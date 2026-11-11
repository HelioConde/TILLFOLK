# Auditoria de publicação, código e habilidades — 11/11/2026

Escopo: análise estática da branch main em 73d4da3. Esta auditoria **não equivale a um playtest** e não aprova a redistribuição de conteúdo de terceiros.

## Situação e medidas

1. **GitHub Actions:** quatro grupos de QA falharam antes dos testes porque Playwright 1.55.0 não suportava Chromium em ubuntu-26.04. Workflows atualizados para Ubuntu 24.04 e instalação a partir do lockfile do projeto (Playwright ^1.64.1). Reexecutar e inspecionar os resultados; não declarar verde sem execução real.
2. **Sobrevivência:** fome, dano, morte e derrota têm lógica no código e testes Node. O README antigo descrevia mortalidade como pendente; essa contradição foi corrigida. Balanceamento S4 não está demonstrado.
3. **Arquitetura:** src/game.js contém cerca de 4.171 linhas. Mantido sem reescrita durante estabilização; modularizar simulação, salvamento, renderização e UI em PRs pequenos com testes, preservando o formato tillfolk-v01.
4. **Performance:** o Canvas do mundo usa 192×120 tiles de 32 px (6.144×3.840). Buffer RGBA de uma camada completa pode ocupar cerca de 90 MiB. O motor já limita o desenho à área visível, mas isso **não reduz o tamanho do buffer**. Antes de diminuir resolução do Canvas, medir FPS/memória, zoom, minimapa, câmera, cliques e saves em aparelhos reais.
5. **CSS/HTML:** diversas folhas de estilo e scripts carregados diretamente, dependentes de ordem. Novo teste de integridade acusa referências locais ausentes ou duplicadas. Consolidar CSS somente após comparar screenshots antes/depois.
6. **Assets:** public/assets tem milhares de arquivos, inclusive sprites premium. O pacote Sprout Lands, de Cup Nooble, pode ser usado em um jogo comercial ou de código aberto conforme a licença versionada, mas o pacote não pode ser revendido/redistribuído isoladamente nem utilizado para treinamento de IA. Não deletar ou redistribuir assets em lote sem confirmar uso e origem.
7. **Skills:** existem oito SKILL.md específicos do TILLFOLK e dezenas de terceiros. skills-lock.json registra 83 origens externas: 78 de gamedev-skills/awesome-gamedev-agent-skills e 5 de outras fontes. Não comercializar textos/código de skills importadas sem revisar suas licenças.
8. **Segurança:** .claude/settings.local.json está versionado, atualmente com configuração de hooks. Não colocar tokens ou segredos nesse arquivo; antes de publicar, revisar o histórico e credenciais por processo apropriado.

## Critérios de aceite para a próxima release

- Todas as ações Playwright executam de fato no Chromium, e não apenas instalam dependências.
- Cenários completos S4 de 2, 3 e 5 colonos, em tempos acelerados, com irrigação, coleta, sementes, consumo e retomada.
- Backup de save anterior testado sem conversão de estoque ou ferramentas grátis.
- Screenshot de desktop e mobile, verificação de 404 e comparação do HUD.
- Conferência de provenance e licença de cada asset a ser publicado ou comercializado.
- Pacote de habilidade de IA independente: sem copiar skills externas, sem sprites premium e com testes reproduzíveis.

**Regra:** não apagar assets que possam estar em saves, nem alterar o contrato do autotile tillfolk-terrain-autotile/v1.

A auditoria foi ampliada com `tools/audit-assets.cjs` e `docs/INVENTARIO_ASSETS_2026-11-11.md`; não exclui conteúdo sem análise de uso/licença.
