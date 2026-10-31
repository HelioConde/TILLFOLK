# Auditoria de sprites e UI — TILLFOLK

Referência direta: `public/assets/Sprout Lands - UI Pack - Basic pack/Sprite sheets/Sprite sheet for Basic Pack.png` (896×240 px).

## Coleções analisadas

| Pasta no repositório | Conteúdo encontrado | Diretriz para TILLFOLK |
| --- | --- | --- |
| `Sprout Lands - UI Pack - Basic pack/Sprite sheets` | Spritesheet geral, botões quadrados, ícones, janela de diálogo, controles de configuração | **Padrão visual principal** do HUD e janelas |
| `Sprout Lands - UI Pack - Basic pack/emojis-free/emoji style ui` | Molduras de inventário, slots e barras com corações | Slots de ferramentas e inventários; permite criar novas bolsas |
| `UI/Inventory` | Inventário e slots roxo-acinzentados, ícones variados | Reservar para interface alternativa; não misturar por padrão com Sprout |
| `UI/Crafting` | Células, grade e menu de fabricação | Material de apoio caso o sistema de fabricação avance; paleta diferente |
| `UI/HP` e `UI/Hunger` | Barras de vida e fome | Disponíveis, porém pertencem ao outro pacote e não seguem a madeira/creme do Sprout |
| `Sprout-Lands-UI-0.2.0` | Addon Godot e recursos/documentação | Referência para regras de estilo; **não importar código Godot em HTML5** |
| `Sprout Lands - Sprites - Basic pack` / `premium pack` | Personagens, objetos, plantações, móveis, animais e terreno | **Arte do cenário**, não molduras de UI |
| `Sprout Sorry pack` | Biomas, estruturas, objetos, animais, sons | Expansão futura do cenário |
| `Objects`, `Tiles`, `Character` | Pacotes de estética diferente, mais urbana/combate | Evitar mistura com a direção de arte rural |
| `Little Dreamyland - Free Pack` e `FREE 64 Tiny Animals` | Animais e personagens de outras escalas | Uso somente após revisão de escala e paleta |

## Implementação

- `src/sprout-ui-skin.js`: extrai recortes controlados e dimensionados dos spritesheets locais usando canvas; fallback conserva arte se imagem indisponível.
- `sprout-ui.css`: aplica tiles a slots de ferramentas e molduras de nove fatias aos botões e painéis, preservando as bordas em pixel art.
- `game-hud.css`: mantém a composição espacial, contraste e organização dos dados do jogo.
- **Otimização:** o navegador usa os arquivos estáticos já publicados via GitHub Pages. Não há chamadas a terceiros ou banco de dados.
- **Segurança visual:** elementos de UI não substituem sprites de árvores, personagens e plantações; não modifica progressão, estado da partida ou salvamentos.

## QA

Teste visual `Sprout Lands UI: atlas original em botões, painel, slots e celular` verifica carregamento da arte e recortes, overflow horizontal do dock e faz screenshots do HUD, ordens, equipe e versão celular.

Critérios de aceitação: botões clicáveis, janelas legíveis, texto contrastante sobre as molduras, sem corte em 1366×768 e 390×844, controle de velocidade preservado.

## Evolução recomendada

Inventário com abas pixeladas; pranchetas para prioridades; barras de fome/energia do mesmo estilo Sprout; ícones de recursos recortados do pack principal; tema consistente do menu ao gameplay.

Evitar copiar layouts ou texturas de um pacote com licença incompatível; manter os créditos das fontes de arte já presentes no projeto.
