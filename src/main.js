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

let mainWindow;
let expressApp;
let httpsServer;
let httpServer;
let wssServer; // HTTPS server for WebSocket
let wss;
let connectedClients = new Set();

const HTTPS_PORT = 8443;
const HTTP_PORT = 8080;
const WS_PORT = 8444;

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
      serverIP: localIP,
      httpsPort: HTTPS_PORT
    });
  });

  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`HTTP Server (redirect) running on port ${HTTP_PORT}`);
  });
}

// Create WebSocket server for video streaming (with SSL)
function createWebSocketServer() {
  const sslOptions = getSSLCertificates();

  // Create a dedicated HTTPS server for WebSocket
  wssServer = https.createServer(sslOptions);

  // Create WebSocket server attached to the HTTPS server
  wss = new WebSocket.Server({ server: wssServer });

  wssServer.listen(WS_PORT, '0.0.0.0', () => {
    console.log(`WebSocket Server (WSS) running on port ${WS_PORT}`);
  });

  wss.on('connection', (ws, req) => {
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
          mainWindow.webContents.send('video-frame', data.toString('base64'));
        } else {
          try {
            const message = JSON.parse(data.toString());
            mainWindow.webContents.send('control-message', message);
          } catch (e) {
            // If not JSON, treat as video data
            mainWindow.webContents.send('video-frame', data.toString());
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
  });
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
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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
