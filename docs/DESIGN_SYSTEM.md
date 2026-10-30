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
