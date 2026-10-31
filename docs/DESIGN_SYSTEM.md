# Design System — TILLFOLK
## Identidade
A interface utiliza Sprout Lands (créditos: Cup Nooble) e um visual de administração rural. Não adicionar ilustrações artificiais no lugar dos sprites existentes.

## Taste Skill — Tokens
- Plano de fundo escuro: #152721
- Painel principal: #21382f
- Borda suave: #405c49
- Texto claro: #f8efd8
- Cor de ação: #b6de81
- Realce quente: #f4d18b
- Alerta: #f4b0a7
- Espaçamento: escala 4 / 8 / 12 / 16 / 24 px; raio de botões e cartões: 8–12 px.
- Canvas pixel art com image-rendering: pixelated. Não usar filtros borrados sobre sprites.

## Web Design Guidelines
- O menu sempre aparece inteiramente dentro da largura visível; telas baixas devem poder rolar verticalmente.
- Mínimo 44 px de altura para botões no layout normal; foco visível com outline destacado.
- Contraste de botões/legendas deve permanecer legível sobre o cenário.
- Respeitar prefers-reduced-motion.
- Evitar navegação e conteúdo cortados por posicionamento absoluto.

## Image to Code
- Tela panorâmica, logo e botões à esquerda, cartões informativos à direita ou abaixo.
- Cenário renderizado a partir dos sprites originais, sem imagens inventadas.
- A UI deve continuar clicável independentemente da renderização do canvas.

## QA visual / Playwright
Capturas reais do repositório nos tamanhos 1600×900, 1366×768, 1125×790, 1024×768, 800×900 e 390×844. Critérios: menu dentro da viewport, rolagem horizontal ausente, Nova Fazenda clicável e modais funcionando.


## Polimento v1.0 — implementação
- Tokens de espaçamento e foco ativos em ui-polish.css.
- Foco acessível, contraste e respeito a movimento reduzido.
- A interface da fazenda preserva o mapa 896x576, ajustado sem distorção em desktop via ResizeObserver e game-polish.css.
- A sidebar pode rolar independentemente; ferramentas precisam permanecer visíveis em 1600x900 e 1366x768.
- Screenshots de menu e jogo gerados pelo workflow QA visual.


### Construções sem distorção — v1.1
Casa do menu e do mapa desenhada com escala 2× exata: cada tile 16×16 ocupa 32×32 pixels, janelas 32×32 ocupam 64×64 e a porta 16×32 ocupa 32×64. Usar o atlas Sprout Lands; proibir esticar telhas horizontalmente. Playwright captura o canvas da casa e valida a existência dos sprites.

## Construção em camadas inspirada diretamente no Slime-Harvest
- Origem: HelioConde/Slime-Harvest, scripts/building/house_builder.gd.
- O src/house-renderer.js reproduz as regras _roof_atlas, _wall_atlas, _add_front_windows e _add_roof_chimney para fachadas retangulares.
- Telhado com cinco faixas distintas, cantos laterais, cumeeira, beiral e chaminé.
- Porta usa o quadro fechado 5 do AutomaticDoor; janelas originais do atlas de paredes.
- Escala inteira 2x, nenhum sprite alongado horizontalmente.
- O mundo inicial do TILLFOLK continua vazio, sem casa preexistente. Apenas a casa ilustrativa do menu foi redesenhada.
- Playwright registra screenshot 1600x900 e captura do canvas 960x540.


### Ajuste fino das proporções — v1.1.1
- Casa ilustrativa: fachada reduzida de cinco para quatro fileiras de 16px.
- Janelas na terceira fileira (índice 2), porta na última fileira (índice 3), alinhadas no mesmo grid.
- A altura lógica passa de 288 para 256 pixels na escala 2×.
- Teste Playwright verifica as coordenadas reais de desenho no canvas, além das capturas.


### Alinhamento v1.1.2 (feedback visual)
- Janelas descem uma célula da grade renderizada: da linha 2 para a linha 3 (+32 px em escala 2×).
- O telhado desce três tiles originais de 16px (+48 px na cena), mantendo o total de cinco faixas.
- O telhado agora é desenhado antes da fachada; a sobreposição não encobre janelas e porta.
- Testes Playwright conferem coordenadas exatas, proporção e ordem de camadas; salvar screenshot do menu após cada alteração.
