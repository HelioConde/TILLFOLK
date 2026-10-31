# TILLFOLK — ordens de trabalho explícitas (inspirado em Oxygen Not Included)

## Regra central
**O jogador decide o que precisa ser feito; os trabalhadores decidem quem executa e em qual ordem.** Colocar uma ordem para arar um terreno não agenda fertilização, plantio, irrigação, colheita ou transporte. A conclusão de uma ordem remove-a da fila; não cria novas tarefas.

## Como designar
1. Entre na fazenda e clique em **Ordens**. Escolha entre **Limpar**, **Arar**, **Fertilizar**, **Semear**, **Regar**, **Colher** e **Transportar**.
2. Clique nos terrenos desejados para adicionar várias ordens independentes à fila. **Arar** também tem um atalho permanente na barra inferior.
3. Se a ordem precisar de trabalho anterior, ela fica **Aguardando**. Exemplo: *Semear* aguarda o solo arado; *Regar* aguarda a semente; *Colher* aguarda a maturação da planta. Não são criadas etapas de preparação implicitamente.
4. A gaveta **Tarefas** mostra todas as ordens, prioridades, trabalhador atribuído ou motivo de espera. **✕** cancela uma única ordem. A ferramenta **Cancelar** remove todas as ordens do terreno escolhido.
5. Os trabalhadores observam a fila e escolhem uma ordem **Pronta** conforme prioridades globais/individuais, distância, especialização e restrições negativas. Eles podem operar qualquer trabalho não proibido, independentemente de especialização.

### Particularidades
- Limpeza de árvore mantém **a mesma ordem** ao virar toco, até a limpeza acabar; não adiciona uma segunda tarefa por conta própria.
- Fertilização é uma ordem separada e opcional para semear. O tempo de cada atividade continua significativo.
- Cultivo é visualizado mesmo após terminar a ordem e ficar sem novas designações.
- Ordens futuras podem ser enfileiradas antes dos pré-requisitos e permanecem aguardando até que a etapa anterior seja executada manualmente.
- Plantas irrigadas crescem naturalmente com o tempo. Colher e transportar ainda exigem ordens explícitas.
- Sem água ou sementes, a ordem fica aguardando recurso; não consome recursos inexistentes.
- O motor de movimentação, as colisões, as casas em camadas e as habilidades positivas/negativas não foram reescritos.

## Persistência e compatibilidade
- `state.orders`: array com `{ id, type, x, y }`; IDs de ordem estáveis por terreno e tipo; no máximo 450. Tudo salvo no `localStorage` da mesma partida, sem banco de dados.
- Saves antigos **sem** `orders` passam a ter fila vazia. O campo legado `plot.selected` não gera trabalhos automáticos. Solo arado e plantas existentes permanecem.
- Códigos: `src/task-orders.js` (regras e pré-requisitos), `src/game.js` (distribuição e conclusão), `task-orders.css` e `index.html`.
- Regressão: `tests/orders.spec.cjs` (somente arar, pré-requisitos, cancelamento, reload, migração de save e mobile) e `tests/menu.spec.cjs` (seleção explícita para limpeza).
- GitHub Pages: estático; CI inclui script e stylesheet no artefato de publicação.

## Evoluções possíveis
Desenhar ordens arrastando sobre áreas, prioridade 1–9 **por ordem**, suspender/retomar ordens, reservar materiais e fornecer ordens permanentes (ex.: manter estoque de água). Estes recursos futuros serão opt-in, nunca trabalho automático não autorizado pelo jogador.
