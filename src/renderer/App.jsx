import React, { useState, useCallback, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Smartphone,
  Wifi,
  Camera,
  Settings,
  Maximize,
  Download,
  FlipHorizontal,
  RotateCw,
  RefreshCw,
  Zap,
  Monitor,
  Video,
  Copy,
  Check,
  ChevronDown,
  CircleDot,
  Info,
  ExternalLink,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { useElectron } from '@/hooks/useElectron'
import { cn } from '@/lib/utils'

// Video Preview Component
function VideoPreview({ frame, isMirrored, rotation, onSnapshot }) {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  const getRotationClass = () => {
    const classes = []
    if (isMirrored) classes.push('mirrored')
    if (rotation === 90) classes.push('rotate-90')
    if (rotation === 180) classes.push('rotate-180')
    if (rotation === 270) classes.push('rotate-270')
    return classes.join(' ')
  }

  const handleSnapshot = useCallback(() => {
    if (!imgRef.current || !frame) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    if (isMirrored) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(img, 0, 0)

    const link = document.createElement('a')
    link.download = `snapshot_${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()

    onSnapshot?.()
  }, [frame, isMirrored, onSnapshot])

  if (!frame) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
        <Camera className="w-20 h-20 mb-4 opacity-20" />
        <p className="text-lg font-medium">Nenhuma câmera conectada</p>
        <p className="text-sm text-muted-foreground/70">Escaneie o QR code com seu celular</p>
      </div>
    )
  }

  return (
    <>
      <img
        ref={imgRef}
        src={frame}
        alt="Camera Preview"
        className={cn("video-preview", getRotationClass())}
      />
      <canvas ref={canvasRef} className="hidden" />
    </>
  )
}

// Connection Panel Component
function ConnectionPanel({ connectionInfo, serverStatus, onSelectIP }) {
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      addToast('URL copiada!', 'success')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [addToast])

  const selectedIP = serverStatus?.localIP
  const allIPs = serverStatus?.allIPs || []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="w-4 h-4" />
          Conectar Celular
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          {connectionInfo?.qrDataUrl ? (
            <div className="p-3 bg-white rounded-lg">
              <img src={connectionInfo.qrDataUrl} alt="QR Code" className="w-40 h-40" />
            </div>
          ) : (
            <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Escaneie com a câmera do celular
          </p>
        </div>

        <Separator />

        {/* Network Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            Interface de Rede
          </label>
          <Select value={selectedIP} onValueChange={onSelectIP}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecionar interface" />
            </SelectTrigger>
            <SelectContent>
              {allIPs.map((net) => (
                <SelectItem key={net.address} value={net.address}>
                  {net.name} - {net.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Connection Info */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Conexão Manual</label>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <code className="text-xs flex-1 truncate">{connectionInfo?.url || '-'}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => copyToClipboard(connectionInfo?.url)}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/50 rounded-md">
              <span className="text-muted-foreground">HTTPS:</span>
              <span className="ml-1 font-mono">{serverStatus?.httpsPort}</span>
            </div>
            <div className="p-2 bg-muted/50 rounded-md">
              <span className="text-muted-foreground">WSS:</span>
              <span className="ml-1 font-mono">{serverStatus?.wsPort}</span>
            </div>
          </div>
        </div>

        {/* SSL Hint */}
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <p className="text-xs text-amber-500">
            <Info className="w-3 h-3 inline mr-1" />
            No celular, aceite o certificado SSL clicando em "Avançado" → "Continuar"
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Camera Controls Component
function CameraControls({ onSendToMobile, quality, setQuality, aspectRatio, setAspectRatio, rotation, setRotation }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4" />
          Controles da Câmera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSendToMobile('switchCamera')}
            className="h-9"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Trocar Câmera
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSendToMobile('toggleFlash')}
            className="h-9"
          >
            <Zap className="w-4 h-4 mr-2" />
            Flash
          </Button>
        </div>

        <Separator />

        {/* Quality */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Qualidade</label>
          <Select value={quality} onValueChange={(v) => {
            setQuality(v)
            onSendToMobile('setQuality', { quality: v })
          }}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa (480p)</SelectItem>
              <SelectItem value="medium">Média (720p)</SelectItem>
              <SelectItem value="high">Alta (1080p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Proporção</label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automático</SelectItem>
              <SelectItem value="16-9">16:9 (Widescreen)</SelectItem>
              <SelectItem value="4-3">4:3 (Clássico)</SelectItem>
              <SelectItem value="1-1">1:1 (Quadrado)</SelectItem>
              <SelectItem value="9-16">9:16 (Retrato)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Rotação</label>
          <Select value={String(rotation)} onValueChange={(v) => setRotation(Number(v))}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0° (Normal)</SelectItem>
              <SelectItem value="90">90° (Direita)</SelectItem>
              <SelectItem value="180">180° (Invertido)</SelectItem>
              <SelectItem value="270">270° (Esquerda)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// Virtual Camera Component
function VirtualCameraPanel({ vcamDetectDrivers, vcamInstallDriver, openCleanWindow, vcamRunning, startVirtualCam, stopVirtualCam, resolution, isConnected }) {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [cleanWindowOpen, setCleanWindowOpen] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    const detect = async () => {
      setLoading(true)
      const detected = await vcamDetectDrivers()
      setDrivers(detected)
      setLoading(false)
    }
    detect()
  }, [vcamDetectDrivers])

  const handleInstall = async () => {
    const result = await vcamInstallDriver()
    addToast(result.message, result.success ? 'success' : 'warning')
    if (result.success) {
      const detected = await vcamDetectDrivers()
      setDrivers(detected)
    }
  }

  const handleCleanWindow = async () => {
    await openCleanWindow()
    setCleanWindowOpen(true)
    addToast('Janela limpa aberta - capture com OBS', 'success')
  }

  const handleToggleVirtualCam = async () => {
    setBusy(true)
    try {
      if (vcamRunning) {
        await stopVirtualCam()
        addToast('Webcam virtual parada', 'success')
      } else {
        const res = await startVirtualCam({
          driverId: drivers[0],
          width: resolution?.width || 1280,
          height: resolution?.height || 720,
          fps: 30,
        })
        addToast(res?.message || 'Erro', res?.success ? 'success' : 'warning')
      }
    } finally {
      setBusy(false)
    }
  }

  const isWindows = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('win')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="w-4 h-4" />
          Webcam Virtual
        </CardTitle>
        <CardDescription>
          Use a câmera do celular em Zoom, Meet, Teams, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <div className={cn(
            "w-2 h-2 rounded-full",
            loading ? "bg-amber-500 animate-pulse" :
            drivers.length > 0 ? "bg-green-500 glow-success" : "bg-red-500"
          )} />
          <span className="text-sm">
            {loading ? 'Verificando drivers...' :
             drivers.length > 0 ? `${drivers.length} driver(s) encontrado(s)` : 'Nenhum driver encontrado'}
          </span>
        </div>

        {/* Drivers List */}
        {drivers.length > 0 && (
          <div className="space-y-2">
            {drivers.map((driver, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-primary/20">
                <Video className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1">{driver.name}</span>
                <Badge variant="success" className="text-xs">Instalado</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Instructions or Install */}
        {drivers.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Instale o OBS Studio para obter o OBS Virtual Camera.
            </p>
            <Button variant="warning" className="w-full" onClick={handleInstall}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Baixar OBS Studio
            </Button>
          </div>
        )}

        {drivers.length > 0 && isWindows && (
          <div className="p-3 bg-primary/10 rounded-md space-y-2">
            <p className="text-xs font-medium">Para usar como webcam:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o OBS Studio</li>
              <li>Vá em <strong>Ferramentas → Iniciar Câmera Virtual</strong></li>
              <li>Clique em "Janela Limpa" abaixo</li>
              <li>No OBS, adicione Captura de Janela</li>
              <li>Em outros apps, selecione "OBS Virtual Camera"</li>
            </ol>
          </div>
        )}

        {/* Direct virtual camera feed (Linux/macOS) */}
        {drivers.length > 0 && !isWindows && (
          <>
            <Button
              variant={vcamRunning ? 'destructive' : 'default'}
              className="w-full glow-primary"
              onClick={handleToggleVirtualCam}
              disabled={busy || (!vcamRunning && !isConnected)}
            >
              <Video className="w-4 h-4 mr-2" />
              {busy ? 'Aguarde...' : vcamRunning ? 'Parar Webcam Virtual' : 'Iniciar Webcam Virtual'}
            </Button>

            {!vcamRunning && !isConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Conecte o celular primeiro para iniciar.
              </p>
            )}

            {vcamRunning && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md space-y-1">
                <p className="text-xs font-medium text-green-500 flex items-center gap-1">
                  <CircleDot className="w-3 h-3" /> Transmitindo para a webcam virtual
                </p>
                <p className="text-xs text-muted-foreground">
                  No Zoom/Meet/Teams selecione a câmera <strong>"Phone Webcam"</strong>.
                  Se já estava aberto, recarregue a página.
                </p>
              </div>
            )}
          </>
        )}

        <Separator />

        {/* Clean Window Button (OBS capture — útil no Windows) */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleCleanWindow}
        >
          <Monitor className="w-4 h-4 mr-2" />
          Abrir Janela Limpa
        </Button>
      </CardContent>
    </Card>
  )
}

// Status Bar Component
function StatusBar({ isConnected, connectedDevices, fps, resolution }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card border-b">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500 glow-success animate-pulse-glow" : "bg-amber-500"
        )} />
        <span className="text-sm">
          {isConnected ? `${connectedDevices} conectado(s)` : 'Aguardando conexão...'}
        </span>
      </div>

      {isConnected && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <Badge variant="secondary" className="font-mono text-xs">
            {fps} FPS
          </Badge>
          {resolution && (
            <Badge variant="secondary" className="font-mono text-xs">
              {resolution.width}×{resolution.height}
            </Badge>
          )}
        </>
      )}
    </div>
  )
}

// Main App Component
function AppContent() {
  const {
    isConnected,
    connectedDevices,
    connectionInfo,
    serverStatus,
    currentFrame,
    resolution,
    fps,
    selectIP,
    sendToMobile,
    openCleanWindow,
    vcamDetectDrivers,
    vcamInstallDriver,
    vcamRunning,
    startVirtualCam,
    stopVirtualCam,
  } = useElectron()

  const { addToast } = useToast()

  // Local state
  const [isMirrored, setIsMirrored] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [quality, setQuality] = useState('medium')
  const [aspectRatio, setAspectRatio] = useState('auto')

  // Video container ref for fullscreen
  const videoContainerRef = useRef(null)

  // Handle IP selection
  const handleSelectIP = useCallback(async (ip) => {
    const result = await selectIP(ip)
    if (result) {
      addToast(`IP alterado para ${ip}. Reinicie o app para aplicar.`, 'warning')
    }
  }, [selectIP, addToast])

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  // Handle rotation
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
    addToast(`Rotação: ${(rotation + 90) % 360}°`)
  }, [rotation, addToast])

  // Handle mirror
  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev)
    addToast(isMirrored ? 'Normal' : 'Espelhado')
  }, [isMirrored, addToast])

  // Handle snapshot
  const handleSnapshot = useCallback(() => {
    addToast('Foto salva!', 'success')
  }, [addToast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case 'f':
          toggleFullscreen()
          break
        case 's':
          // Trigger snapshot from video preview
          break
        case 'm':
          toggleMirror()
          break
        case 'r':
          handleRotate()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen, toggleMirror, handleRotate])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Phone Webcam
        </h1>
        <StatusBar
          isConnected={isConnected}
          connectedDevices={connectedDevices}
          fps={fps}
          resolution={resolution}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Video Container */}
          <div
            ref={videoContainerRef}
            className="flex-1 bg-black/50 rounded-lg border flex items-center justify-center overflow-hidden"
          >
            <VideoPreview
              frame={currentFrame}
              isMirrored={isMirrored}
              rotation={rotation}
              onSnapshot={handleSnapshot}
            />
          </div>

          {/* Video Controls */}
          <div className="flex items-center justify-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={toggleFullscreen}>
                    <Maximize className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tela cheia (F)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={handleSnapshot} disabled={!currentFrame}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Capturar foto (S)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMirrored ? "default" : "secondary"}
                    size="icon"
                    onClick={toggleMirror}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Espelhar (M)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={handleRotate}>
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotacionar (R)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Side Panel */}
        <aside className="w-80 flex flex-col gap-4 overflow-y-auto">
          <ConnectionPanel
            connectionInfo={connectionInfo}
            serverStatus={serverStatus}
            onSelectIP={handleSelectIP}
          />

          <CameraControls
            onSendToMobile={sendToMobile}
            quality={quality}
            setQuality={setQuality}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            rotation={rotation}
            setRotation={setRotation}
          />

          <VirtualCameraPanel
            vcamDetectDrivers={vcamDetectDrivers}
            vcamInstallDriver={vcamInstallDriver}
            openCleanWindow={openCleanWindow}
            vcamRunning={vcamRunning}
            startVirtualCam={startVirtualCam}
            stopVirtualCam={stopVirtualCam}
            resolution={resolution}
            isConnected={isConnected}
          />
        </aside>
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 text-center text-xs text-muted-foreground border-t">
        Certifique-se de que o celular e o PC estão na mesma rede WiFi
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </ToastProvider>
  )
}
