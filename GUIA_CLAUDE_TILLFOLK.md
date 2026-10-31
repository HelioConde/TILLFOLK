# Guia rápido do kit de agentes TILLFOLK

## Objetivo do jogo
TILLFOLK é uma sobrevivência de colônia HTML5 com forte referência mecânica em Oxygen Not Included: colonos autônomos, fome com consequências, tarefas dirigidas pelo jogador, produção de recursos, casas para recrutamento, expansão por biomas. Visual Sprout Lands, identidade própria. A referência autoritativa da visão é `docs/GDD_TILLFOLK.md` e o roadmap é `docs/ROADMAP_SOBREVIVENCIA.md`.

## Primeiras tarefas priorizadas
1. Fome individual, alimentação, dano, morte progressiva e tela de derrota.
2. Indicadores de comida, consumo por dia, aviso antecipado e HUD.
3. Balancear agricultura: crescimento, produtividade, sementes, água e consumo.
4. Recrutamento com vagas reais e necessidade de alimentação escalável.
5. Expansão por passagem e recursos exclusivos por bioma.
6. Armazenamento, transporte físico, sono, saúde, tecnologia e ambiente (fases posteriores).

## Como distribuir tarefas
- Direção/GDD: use `game-director` + `survival-designer`.
- IA de colonos: `colonist-ai` + `gameplay-engineer` + `qa-playwright`.
- Sprites errados: `pixel-art-guardian` + `qa-playwright`.
- Salvos quebrados: `release-guardian` + skill `tillfolk-save-compat`.
- Interface: Taste Skill + Guidelines + `tillfolk-design-audit` + QA.

## Instruções do agente
Para cada tarefa: ler documentação → inspecionar estado real → reproduzir bug/teste → implementar → screenshots → testes automatizados → verificar no Pages. Nunca chamar uma feature de concluída só porque o código compila.

## Sugestão de pedido para Claude
"Leia CLAUDE.md, DESIGN.md, docs/GDD_TILLFOLK.md e docs/ROADMAP_SOBREVIVENCIA.md. Planeje e implemente S1 (fome individual) com testes de regressão e Playwright. Use os agentes survival-designer, gameplay-engineer, colonist-ai, qa-playwright e release-guardian. Preserve os saves e publique apenas após validação."

## Para outros jogos
Godot MCP e GdUnit4 só são pertinentes a um diretório que contém `project.godot`. Eles não devem inserir `.godot`, `addons` ou GDScript dentro do TILLFOLK HTML5.

## Origem das skills de terceiros
O instalador acessa fornecedores externos apenas com uma opção explícita. Ver `FONTES_E_LICENCAS.md`. Não confundir uma skill instalada com garantia de funcionamento. Confirme as ferramentas locais e contratos das integrações antes de usar.
