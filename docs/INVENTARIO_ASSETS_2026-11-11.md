# Inventário de assets e direitos — 11/11/2026

## Base auditada
- 3.267 arquivos em public/assets, distribuídos por muitos diretórios.
- Grupo Sprout Lands - Sprites - premium pack: 247 arquivos. A licença versionada autoriza projetos/jogos com a arte, mas **não a redistribuição isolada do pack** nem treinamento de IA.
- Outros grupos volumosos: Objects (755), assets_premium_preview (706), Character (324), Enemies (181), Sprout Sorry pack (127), UI (100). A origem e licença individual dos demais diretórios **ainda não estão comprovadas**.
- skills-lock.json: 83 habilidades importadas de terceiros; não as apresentar como autorais.

## Verificação automática
Execute: node tools/audit-assets.cjs e npm run test:assets.

A verificação recusa imagens, áudio, fontes, arquivos compactados e executáveis dentro do pacote marketplace/; verifica a presença da atribuição e licença Sprout Lands e informa grupos de assets para revisão.

## Regra de exclusão
A ausência de um caminho literal no JavaScript **não prova** que o arquivo está sem uso. O jogo monta caminhos dinamicamente e possui spritesheets e saves antigos. Não excluir assets em lote sem:
1. Revisar fontes/licença e confirmar quais arquivos pertencem ao jogo e quais ao pack original.
2. Registrar quais assets são copiados para o artefato GitHub Pages e quais são carregados dinamicamente.
3. Validar screenshots desktop e mobile, novas partidas e saves existentes.
4. Criar backup do diretório e registrar lista explícita antes de qualquer exclusão.

O GitHub Pages já prepara um artefato seletivo, mas o repositório público ainda pode incluir pacotes originais; regularização dos arquivos e eventual limpeza do histórico público exige revisão específica. Não é correto declarar a licença regularizada sem essa etapa.

## Preparação para venda
A habilidade colony-worker-ai não inclui arte nem pacotes de terceiros. Ainda falta definir licença comercial, suporte e condições de distribuição antes do anúncio na Agensi. Nenhuma venda foi ativada.
