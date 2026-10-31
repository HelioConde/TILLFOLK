# Tutorial e missões — TILLFOLK
**Revisão de design: 31/10/2026**

> **Propósito:** ensinar o jogador a manter uma colônia viva. A primeira sequência apresenta coleta, fabricação, cultivo e abertura do vale; futuras missões devem introduzir alimentação diária, moradias, recrutamento e riscos de sobrevivência. Referência: [GDD](./GDD_TILLFOLK.md).

## Menu: dois caminhos distintos

- **Como jogar:** guia ilustrado, apenas consulta, não interfere no progresso nem termina missões.
- **Tutorial:** cria uma partida com missões acompanhadas **dentro** do jogo, balões de diálogo, painel de objetivos, detalhes e botão Mostrar no mapa.
- **Nova Fazenda:** também começa com objetivos para orientar quem está iniciando; não é uma sequência de páginas fora do mundo.
- **Continuar:** retoma a mesma colônia, tarefa e estado salvo, sem exibir o menu quando a sessão estava ativa.
- **Voltar ao menu inicial:** oculta o painel de missões; ao retomar, exibe a missão atual.

## Sequência atual do protótipo: 12 missões

O código de referência é `src/missions.js`, não uma lista antiga neste documento.

| # | Evento registrado ao completar trabalho | O que ensina |
|---|---|---|
| 1 | `workstation` | Juntar gravetos e construir a Work Station |
| 2 | `hoe` | Fabricar uma enxada e prepará-la para um colono |
| 3 | `grass` | Marcar e concluir a limpeza de grama alta |
| 4 | `seed` | Encontrar sementes entre os tufos de grama |
| 5 | `till` | Arar solo livre com a ferramenta apropriada |
| 6 | `sow` | Plantar uma cultura em solo preparado |
| 7 | `wateringCan` | Fabricar o regador |
| 8 | `water` | Regar o canteiro |
| 9 | `harvest` | Esperar a plantação amadurecer e colher |
| 10 | `carry` | Transportar comida até o estoque |
| 11 | `axe` | Fabricar um machado comum |
| 12 | `exit` | Cortar o tronco que bloqueia a saída do vale |

**Atenção:** o machado de pedra foi removido. O tronco é cortado com o machado comum. O frame da enxada deve corresponder à enxada real do atlas. Esses itens não são intercambiáveis.

As missões avançam pela **conclusão real do trabalho**, nunca ao clicar apenas em um botão ou enfileirar uma ordem. Eventos obtidos antecipadamente podem ser reconhecidos na progressão; verificar a lógica em `Missions.record`.

## Próximo capítulo: sobrevivência verdadeira [PLANEJADO]

Quando existirem fome individual, saúde e morte, a conclusão do tutorial inicial será o início de um desafio de sobrevivência mais longo, com missões opcionais de acompanhamento:

1. **O jantar é para todos:** produzir comida suficiente para alimentar os habitantes e acompanhar os níveis individuais de fome.
2. **Estoque para amanhã:** estabilizar uma reserva alimentar por mais de um dia de consumo.
3. **Um teto para cada pessoa:** construir novas casas e atribuir os moradores.
4. **Mais braços, mais bocas:** recrutar um colono e aumentar a produção para atender à nova necessidade.
5. **Além da passagem:** buscar um material que só existe depois de desbloquear outra região.
6. **A força de cada um:** definir prioridades diferentes para dois colonos e tirar proveito de uma especialização.

Essas **seis missões adicionais são propostas**, não estão implementadas. Sua liberação depende das mecânicas previstas em [ROADMAP_SOBREVIVENCIA.md](./ROADMAP_SOBREVIVENCIA.md).

## Usabilidade e conclusão

- Passe o mouse ou toque em **Detalhes** para aprender por que uma missão está esperando e qual ferramenta falta.
- **Mostrar no mapa** destaca objetivos reais e pode selecionar a ferramenta adequada, sem concluir ações automaticamente.
- As falas dos trabalhadores devem ser naturais, variadas e situacionais; balões desaparecem depois de um intervalo e não ficam sobre o menu.
- Ao concluir a sequência inicial, apresentar **Continuar jogando** ou **Voltar ao menu inicial**. A colônia e o save permanecem intactos.
- Não usar missões para fornecer comida infinita, eliminar consequências de sobrevivência ou teletransportar materiais.

## QA e arquivos

- Fonte de verdade da progressão: `src/missions.js`; gatilhos de trabalho: `src/game.js`.
- Testes: `tests/tutorial-missions.test.cjs`, `tests/tutorial-flow.spec.cjs`, além de validações de crafting e da passagem do vale.
- Novas missões precisam de testes de save, progresso, cancelamento, bloqueio por ferramenta, mobile e retorno ao menu.
