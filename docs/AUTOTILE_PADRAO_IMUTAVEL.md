# Regra fixa de terrenos — TILLFOLK

**Decisão de projeto: não alterar automaticamente nem durante refatorações.**

A definição oficial fornecida pelo criador do jogo é o arquivo:

`public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/ground tiles/New tiles/Grass_Tile_Layers_terrain.json`

É um JSON válido com:

- `schema: "tillfolk-terrain-autotile/v1"`
- `terrain: "grass"`, `atlas: "Grass_Tile_Layers.png"`
- `tileSize: 16`, `atlasColumns: 11`, `atlasRows: 7`
- `neighbors: 8`
- `method: "cardinal + complementary inner corners"`

## Mapeamento oficial — **NÃO REMAPEAR**

| Papel | Tile |
|---|---|
| canto_noroeste | C01_L01 |
| borda_norte | C02_L01 |
| canto_nordeste | C03_L01 |
| borda_oeste | C01_L02 |
| centro | C02_L02 |
| borda_leste | C03_L02 |
| canto_sudoeste | C01_L03 |
| borda_sul | C02_L03 |
| canto_sudeste | C03_L03 |
| interno_noroeste | C07_L03 |
| interno_nordeste | C06_L03 |
| interno_sudoeste | C07_L02 |
| interno_sudeste | C06_L02 |

Os papéis `isolado`, `horizontal`, `vertical`, `ponta_norte`, `ponta_leste`, `ponta_sul` e `ponta_oeste` permanecem **`null`**, não recebem IDs inventados.

Cantos internos só são aplicados quando os dois vizinhos cardinais existem e a diagonal correspondente está vazia. O algoritmo de oito vizinhos, a resolução e a posição dos sprites são mantidos em `src/terrain-autotile.js`. O fallback para `centro`, quando um papel específico está `null`, é uma estratégia de desenho e **não muda a regra salva**.

## Escopo: todos os terrenos compatíveis

Os **nove atlases** de terreno em `New tiles/` que possuem células de 16 pixels e imagem de 176 × 112 pixels usam **exatamente o mesmo objeto `ROLES`** de `src/terrain-catalog.js`:

1. `Grass_Tile_Layers.png`
2. `Grass_Tile_layers2.png`
3. `Darker_Grass_Tile_Layers.png`
4. `Darker_Grass_Tile_Layers2.png`
5. `Grass_tiles_v2.png`
6. `Darker_Grass_Tiles_v2.png`
7. `Soil_Ground_Tiles.png`
8. `Darker_Soil_Ground_Tiles.png`
9. `Stone_Ground_Tiles.png`

Os seis biomas atuais (`g, f, s, i, w, p`) são desenhados por `src/biomes.js` através desse mesmo padrão. **Não alterar o mapa nem seus tiles para trocar detalhes como rios, pontes, minérios ou árvores.** As camadas de água, objetos e estruturas devem ser independentes do atlas de solo.

**Exceção técnica necessária:** imagens `Hill`, `Slope`, `Bush`, previews e recortes isolados que não sejam atlas de terreno 11×7 não podem ser interpretados como se fossem esse formato sem deformar os sprites. Suas regras particulares permanecem independentes. Isso não autoriza alterar o mapeamento dos nove terrenos compatíveis.

## Como proteger essa decisão

- `src/terrain-catalog.js` exporta `ROLES` congelado e `configForAtlas` para os nove terrenos.
- `src/biomes.js` aplica `Catalog.ROLES` ao desenhar todos os seis biomas.
- O editor `terrain-editor.html` abre sempre com a regra oficial, mesmo se houver rascunhos no armazenamento local. Os testes feitos no editor não são alterações de produção.
- `tests/terrain-contract.test.cjs` compara o JSON canônico com **valores esperados independentes**, todos os PNGs de terreno, os 6 biomas, o algoritmo de oito vizinhos e a renderização.
- O workflow de GitHub Pages executa esse teste e falha se alguém alterar a regra sem atualizar intencionalmente o contrato.

**Orientação a quem desenvolver o jogo:** não reescrever nem recalcular os IDs da tabela acima. Qualquer proposta de revisão deve ser explicitamente aprovada pelo criador do TILLFOLK e documentada. Não trocar o visual silenciosamente.
