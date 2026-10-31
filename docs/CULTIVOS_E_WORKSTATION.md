# TILLFOLK — Cultivos, sementes e Work Station

## Recursos originais encontrados

- `public/assets/assets/crops/`: **19 plantas com arquivos `growth_basic`** (bambu, beterraba, frutinhas, brócolis, cenoura, couve-flor, aipo, milho, berinjela, uva, alho-poró, alface, cebola, pimentão, batata, abóbora, rabanete, tomate e trigo). As 19 têm ícones `icon`. `tallgrass` também existe, mas funciona como grama ambiental e não como cultura cultivável no catálogo.
- `public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Objects/Farming Plants.png`: atlas premium de plantas.
- `.../Objects/work station.png`: sprite da Work Station.
- `.../Objects/Items/tools and meterials.png` e `.../Objects/Items/All items.png`: sprites premium de ferramentas e itens.
- `public/assets/sprout-lands/`: os sprites já utilizados pelo motor do jogo.

## Mecânicas adicionadas e unificadas

1. O catálogo `src/crop-catalog.js` descreve as 19 culturas e aponta diretamente para seus arquivos reais. O canvas seleciona os quadros de crescimento a partir da maturação; o primeiro quadro representa o início e o último a planta pronta para a colheita.
2. Limpar grama alta conserva a chance de 25% de descobrir uma semente; agora a variedade encontrada é identificada e guardada em `state.cropSeeds`. A primeira descoberta passa a ser a cultura selecionada por padrão.
3. No menu **Ordens → Escolher cultura**, o jogador define o tipo da próxima semeadura. Uma ordem de semear grava seu tipo de cultura para não ser alterada caso a seleção mude durante o trabalho.
4. Ao colher e transportar, o estoque recebe alimentos identificados em `state.cropProduce`, um pouco de comida e uma semente do mesmo cultivo. O menu Estoque mostra as quantidades por espécie.
5. A **Work Station** é uma construção única: o jogador primeiro junta **30 gravetos**, coloca o blueprint em **Construir → Work Station**, e a equipe monta a bancada. O estado fica em `state.crafting.station` e é sincronizado com `state.workstations` de versões anteriores.
6. Abrir a bancada mostra as receitas originais de ferramentas de `src/crafting.js` (incluindo machado, ferramentas para mineração e cultivo) e o reaproveitamento agrícola: **2 alimentos armazenados de uma espécie → 3 sementes dessa espécie**. O jogo valida os custos antes de retirar recursos.
7. A Work Station pode ser aberta pelo botão **Bancada e receitas** ou clicando diretamente na bancada no mapa. Equipamentos fabricados servem à equipe inteira.
8. Partidas antigas migram sem apagar canteiros ou recursos. Os dados permanecem no `localStorage`; não é necessário banco de dados.

## Validações

- `node --test tests/crops.test.cjs`: valida os caminhos PNG, o catálogo e o inventário.
- `npx playwright test tests/crop-workshop.spec.cjs --browser chromium`: valida UI desktop/mobile e produção de machado e sementes.
- `.github/workflows/crop-workshop.yml`: executa os testes e salva capturas de tela.
- `.github/workflows/pages.yml`: publica os scripts e somente os arquivos gráficos necessários do novo recurso.

## Créditos e condições

Sprites premium **Sprout Lands — Cup Nooble**. A licença permite jogos comerciais e não comerciais, com crédito. Não redistribua ou revenda o pacote isoladamente; o uso para treinamento de IA ou NFT não é permitido. Consulte também `licenses/sprout-lands-premium.txt` e `docs/ASSET_CREDITS.md`.

