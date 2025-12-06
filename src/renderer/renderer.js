// DOM Elements
const videoPreview = document.getElementById('videoPreview');
const noVideo = document.getElementById('noVideo');
const videoContainer = document.getElementById('videoContainer');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = statusIndicator.querySelector('.status-text');
const qrCode = document.getElementById('qrCode');
const connectionUrl = document.getElementById('connectionUrl');
const serverIP = document.getElementById('serverIP');
const httpPort = document.getElementById('httpPort');
const wsPort = document.getElementById('wsPort');
const connectedDevices = document.getElementById('connectedDevices');
const currentFPS = document.getElementById('currentFPS');
const resolution = document.getElementById('resolution');
const snapshotCanvas = document.getElementById('snapshotCanvas');

// Control buttons
const btnFullscreen = document.getElementById('btnFullscreen');
const btnSnapshot = document.getElementById('btnSnapshot');
const btnMirror = document.getElementById('btnMirror');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnToggleFlash = document.getElementById('btnToggleFlash');
const qualitySelect = document.getElementById('qualitySelect');

// State
let frameCount = 0;
let lastFPSUpdate = Date.now();
let isMirrored = false;
let isConnected = false;

// Initialize connection info
async function initConnectionInfo() {
  try {
    const info = await window.electronAPI.getConnectionInfo();

    if (info.qrDataUrl) {
      qrCode.src = info.qrDataUrl;
    }

    connectionUrl.textContent = info.url;
    serverIP.textContent = info.ip;

    const status = await window.electronAPI.getServerStatus();
    httpPort.textContent = status.httpPort;
    wsPort.textContent = status.wsPort;
    connectedDevices.textContent = status.connectedClients;

  } catch (error) {
    console.error('Error getting connection info:', error);
  }
}

// Update FPS counter
function updateFPS() {
  const now = Date.now();
  const elapsed = now - lastFPSUpdate;

  if (elapsed >= 1000) {
    const fps = Math.round((frameCount * 1000) / elapsed);
    currentFPS.textContent = fps;
    frameCount = 0;
    lastFPSUpdate = now;
  }
}

// Handle incoming video frames
function handleVideoFrame(frameData) {
  frameCount++;
  updateFPS();

  // Update video preview
  videoPreview.src = `data:image/jpeg;base64,${frameData}`;

  // Show video, hide placeholder
  if (videoPreview.classList.contains('hidden')) {
    videoPreview.classList.remove('hidden');
    noVideo.style.display = 'none';
  }
}

// Handle control messages from mobile
function handleControlMessage(message) {
  console.log('Control message:', message);

  switch (message.type) {
    case 'resolution':
      resolution.textContent = `${message.width}x${message.height}`;
      break;
    case 'cameraInfo':
      console.log('Camera info:', message);
      break;
  }
}

// Update connection status
function updateConnectionStatus(connected, deviceCount) {
  isConnected = connected;
  connectedDevices.textContent = deviceCount;

  if (connected) {
    statusIndicator.classList.add('connected');
    statusText.textContent = `${deviceCount} dispositivo(s) conectado(s)`;
  } else {
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Aguardando conexão...';

    // Reset video display if no devices connected
    if (deviceCount === 0) {
      videoPreview.classList.add('hidden');
      noVideo.style.display = 'flex';
      currentFPS.textContent = '0';
      resolution.textContent = '-';
    }
  }
}

// Copy to clipboard
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;

  navigator.clipboard.writeText(text).then(() => {
    showToast('URL copiada!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// Take snapshot
function takeSnapshot() {
  if (!isConnected || videoPreview.classList.contains('hidden')) {
    showToast('Nenhum vídeo disponível');
    return;
  }

  const canvas = snapshotCanvas;
  const ctx = canvas.getContext('2d');

  canvas.width = videoPreview.naturalWidth;
  canvas.height = videoPreview.naturalHeight;

  if (isMirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoPreview, 0, 0);

  // Download the image
  const link = document.createElement('a');
  link.download = `snapshot_${Date.now()}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.click();

  showToast('Foto salva!');
}

// Toggle fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    videoContainer.requestFullscreen().catch(err => {
      console.error('Error entering fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Toggle mirror
function toggleMirror() {
  isMirrored = !isMirrored;
  videoPreview.classList.toggle('mirrored', isMirrored);
  showToast(isMirrored ? 'Espelhado' : 'Normal');
}

// Send command to mobile
function sendToMobile(command, data = {}) {
  window.electronAPI.sendToMobile({
    type: command,
    ...data
  });
}

// Event Listeners
btnFullscreen.addEventListener('click', toggleFullscreen);
btnSnapshot.addEventListener('click', takeSnapshot);
btnMirror.addEventListener('click', toggleMirror);

btnSwitchCamera.addEventListener('click', () => {
  sendToMobile('switchCamera');
  showToast('Trocando câmera...');
});

btnToggleFlash.addEventListener('click', () => {
  sendToMobile('toggleFlash');
});

qualitySelect.addEventListener('change', (e) => {
  sendToMobile('setQuality', { quality: e.target.value });
  showToast(`Qualidade: ${e.target.options[e.target.selectedIndex].text}`);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 's':
    case 'S':
      takeSnapshot();
      break;
    case 'm':
    case 'M':
      toggleMirror();
      break;
  }
});

// Set up IPC listeners
window.electronAPI.onVideoFrame(handleVideoFrame);
window.electronAPI.onControlMessage(handleControlMessage);

window.electronAPI.onClientConnected((data) => {
  console.log('Client connected:', data);
  updateConnectionStatus(true, data.totalClients);
  showToast('Dispositivo conectado!');
});

window.electronAPI.onClientDisconnected((data) => {
  console.log('Client disconnected:', data);
  updateConnectionStatus(data.totalClients > 0, data.totalClients);
  if (data.totalClients === 0) {
    showToast('Dispositivo desconectado');
  }
});

// Make copyToClipboard available globally
window.copyToClipboard = copyToClipboard;

// Initialize
initConnectionInfo();
