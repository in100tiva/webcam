# Phone Webcam

Use a câmera do seu celular como webcam no PC via WiFi usando Electron.js.

## Funcionalidades

- 📹 Streaming de vídeo em tempo real via WebSocket (SSL)
- 📱 QR Code para conexão fácil do celular
- 🔄 Trocar entre câmera frontal e traseira
- ⚡ Controle de flash/lanterna
- 📊 Ajuste de qualidade (480p, 720p, 1080p)
- 📸 Captura de screenshots
- ↔️ Modo espelhado
- 🔃 Rotação de vídeo (0°, 90°, 180°, 270°)
- 📐 Ajuste de proporção (16:9, 4:3, 1:1, 9:16)
- ⛶ Tela cheia
- 🎥 **Webcam Virtual** - Use em Zoom, Meet, Teams, etc.

## Webcam Virtual

O Phone Webcam suporta **webcam virtual** - sua câmera do celular aparece como uma webcam real para outros aplicativos!

### Drivers Suportados

| Plataforma | Driver | Como Instalar |
|------------|--------|---------------|
| Windows | OBS Virtual Camera | Instale o [OBS Studio](https://obsproject.com) |
| Linux | v4l2loopback | `sudo apt install v4l2loopback-dkms` |
| macOS | OBS Virtual Camera | Instale o [OBS Studio](https://obsproject.com) |

### Como Usar a Webcam Virtual

1. Instale o driver apropriado para seu sistema
2. Abra o Phone Webcam e conecte seu celular
3. Na seção "Webcam Virtual", clique em "Iniciar Webcam Virtual"
4. Abra qualquer aplicativo (Zoom, Meet, Teams, Discord, etc.)
5. Selecione "OBS Virtual Camera" como fonte de vídeo

## Requisitos

- Node.js 18+
- NPM ou Yarn
- PC e celular conectados na mesma rede WiFi

## Instalação

### Desenvolvimento

```bash
# Clone o repositório
git clone <repo-url>
cd webcam

# Instale as dependências
npm install

# Execute o aplicativo
npm start
```

### Build do Instalador

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

O instalador será criado na pasta `dist/`.

## Como Usar

### No PC

1. Execute o aplicativo com `npm start`
2. A janela do Phone Webcam será aberta
3. Um QR Code será exibido na tela

### No Celular

1. Conecte o celular na mesma rede WiFi do PC
2. Abra a câmera do celular e escaneie o QR Code
3. **Importante**: Aceite o certificado SSL clicando em "Avançado" > "Continuar"
4. Permita o acesso à câmera quando solicitado
5. O streaming começará automaticamente

## Controles

### Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `F` | Tela cheia |
| `S` | Capturar foto |
| `M` | Espelhar vídeo |
| `R` | Rotacionar 90° |

### Interface

- **Qualidade**: Escolha entre 480p, 720p ou 1080p
- **Proporção**: Auto, 16:9, 4:3, 1:1, ou 9:16
- **Rotação**: 0°, 90°, 180°, 270°
- **Trocar Câmera**: Alterna entre frontal e traseira
- **Flash**: Liga/desliga a lanterna

## Estrutura do Projeto

```
webcam/
├── src/
│   ├── main.js          # Processo principal do Electron
│   ├── preload.js       # Bridge IPC segura
│   ├── virtualcam/      # Módulo de webcam virtual
│   │   └── index.js
│   ├── renderer/        # Interface do PC
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── renderer.js
│   │   └── clean.html   # Janela limpa para OBS
│   └── mobile/          # Página web para o celular
│       └── index.html
├── drivers/             # Drivers de webcam virtual
├── installer/           # Scripts do instalador
├── package.json
└── README.md
```

## Arquitetura

```
+------------------+          WiFi           +------------------+
|     Celular      |  <------------------->  |        PC        |
|                  |                         |                  |
|  Camera API      |    HTTPS (porta 8443)   |  Electron App    |
|  getUserMedia()  |  <------------------->  |  Express Server  |
|                  |                         |                  |
|  WebSocket       |     WSS (porta 8444)    |  WebSocket       |
|  Client (SSL)    |  -------------------->  |  Server (SSL)    |
|                  |    frames JPEG Base64   |                  |
+------------------+                         +------------------+
                                                     |
                                                     v
                                            +------------------+
                                            |  Virtual Camera  |
                                            |  (FFmpeg + Driver)|
                                            +------------------+
                                                     |
                                                     v
                                            +------------------+
                                            |  Zoom, Meet, etc |
                                            +------------------+
```

## Portas Utilizadas

- **8080**: Servidor HTTP (redirecionamento para HTTPS)
- **8443**: Servidor HTTPS (serve a página mobile)
- **8444**: Servidor WebSocket SSL (streaming de vídeo)

## Solução de Problemas

### O celular não conecta

1. Verifique se ambos estão na mesma rede WiFi
2. Selecione a interface de rede correta no PC
3. Desative o "Isolamento de cliente" no roteador (se houver)
4. Verifique se o firewall permite conexões nas portas 8443 e 8444

### Certificado SSL não aceito

1. No celular, ao abrir a URL, clique em "Avançado"
2. Clique em "Continuar para o site" ou "Aceitar o risco"
3. A câmera só funciona em conexões seguras (HTTPS)

### Vídeo com lag

1. Reduza a qualidade do vídeo para 720p ou 480p
2. Use a rede WiFi de 5GHz se disponível
3. Aproxime o celular do roteador

### Webcam virtual não detectada

1. Instale o OBS Studio para obter o OBS Virtual Camera
2. No OBS, vá em Ferramentas > Iniciar Câmera Virtual
3. Reinicie o Phone Webcam
4. O driver será detectado automaticamente

### Vídeo achatado/distorcido

1. Use a opção "Automático" na proporção
2. Ou selecione 9:16 se estiver com o celular na vertical

## Tecnologias

- **Electron** - Framework desktop
- **Express** - Servidor web
- **WebSocket (ws)** - Streaming em tempo real
- **FFmpeg** - Processamento de vídeo
- **QRCode** - Geração de QR codes
- **selfsigned** - Certificados SSL auto-assinados

## Licença

MIT
