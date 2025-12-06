# Phone Webcam

Use a camera do seu celular como webcam no PC via WiFi usando Electron.js.

## Funcionalidades

- Streaming de video em tempo real via WebSocket
- QR Code para conexao facil do celular
- Trocar entre camera frontal e traseira
- Controle de flash/lanterna
- Ajuste de qualidade (480p, 720p, 1080p)
- Captura de screenshots
- Modo espelhado
- Tela cheia

## Requisitos

- Node.js 18+
- NPM ou Yarn
- PC e celular conectados na mesma rede WiFi

## Instalacao

```bash
# Clone o repositorio
git clone <repo-url>
cd webcam

# Instale as dependencias
npm install

# Execute o aplicativo
npm start
```

## Como Usar

### No PC

1. Execute o aplicativo com `npm start`
2. A janela do Phone Webcam sera aberta
3. Um QR Code sera exibido na tela

### No Celular

1. Conecte o celular na mesma rede WiFi do PC
2. Abra a camera do celular e escaneie o QR Code
   - Ou digite o URL mostrado na tela no navegador do celular
3. Permita o acesso a camera quando solicitado
4. O streaming comecara automaticamente

## Controles

### No PC

| Tecla | Acao |
|-------|------|
| `F` | Tela cheia |
| `S` | Capturar foto |
| `M` | Espelhar video |

### No Celular

- **Botao de rotacao**: Trocar entre camera frontal/traseira
- **Botao de play/pause**: Iniciar/parar streaming
- **Botao de raio**: Ligar/desligar flash

## Estrutura do Projeto

```
webcam/
├── src/
│   ├── main.js          # Processo principal do Electron
│   ├── preload.js       # Bridge IPC segura
│   ├── renderer/        # Interface do PC
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── renderer.js
│   └── mobile/          # Pagina web para o celular
│       └── index.html
├── package.json
└── README.md
```

## Arquitetura

```
+------------------+          WiFi           +------------------+
|     Celular      |  <------------------->  |        PC        |
|                  |                         |                  |
|  Camera API      |     HTTP (porta 8080)   |  Electron App    |
|  getUserMedia()  |  <------------------->  |  Express Server  |
|                  |                         |                  |
|  WebSocket       |     WS (porta 8081)     |  WebSocket       |
|  Client          |  -------------------->  |  Server          |
|                  |    frames JPEG Base64   |                  |
+------------------+                         +------------------+
```

## Portas Utilizadas

- **8080**: Servidor HTTP (serve a pagina mobile)
- **8081**: Servidor WebSocket (streaming de video)

## Solucao de Problemas

### O celular nao conecta

1. Verifique se ambos estao na mesma rede WiFi
2. Desative o "Isolamento de cliente" no roteador (se houver)
3. Verifique se o firewall do PC permite conexoes nas portas 8080 e 8081

### Video com lag

1. Reduza a qualidade do video nas configuracoes
2. Use a rede WiFi de 5GHz se disponivel
3. Aproxime o celular do roteador

### Camera nao abre no celular

1. Use HTTPS ou localhost (algumas funcoes requerem conexao segura)
2. Permita o acesso a camera nas configuracoes do navegador
3. Tente usar o Chrome no celular

## Proximos Passos

- [ ] Adicionar virtual webcam (v4l2loopback no Linux, OBS Virtual Camera no Windows)
- [ ] Suporte a audio
- [ ] Multiplas cameras simultaneas
- [ ] Gravacao de video
- [ ] Criptografia do stream

## Licenca

MIT
