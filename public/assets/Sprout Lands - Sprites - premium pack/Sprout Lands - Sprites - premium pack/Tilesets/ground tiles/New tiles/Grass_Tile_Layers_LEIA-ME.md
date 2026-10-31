# Grass_Tile_Layers — recortes para mapeamento

O sprite original foi preservado. Foram extraídas **77 células** de **16×16 px** (11 colunas × 7 linhas), incluindo eventuais células transparentes.

- **Grass_Tile_Layers_MAPA.png**: prancha numerada com fundo quadriculado para enxergar transparências.
- **Grass_Tile_Layers_recortes/**: um PNG RGBA original por célula.
- **Grass_Tile_Layers_recortes.zip**: todos os recortes em um arquivo.
- **Grass_Tile_Layers_mapeamento.json**: coordenadas em pixels e campos \`tipo\` / \`observacao\` vazios, para classificar depois.
- **mapear_grama.html**, na raiz do GitHub Pages: ferramenta interativa para clicar, classificar e exportar um JSON.

## Como me enviar o mapeamento

Diga por exemplo: **C01_L02 = canto superior esquerdo**, **C02_L02 = borda superior**, **C05_L04 = centro**.

Ou abra \`mapear_grama.html\`, clique nas peças, escolha a categoria e use **Copiar mapeamento** para colar aqui.

As etiquetas são coordenadas e não suposições sobre o uso de cada tile. O código do terreno não foi alterado.
