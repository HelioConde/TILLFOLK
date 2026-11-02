# Cancelamento de projetos de construção — TILLFOLK

## Problema confirmado
O botão direito no modo **Objetos** não incluía `chest` nem `well` na verificação de ordens. O motor caía no caminho de `paintHouse(x,y,true)`, que podia tentar criar a obra em vez de cancelar o projeto. A situação era pior com pesquisas ainda bloqueadas e materiais já entregues.

## Regra corrigida
- O botão direito cancela **apenas ordens pendentes** da camada escolhida, nunca destrói construções concluídas.
- **Canteiro:** as ordens de arar e semear do mesmo tile.
- **Cabana:** qualquer um dos quatro quadrados 2×2.
- **Work Station, baú e poço:** a célula da respectiva blueprint.
- **Foguete:** qualquer quadrado de sua plataforma 3×3, inclusive canto.
- A verificação de cancelamento é anterior à inspeção de trabalhador sobre o local: um colono sobre a obra não pode impedir a desistência. Clique direito sobre um colono sem blueprint continua abrindo seu inventário.
- **Não se exige pesquisa, recurso, local vazio ou ferramenta para cancelar.** A validade de um projeto serve somente para sua criação, não para desistir dele.
- Se não houver ordem pendente na célula, o clique direito encerra o modo Objetos e não cria um projeto novo.

## Materiais e trabalhadores
O código existente `removeOrders` permanece responsável pela transação: `Logistics.refund` devolve materiais já entregues ao chão no local da obra, atribuições são liberadas, rotas são descartadas, a fila é recalculada e a partida é salva. Não são gerados recursos novos nem ficam blueprints fantasmas.

## QA obrigatório
- `node --test tests/blueprint-cancel.test.cjs`: todas as seis camadas, footprint 2×2 e 3×3, IDs e funções puras.
- `npx playwright test tests/blueprint-cancel.spec.cjs --browser chromium`: baú com gravetos entregues, poço sem pesquisa, cabana/foguete pelos cantos, clique em terreno sem obra, desktop 1366×768 e celular 390×844.
- `node --test tests/terrain-contract.test.cjs tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs`: o contrato permanente dos nove terrenos continua imutável.

O HTML5 Canvas, sprites Sprout Lands e formato de `localStorage` não foram alterados.
