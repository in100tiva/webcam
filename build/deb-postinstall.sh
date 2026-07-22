#!/bin/bash
# postinst do Phone Webcam — configura a webcam virtual (v4l2loopback).
# Roda como root durante `apt install`. v4l2loopback-dkms já foi instalado
# (é Depends), então o módulo compila/carrega aqui sem intervenção do usuário.
set -e

echo "[Phone Webcam] Configurando webcam virtual (v4l2loopback)..."

# 1) Opções do módulo — exclusive_caps=1 é OBRIGATÓRIO para o Chrome enxergar.
cat > /etc/modprobe.d/phone-webcam.conf <<'EOF'
options v4l2loopback video_nr=10 card_label="Phone Webcam" exclusive_caps=1 max_width=1920 max_height=1080
EOF

# 2) Auto-carregar no boot.
echo v4l2loopback > /etc/modules-load.d/phone-webcam.conf

# 3) Regra udev — device nasce gravável (0666) sem depender de grupo/re-login.
cat > /etc/udev/rules.d/99-phone-webcam.rules <<'EOF'
KERNEL=="video10", SUBSYSTEM=="video4linux", MODE="0666"
EOF

# 4) Aplicar agora (best-effort — não falhar a instalação se algo não rolar).
udevadm control --reload-rules >/dev/null 2>&1 || true
# recarrega limpo caso já estivesse carregado com opções antigas
modprobe -r v4l2loopback >/dev/null 2>&1 || true
if modprobe v4l2loopback >/dev/null 2>&1; then
  sleep 1
  chmod 666 /dev/video10 >/dev/null 2>&1 || true
  echo "[Phone Webcam] OK — /dev/video10 (Phone Webcam) pronto."
else
  echo "[Phone Webcam] Aviso: não foi possível carregar o módulo agora."
  echo "  Ele será carregado no próximo boot. Se persistir, rode:"
  echo "    sudo apt install --reinstall v4l2loopback-dkms && sudo modprobe v4l2loopback"
fi

exit 0
