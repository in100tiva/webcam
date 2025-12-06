const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get connection info (QR code, URL, IP)
  getConnectionInfo: () => ipcRenderer.invoke('get-connection-info'),

  // Get server status
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),

  // Select IP address for connection
  selectIP: (ip) => ipcRenderer.invoke('select-ip', ip),

  // Clean output window for OBS capture
  openCleanWindow: () => ipcRenderer.invoke('open-clean-window'),
  closeCleanWindow: () => ipcRenderer.invoke('close-clean-window'),
  isCleanWindowOpen: () => ipcRenderer.invoke('is-clean-window-open'),
  onCleanWindowClosed: (callback) => {
    ipcRenderer.on('clean-window-closed', () => callback());
  },

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
  },

  // =====================
  // Virtual Camera API
  // =====================

  // Detect available virtual camera drivers
  vcamDetectDrivers: () => ipcRenderer.invoke('vcam-detect-drivers'),

  // Install virtual camera driver
  vcamInstallDriver: () => ipcRenderer.invoke('vcam-install-driver'),

  // Start virtual camera
  vcamStart: (options) => ipcRenderer.invoke('vcam-start', options),

  // Stop virtual camera
  vcamStop: () => ipcRenderer.invoke('vcam-stop'),

  // Get virtual camera status
  vcamGetStatus: () => ipcRenderer.invoke('vcam-status'),

  // Send frame to virtual camera
  vcamSendFrame: (frameData) => ipcRenderer.send('vcam-send-frame', frameData)
});
