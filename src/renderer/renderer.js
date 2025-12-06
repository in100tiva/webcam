// DOM Elements
const videoPreview = document.getElementById('videoPreview');
const noVideo = document.getElementById('noVideo');
const videoContainer = document.getElementById('videoContainer');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = statusIndicator.querySelector('.status-text');
const qrCode = document.getElementById('qrCode');
const connectionUrl = document.getElementById('connectionUrl');
const httpsPort = document.getElementById('httpsPort');
const wsPort = document.getElementById('wsPort');
const connectedDevices = document.getElementById('connectedDevices');
const currentFPS = document.getElementById('currentFPS');
const resolution = document.getElementById('resolution');
const snapshotCanvas = document.getElementById('snapshotCanvas');
const networkSelect = document.getElementById('networkSelect');
const networkHint = document.getElementById('networkHint');

// Control buttons
const btnFullscreen = document.getElementById('btnFullscreen');
const btnSnapshot = document.getElementById('btnSnapshot');
const btnMirror = document.getElementById('btnMirror');
const btnRotate = document.getElementById('btnRotate');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnToggleFlash = document.getElementById('btnToggleFlash');
const qualitySelect = document.getElementById('qualitySelect');
const aspectSelect = document.getElementById('aspectSelect');
const rotationSelect = document.getElementById('rotationSelect');
const btnOpenCleanWindow = document.getElementById('btnOpenCleanWindow');

// State
let frameCount = 0;
let lastFPSUpdate = Date.now();
let isMirrored = false;
let isConnected = false;
let allNetworkIPs = [];
let currentRotation = 0;

// Populate network selector
async function populateNetworkSelect() {
  try {
    const status = await window.electronAPI.getServerStatus();
    allNetworkIPs = status.allIPs || [];

    networkSelect.innerHTML = '';

    if (allNetworkIPs.length === 0) {
      networkSelect.innerHTML = '<option value="">Nenhuma rede encontrada</option>';
      networkHint.textContent = 'Verifique sua conexao de rede';
      networkHint.style.color = 'var(--error)';
      return;
    }

    allNetworkIPs.forEach((net, index) => {
      const option = document.createElement('option');
      option.value = net.address;
      option.textContent = `${net.name} - ${net.address}`;
      if (net.address === status.localIP) {
        option.selected = true;
      }
      networkSelect.appendChild(option);
    });

    // Show hint based on network type
    updateNetworkHint();

  } catch (error) {
    console.error('Error populating network select:', error);
    networkSelect.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// Update network hint based on selected interface
function updateNetworkHint() {
  const selectedIP = networkSelect.value;
  const selectedNet = allNetworkIPs.find(n => n.address === selectedIP);

  if (selectedNet) {
    const name = selectedNet.name.toLowerCase();
    if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wlan') || name.includes('wireless')) {
      networkHint.textContent = 'WiFi selecionado - ideal para celular no WiFi';
      networkHint.style.color = 'var(--success)';
    } else if (name.includes('eth') || name.includes('ethernet') || name.includes('enp') || name.includes('eno')) {
      networkHint.textContent = 'Ethernet selecionado - celular deve estar na mesma rede';
      networkHint.style.color = 'var(--warning)';
    } else {
      networkHint.textContent = 'Certifique-se que o celular esta na mesma rede';
      networkHint.style.color = 'var(--text-secondary)';
    }
  }
}

// Handle network selection change
async function handleNetworkChange() {
  const selectedIP = networkSelect.value;

  if (!selectedIP) return;

  showToast('Alterando rede...');
  updateNetworkHint();

  try {
    const newInfo = await window.electronAPI.selectIP(selectedIP);

    if (newInfo.qrDataUrl) {
      qrCode.src = newInfo.qrDataUrl;
    }
    connectionUrl.textContent = newInfo.url;

    showToast(`IP alterado para ${selectedIP}`);

    // Show restart hint
    networkHint.innerHTML = `<strong>Reinicie o app</strong> para aplicar o novo certificado SSL`;
    networkHint.style.color = 'var(--accent)';

  } catch (error) {
    console.error('Error changing IP:', error);
    showToast('Erro ao alterar IP');
  }
}

// Initialize connection info
async function initConnectionInfo() {
  try {
    // First populate network selector
    await populateNetworkSelect();

    const info = await window.electronAPI.getConnectionInfo();

    if (info.qrDataUrl) {
      qrCode.src = info.qrDataUrl;
    }

    connectionUrl.textContent = info.url;

    const status = await window.electronAPI.getServerStatus();
    httpsPort.textContent = status.httpsPort;
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

// Rotate video 90 degrees
function rotateVideo() {
  currentRotation = (currentRotation + 90) % 360;
  updateVideoTransform();
  rotationSelect.value = currentRotation.toString();
  showToast(`Rotação: ${currentRotation}°`);
}

// Set rotation from select
function setRotation(degrees) {
  currentRotation = parseInt(degrees);
  updateVideoTransform();
}

// Set aspect ratio
function setAspectRatio(ratio) {
  // Remove all aspect ratio classes
  videoContainer.classList.remove('aspect-16-9', 'aspect-4-3', 'aspect-1-1', 'aspect-9-16');

  if (ratio !== 'auto') {
    videoContainer.classList.add(`aspect-${ratio}`);
  }

  showToast(`Proporção: ${ratio === 'auto' ? 'Automático' : ratio.replace('-', ':')}`);
}

// Update video transform based on mirror and rotation
function updateVideoTransform() {
  // Remove all rotation classes
  videoPreview.classList.remove('rotate-90', 'rotate-180', 'rotate-270');

  if (currentRotation === 90) {
    videoPreview.classList.add('rotate-90');
  } else if (currentRotation === 180) {
    videoPreview.classList.add('rotate-180');
  } else if (currentRotation === 270) {
    videoPreview.classList.add('rotate-270');
  }
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
btnRotate.addEventListener('click', rotateVideo);

// Aspect ratio and rotation selects
aspectSelect.addEventListener('change', (e) => {
  setAspectRatio(e.target.value);
});

rotationSelect.addEventListener('change', (e) => {
  setRotation(e.target.value);
  showToast(`Rotação: ${e.target.value}°`);
});

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

// Network selection
networkSelect.addEventListener('change', handleNetworkChange);

// Virtual Webcam / Clean window
btnOpenCleanWindow.addEventListener('click', async () => {
  const isOpen = await window.electronAPI.isCleanWindowOpen();

  if (isOpen) {
    await window.electronAPI.closeCleanWindow();
    btnOpenCleanWindow.textContent = '🎥 Abrir Janela Limpa';
    showToast('Janela limpa fechada');
  } else {
    await window.electronAPI.openCleanWindow();
    btnOpenCleanWindow.textContent = '❌ Fechar Janela Limpa';
    showToast('Janela limpa aberta - capture com OBS');
  }
});

// Listen for clean window closed event
window.electronAPI.onCleanWindowClosed(() => {
  btnOpenCleanWindow.textContent = '🎥 Abrir Janela Limpa';
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
    case 'r':
    case 'R':
      rotateVideo();
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
