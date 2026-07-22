const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const QRCode = require('qrcode');
const selfsigned = require('selfsigned');
const VirtualCamera = require('./virtualcam');

let mainWindow;
let cleanWindow; // Clean output window for OBS capture
let expressApp;
let httpsServer;
let httpServer;
let wssServer; // HTTPS server for WebSocket
let wss;
let wsPlainServer; // plain HTTP server for native-app WebSocket
let wsPlain;
let connectedClients = new Set();

// Virtual Camera instance
let virtualCamera = null;

const HTTPS_PORT = 8443;
const HTTP_PORT = 8080;
const WS_PORT = 8444;
const WS_PLAIN_PORT = 8445; // plain ws:// for the native Android app

// Certificate storage path
const certsPath = path.join(app.getPath('userData'), 'certs');

// Selected IP for connection
let selectedIP = null;

// Get all local IP addresses
function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask
        });
      }
    }
  }

  return ips;
}

// Get local IP address (use selected or first available)
function getLocalIP() {
  if (selectedIP) {
    return selectedIP;
  }

  const ips = getAllLocalIPs();
  if (ips.length > 0) {
    return ips[0].address;
  }
  return '127.0.0.1';
}

// Generate or load SSL certificates
function getSSLCertificates() {
  const certFile = path.join(certsPath, 'cert.pem');
  const keyFile = path.join(certsPath, 'key.pem');

  // Check if certificates already exist
  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('Loading existing SSL certificates...');
    return {
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile)
    };
  }

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certsPath)) {
    fs.mkdirSync(certsPath, { recursive: true });
  }

  console.log('Generating new SSL certificates...');

  const localIP = getLocalIP();

  // Generate self-signed certificate
  const attrs = [{ name: 'commonName', value: 'Phone Webcam' }];
  const pems = selfsigned.generate(attrs, {
    algorithm: 'sha256',
    days: 365,
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: localIP }
        ]
      }
    ]
  });

  // Save certificates
  fs.writeFileSync(certFile, pems.cert);
  fs.writeFileSync(keyFile, pems.private);

  console.log('SSL certificates generated and saved.');

  return {
    cert: pems.cert,
    key: pems.private
  };
}

// Create Express server with HTTPS
function createExpressServer() {
  expressApp = express();

  // Get SSL certificates
  const sslOptions = getSSLCertificates();

  // Create HTTPS server
  httpsServer = https.createServer(sslOptions, expressApp);

  // Also create HTTP server for redirect
  httpServer = http.createServer((req, res) => {
    const localIP = getLocalIP();
    res.writeHead(301, { Location: `https://${localIP}:${HTTPS_PORT}${req.url}` });
    res.end();
  });

  // Serve static files from mobile directory
  expressApp.use(express.static(path.join(__dirname, 'mobile')));

  // Serve the mobile camera page
  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile', 'index.html'));
  });

  // API endpoint to get WebSocket connection info
  expressApp.get('/api/config', (req, res) => {
    const localIP = getLocalIP();
    res.json({
      wsUrl: `wss://${localIP}:${WS_PORT}`,
      wsPlainUrl: `ws://${localIP}:${WS_PLAIN_PORT}`,
      serverIP: localIP,
      httpsPort: HTTPS_PORT,
      wsPort: WS_PORT,
      wsPlainPort: WS_PLAIN_PORT
    });
  });

  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`HTTP Server (redirect) running on port ${HTTP_PORT}`);
  });
}

// Shared connection handler for both the WSS (browser) and plain WS (app) servers.
function handleWsConnection(ws, req) {
  const clientIP = req.socket.remoteAddress;
  console.log(`New client connected: ${clientIP}`);
  connectedClients.add(ws);

  // Notify renderer about new connection
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('client-connected', {
      ip: clientIP,
      totalClients: connectedClients.size
    });
  }

  ws.on('message', (data) => {
    // Forward video frame to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Check if it's binary data (video frame) or text (control message)
      if (Buffer.isBuffer(data)) {
        const frameData = data.toString('base64');
        mainWindow.webContents.send('video-frame', frameData);
        // Also send to clean window if open
        if (cleanWindow && !cleanWindow.isDestroyed()) {
          cleanWindow.webContents.send('video-frame', frameData);
        }
      } else {
        try {
          const message = JSON.parse(data.toString());
          mainWindow.webContents.send('control-message', message);
        } catch (e) {
          // If not JSON, treat as video data
          const frameData = data.toString();
          mainWindow.webContents.send('video-frame', frameData);
          if (cleanWindow && !cleanWindow.isDestroyed()) {
            cleanWindow.webContents.send('video-frame', frameData);
          }
        }
      }
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientIP}`);
    connectedClients.delete(ws);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('client-disconnected', {
        ip: clientIP,
        totalClients: connectedClients.size
      });
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
}

// Create WebSocket servers for video streaming.
// - WSS (8444): for the browser flow (page served over HTTPS, secure context).
// - Plain WS (8445): for the native Android app (embedded page). The native
//   WebView rejects the self-signed WSS cert, so the app uses cleartext ws://
//   on the LAN. Same handler, same message protocol.
function createWebSocketServer() {
  const sslOptions = getSSLCertificates();

  wssServer = https.createServer(sslOptions);
  wss = new WebSocket.Server({ server: wssServer });
  wssServer.listen(WS_PORT, '0.0.0.0', () => {
    console.log(`WebSocket Server (WSS) running on port ${WS_PORT}`);
  });
  wss.on('connection', handleWsConnection);

  // Plain WS server for native app clients.
  wsPlainServer = http.createServer();
  wsPlain = new WebSocket.Server({ server: wsPlainServer });
  wsPlainServer.listen(WS_PLAIN_PORT, '0.0.0.0', () => {
    console.log(`WebSocket Server (plain ws) running on port ${WS_PLAIN_PORT}`);
  });
  wsPlain.on('connection', handleWsConnection);
}

// Create the main application window
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width * 0.8),
    height: Math.min(800, height * 0.8),
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Phone Webcam',
    backgroundColor: '#0a0a0f'
  });

  // Load the React app - either from dev server or built files
  if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
    // Development mode - load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close clean window if main window is closed
    if (cleanWindow && !cleanWindow.isDestroyed()) {
      cleanWindow.close();
    }
  });
}

// Create clean output window for OBS/virtual webcam capture
function createCleanWindow() {
  if (cleanWindow && !cleanWindow.isDestroyed()) {
    cleanWindow.focus();
    return;
  }

  cleanWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 320,
    minHeight: 240,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Phone Webcam - Clean Output (Capture this window)',
    backgroundColor: '#000000',
    autoHideMenuBar: true
  });

  cleanWindow.loadFile(path.join(__dirname, 'renderer', 'clean.html'));

  cleanWindow.on('closed', () => {
    cleanWindow = null;
    // Notify main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clean-window-closed');
    }
  });
}

// Generate QR Code for easy mobile connection
async function generateQRCode() {
  const localIP = getLocalIP();
  const url = `https://${localIP}:${HTTPS_PORT}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#16213e',
        light: '#ffffff'
      }
    });
    return { qrDataUrl, url, ip: localIP, port: HTTPS_PORT };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { url, ip: localIP, port: HTTPS_PORT, error: error.message };
  }
}

