# TILLFOLK — Jornada da colônia e progressão orgânica

Data: 2026-11-01. Aplicado ao repositório principal com GitHub Pages estático, sem banco de dados.

## Por que foi criado

O jogo já possuía colheita, oficina, recursos físicos no chão, baús, pesquisa, moradias, água, equipamentos e continentes, mas não existia um caminho claro que conectasse esses sistemas. A jornada usa **eventos e estados reais**: não atribui pontos por clicar em botões e não cria ordens automaticamente.

## Ciclo de progressão

1. **O primeiro abrigo**: construir Work Station, fabricar enxada e concluir a primeira colheita. Abre as condições para sustentar uma fazenda.
2. **Uma fazenda de verdade**: construir primeira moradia, construir um baú, pesquisar agricultura eficiente e armazenar 12 alimentos após a primeira colheita. Ensina logística, armazenamento e subsistência.
3. **Colônia organizada**: pesquisar conservação (nível 2), construir um poço e abrigar os dois primeiros colonos. Melhora água, perdas de alimentos e descanso.
4. **Além dos rios**: fabricar uma proteção individual, enviar um colono realmente para outro bioma e recrutar um terceiro colono. Vincula expansão à preparação e ao trabalho.
5. **Domínio dos continentes**: explorar 3 continentes, pesquisar rotina de descanso (nível 3), pesquisar transporte avançado (nível 4) e alcançar os 5 continentes. Completa o objetivo de longo prazo, sem encerrar a partida.

Os capítulos têm objetivos permanentes: **as conquistas não desaparecem** ao consumir alimentos ou perder uma ferramenta. São persistidas em `state.progression.achievements` do save local.

## Benefícios reais

- Cada objetivo concede entre **1 e 5 pontos de conhecimento** uma única vez.
- Cada capítulo concluído concede **4 pontos** adicionais, uma única vez.
- A primeira visita a cada um dos cinco biomas fora da ilha dá **3 pontos de conhecimento**, uma única vez, e registra o nome do explorador e o dia.
- Nível 1 de pesquisa: agricultura eficiente, com ganho de produção/crescimento preexistente.
- Nível 2: conservação e acesso aos poços. Agora também exige uma colheita e uma moradia.
- Nível 3: descanso melhorado. Exige poço construído e primeiro continente efetivamente explorado.
- Nível 4: transporte avançado (capacidade de carga). Exige 3 continentes explorados e 3 colonos.

As exigências adicionais aplicam-se somente a novas pesquisas. **Pesquisas antigas permanecem no nível salvo**, sem regressão.

## Como funciona exploração

O jogador decide a posição de uma ordem num outro continente. A IA só assume ordens válidas; calcula caminho e recusa entrar no bioma sem o EPI individual correto. Só registra a descoberta quando um colono **alcança terra firme** dentro daquele bioma (não contam pontes nem água). O sistema não assume que um bioma foi visitado porque apareceu no mapa ou o jogador clicou em seu botão.

## Interface

- Botão **🧭 Jornada** no cabeçalho; abre painel completo responsivo com cinco capítulos, dicas, progresso numérico e benefícios.
- Quando o tutorial estiver concluído, aparece uma faixa discreta de **próximo objetivo**, com link para o painel completo. Durante o tutorial esta faixa fica oculta para não competir com a mãozinha das missões.
- O painel **🔬 Pesquisa** mostra também o pré-requisito da próxima tecnologia, desabilitando a pesquisa quando faltar estrutura/expedição.
- Conquistas e descobertas são registradas no diário. Capítulos concluídos mostram aviso visível.

## Save e compatibilidade

`src/progression.js` mantém os registros persistentes `achievements`, `discovered`, `chapters`, `rewards` no objeto `state.progression`.

Partidas antigas recebem uma atualização **não destrutiva**: o sistema reconhece moradias, ferramentas, pesquisas e posições já existentes, mas não concede premiações retroativas em lote. Nenhum recurso, colono, plantação, equipamento ou pesquisa é apagado.

## Validação

```bash
node --test tests/progression.test.cjs
node --test tests/colony-life.test.cjs
node --check src/game.js
```

A integração com GitHub Pages inclui `src/progression.js` e `progression.css`. As imagens do jogo permanecem nos arquivos locais já existentes; não foi adicionada dependência externa.
