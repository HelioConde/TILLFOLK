# Alocação de trabalhos por elegibilidade real

**Objetivo:** impedir que um trabalhador generalista tome uma ordem que é a única atividade possível para outro colono, deixando este ocioso.

## Antes
A seleção dos colonos contava tarefas candidatas usando verificações simplificadas. O contador não considerava caminho realmente acessível, ferramenta individual e outros bloqueios do trabalhador que já eram verificados mais tarde em `workerTaskBlocker`. Isso distorcia a ordem de escolha: dois colonos pareciam ter igual quantidade de opções, mas apenas um alcançava certas tarefas.

## Agora
1. A IA considera **somente ordens existentes e autorizadas pelo jogador** com status `ready` e não atribuídas.
2. Para cada colono livre e acordado, verifica os impedimentos reais do motor: especialidades negativas, ferramentas equipadas, carga/logística, EPI, espaço de obra e rota acessível.
3. Colonos com menos ordens **realmente elegíveis** escolhem primeiro. Depois da escolha, a disponibilidade é recalculada sem atribuir o mesmo trabalho duas vezes.
4. Entre as ordens compatíveis, continua valendo a prioridade global/individual, especialização, bem-estar e distância. Não cria ordens, materiais nem atividades automáticas.
5. O módulo `src/worker-allocation.js` só **planeja a atribuição**; `src/game.js` faz a reserva em memória e mantém o save `tillfolk-v01` intacto.

## Casos de regressão
- Trabalhador 1: pode limpar e arar. Trabalhador 2: proibição vermelha em Limpar. Mesmo que Arar tenha prioridade 9 e Limpar prioridade 1, o trabalhador 2 recebe Arar, e o trabalhador 1 executa Limpar.
- Trabalhador 2 não alcança uma das tarefas: a contagem considera a rota bloqueada.
- Trabalhos já atribuídos, colonos dormindo e traços proibitivos não são selecionados.
- Desempate estável; ordens nunca são duplicadas e nenhum plano altera o próprio save.
- Playwright reproduz a distribuição de ordens em uma partida real, com duas tarefas e duas pessoas.

## Limites
A lógica não elimina outros motivos de ociosidade: ordens sem materiais, sem ferramentas ou sem rota ainda dependem de o jogador autorizar o trabalho necessário. O motor continua sem banco de dados e sem teleportar recursos.

## Testes
```bash
node --test tests/worker-allocation.test.cjs
node --test tests/terrain-contract.test.cjs tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs
npx playwright test tests/worker-allocation.spec.cjs --browser chromium
```
