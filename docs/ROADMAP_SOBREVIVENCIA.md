# Roadmap de sobrevivência — TILLFOLK
**Prioridades do jogo, por dependência | 31/10/2026**

**Documento de produto:** [GDD_TILLFOLK.md](./GDD_TILLFOLK.md). A tabela distingue etapas implementadas das ainda planejadas; status local não significa publicação no GitHub Pages.

## Diagnóstico do protótipo

O TILLFOLK já tem estrutura de simulação em tempo acelerado, dois colonos iniciais, trabalho por ordem e prioridade, características positivas/negativas, mundo procedural e biomas, agricultura/colheita, Work Station, ferramentas, casas e save no navegador.

**Status S0–S3:** necessidades individuais, refeição com consumo real, dano por inanição, morte, derrota persistente e HUD estão implementados. A economia agrícola sustentável continua pendente em S4; portanto, esta entrega não afirma que a colônia já pode se sustentar indefinidamente.

A implementação deve preservar a regra: o jogador designa trabalhos; a IA escolhe as tarefas permitidas. **Todo personagem pode trabalhar em qualquer categoria não proibida por seus traços**, com bônus maior para perfis mais especializados.

O mapa inicial é aberto. A antiga muralha e o tronco que bloqueava a saída foram removidos; passagens poderão voltar em S6 quando houver uma progressão de exploração definida.

## Etapas em ordem obrigatória

| Marco | Prioridade | Escopo | Status | Aceite verificável |
| --- | --- | --- | --- | --- |
| S0. Integridade da base | P0 | Auditoria de save, ordens, inventário e ferramentas; testes de regressão | Implementado; Pages pendente | Migração conserva o mundo/estoque e inicializa necessidades sem comida grátis; refeições salvam imediatamente; testes locais cobrem sobrevivência |
| S1. Necessidade de comida individual | **P0** | Fome por colono, refeições autônomas, consumo real do estoque | Implementado | Saciedade individual; aviso em 50%, fome abaixo de 30%; refeição consome 1 unidade e restaura até 70; agricultura não é ordenada automaticamente |
| S2. Dano, morte e derrota | **P0** | Estados fome → fraqueza → dano → morte; remoção segura; game over | Implementado | Após 1 dia contínuo em inanição começa dano de 10 de saúde/dia; morte libera a ordem e registra o colono; derrota persiste e permite reiniciar |
| S3. HUD de sobrevivência | **P0** | População viva, comida, consumo/dia, dias restantes, fome, saúde e alertas | Implementado; QA local aprovado | Playwright verifica HUD e cartões em 1366×768, 1600×900 e 390×844; publicação no Pages ainda não verificada |
| S4. Economia e agricultura balanceadas | **P0** | 19 cultivos com ciclos/rendimento/água diferentes, reposição de sementes, produção e consumo por dia | Em desenvolvimento: água por cultura, estoque físico, planejamento orientativo; falta playtest e simulação integral | Colônia pode ser alimentada de forma sustentável, mas não infinita sem esforço |
| S5. Moradia e crescimento populacional | **P0** | Cabanas com vagas, atribuição, contratação limitada a vagas e suprimentos; custo de novos colonos | Pendente | 2→3 trabalhadores exige casa nova e aumenta consumo de comida |
| S6. Expansão com recompensa | **P0** | Acesso progressivo a novas áreas, recursos por bioma, obstáculos e distância de transporte | Pendente | Recurso de nova etapa inacessível antes de liberar o acesso; trabalhador o coleta de fato |
| S7. Logística física | P1 | Depósito, capacidade, transporte de materiais, reserva por tarefa, prioridade de emergência | Pendente | Obra não recebe madeira de longe sem entrega; sem dupla retirada do mesmo item |
| S8. Sono, energia e rotina | P1 | Necessidade de descanso, camas/abrigo, rotina, exaustão e penalidades | Pendente | Colonos descansam, recuperam energia e trabalham mais devagar cansados |
| S9. Saúde e água potável | P1 | Higiene, água para pessoas, doenças/ferimentos, recuperação/cuidado | Pendente | Falta de recurso de saúde causa consequência com chance de intervenção |
| S10. Fabricação e cadeia de produção | P1 | Cozinha, conservação, tecnologia de materiais, novas estações, melhoria de ferramentas | Pendente | Obtenção de alimentos/itens passa por cadeias com custos e tempos verificáveis |
| S11. IA avançada por perfil | P1 | Alocação baseada em especialidade, urgência fisiológica, distância, perigos e limites pessoais | Pendente | Especialista prioriza trabalho afim; não viola traços negativos; autonomia estável |
| S12. Sobrevivência ambiental | P2 | Clima/temperatura, solo, água contaminada, perigos de regiões; proteger construções | Pendente | Eventos oferecem antecipação, decisão e resposta, sem punição arbitrária |
| S13. Aprofundamento | P2 | Pesquisa, eventos, relações entre colonos, múltiplos biomas úteis, objetivos de campanha | Pendente | Cada sistema adiciona escolhas, não apenas barras decorativas |
| S14. Polimento e release | Contínuo | Animações de tarefas, áudio, acessibilidade, tutorial, saves, mobile, screenshots, testes | Contínuo | Zero erro crítico/404; produto consistente no GitHub Pages |

## Lote de implementação sugerido (primeira versão verdadeiramente sobrevivência)

**Entrega A: sobrevida diária** (S0–S3). Implementada localmente e coberta por testes Node e Playwright. Falta integrar/publicar e validar no GitHub Pages.

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

- Não avançar para novas necessidades pessoais antes de completar S4 e provar uma fonte alimentar sustentável.
- Não adicionar gases ou temperatura complexa antes de fome, moradia e logística funcionarem.
- Não adicionar habitantes infinitos sem custo alimentar e moradia.
- Não fazer personagem exclusivo de uma profissão: especialização altera eficiência/prioridade; somente traço negativo impede função.
- Não mudar receita/tempo com base em documento antigo sem conferir os valores atuais em `src/crafting.js`, `src/game.js` e `src/task-orders.js`.

## Critério de "já é um jogo de sobrevivência"

Uma partida real deve permitir **vencer o desafio inicial** estabelecendo comida sustentável e aumentando a população, mas **perder por não alimentar os colonos**. O jogador consegue identificar a causa, corrigir a escassez por ordens e explorar outro território para manter a vila crescendo.

**Links:** [GDD](./GDD_TILLFOLK.md) · [Roadmap visual/QA](./ROADMAP_VISUAL.md) · [Colônia do protótipo](./COLONIA_SUSTENTAVEL.md).
