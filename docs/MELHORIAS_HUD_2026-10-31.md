# TILLFOLK — Rodada de melhoria de interface e feedback (31/10/2026)

## Objetivo

Deixar o HUD mais próximo de uma interface de jogo, e menos parecido com uma página web, sem trocar o motor e sem alterar os salvamentos locais. Parte da trilha de 30 melhorias proposta na conversa com o criador.

## Alterações implementadas nesta rodada

1. Barra superior reduzida em desktop: altura de 60 px, indicadores mais compactos.
2. Identificação de região reduzida e posicionada junto à parte superior esquerda.
3. Hotbar inferior compacta sem perder os cinco comandos, velocidades e atalhos existentes.
4. Ação selecionada mais evidente, mantendo as molduras e slots reais do Sprout Lands.
5. Inventário reorganizado em oito slots: madeira, pedra, cogumelos, flores, ervas, fibras, esterco e moradias.
6. Trabalhadores com estado explícito na ficha: trabalhando, caminhando, disponível.
7. Barras de progresso acessíveis em fichas e ordens.
8. Etiquetas dos trabalhadores no mapa com indicação de estado, separação alternada de etiquetas próximas e progresso abaixo do personagem.
9. Feedback visual não persistente quando uma ordem é atribuída ou concluída (respeita preferência de movimento reduzido).
10. Contorno do terreno sob o ponteiro; a prévia não cria ordens automaticamente.
11. Fila de tarefas com estados distintos: aguardando, em execução e disponível.
12. Ajustes responsivos para 1366×768 e 390×844; capturas automáticas para ambas.

## Arquivos

- `game-refinement.css`: refinamento final acima das skins `game-hud.css` e `sprout-ui.css`.
- `src/game.js`: indicadores e dados da UI. As regras de simulação, IA, inventário e persistência continuam as existentes.
- `tests/visual-refinement.spec.cjs`: screenshots e checks de overflow, inventário e estado do trabalhador.
- `.github/workflows/pages.yml` e `.github/workflows/menu-screenshots.yml`: distribuição e regressão no GitHub Pages.

## Próximas melhorias que não foram concluídas nesta rodada

- Animações específicas para todas as ferramentas, com atlas confiável e sem frames cortados.
- Câmera com zoom, minimapa e deslocamento suave com controles de teclado.
- Sons de conclusão de tarefa e melhorias do tutorial.
- Construção de novas estruturas e melhorias de terreno com estética uniforme.
- QA de partidas longas de múltiplos dias e monitoramento de colisões entre colonos.

Critérios: nenhum banco de dados; preservar `localStorage`, regras de ordens manuais, prioridades de trabalhadores e GitHub Pages.
