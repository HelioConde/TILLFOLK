# Integração dos terrenos Sprout Lands no TILLFOLK

## Mapeamento aplicado

O preset aprovado em conversa está em `Grass_Tile_Layers_terrain.json` na pasta New tiles. O registro `src/terrain-catalog.js` reutiliza exatamente as 13 posições preenchidas no atlas 11×7 de 16×16; as sete peças especiais continuam opcionais e nulas. Nenhum sprite foi modificado.

## Mapa HTML5

Carregamento em `src/game.js` -> `src/terrain-catalog.js` -> `src/biomes.js` -> `src/wild-world.js`: os terrenos de Grama, Floresta, Areia, Gelo, Pântano e Veneno usam, respectivamente, `Grass_Tile_Layers.png`, `Darker_Grass_Tile_Layers.png`, `Soil_Ground_Tiles.png`, `Stone_Ground_Tiles.png`, `Darker_Soil_Ground_Tiles.png` e `Darker_Grass_Tile_Layers2.png`. O atlas `Grass_tiles_v2.png` fica como substrato comum atrás das partes transparentes para criar transições. Se algum sprite não carregar, o renderizador anterior permanece funcional.

Os 14 atlas com dimensões 176×112 são cadastrados e compatíveis com a mesma regra de autotile de oito vizinhos, inclusive variações alternativas, colinas e tipos de solo. As 3 imagens de declives têm grade diferente e ficam registradas como `slope` para uso posterior, sem aplicar coordenadas inválidas. `Bush_Tiles.png` é decoração e não deve ser tratado como piso. As colinas das rochas-limite usam a variante do bioma quando existir.

## Preservação

Não altera a distribuição de biomas, hitboxes, fertilidade, ordens, obstáculos, saves, nem a navegação da equipe. Continua sem banco de dados. Renderização usa máscara em cache e só desenha células visíveis. As imagens são servidas localmente no GitHub Pages.

## Testes

`node --test tests/terrain-autotile.test.cjs tests/terrain-biomes.test.cjs` verifica classificação de bordas, cantos internos, exatidão do JSON, dimensões reais de 18 sprites, seis biomas, fallback visual e colinas.

## Ajustes futuros

Para utilizar outros atlas do catálogo em novos biomas ou alterar a textura de um bioma, atualize `BIOME_ATLAS` em `src/terrain-catalog.js`. Para editar os papéis dos sprites, use o editor visual em `/terrain-editor.html`; novas escolhas devem ser revisadas antes de substituir a configuração aprovada.
