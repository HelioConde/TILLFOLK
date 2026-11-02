# Auditoria e evolução aplicada — seleção de tarefas e fauna (02/11/2026)

## Estado confirmado antes da alteração
- O motor já diferencia fauna selvagem de animais de criação para renderização, reprodução e visibilidade do botão de esterco.
- O teste antigo `tests/colony.spec.cjs` esperava `animals=[]` mesmo com animais selvagens gerados nos biomas.
- A distribuição atual já respeita permissões, equipamentos e rotas, mas utilizava distância com peso muito baixo e não priorizava alimento urgentemente.
- O GDD exige que **somente o jogador ordene tarefas**; colonos escolhem quem executa.

## O que mudou
- `src/worker-task-scoring.js` contém um ranking puro e determinístico das ordens existentes: prioridade global/individual, bônus de especialização, distância, condição física e escassez de alimento.
- `src/game.js` usa o ranking somente **depois** de validar pré-requisitos e proibições. Não foram adicionadas ordens nem recursos fictícios.
- `src/task-orders.js`: fauna selvagem não habilita a coleta de esterco nem falsas expectativas de fertilização.
- `tests/colony.spec.cjs`: os testes passam a exigir ausência de animais domesticados no início, e não ausência de vida selvagem.
- `tests/worker-task-scoring.test.cjs` e `tests/wildlife-manure.test.cjs` cobrem cenários verificáveis.
- README corrigido sobre fome, morte e derrota já existentes.

## Riscos/limites ainda não resolvidos
- A IA continua usando o cálculo de caminho do motor para validar ordens; os custos de pathfinding sob centenas de ordens ainda exigem perfil e otimização antes de mudar.
- O ranking NÃO resolve gargalos de ferramentas, logística e dependências; esses problemas exigem testes integrados.
- A suíte de navegador histórica registrou **40 falhas / 50 sucessos** na Action 41386880974. Essa execução tinha expectativas legadas e timeouts. A existência deste PR não significa que a suíte completa esteja verde; investigar cada falha no último SHA.

## Próximas entregas recomendadas
1. Auditoria por grupos e screenshots dos workflows Playwright: menu, colônia, agricultura, missões, saves, 3 resoluções.
2. Testes de atribuição com trabalhadores restritos e estoque escasso dentro do motor real.
3. Simulação determinística de alimentos, água e sono para 2/3/5 colonos em 7/14/28 dias.
4. Playtest dos primeiros 15–30 minutos com foco na transição machado → cabana → primeiro mutirão.
5. Perfil de FPS/latência com 10+ trabalhadores e 100+ ordens antes de qualquer refatoração grande.

Nenhum terreno, sprite, contrato de autotile, save nem stack foi alterado.
