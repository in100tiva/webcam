/**
 * Virtual Camera Module
 * Sends video frames to a virtual camera device that other applications can use
 */

const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get FFmpeg path
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
  // On Windows, ensure the path is quoted if it contains spaces
  if (os.platform() === 'win32' && ffmpegPath.includes(' ')) {
    ffmpegPath = `"${ffmpegPath}"`;
  }
} catch (e) {
  ffmpegPath = 'ffmpeg'; // Fallback to system ffmpeg
}

console.log('FFmpeg path:', ffmpegPath);

class VirtualCamera {
  constructor() {
    this.ffmpegProcess = null;
    this.isRunning = false;
    this.width = 1280;
    this.height = 720;
    this.fps = 30;
    this.driverName = null;
    this.platform = os.platform();
  }

  /**
   * Detect available virtual camera drivers
   */
  async detectDrivers() {
    const drivers = [];

    console.log('Detecting drivers for platform:', this.platform);

    if (this.platform === 'win32') {
      // Get list of all video devices
      const devices = await this.listWindowsVideoDevices();
      console.log('Found Windows video devices:', devices);

      // Known virtual camera patterns
      const virtualCamPatterns = [
        { pattern: /obs.?virtual.?cam/i, name: 'OBS Virtual Camera', id: 'obs' },
        { pattern: /obs-camera/i, name: 'OBS-Camera', id: 'obs-legacy' },
        { pattern: /unity.?video.?capture/i, name: 'Unity Video Capture', id: 'unity' },
        { pattern: /snap.?camera/i, name: 'Snap Camera', id: 'snap' },
        { pattern: /manycam/i, name: 'ManyCam Virtual Webcam', id: 'manycam' },
        { pattern: /xsplit/i, name: 'XSplit VCam', id: 'xsplit' },
        { pattern: /virtual.?cam/i, name: 'Virtual Camera', id: 'virtual' },
        { pattern: /droidcam/i, name: 'DroidCam', id: 'droidcam' },
        { pattern: /iriun/i, name: 'Iriun Webcam', id: 'iriun' },
        { pattern: /epoccam/i, name: 'EpocCam', id: 'epoccam' },
      ];

      for (const device of devices) {
        for (const vcam of virtualCamPatterns) {
          if (vcam.pattern.test(device)) {
            drivers.push({
              name: device, // Use actual device name
              id: vcam.id,
              installed: true
            });
            break;
          }
        }
      }

    } else if (this.platform === 'linux') {
      // Check for v4l2loopback
      const v4l2 = await this.checkV4l2Loopback();
      if (v4l2) {
        drivers.push({ name: 'v4l2loopback', id: 'v4l2', installed: true, device: v4l2 });
      }

    } else if (this.platform === 'darwin') {
      // macOS - check for OBS Virtual Camera
      const obsVCam = await this.checkMacOBSVirtualCam();
      if (obsVCam) drivers.push({ name: 'OBS Virtual Camera', id: 'obs-mac', installed: true });
    }

    console.log('Detected drivers:', drivers);
    return drivers;
  }

