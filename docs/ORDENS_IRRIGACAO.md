# Irrigação com ordens coletivas — TILLFOLK

## Problema
A agricultura S4 passou a exigir várias regas para algumas culturas. Irrigar cada canteiro individualmente virou uma tarefa repetitiva, mas criar ordens automáticas sem autorização violaria o princípio central do jogo.

## Comando no Estoque
- O botão **Ordenar rega dos canteiros sedentos** calcula quantos canteiros ainda precisam de água e permite criar as ordens em um clique explícito.
- Só recebe ordem o canteiro sem rega pendente, ainda não maduro, em área cultivável e pronto segundo `TillfolkOrders.status`.
- Respeita equipamento, fontes de água, proibições de habilidades e limite de 1.500 ordens totais (até 40 regas por clique). Não cria água, não rega imediatamente e não atribui trabalhadores por conta própria.
- Exibe quantos estão aguardando, já possuem ordem, estão bloqueados ou podem receber ordem nova.
- Acionar repetidamente não duplica regas: o ID oficial `x-y:water` continua sendo a referência para cancelar/priorizar.

## Clima e ordens obsoletas
- O status da ordem de rega é `done` quando o canteiro está maduro/colhido ou a etapa de água já foi atendida.
- A chuva produz evento somente quando realmente irriga canteiros; o motor reavalia as ordens. Ordens concluídas pela chuva saem da fila, liberando trabalhador e suprimentos não consumidos.
- O tutorial continua manual, a rotina agrícola automática é opcional, e a primeira rega da batata não muda.

## Integridade
- Não foram alterados sprites, terrenos, atlas, contratos de autotile, regras de especialização, custos de água ou formato de saves.
- O botão é apenas um facilitador de criação de **ordens explícitas**, armazenadas em `state.orders` no salvamento existente.
- Compatível com GitHub Pages sem banco de dados.

## QA
- `node --test tests/irrigation-orders.test.cjs` e testes agrícolas já existentes.
- `npx playwright test tests/irrigation-orders.spec.cjs --browser chromium` nas resoluções 1366×768 e 390×844.
- Verificar repetição do botão, canteiro maduro, sem fonte d'água, trabalhador impedido de regar e chuva que substitui uma ordem.
- O workflow Pages mantém o teste obrigatório do contrato de terreno.

## Próxima iteração
- Fazer teste com partidas reais e medir se a irrigação por 2–3 estágios estimula decisões sem se tornar microgerenciamento.
- Medir produção/custos e retenção de jogadores no início, sem adicionar bônus gratuitos de recursos.
