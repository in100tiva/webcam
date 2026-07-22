#!/bin/bash
# postrm do Phone Webcam — limpa a configuração da webcam virtual.
# $1 = "remove" | "purge" | "upgrade" ...
set -e

case "$1" in
  remove|purge)
    echo "[Phone Webcam] Removendo configuração da webcam virtual..."
    rm -f /etc/modprobe.d/phone-webcam.conf
    rm -f /etc/modules-load.d/phone-webcam.conf
    rm -f /etc/udev/rules.d/99-phone-webcam.rules
    udevadm control --reload-rules >/dev/null 2>&1 || true
    modprobe -r v4l2loopback >/dev/null 2>&1 || true
    ;;
esac

exit 0
