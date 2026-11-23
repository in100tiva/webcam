# Changelog

Todas as mudanças relevantes do Phone Webcam estão documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/). As
versões publicadas ficam em
[Releases](https://github.com/in100tiva/webcam/releases).

## [Não publicado]

### Adicionado

- Workflow de CI (`.github/workflows/ci.yml`) para validar o projeto a cada push
  e pull request.
- `.github/CODEOWNERS` para revisão dos arquivos do projeto.
- Atualizações automáticas do Dependabot reagrupadas e limitadas por rodada
  (`.github/dependabot.yml`).

### Alterado

- Pipeline de release (`.github/workflows/release.yml`) reforçado e downloads
  do release corrigidos no `README.md` e em `site/index.html`.
- Print da landing page (`docs/preview.png`) atualizado com os downloads reais.
- Dependências atualizadas: `node-forge` 1.4.0 → 1.4.4,
  `postcss-selector-parser` 6.1.4 → 6.1.6, `follow-redirects` 1.16.0 → 1.16.3,
  `body-parser` 1.20.6 → 1.20.9, `qs` e `express`, `@capacitor/core` e
  `@capacitor/android` 6.2.1 → 6.2.3.

### Removido

- Workflow do OpenSSF Scorecard (`.github/workflows/scorecard.yml`): a imagem
  `gcr.io` não sobe no runner do GitHub Actions.

## [2.0.1] - 2026-11-23

### Adicionado

- Webcam virtual no Linux: device **Phone Webcam** em `/dev/video10` criado pelo
  `v4l2loopback` com `exclusive_caps=1`, e scripts do `.deb` que configuram o
  módulo, a carga no boot e a permissão do device.
- App Android empacotado com Capacitor (`mobile-app/`), com leitura de QR Code,
  e `DISTRIBUICAO.md` com o passo a passo de distribuição.
- Pipeline de release (`.github/workflows/release.yml`) que builda `.deb`,
  `.AppImage`, instalador NSIS `.exe` e `.apk` e publica os artefatos no GitHub
  Release.
- Landing page em `site/`, publicada no GitHub Pages
  (`.github/workflows/pages.yml`) e servida pela Vercel via `vercel.json`.
- Auto-recuperação do device da webcam virtual via `pkexec`, sem precisar de
  terminal.
- Teste de conexão no app Android antes de iniciar o streaming.
- Arquivos de comunidade: `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md` e templates de issue e de pull request.
- Badges e seção TL;DR no `README.md`.
- Documentação de setup da webcam virtual para quem roda a partir do
  código-fonte (`npm run setup:linux`).
- Base de agentes de código (`AGENTS.md` e `.agents/`).

### Alterado

- Streaming com *backpressure* no celular e envio direto do feed para a câmera
  virtual, reduzindo o atraso.
- Preview do PC passou a atualizar por `<img>` imperativo, fora do ciclo de
  renderização do React.

### Corrigido

- Webcam virtual não cai mais no Google Meet quando o celular oscila na rede.
- `ffmpeg` passou a ser desempacotado do `asar`, corrigindo a webcam virtual que
  não iniciava.
- `EADDRINUSE`: instância única do app e porta não-fatal em caso de conflito,
  além do lag no APK.
- APK: liberado `ws://` (mixed content) e adicionado teste de conexão.
- `clean.html` incluído no pacote (a "Janela Limpa" abria preta).
- Site estático servido pela Vercel sem rodar o build do Electron.
- Garantia de um único produtor `ffmpeg`, estabilizando a enumeração do device
  virtual.

### Segurança

- CodeQL e Dependabot habilitados e política de divulgação responsável
  publicada em `SECURITY.md`.

## [2.0.0] - 2026-07-22

### Adicionado

- Aplicativo Electron + Express que serve a página da câmera e recebe o vídeo
  do celular.
- Streaming em tempo real por WebSocket sobre SSL (HTTPS na porta 8443 e WSS na
  8444), com QR Code para parear o celular.
- Seletor de interface de rede para escolher em qual IP o servidor escuta.
- Suporte a webcam virtual com detecção automática de driver (`v4l2loopback` no
  Linux e OBS Virtual Camera no Windows).
- Interface em React com shadcn/ui e ícones Lucide: qualidade 480p/720p/1080p,
  proporção (16:9, 4:3, 1:1, 9:16), rotação 0°/90°/180°/270°, espelhamento, tela
  cheia, troca de câmera, flash e captura de screenshot.
- Instaladores do release: `.deb` (Linux) e `.apk` (Android).

### Alterado

- Otimizações de desempenho no pipeline de vídeo.

### Corrigido

- Relação de aspecto do vídeo passou a usar as dimensões reais da câmera.
- Configuração de SSL do WebSocket para a conexão WSS funcionar corretamente.

## Links

[Não publicado]: https://github.com/in100tiva/webcam/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/in100tiva/webcam/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/in100tiva/webcam/releases/tag/v2.0.0
