#!/bin/bash
# Setup da webcam virtual (v4l2loopback) para quem roda o Phone Webcam
# a partir do código-fonte (git clone + npm start).
#
# Quem instala pelo .deb NÃO precisa disto — o pacote já faz este mesmo
# setup no `apt install` (build/deb-postinstall.sh).
#
# Uso:  npm run setup:linux     (ou)     sudo bash scripts/setup-linux.sh
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Este script precisa de root para carregar o módulo do kernel."
  echo "Reexecutando com sudo..."
  exec sudo bash "$0" "$@"
fi

echo "[Phone Webcam] Configurando webcam virtual (v4l2loopback)..."

# 1) Driver da câmera virtual. Sem ele o Google Meet/Zoom não têm o que listar.
if ! dpkg -s v4l2loopback-dkms >/dev/null 2>&1; then
  echo "  -> instalando v4l2loopback-dkms (compila o módulo, pode demorar 1-2 min)"
  apt-get update -qq || true
  apt-get install -y v4l2loopback-dkms
fi

# 2) Opções do módulo — exclusive_caps=1 é OBRIGATÓRIO para o Chrome enxergar
#    a câmera (com 0 o Chrome ignora o device; o Firefox aceita).
cat > /etc/modprobe.d/phone-webcam.conf <<'EOF'
options v4l2loopback video_nr=10 card_label="Phone Webcam" exclusive_caps=1 max_width=1920 max_height=1080
EOF

# 3) Auto-carregar no boot.
echo v4l2loopback > /etc/modules-load.d/phone-webcam.conf

# 4) Regra udev — o device nasce gravável (0666), sem depender de grupo/re-login.
cat > /etc/udev/rules.d/99-phone-webcam.rules <<'EOF'
KERNEL=="video10", SUBSYSTEM=="video4linux", MODE="0666"
EOF

# 5) Aplicar agora, sem reboot.
udevadm control --reload-rules >/dev/null 2>&1 || true
modprobe -r v4l2loopback >/dev/null 2>&1 || true
if modprobe v4l2loopback >/dev/null 2>&1; then
  sleep 1
  chmod 666 /dev/video10 >/dev/null 2>&1 || true
  NAME=$(cat /sys/class/video4linux/video10/name 2>/dev/null || echo "?")
  echo "[Phone Webcam] OK — /dev/video10 pronto (nome: $NAME)."
  echo "  Agora rode:  npm start"
else
  echo "[Phone Webcam] Falha ao carregar o módulo agora."
  echo "  Tente: sudo apt install --reinstall v4l2loopback-dkms && sudo modprobe v4l2loopback"
  exit 1
fi
