# Auditoria inicial — QA e atribuição de tarefas (02/11/2026)

## Escopo e evidência
- Auditoria de repositório **HelioConde/TILLFOLK** conforme `AGENTS.md`, `CLAUDE.md`, GDD, roadmap e skills locais.
- Referência histórica auditada: workflow visual [run 41386880974](https://github.com/HelioConde/TILLFOLK/actions/runs/41386880974). Resultado daquele run: **50 testes passaram, 40 falharam**. Isso NÃO representa uma reexecução completa da versão atual.
- Distribuição de falhas nesse run: `colony.spec.cjs` 8; `crop-choice.spec.cjs` 1; `crop-workshop.spec.cjs` 1; `house.spec.cjs` 2; `menu.spec.cjs` 13; `orders.spec.cjs` 9; `tutorial-flow.spec.cjs` 1; `visual-refinement.spec.cjs` 5.
- Exemplo concreto de teste obsoleto: `colony.spec.cjs` exigia `s.animals=[]`, mas a versão atual pode gerar fauna selvagem desde a criação do mundo. A regra correta a preservar é **não gerar animais domesticados gratuitamente**.
- A Action de terreno/fauna do PR anterior foi aprovada, mas a suíte visual completa de 41386880974 falhou. Não registrar o conjunto inteiro como aprovado.

## Correções deste PR
1. `tests/colony.spec.cjs`: distinguir fauna selvagem dos animais de criação, mantendo verificação rigorosa de ausência de gado inicial.
2. `src/task-assignment.js`: extrair pontuação pura e testável para as ordens já prontas e aprovadas pelo jogador.
3. `src/game.js`: integrar ordenação determinística das tarefas segundo prioridade manual, preferência individual, especialização, distância, situação de saúde/energia e **urgência alimentar**.
4. Emergência de comida só dá preferência a colher/transportar/regar/semear **ordens existentes**; ela não cria tarefas nem substitui prioridades manuais.
5. `tests/task-assignment.test.cjs`: regressões para fome crítica, prioridade manual, distância, especialização, desempate e imutabilidade.

## Próximas fases obrigatórias do prompt mestre
- Reexecutar o QA visual após estes ajustes, identificar o **primeiro erro real** em cada suíte e separar outros testes historicamente obsoletos de bugs de produto.
- Fazer playtests reais da progressão Work Station → enxada → safra → machado → árvore → cabana, incluindo a mão Catpaw.
- Medir frame time antes de alterar pathfinding ou otimizar o motor. A nova função `score` é pura e não executa busca de caminho extra.
- Acompanhar evolução econômica e somar os resultados de sementes, água, comida e transporte nas simulações para populações 2/3/5.
- Inspecionar arte original em capturas antes de alterar sprites e respeitar o contrato permanente dos nove terrenos.

**Status:** este relatório registra um lote limitado de implementação. As 12 fases do prompt mestre não estão concluídas.
