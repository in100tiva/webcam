/**
 * Virtual Camera Module
 * Sends video frames to a virtual camera device that other applications can use
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get FFmpeg path
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  ffmpegPath = 'ffmpeg'; // Fallback to system ffmpeg
}

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

    if (this.platform === 'win32') {
      // Check for OBS Virtual Camera
      const obsVCam = await this.checkWindowsDriver('OBS Virtual Camera');
      if (obsVCam) drivers.push({ name: 'OBS Virtual Camera', id: 'obs', installed: true });

      // Check for OBS-Camera (older version)
      const obsCamera = await this.checkWindowsDriver('OBS-Camera');
      if (obsCamera) drivers.push({ name: 'OBS-Camera', id: 'obs-legacy', installed: true });

      // Check for Unity Capture
      const unityCapture = await this.checkWindowsDriver('Unity Video Capture');
      if (unityCapture) drivers.push({ name: 'Unity Video Capture', id: 'unity', installed: true });

      // Check for Snap Camera
      const snapCamera = await this.checkWindowsDriver('Snap Camera');
      if (snapCamera) drivers.push({ name: 'Snap Camera', id: 'snap', installed: true });

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

    return drivers;
  }

  /**
   * Check for Windows DirectShow device
   */
  checkWindowsDriver(driverName) {
    return new Promise((resolve) => {
      exec(`${ffmpegPath} -list_devices true -f dshow -i dummy 2>&1`, (error, stdout, stderr) => {
        const output = stderr || stdout;
        resolve(output.toLowerCase().includes(driverName.toLowerCase()));
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
    const driverPath = path.join(process.resourcesPath || path.join(__dirname, '../../'), 'drivers/win');
    const installerPath = path.join(driverPath, 'install-driver.bat');

    if (!fs.existsSync(installerPath)) {
      return {
        success: false,
        message: 'Driver não encontrado. Por favor, instale o OBS Studio para obter o OBS Virtual Camera.'
      };
    }

    return new Promise((resolve) => {
      // Run installer with elevated privileges
      exec(`powershell -Command "Start-Process '${installerPath}' -Verb RunAs -Wait"`, (error) => {
        if (error) {
          resolve({ success: false, message: 'Erro ao instalar driver: ' + error.message });
        } else {
          resolve({ success: true, message: 'Driver instalado com sucesso! Reinicie o aplicativo.' });
        }
      });
    });
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

    let ffmpegArgs;

    if (this.platform === 'win32') {
      // Windows - output to DirectShow virtual camera
      const deviceName = this.getWindowsDeviceName(driverId);
      ffmpegArgs = [
        '-f', 'rawvideo',
        '-pix_fmt', 'bgra',
        '-s', `${width}x${height}`,
        '-r', String(fps),
        '-i', 'pipe:0',
        '-f', 'dshow',
        '-vcodec', 'rawvideo',
        '-pix_fmt', 'yuyv422',
        `video=${deviceName}`
      ];
    } else if (this.platform === 'linux') {
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
      // For now, return not supported
      return { success: false, message: 'macOS virtual camera requer OBS Studio rodando' };
    }

    try {
      this.ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.ffmpegProcess.on('error', (err) => {
        console.error('FFmpeg error:', err);
        this.isRunning = false;
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        // Log FFmpeg output for debugging
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
    // This is less efficient but more compatible
    if (!this.jpegProcess) {
      await this.startJpegPipeline();
    }

    if (this.jpegProcess && this.jpegProcess.stdin.writable) {
      try {
        // Write JPEG with frame delimiter
        const header = Buffer.alloc(8);
        header.writeUInt32BE(jpegBuffer.length, 0);
        this.jpegProcess.stdin.write(header);
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

    if (this.platform === 'win32') {
      const deviceName = this.getWindowsDeviceName(driver.id);
      ffmpegArgs = [
        '-f', 'mjpeg',
        '-i', 'pipe:0',
        '-f', 'dshow',
        '-vcodec', 'rawvideo',
        '-pix_fmt', 'yuyv422',
        '-s', `${this.width}x${this.height}`,
        `video=${deviceName}`
      ];
    } else if (this.platform === 'linux') {
      const device = driver.device || '/dev/video10';
      ffmpegArgs = [
        '-f', 'mjpeg',
        '-i', 'pipe:0',
        '-f', 'v4l2',
        '-pix_fmt', 'yuyv422',
        '-s', `${this.width}x${this.height}`,
        device
      ];
    } else {
      return false;
    }

    this.jpegProcess = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.jpegProcess.on('error', (err) => {
      console.error('FFmpeg JPEG error:', err);
    });

    return true;
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
