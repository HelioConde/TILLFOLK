# Agricultura estratégica — TILLFOLK (02/11/2026)

## Objetivo
Melhorar as decisões agrícolas após o tutorial. Entrega incremental de S4; ainda não significa equilíbrio alimentar completo.

## Implementado
- As 19 culturas mantêm sprites Sprout Lands, tempo próprio, rendimento alimentar e crescimento existente.
- Cada cultura tem uma estação favorita. Na estação adequada cresce 15% mais depressa, além dos multiplicadores anteriores de clima, solo e pesquisa.
- A ordem de transportar a colheita devolve de 1 a 3 sementes segundo a espécie. Semear e colher no campo não geram sementes.
- Batata retorna 1 semente; trigo retorna 3, incentivando estratégias de expansão diferentes.
- Estoque agora mostra as culturas, rendimento, ciclo relativo e estação favorável, permitindo escolher o próximo plantio se houver sementes.
- Somente novas ordens de plantio usam a escolha; ordens existentes não são alteradas. selectedCrop segue persistido no save.

## Invariantes
- Nada muda no contrato do autotile e nos nove atlas de terrenos.
- IA executa apenas ordens autorizadas; a construção do canteiro autoriza somente sua manutenção recorrente **após a primeira colheita transportada**. O jogador pode pausar a rotina em Gestão ou cancelar uma tarefa automática para desativar aquele canteiro. Não abrir novos canteiros nem gerar sementes/água/alimentos sem trabalho físico; restrições vermelhas e ferramentas permanecem.
- Sem banco de dados, serviços externos, novas artes ou alteração no consumo de alimento.
- Saves anteriores com culturas sem metadados recebem o fallback de crescimento existente.

## QA
- node --test tests/crops.test.cjs tests/crop-strategy.test.cjs tests/colony-life.test.cjs
- npx playwright test tests/crop-choice.spec.cjs --browser chromium
- Verificar desktop 1366x768 e mobile 390x844, primeira semente, dois cultivos diferentes, colheita, transporte e retomada de save.

## Próxima etapa S4
- Balancear duração, rendimento, irrigação e consumo por colono com simulações de 2, 3 e 5 pessoas.
- Revisar a contabilidade por variedade quando os colonos consomem ou perdem alimentos: evitar converter outro cultivo sem estoque correspondente.
- Validar climas extremos sem criar bloqueios irreversíveis para novas partidas ou saves antigos.
