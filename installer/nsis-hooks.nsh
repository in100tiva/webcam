; NSIS Hooks for Phone Webcam Installer
; This script handles virtual camera driver installation

!macro customInstall
  ; Check if OBS Virtual Camera is already installed
  nsExec::ExecToStack 'where ffmpeg'
  Pop $0
  Pop $1

  ; Show info about virtual camera requirements
  MessageBox MB_ICONINFORMATION|MB_OK "Para usar a webcam virtual, voce precisa do OBS Virtual Camera instalado.$\n$\nSe voce ainda nao tem, instale o OBS Studio (gratuito) em:$\nhttps://obsproject.com$\n$\nO OBS Virtual Camera sera detectado automaticamente."
!macroend

!macro customUnInstall
  ; Nothing special to do on uninstall
!macroend
