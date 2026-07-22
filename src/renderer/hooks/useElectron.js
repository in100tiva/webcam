import { useState, useEffect, useCallback, useRef } from 'react'

// Get the electronAPI from the preload script
const electronAPI = window.electronAPI

export function useElectron() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectedDevices, setConnectedDevices] = useState(0)
  const [connectionInfo, setConnectionInfo] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)
  const [currentFrame, setCurrentFrame] = useState(null)
  const [resolution, setResolution] = useState(null)
  const [fps, setFps] = useState(0)
  const [vcamRunning, setVcamRunning] = useState(false)

  // Gate for frame forwarding — read inside the frame listener without
  // re-subscribing on every toggle (a ref survives re-renders).
  const vcamActiveRef = useRef(false)

  // FPS counter
  const [frameCount, setFrameCount] = useState(0)
  const [lastFpsUpdate, setLastFpsUpdate] = useState(Date.now())

  // Initialize connection info
  const loadConnectionInfo = useCallback(async () => {
    if (!electronAPI) return

    try {
      const info = await electronAPI.getConnectionInfo()
      setConnectionInfo(info)

      const status = await electronAPI.getServerStatus()
      setServerStatus(status)
      setConnectedDevices(status.connectedClients)
    } catch (error) {
      console.error('Error loading connection info:', error)
    }
  }, [])

  // Change selected IP
  const selectIP = useCallback(async (ip) => {
    if (!electronAPI) return null

    try {
      const newInfo = await electronAPI.selectIP(ip)
      setConnectionInfo(prev => ({ ...prev, ...newInfo }))
      return newInfo
    } catch (error) {
      console.error('Error selecting IP:', error)
      return null
    }
  }, [])

  // Send command to mobile
  const sendToMobile = useCallback((command, data = {}) => {
    if (!electronAPI) return
    electronAPI.sendToMobile({ type: command, ...data })
  }, [])

  // Clean window controls
  const openCleanWindow = useCallback(async () => {
    if (!electronAPI) return false
    return await electronAPI.openCleanWindow()
  }, [])

  const closeCleanWindow = useCallback(async () => {
    if (!electronAPI) return false
    return await electronAPI.closeCleanWindow()
  }, [])

  const isCleanWindowOpen = useCallback(async () => {
    if (!electronAPI) return false
    return await electronAPI.isCleanWindowOpen()
  }, [])

  // Virtual camera controls
  const vcamDetectDrivers = useCallback(async () => {
    if (!electronAPI) return []
    return await electronAPI.vcamDetectDrivers()
  }, [])

  const vcamInstallDriver = useCallback(async () => {
    if (!electronAPI) return { success: false }
    return await electronAPI.vcamInstallDriver()
  }, [])

  // Start the virtual camera AND begin forwarding phone frames to it.
  const startVirtualCam = useCallback(async (options) => {
    if (!electronAPI) return { success: false, message: 'electronAPI indisponível' }
    const res = await electronAPI.vcamStart(options)
    if (res?.success) {
      vcamActiveRef.current = true
      setVcamRunning(true)
    }
    return res
  }, [])

  const stopVirtualCam = useCallback(async () => {
    if (!electronAPI) return { success: false }
    vcamActiveRef.current = false
    setVcamRunning(false)
    return await electronAPI.vcamStop()
  }, [])

  // Set up event listeners
  useEffect(() => {
    if (!electronAPI) return

    // Handle video frames
    const handleVideoFrame = (frameData) => {
      setCurrentFrame(`data:image/jpeg;base64,${frameData}`)
      setFrameCount(prev => prev + 1)
      // Forward the raw base64 JPEG to the virtual camera when it is active.
      if (vcamActiveRef.current && electronAPI.vcamSendFrame) {
        electronAPI.vcamSendFrame(frameData)
      }
    }

    // Handle control messages
    const handleControlMessage = (message) => {
      if (message.type === 'resolution') {
        setResolution({ width: message.width, height: message.height })
      }
    }

    // Handle client connected
    const handleClientConnected = (data) => {
      setIsConnected(true)
      setConnectedDevices(data.totalClients)
    }

    // Handle client disconnected
    const handleClientDisconnected = (data) => {
      setConnectedDevices(data.totalClients)
      if (data.totalClients === 0) {
        setIsConnected(false)
        setCurrentFrame(null)
        setResolution(null)
      }
    }

    electronAPI.onVideoFrame(handleVideoFrame)
    electronAPI.onControlMessage(handleControlMessage)
    electronAPI.onClientConnected(handleClientConnected)
    electronAPI.onClientDisconnected(handleClientDisconnected)

    // Load initial data
    loadConnectionInfo()

    // Cleanup
    return () => {
      if (electronAPI.removeAllListeners) {
        electronAPI.removeAllListeners('video-frame')
        electronAPI.removeAllListeners('control-message')
        electronAPI.removeAllListeners('client-connected')
        electronAPI.removeAllListeners('client-disconnected')
      }
    }
  }, [loadConnectionInfo])

  // FPS calculation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastFpsUpdate
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed))
        setFrameCount(0)
        setLastFpsUpdate(now)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [frameCount, lastFpsUpdate])

  return {
    isConnected,
    connectedDevices,
    connectionInfo,
    serverStatus,
    currentFrame,
    resolution,
    fps,
    loadConnectionInfo,
    selectIP,
    sendToMobile,
    openCleanWindow,
    closeCleanWindow,
    isCleanWindowOpen,
    vcamDetectDrivers,
    vcamInstallDriver,
    vcamRunning,
    startVirtualCam,
    stopVirtualCam,
  }
}