  /**
   * List all Windows video devices using FFmpeg
   */
  listWindowsVideoDevices() {
    return new Promise((resolve) => {
      const cmd = `${ffmpegPath} -list_devices true -f dshow -i dummy 2>&1`;
      console.log('Running command:', cmd);

      exec(cmd, { shell: true }, (error, stdout, stderr) => {
        const output = (stderr || '') + (stdout || '');
        console.log('FFmpeg output:', output);

        const devices = [];

        // Parse the output to find video devices
        // Format: [dshow @ ...] "Device Name" (video)
        const lines = output.split('\n');
        let inVideoSection = false;

        for (const line of lines) {
          // Check if we're entering video devices section
          if (line.includes('DirectShow video devices')) {
            inVideoSection = true;
            continue;
          }

          // Check if we're leaving video section (entering audio)
          if (line.includes('DirectShow audio devices')) {
            inVideoSection = false;
            continue;
          }

          if (inVideoSection) {
            // Match device names in quotes
            const match = line.match(/"([^"]+)"/);
            if (match && match[1]) {
              // Skip "Alternative name" entries
              if (!line.includes('Alternative name')) {
                devices.push(match[1]);
              }
            }
          }
        }

        resolve(devices);
      });
    });
  }

  /**
   * Check for v4l2loopback on Linux
   */
  checkV4l2Loopback() {
    return new Promise((resolve) => {
      // Look for /dev/video* devices that are v4l2loopback
      exec('v4l2-ctl --list-devices 2>/dev/null | grep -A1 "Dummy\\|Loopback\\|Virtual"', (error, stdout) => {
        if (stdout) {
          const match = stdout.match(/\/dev\/video\d+/);
          resolve(match ? match[0] : null);
        } else {
          // Try to find any available loopback device
          exec('ls /dev/video* 2>/dev/null', (err, out) => {
            if (out) {
              const devices = out.trim().split('\n');
              // Return the last device (usually the loopback one)
              resolve(devices.length > 1 ? devices[devices.length - 1] : null);
            } else {
              resolve(null);
            }
          });
        }
      });
    });
  }

  /**
   * Check for OBS Virtual Camera on macOS
   */
  checkMacOBSVirtualCam() {
    return new Promise((resolve) => {
      exec('system_profiler SPCameraDataType 2>/dev/null | grep -i "OBS"', (error, stdout) => {
        resolve(stdout && stdout.includes('OBS'));
      });
    });
  }

  /**
   * Install virtual camera driver
   */
  async installDriver() {
    if (this.platform === 'win32') {
      return this.installWindowsDriver();
    } else if (this.platform === 'linux') {
      return this.installLinuxDriver();
    } else if (this.platform === 'darwin') {
      return { success: false, message: 'Por favor, instale o OBS Studio para obter o OBS Virtual Camera no macOS' };
    }
    return { success: false, message: 'Plataforma não suportada' };
  }

  /**
   * Install driver on Windows
   */
  async installWindowsDriver() {
    // Open OBS download page
    const { shell } = require('electron');
    shell.openExternal('https://obsproject.com/download');

    return {
      success: true,
      message: 'Abrindo página de download do OBS Studio. Após instalar, reinicie o Phone Webcam.'
    };
  }

  /**
   * Install v4l2loopback on Linux
   */
  async installLinuxDriver() {
    return new Promise((resolve) => {
      // Try to load v4l2loopback module
      exec('sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="Phone Webcam" exclusive_caps=1', (error) => {
        if (error) {
          resolve({
            success: false,
            message: 'Instale o v4l2loopback: sudo apt install v4l2loopback-dkms'
          });
        } else {
          resolve({ success: true, message: 'v4l2loopback carregado com sucesso!' });
        }
      });
    });
  }

  /**
   * Start sending frames to virtual camera
   */
  async start(driverId, width = 1280, height = 720, fps = 30) {
    if (this.isRunning) {
      return { success: false, message: 'Virtual camera já está rodando' };
    }

    this.width = width;
    this.height = height;
    this.fps = fps;
    this.driverName = driverId;

    // For now, we'll use a simpler approach - just mark as running
    // The actual FFmpeg pipeline for Windows DirectShow output is complex
    // and requires the virtual camera to be in "receive" mode

    // Check if driver supports direct input
    if (this.platform === 'win32') {
      // Windows virtual cameras typically don't support direct FFmpeg output
      // They work by the application sending frames via their SDK
      // For OBS Virtual Camera, you need OBS running with Virtual Camera active
      return {
        success: false,
        message: 'No Windows, abra o OBS Studio e ative "Iniciar Câmera Virtual" no menu Ferramentas. Depois use o método "Janela Limpa" para capturar.'
      };
    }

    let ffmpegArgs;

    if (this.platform === 'linux') {
      // Linux - output to v4l2loopback device
      const device = driverId.device || '/dev/video10';
      ffmpegArgs = [
        '-f', 'rawvideo',
        '-pix_fmt', 'bgra',
        '-s', `${width}x${height}`,
        '-r', String(fps),
        '-i', 'pipe:0',
        '-f', 'v4l2',
        '-pix_fmt', 'yuyv422',
        device
      ];
    } else if (this.platform === 'darwin') {
      // macOS - OBS Virtual Camera uses different approach
      return { success: false, message: 'macOS virtual camera requer OBS Studio rodando' };
    }

    try {
      this.ffmpegProcess = spawn(ffmpegPath.replace(/"/g, ''), ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.ffmpegProcess.on('error', (err) => {
        console.error('FFmpeg error:', err);
        this.isRunning = false;
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        console.log('FFmpeg:', data.toString());
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log('FFmpeg closed with code:', code);
        this.isRunning = false;
      });

      this.isRunning = true;
      return { success: true, message: 'Virtual camera iniciada!' };
    } catch (error) {
      return { success: false, message: 'Erro ao iniciar FFmpeg: ' + error.message };
    }
  }

  /**
   * Get Windows DirectShow device name
   */
  getWindowsDeviceName(driverId) {
    const deviceNames = {
      'obs': 'OBS Virtual Camera',
      'obs-legacy': 'OBS-Camera',
      'unity': 'Unity Video Capture',
      'snap': 'Snap Camera'
    };
    return deviceNames[driverId] || 'OBS Virtual Camera';
  }

  /**
   * Send a frame to the virtual camera
   * @param {Buffer} frameBuffer - Raw BGRA pixel data
   */
  sendFrame(frameBuffer) {
    if (!this.isRunning || !this.ffmpegProcess || !this.ffmpegProcess.stdin.writable) {
      return false;
    }

    try {
      this.ffmpegProcess.stdin.write(frameBuffer);
      return true;
    } catch (error) {
      console.error('Error sending frame:', error);
      return false;
    }
  }

  /**
   * Send a JPEG frame (will be converted internally)
   * @param {Buffer} jpegBuffer - JPEG image data
   */
  async sendJpegFrame(jpegBuffer) {
    // For JPEG input, we need a different FFmpeg pipeline
    if (!this.jpegProcess) {
      await this.startJpegPipeline();
    }

    if (this.jpegProcess && this.jpegProcess.stdin.writable) {
      try {
        this.jpegProcess.stdin.write(jpegBuffer);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  /**
   * Start a JPEG-based pipeline
   */
  async startJpegPipeline() {
    const drivers = await this.detectDrivers();
    if (drivers.length === 0) {
      return false;
    }

    const driver = drivers[0];
    let ffmpegArgs;

    if (this.platform === 'linux') {
      const device = driver.device || '/dev/video10';
      ffmpegArgs = [
        '-f', 'mjpeg',
        '-i', 'pipe:0',
        '-f', 'v4l2',
        '-pix_fmt', 'yuyv422',
        '-s', `${this.width}x${this.height}`,
        device
      ];

      this.jpegProcess = spawn(ffmpegPath.replace(/"/g, ''), ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.jpegProcess.on('error', (err) => {
        console.error('FFmpeg JPEG error:', err);
      });

      return true;
    }

    return false;
  }

  /**
   * Stop the virtual camera
   */
  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin.end();
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    if (this.jpegProcess) {
      this.jpegProcess.stdin.end();
      this.jpegProcess.kill('SIGTERM');
      this.jpegProcess = null;
    }

    this.isRunning = false;
    return { success: true, message: 'Virtual camera parada' };
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      width: this.width,
      height: this.height,
      fps: this.fps,
      driver: this.driverName,
      platform: this.platform
    };
  }
}

module.exports = VirtualCamera;
