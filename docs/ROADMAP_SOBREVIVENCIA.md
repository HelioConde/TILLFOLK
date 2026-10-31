# Roadmap de sobrevivência — TILLFOLK
**Prioridades do jogo, por dependência | 31/10/2026**

**Documento de produto:** [GDD_TILLFOLK.md](./GDD_TILLFOLK.md). Este arquivo lista entregas **a fazer**. A existência de uma etapa na tabela NÃO significa que a mecânica já está implementada.

## Diagnóstico do protótipo

O TILLFOLK já tem estrutura de simulação em tempo acelerado, dois colonos iniciais, trabalho por ordem e prioridade, características positivas/negativas, mundo procedural e biomas, agricultura/colheita, Work Station, ferramentas, casas e save no navegador.

**Falha central de design atual:** `src/game.js` reduz `state.food` uma vez por dia no modo Sobrevivência, mas os colonos não têm fome/saúde pessoais nem morrem. Assim, **faltar comida não provoca derrota** e a decisão de manter a população alimentada ainda não sustenta o jogo.

A implementação deve preservar a regra: o jogador designa trabalhos; a IA escolhe as tarefas permitidas. **Todo personagem pode trabalhar em qualquer categoria não proibida por seus traços**, com bônus maior para perfis mais especializados.

## Etapas em ordem obrigatória

| Marco | Prioridade | Escopo | Aceite verificável |
| --- | --- | --- | --- |
| S0. Integridade da base | P0 | Auditoria de save, ordens, inventário e ferramentas; estado atual/testes | Recarregar ou acelerar não duplica tarefas/itens; testes no Pages |
| S1. Necessidade de comida individual | **P0** | Fome por colono, refeições, consumo real do estoque, priorização de alimentação | Dois colonos consomem comida e têm indicador individual; nenhum recurso negativo |
| S2. Dano, morte e derrota | **P0** | Estados fome → fraqueza → dano → morte; remoção segura de ordens/equipamento; game over sem colonos | Falta prolongada de comida mata gradualmente; alertas antes; save íntegro |
| S3. HUD de sobrevivência | **P0** | População viva, comida, consumo/dia, dias restantes, fome, alertas e tarefas travadas | Jogador percebe a crise antes de perder colono; desktop/mobile |
| S4. Economia e agricultura balanceadas | **P0** | 19 cultivos com ciclos/rendimento/água diferentes, reposição de sementes, produção e consumo por dia | Colônia pode ser alimentada de forma sustentável, mas não infinita sem esforço |
| S5. Moradia e crescimento populacional | **P0** | Cabanas com vagas, atribuição, contratação limitada a vagas e suprimentos; custo de novos colonos | 2→3 trabalhadores exige casa nova e aumenta consumo de comida |
| S6. Expansão com recompensa | **P0** | Travessia da passagem, recursos por bioma, obstáculos e distância de transporte | Recurso de nova etapa inacessível antes de abrir passagem; trabalhador o coleta de fato |
| S7. Logística física | P1 | Depósito, capacidade, transporte de materiais, reserva por tarefa, prioridade de emergência | Obra não recebe madeira de longe sem entrega; sem dupla retirada do mesmo item |
| S8. Sono, energia e rotina | P1 | Necessidade de descanso, camas/abrigo, rotina, exaustão e penalidades | Colonos descansam, recuperam energia e trabalham mais devagar cansados |
| S9. Saúde e água potável | P1 | Higiene, água para pessoas, doenças/ferimentos, recuperação/cuidado | Falta de recurso de saúde causa consequência com chance de intervenção |
| S10. Fabricação e cadeia de produção | P1 | Cozinha, conservação, tecnologia de materiais, novas estações, melhoria de ferramentas | Obtenção de alimentos/itens passa por cadeias com custos e tempos verificáveis |
| S11. IA avançada por perfil | P1 | Alocação baseada em especialidade, urgência fisiológica, distância, perigos e limites pessoais | Especialista prioriza trabalho afim; não viola traços negativos; autonomia estável |
| S12. Sobrevivência ambiental | P2 | Clima/temperatura, solo, água contaminada, perigos de regiões; proteger construções | Eventos oferecem antecipação, decisão e resposta, sem punição arbitrária |
| S13. Aprofundamento | P2 | Pesquisa, eventos, relações entre colonos, múltiplos biomas úteis, objetivos de campanha | Cada sistema adiciona escolhas, não apenas barras decorativas |
| S14. Polimento e release | Contínuo | Animações de tarefas, áudio, acessibilidade, tutorial, saves, mobile, screenshots, testes | Zero erro crítico/404; produto consistente no GitHub Pages |