// IPC Handlers
ipcMain.handle('get-connection-info', async () => {
  return await generateQRCode();
});

ipcMain.handle('get-server-status', () => {
  return {
    httpsRunning: !!httpsServer,
    wsRunning: !!wss,
    connectedClients: connectedClients.size,
    localIP: getLocalIP(),
    allIPs: getAllLocalIPs(),
    httpsPort: HTTPS_PORT,
    wsPort: WS_PORT
  };
});

// Change selected IP and regenerate QR code
ipcMain.handle('select-ip', async (event, ip) => {
  selectedIP = ip;
  console.log(`Selected IP changed to: ${ip}`);

  // Delete old certificates to regenerate with new IP
  const certFile = path.join(certsPath, 'cert.pem');
  const keyFile = path.join(certsPath, 'key.pem');

  try {
    if (fs.existsSync(certFile)) fs.unlinkSync(certFile);
    if (fs.existsSync(keyFile)) fs.unlinkSync(keyFile);
    console.log('Old certificates deleted, will regenerate on restart');
  } catch (e) {
    console.error('Error deleting certificates:', e);
  }

  return await generateQRCode();
});

// Send command to connected mobile clients
ipcMain.on('send-to-mobile', (event, data) => {
  const message = JSON.stringify(data);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

// Open clean output window for OBS capture
ipcMain.handle('open-clean-window', () => {
  createCleanWindow();
  return true;
});

// Close clean output window
ipcMain.handle('close-clean-window', () => {
  if (cleanWindow && !cleanWindow.isDestroyed()) {
    cleanWindow.close();
  }
  return true;
});

// Check if clean window is open
ipcMain.handle('is-clean-window-open', () => {
  return cleanWindow && !cleanWindow.isDestroyed();
});

// =====================
// Virtual Camera IPC Handlers
// =====================

// Initialize virtual camera
function initVirtualCamera() {
  if (!virtualCamera) {
    virtualCamera = new VirtualCamera();
  }
  return virtualCamera;
}

// Detect available virtual camera drivers
ipcMain.handle('vcam-detect-drivers', async () => {
  const vcam = initVirtualCamera();
  return await vcam.detectDrivers();
});

// Install virtual camera driver
ipcMain.handle('vcam-install-driver', async () => {
  const vcam = initVirtualCamera();
  return await vcam.installDriver();
});

// Start virtual camera
ipcMain.handle('vcam-start', async (event, options = {}) => {
  const vcam = initVirtualCamera();
  const { driverId, width = 1280, height = 720, fps = 30 } = options;
  return await vcam.start(driverId, width, height, fps);
});

// Stop virtual camera
ipcMain.handle('vcam-stop', () => {
  if (virtualCamera) {
    return virtualCamera.stop();
  }
  return { success: false, message: 'Virtual camera não inicializada' };
});

// Get virtual camera status
ipcMain.handle('vcam-status', () => {
  if (virtualCamera) {
    return virtualCamera.getStatus();
  }
  return { isRunning: false };
});

// Send frame to virtual camera (called from renderer when receiving video frame)
ipcMain.on('vcam-send-frame', (event, frameData) => {
  if (virtualCamera && virtualCamera.isRunning) {
    // frameData is base64 JPEG
    const buffer = Buffer.from(frameData, 'base64');
    virtualCamera.sendJpegFrame(buffer);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createExpressServer();
  createWebSocketServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up servers
  if (httpsServer) {
    httpsServer.close();
  }
  if (httpServer) {
    httpServer.close();
  }
  if (wss) {
    wss.close();
  }
  if (wssServer) {
    wssServer.close();
  }
});
