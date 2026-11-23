# Como contribuir

Obrigado pelo interesse. O Phone Webcam transforma a câmera do celular em
webcam no PC por WiFi, sem nuvem: o vídeo trafega só na sua rede local. Esse
recorte define o que o projeto aceita ou não.

## Antes de abrir algo

| Você quer… | Vá para |
|---|---|
| Reportar uma falha | [Nova issue](https://github.com/in100tiva/webcam/issues/new/choose) (modelo de bug) |
| Sugerir uma funcionalidade | [Nova issue](https://github.com/in100tiva/webcam/issues/new/choose) (modelo de ideia) |
| Tirar dúvida de instalação | [Discussions](https://github.com/in100tiva/webcam/discussions) |
| Reportar falha de segurança | [Relato privado](https://github.com/in100tiva/webcam/security/advisories/new) — nunca em issue pública |

## Ambiente de desenvolvimento

Requisitos: Node.js 18+ e um PC com WiFi. Para a webcam virtual no Linux,
`v4l2loopback-dkms` (o setup instala).

```bash
git clone https://github.com/in100tiva/webcam.git
cd webcam
npm install

# Linux: configura a webcam virtual (uma vez, pede sudo)
npm run setup:linux

# Sobe o Vite + Electron com recarregamento
npm run dev
```

Build dos instaladores:

```bash
npm run build:linux   # .deb + AppImage em dist/
npm run build:win     # NSIS .exe em dist/
npm run build:mac     # .dmg em dist/
```

O app Android fica em `mobile-app/` (Capacitor). Para mexer nele:

```bash
cd mobile-app
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Padrões do projeto

- **Idioma**: código, comentários e documentação em português. Identificadores
  seguem o padrão que já existe no arquivo (evite renomear por gosto).
- **Estilo**: o repositório não tem linter configurado. Mantenha o estilo do
  arquivo que você está editando, com 2 espaços de indentação em JS/JSON/YAML.
- **Escopo**: mudanças de comportamento vêm com README atualizado. Mudança de
  porta, caminho de device ou formato de frame precisa de nota no PR.
- **Privacidade**: nada de telemetria, analytics ou envio de vídeo para fora.
  Se sua ideia depende de servidor externo, ela não entra.
- **Binários**: não comite `node_modules/`, `dist/`, `dist-react/` nem saída do
  Gradle. Instaladores são publicados como anexos de release pela tag.

## Commits e pull requests

- Commits curtos no imperativo, em português: `corrige QR code em tela cheia`.
- Um PR por assunto. PR grande demais é difícil de revisar e demora.
- Preencha o modelo de PR: o que muda, como testar e o checklist.
- Se o PR mexe em `site/`, confira a landing page em tela pequena também.
- CI precisa passar antes da revisão.

O mantenedor responde na ordem de chegada, sem prazo garantido — este é um
projeto mantido por uma pessoa, de graça.

## Licença

Ao contribuir você concorda que sua contribuição é licenciada sob a
[MIT](LICENSE), sem termos adicionais.