## Lote de implementação sugerido (primeira versão verdadeiramente sobrevivência)

**Entrega A: sobrevida diária** (S0–S3). Começar por testes que reproduzam fome, alimentação e morte, depois criar o estado por trabalhador e HUD. Não alterar sprites antes de existir gameplay testável.

**Entrega B: abastecimento** (S4). Dar dados específicos a cada cultura (`growthTime`, `waterNeed`, `foodYield`, `seedYield`) e rever relação tempo de simulação × consumo. Criar casos de teste de déficit e superávit alimentar.

**Entrega C: crescimento** (S5–S6). Demonstrar que a contratação exige vaga habitável, aumenta a demanda e faz valer a pena conquistar um novo bioma com materiais importantes.

**Entrega D: evolução ONI-like** (S7–S11). Tornar logística, descanso, saúde e cadeias produtivas problemas reais de prioridade e distância.

## Requisitos técnicos e de UX por etapa

1. **Compatibilidade de saves:** versões/migração idempotente, não zerar a partida; backup antes de alterações estruturais.
2. **Testabilidade:** simular tempo sem depender de FPS; cenários determinísticos para fome e morte; não inserir execução automática de ordens agrícolas.
3. **Economia fechada:** nenhum recurso criado do nada, salvo fontes explicitamente definidas (colheitas, regeneração de mundo, extração). Consumos atômicos e reservas claras.
4. **Salvamento local:** toda necessidade de colono, fila, corpo/efeito de falecimento, construções, recursos e fronteira do mapa devem persistir.
5. **UX de crise:** aviso de fome antes de dano; motivo de bloqueio; indicação da pessoa afetada; navegação até ela no mapa.
6. **Mobile e PC:** testes visuais em 390×844 e 1366×768/1600×900; suporte a teclado/mouse/toque sem perder comandos.
7. **Balanceamento:** jogar cenários reais com 2, 3 e 5 colonos, baixa/alta especialização e diferentes tipos de cultivo; nunca aprovar uma nova necessidade sem fonte de reposição possível.

## Não desenvolver fora de ordem

- Não priorizar decoração ou novas variedades gráficas enquanto **comida zerada não traz consequência e HUD legível**.
- Não adicionar gases ou temperatura complexa antes de fome, moradia e logística funcionarem.
- Não adicionar habitantes infinitos sem custo alimentar e moradia.
- Não fazer personagem exclusivo de uma profissão: especialização altera eficiência/prioridade; somente traço negativo impede função.
- Não mudar receita/tempo com base em documento antigo sem conferir os valores atuais em `src/crafting.js`, `src/game.js` e `src/task-orders.js`.

## Critério de "já é um jogo de sobrevivência"

Uma partida real deve permitir **vencer o desafio inicial** estabelecendo comida sustentável e aumentando a população, mas **perder por não alimentar os colonos**. O jogador consegue identificar a causa, corrigir a escassez por ordens e explorar outro território para manter a vila crescendo.

**Links:** [GDD](./GDD_TILLFOLK.md) · [Roadmap visual/QA](./ROADMAP_VISUAL.md) · [Colônia do protótipo](./COLONIA_SUSTENTAVEL.md).
