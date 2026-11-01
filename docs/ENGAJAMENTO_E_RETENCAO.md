# Engajamento e retenção — TILLFOLK
**Entrega 01/11/2026: mutirões opcionais pós-tutorial.**

## Diagnóstico
A jornada já apresenta o objetivo de longo prazo (colonizar os continentes e construir o foguete), mas ao terminar o tutorial o jogador precisa de metas de curto prazo, com escolha, feedback e progresso claro. Testadores podem parar após fabricar o machado porque a conquista não se conecta visualmente à próxima ação.

## Implementado: mutirões do vale
- O jogador escolhe **um entre até três mutirões** oferecidos após o tutorial. O menu não ocupa a área de gameplay durante o tutorial.
- Cada mutirão exige ordens **de fato concluídas**: cortar árvores, construir uma cabana, plantar, arar, regar, transportar colheita ou organizar recursos.
- **Cortar árvore conta apenas quando o alvo removido era árvore**; limpar grama ou graveto não vale.
- Um mutirão concluído melhora a moral dos trabalhadores vivos em 7–12 pontos, respeitando 100. É uma recompensa de desempenho, nunca comida/material criado gratuitamente.
- O estado é salvo no mesmo `localStorage` do jogo. Mutirões ativos não expiram com o dia; só um prêmio por dia evita repetição artificial de bônus. Novas escolhas após amanhecer.
- Habilidades proibidas e ferramentas disponíveis filtram os mutirões; não há novos comandos automáticos nem backend.
- Cartão responsivo: 3 opções em desktop, opções verticais no celular; atalho para ativar Universal ou Objetos.

## Medir com jogadores
1. No primeiro teste, anotar: etapa do tutorial alcançada, tempo até Work Station, primeira plantação, machado, primeiro mutirão, cabana e se voltou a jogar. Não coletar identificadores pessoais sem consentimento.
2. Rodar teste com 1600×900, 1366×768 e 390×844. Confirmar que o cartão não encobre o mapa e que o tutorial mantém a prioridade.
3. Priorizar depois: indicador contextual do que falta para concluir uma construção; eventos de clima com decisão e aviso antecipado; narrativas de descoberta de regiões; sons opcionais; conquistas cosméticas, sempre sem recompensas manipulativas ou punições artificiais.
4. Validar equilíbrio: recompensa de moral de 7–12 é provisória. O sistema atual já recalcula moral por descanso, abrigo e alimentação; observar se o bônus dura o suficiente para importar sem anular sobrevivência.

## QA
`node --check src/colony-contracts.js`
`node --test tests/colony-contracts.test.cjs`

Esta funcionalidade é complementar à jornada principal de `src/progression.js`, não substitui o GDD nem altera o contrato permanente do autotile.

## Entrega adicional — Conselho do Vale (01/11/2026)
- Depois do tutorial, o primeiro encontro acontece no dia seguinte; os próximos, a cada três dias após uma escolha. Não há prazo nem penalização por não responder.
- O jogador escolhe entre uma ceia coletiva (2 comidas por colono, moral +12, energia +3), lanche de trabalho (1 comida por colono, moral +4, energia +12) e guardar mantimentos (sem custo e sem bônus).
- O jogo bloqueia refeições quando não sobra uma comida por trabalhador. Não existem recursos criados, recompensas ao carregar saves antigos nem escolhas automáticas.
- O painel Vida da colônia mostra previsão baseada no clima real do próximo dia. Aviso compacto aparece apenas quando há decisão disponível; nenhuma caixa modal abre sozinha.
- A decisão persiste no save local, não altera skills, coleta física, ordens, construções, autotile nem tarefas do jogador.
- Regressão: `node --test tests/colony-council.test.cjs`.
