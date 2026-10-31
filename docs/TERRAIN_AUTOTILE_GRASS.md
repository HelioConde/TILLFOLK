# TileMap Terrain do Grass_Tile_Layers

**Editor visual:** https://helioconde.github.io/TILLFOLK/terrain-editor.html
**Prancha original:** https://helioconde.github.io/TILLFOLK/mapear_grama.html

## Uso no projeto

O terreno usa o atlas original de 176×112 pixels, com células de 16×16, preservando transparência, posição, paleta e detalhes de pixel art. O jogo continua sem banco de dados. `src/terrain-autotile.js` é uma biblioteca independente para o editor e o motor do jogo.

1. Selecione uma posição na matriz 3×3 (canto externo, borda ou centro).
2. Clique no sprite do atlas. Ele ficará vinculado à posição escolhida.
3. Repita nas quatro posições de canto interno (concavidades: ↖ ↗ ↙ ↘), que complementam as bordas quando uma diagonal não está preenchida.
4. Desenhe na prévia para testar ilhas, recortes, buracos e caminhos finos. O editor recalcula cada célula observando oito vizinhos.
5. Opcionalmente preencha as sete peças especiais para linhas estreitas, pontas e tile isolado.
6. Clique em Copiar configuração e envie o JSON na conversa. Também há Baixar JSON e Importar JSON.

## Estrutura

- `src/terrain-autotile.js`: `coords`, `roleAt`, `resolve`, `draw`, `exportConfig`. Sem dependências externas.
- `terrain-editor.html`: UI visual HTML5 Canvas publicada pelo GitHub Pages.
- `tests/terrain-autotile.test.cjs` e `tests/terrain-editor.test.cjs`: testes automáticos.
- `public/assets/.../New tiles/Grass_Tile_Layers.png`: atlas original, não editado.
- `public/assets/.../New tiles/Grass_Tile_Layers_recortes/`: 77 PNGs.

## Regras de montagem

- Quatro vizinhos cardinais presentes: sprite central.
- Um lado cardinal ausente: borda correspondente.
- Dois lados adjacentes ausentes: canto externo.
- Diagonal ausente com ambos os vizinhos cardinais presentes: canto interno complementar sobreposto à peça base, respeitando transparência.
- Corredor de um tile, ponta ou isolado: papéis especiais opcionais.
- Papel ausente: destacar ausência na prévia e identificar fallback quando houver centro. Não adivinhar o sprite.

A configuração exportada usa o esquema `tillfolk-terrain-autotile/v1` e IDs de `C01_L01` a `C11_L07`, com `roles` e `preview.grid` de 20×14 células. O jogo principal ainda não aplica automaticamente esse JSON ao mapa salvo; o passo seguinte é validar o mapeamento para não introduzir tiles errados.

Para reutilizar classificações do editor anterior, use Importar classificações do mapeador antigo. O rótulo antigo `canto_interno` não define orientação; os quatro novos papéis internos precisam ser atribuídos manualmente.
