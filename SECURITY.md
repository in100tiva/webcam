# Política de segurança

## Versões com suporte

| Versão | Suporte |
|--------|---------|
| 2.x | Correções de segurança |
| 1.x e anteriores | Sem suporte — atualize para a 2.x |

As correções saem em uma nova release. Como o app roda na máquina de quem usa,
não existe patch remoto: é necessário baixar a versão corrigida.

## Como relatar uma vulnerabilidade

**Não abra issue pública.** Use o relato privado:

<https://github.com/in100tiva/webcam/security/advisories/new>

Se preferir, escreva para [@in100tiva](https://github.com/in100tiva) por
mensagem privada no GitHub. Inclua, se possível:

- versão do Phone Webcam e sistema do PC (Linux/Windows/macOS);
- o que o atacante consegue fazer e em que condição (mesma rede WiFi? arquivo
  malicioso? instalador?);
- passos para reproduzir, ou prova de conceito;
- impacto que você enxerga.

Confirmação de recebimento em até **5 dias úteis** e retorno sobre a
classificação em até **10 dias úteis**. O prazo para a correção depende da
gravidade; você é avisado a cada etapa e citado no aviso publicado, se quiser.

## Escopo

O código vale o relato quando o problema está em algo deste repositório:

- processo principal e renderer do Electron (`src/`);
- servidor HTTP/HTTPS e WebSocket (portas 8080, 8443 e 8444);
- página servida ao celular (`src/mobile/`);
- scripts de instalador (`build/`, `installer/`, `scripts/`) e o `.deb`;
- app Android em `mobile-app/`;
- workflows de CI em `.github/`.

## Fora de escopo

- **Quem já está na sua rede WiFi.** O app usa certificado auto-assinado e não
  pede senha: o pareamento é por QR Code, dentro da rede local. Alguém com acesso
  à mesma rede (ou com a rede comprometida) consegue alcançar as portas 8443/8444.
  Isso é limitação conhecida do modelo — para uso em rede pública, prefira um
  hotspot do próprio celular ou uma rede confiável.
- **Aceitar o certificado auto-assinado** no celular (aviso "Avançado →
  Continuar") é esperado no primeiro acesso; não é falha.
- Instaladores não assinados com certificado comercial (Windows SmartScreen e
  `apt` podem avisar) — a origem é este repositório e a release oficial.
- Falhas em dependências de terceiros sem impacto demonstrável no app: reporte
  ao projeto de origem, ou aqui se o app for o caminho de exploração.
- Ataques que exigem acesso físico ao PC desbloqueado ou root/administrador.

## Boas práticas para quem usa

- Baixe apenas de <https://github.com/in100tiva/webcam/releases>.
- Confira o nome do arquivo e o checksum publicado na release, quando houver.
- Não abra as portas 8080/8443/8444 no roteador: o app é para a rede local.
- Feche o app quando não estiver usando e mantenha o sistema atualizado.

## Avisos publicados

Ficam em <https://github.com/in100tiva/webcam/security/advisories>. Assine o
repositório (**Watch → Custom → Security alerts**) para ser avisado.
