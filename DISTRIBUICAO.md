# Phone Webcam — Guia de Distribuição

Use a câmera do celular como webcam no PC (Zoom, Meet, Teams, Discord…) via WiFi.
São **dois apps**: um no **PC (Linux)** e um no **celular (Android)**. Abre os dois,
escaneia o QR e usa.

---

## 1. PC — Linux (.deb, "instala e funciona")

O pacote `.deb` **já resolve tudo sozinho**: instala o driver de webcam virtual
(`v4l2loopback`) e configura o dispositivo `/dev/video10`. Sem passos manuais.

```bash
sudo apt install ./phone-webcam_2.0.0_amd64.deb
```

> Em distros baseadas em Debian/Ubuntu/Mint. O `apt` baixa e compila o
> `v4l2loopback-dkms` automaticamente (é dependência declarada) e o script de
> pós-instalação cria o `/dev/video10` com as opções corretas (inclusive no boot).

Depois é só abrir **Phone Webcam** pelo menu de aplicativos.

### Requisitos que o .deb cobre automaticamente
- `v4l2loopback-dkms` (driver de câmera virtual) — instalado como dependência.
- `/etc/modprobe.d/phone-webcam.conf` → `exclusive_caps=1` (obrigatório p/ Chrome).
- Regra `udev` → `/dev/video10` sempre gravável.
- Autoload do módulo no boot.

### Se algo falhar (raro)
```bash
sudo apt install --reinstall v4l2loopback-dkms
sudo modprobe v4l2loopback
```

---

## 2. Celular — Android (APK)

Instale o `app-debug.apk` (Configurações → permitir "instalar de fontes
desconhecidas" ao abrir o arquivo).

Fluxo de uso:
1. Abra **Phone Webcam** no celular.
2. Toque em **Escanear QR Code** e aponte para o QR mostrado no app do PC
   (ou digite o IP que aparece nele).
3. Permita o acesso à câmera.
4. O vídeo começa a transmitir para o PC.

> O app conecta direto no PC via `ws://<ip>:8445` (rede local). Não precisa de
> certificado nem de navegador.

---

## 3. Usar como webcam no PC

1. No app do PC, com o celular conectado, clique em **Iniciar Webcam Virtual**.
2. No Zoom/Meet/Teams/Discord, selecione a câmera **"Phone Webcam"**.
   - Se o app de vídeo já estava aberto, recarregue a página (F5) para ele
     detectar a câmera nova.

---

## Portas usadas (rede local)
| Porta | Uso |
|------:|-----|
| 8080  | HTTP (redirect) |
| 8443  | HTTPS (página mobile p/ navegador) |
| 8444  | WSS (streaming p/ navegador) |
| 8445  | WS puro (streaming p/ app Android) |

Libere-as no firewall se o celular não conectar. PC e celular devem estar na
**mesma rede WiFi**.

---

## Para desenvolvedores — como gerar os pacotes

```bash
# PC (.deb + AppImage)
npm run build:linux          # gera dist/phone-webcam_2.0.0_amd64.deb e .AppImage

# Android (.apk)
cd mobile-app
npx cap sync android
cd android && ./gradlew assembleDebug
# APK em: mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Requisitos de build Android: JDK 17+ e Android SDK (platform 34/35 + build-tools).
