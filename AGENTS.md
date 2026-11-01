# TILLFOLK — regras do projeto para agentes e colaboradores

## CONTRATO IMUTÁVEL DO TILEMAP — não modificar por iniciativa própria

O criador do jogo determinou que a regra `tillfolk-terrain-autotile/v1` é o padrão permanente de todos os **nove atlases de terreno 16×16 (11 colunas × 7 linhas)** dentro da pasta `public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/ground tiles/New tiles/`.

**Proibido em tarefas de refatoração, arte, mapa, ponte, rio, exploração ou bugs:**
- modificar qualquer ID ou papel de `Grass_Tile_Layers_terrain.json`;
- trocar centro, bordas, cantos externos ou quatro cantos internos;
- atribuir IDs a papéis definidos como `null`;
- alterar a grade 11×7, tile 16×16, vizinhança de oito ou método cardinal com complementos diagonais;
- aplicar editor ou rascunho salvo no navegador como regra de produção;
- deformar imagens de declives e outras grades incompatíveis para forçar esse formato;
- mudar o tilemap existente para corrigir um problema de ponte ou objeto.

**Antes de qualquer mudança no desenho de terrenos**, leia `docs/AUTOTILE_PADRAO_IMUTAVEL.md` e o JSON oficial. Todas as nove texturas compatíveis devem continuar consumindo o mesmo `TillfolkTerrainCatalog.ROLES`.

**Teste obrigatório:** `node --test tests/terrain-contract.test.cjs` + `node --test tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs`. O workflow de publicação também os executa.

Se alguma solicitação exigir alteração nessa regra, não assuma aprovação implícita. Peça autorização específica do criador e explique exatamente qual papel, arquivo e coordenada precisariam mudar.

Preservar os demais princípios do jogo: Sprout Lands, HTML5 + GitHub Pages sem banco de dados, saves locais, recursos coletáveis e transporte físico, mundo com seis biomas, especializações dos trabalhadores e evolução até o foguete.
