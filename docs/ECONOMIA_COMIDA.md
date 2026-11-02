# Economia de comida consistente — TILLFOLK (02/11/2026)

## Problema corrigido
Antes, cropProduce guardava a soma de todas as colheitas históricas e era usado como disponibilidade de ingredientes na Work Station. Como refeições, deterioração, Conselho e recrutamento apenas diminuíam state.food, receitas podiam fabricar sementes a partir de alimentos já consumidos.

## Novo contrato de dados
- state.food continua sendo a quantidade total real e a única base para fome, contratação e viagens.
- state.cropProduce é somente o histórico acumulado das culturas, sem decremento em refeições ou crafting.
- state.foodLedger={version:1,stock:{[cropId]:quantidade},generic:quantidade} rastreia quanto do total ainda está disponível por tipo.
- Soma de generic e stock nunca supera state.food. Normalização descarta contagens inválidas e equilibra discrepâncias sem aumentar a comida.
- A colheita só soma comida tipada ao concluir a ordem de transporte; a oficina gasta 2 unidades reais daquele tipo por 3 sementes.
- Refeições, deterioração, reuniões, contratação, reprodução animal e foguete descontam comida genérica primeiro e depois tipada. Gastos não podem deixar saldo negativo.

## Compatibilidade com saves
- Saves anteriores à migração mantêm integralmente state.food, state.cropProduce, equipamentos, trabalhadores, ordens e sementes.
- Não é possível deduzir a espécie dos alimentos legados a partir do histórico. Por segurança esses alimentos entram como generic, utilizáveis normalmente para alimentação e trocas, mas não para fabricar sementes específicas.
- Após uma colheita transportada, o saldo físico daquele cultivo é contabilizado normalmente. Nenhum recurso é dado gratuitamente no carregamento.
- Saves novos mantêm o registro tipado em localStorage junto com o estado existente. Nenhum banco de dados é necessário.

## Interface
- Estoque exibe quantidade de alimentos realmente disponíveis por cultura e separa histórico colhido.
- Prognóstico apresenta dias de reserva calculados pelo consumo esperado e número de canteiros em crescimento/prontos. Não inclui colheitas pendentes como comida já coletada.
- No modo Fazenda Tranquila não projeta a fome como emergência.

## QA
- node --test tests/food-ledger.test.cjs e regressões existentes de fome, colônia e espaço.
- Playwright tests/food-outlook.spec.cjs e tests/crop-workshop.spec.cjs para capturas e comportamento de legado.
- Publicação no GitHub Pages segue sujeita às Actions, incluindo o contrato intocável do autotile.

## Próxima melhoria
- Modelar necessidades de água por cultura e balanceamento da economia de colônias com 2/3/5 pessoas; testar com mundo e seed fixos sem desbloquear recursos automaticamente.
