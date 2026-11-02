# Irrigação e planejamento de safras — TILLFOLK
**S4, 02/11/2026**

## Problema resolvido
Antes, regar uma plantação uma única vez permitia que qualquer uma das 19 espécies crescesse até o final, independentemente da necessidade de água. O trabalho de irrigação não variava com a cultura escolhida.

## Mecânica
- Cada espécie define `waterNeed` (1, 2 ou 3) no catálogo, mantendo o mesmo sprite e tempo base de crescimento.
- Batata, cenoura e outras espécies de entrada precisam de **uma rega**. Tomate e trigo de **duas**; milho, abóbora, uva e bambu de **três**.
- Cada rega habilita apenas a etapa proporcional de maturação. Por exemplo, abóbora cresce até 33% após a primeira, 67% após a segunda e 100% após a terceira. Ao alcançar o limite, o canteiro seca e aguarda nova ordem de irrigação.
- A rega manual continua consumindo **uma unidade de água** por tarefa realmente executada, inclusive quando transportada por trabalhador. A chuva pode atender etapas sem inventar água no estoque.
- Nenhuma ordem de irrigação é criada automaticamente pelo sistema. O jogador usa a ferramenta universal ou as Ordens e os colonos executam conforme habilidades e ferramentas existentes.
- No Estoque há a necessidade de regas por cultura, o total de canteiros aguardando água e uma **meta orientativa** por equipe baseada em uma refeição por colono/dia com 15% de margem para imprevistos.
- A meta é um planejamento de demanda, **não** uma garantia de produtividade: distância de transporte, solo, clima, tempo das ações, trabalhadores aptos e decisões do jogador alteram o resultado.

## Compatibilidade
- Save antigo com cultura já irrigada recebe crédito pelas regas do ciclo antigo; crescimento não regride e não exige uma nova rega por mudança de versão.
- Save antigo ainda não irrigado mantém crescimento e segue a nova regra ao ser regado.
- Plantio novo inicializa `waterings=0` e cada rega só avança esse contador uma vez. A colheita limpa a contagem.
- Nenhum terreno, textura, contrato `tillfolk-terrain-autotile/v1`, recurso, estoque ou ferramenta foi alterado.
- Compatível com GitHub Pages e `localStorage`; módulos JavaScript leves sem dependências ou backend.

## Testes
- `node --test tests/crop-care.test.cjs tests/crop-strategy.test.cjs tests/colony-life.test.cjs`
- `npx playwright test tests/crop-care.spec.cjs --browser chromium`
- Regressão dos nove atlases: `node --test tests/terrain-contract.test.cjs tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs`

## Próximos testes com jogadores
- Verificar se três regas em culturas longas são interessantes, e não excesso de microgerenciamento.
- Medir colônias com 2, 3 e 5 pessoas durante várias estações, incluindo perdas e tempo de deslocamento. Se necessário, revisar necessidade de água e tempo de cada atividade, sem dar comida gratuitamente.
- Testar tutorial com dias chuvosos, save antigo, turno noturno, falta de regador e clima de seca.
