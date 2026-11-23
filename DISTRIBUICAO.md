# Phone Webcam — Guia de Distribuição

Use a câmera do celular como webcam no PC (Zoom, Meet, Teams, Discord…) via
WiFi. São **dois apps**: um no **PC** e um no **celular (Android)**. Abre os
dois, escaneia o QR e usa.

- 🌐 Landing page com os downloads: <https://in100tiva.github.io/webcam/>
- 📦 Todos os instaladores: <https://github.com/in100tiva/webcam/releases/latest>
- 📖 Visão geral do projeto: [README.md](README.md)

---

## 1. O que baixar

| Plataforma | Arquivo do release | Observação |
|---|---|---|
| 🐧 Linux (Debian/Ubuntu/Mint) | `PhoneWebcam-linux.deb` | **instala e funciona**: configura o driver sozinho |
| 🐧 Linux (qualquer distro) | `PhoneWebcam-linux.AppImage` | rode com `chmod +x` e execute |
| 🪟 Windows 10/11 (64-bit) | `PhoneWebcam-windows.exe` | instalador NSIS; combine com o **OBS Virtual Camera** |
| 🤖 Android | `PhoneWebcam-android.apk` | permita "instalar de fontes desconhecidas" |

> Os instaladores não têm assinatura comercial. No Windows o SmartScreen pode
> avisar; no `apt` pode aparecer um alerta de origem. Baixe apenas da página
> oficial de Releases e confira o nome do arquivo.

---

## 2. PC — Linux (.deb, "instala e funciona")

O pacote `.deb` **já resolve tudo sozinho**: instala o driver de webcam virtual
(`v4l2loopback`) e configura o dispositivo `/dev/video10`. Sem passos manuais.

```bash
sudo apt install ./PhoneWebcam-linux.deb
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

## 3. PC — Linux (AppImage)

Para distros que não usam `apt` (Fedora, Arch, openSUSE…). O AppImage **não**
instala a webcam virtual sozinho: rode `npm run setup:linux` (ou instale o
`v4l2loopback` pela sua distro) antes de usar o botão **Iniciar Webcam Virtual**.

```bash
chmod +x PhoneWebcam-linux.AppImage
./PhoneWebcam-linux.AppImage
```

---

## 4. PC — Windows 10/11

1. Execute `PhoneWebcam-windows.exe` (o SmartScreen pode pedir *Mais
   informações → Executar assim mesmo*).
2. Instale o [OBS Studio](https://obsproject.com/) e deixe a **OBS Virtual
   Camera** ativa — no Windows é ela que fornece a câmera virtual para Meet,
   Zoom e Teams.
3. Abra o Phone Webcam; o vídeo recebido do celular aparece na janela.

---

## 5. Celular — Android (APK)

Instale o `PhoneWebcam-android.apk` (Configurações → permitir "instalar de
fontes desconhecidas" ao abrir o arquivo).

Fluxo de uso:
1. Abra **Phone Webcam** no celular.
2. Toque em **Escanear QR Code** e aponte para o QR mostrado no app do PC
   (ou digite o IP que aparece nele).
3. Permita o acesso à câmera.
4. O vídeo começa a transmitir para o PC.

> O app conecta direto no PC via `ws://<ip>:8445` (rede local). Não precisa de
> certificado nem de navegador.

---

## 6. Usar como webcam no PC

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
npm run build:linux          # gera dist/PhoneWebcam-linux.deb e dist/PhoneWebcam-linux.AppImage

# Windows (.exe)
npm run build:win

# Android (.apk)
cd mobile-app
npx cap sync android
cd android && ./gradlew assembleDebug
# APK em: mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Requisitos de build Android: JDK 17+ e Android SDK (platform 34/35 + build-tools).
O CI (`.github/workflows/release.yml`) refaz esses pacotes quando uma tag `v*`
é enviada.
