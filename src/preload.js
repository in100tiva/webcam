const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get connection info (QR code, URL, IP)
  getConnectionInfo: () => ipcRenderer.invoke('get-connection-info'),

  // Get server status
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),

  // Send command to mobile device
  sendToMobile: (data) => ipcRenderer.send('send-to-mobile', data),

  // Listen for video frames
  onVideoFrame: (callback) => {
    ipcRenderer.on('video-frame', (event, data) => callback(data));
  },

  // Listen for control messages from mobile
  onControlMessage: (callback) => {
    ipcRenderer.on('control-message', (event, data) => callback(data));
  },

  // Listen for client connections
  onClientConnected: (callback) => {
    ipcRenderer.on('client-connected', (event, data) => callback(data));
  },

  // Listen for client disconnections
  onClientDisconnected: (callback) => {
    ipcRenderer.on('client-disconnected', (event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
