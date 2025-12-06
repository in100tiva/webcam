const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const QRCode = require('qrcode');

let mainWindow;
let expressApp;
let httpServer;
let wss;
let connectedClients = new Set();

const PORT = 8080;
const WS_PORT = 8081;

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Create Express server to serve mobile page
function createExpressServer() {
  expressApp = express();
  httpServer = http.createServer(expressApp);

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
      wsUrl: `ws://${localIP}:${WS_PORT}`,
      serverIP: localIP
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT}`);
  });
}

// Create WebSocket server for video streaming
function createWebSocketServer() {
  wss = new WebSocket.Server({ port: WS_PORT, host: '0.0.0.0' });

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

  console.log(`WebSocket Server running on port ${WS_PORT}`);
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
  const url = `http://${localIP}:${PORT}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#16213e',
        light: '#ffffff'
      }
    });
    return { qrDataUrl, url, ip: localIP };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { url, ip: localIP, error: error.message };
  }
}

// IPC Handlers
ipcMain.handle('get-connection-info', async () => {
  return await generateQRCode();
});

ipcMain.handle('get-server-status', () => {
  return {
    httpRunning: !!httpServer,
    wsRunning: !!wss,
    connectedClients: connectedClients.size,
    localIP: getLocalIP(),
    httpPort: PORT,
    wsPort: WS_PORT
  };
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
  if (httpServer) {
    httpServer.close();
  }
  if (wss) {
    wss.close();
  }
});
