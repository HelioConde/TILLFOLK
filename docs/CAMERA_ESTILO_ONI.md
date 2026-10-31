# TILLFOLK — câmera inspirada em Oxygen Not Included

Implementada em `src/game.js`, preservando o canvas e os controles do jogo.

## Controles

| Controle | Ação |
| --- | --- |
| Roda do mouse / trackpad sobre o mapa | Zoom **suave**, com o ponto sob o cursor fixo durante a aproximação ou afastamento |
| W/A/S/D ou setas | Movimento contínuo da câmera |
| Shift + W/A/S/D | Movimento mais rápido |
| H | Centralizar a câmera no vale |
| Botão do meio + arrastar | Arrastar a câmera |
| Shift + arrastar | Alternativa para quem não usa botão do meio |
| Dois dedos na tela | Gesto de pinça para zoom e arrasto do mapa |
| Toque com um dedo + arrastar | Percorrer o mapa no celular |
| + / - | Zoom por níveis discretos no teclado |
| 0 | Restaurar posição e zoom |
| M | Abrir/fechar minimapa |
| Clique no minimapa | Ir à região selecionada |

O zoom varia de 100% a 400% com ajuste suave; os botões no painel usam níveis predefinidos, enquanto o scroll é contínuo. Ao mudar o zoom com a roda, o ponto do terreno sob o cursor é mantido na posição da tela sempre que os limites físicos do mapa permitem. A câmera jamais se desloca para fora do vale.

## Comportamento

- A escala atual é interpolada em `requestAnimationFrame` até a escala desejada, com curva exponencial de aproximadamente 95 ms.
- `prefers-reduced-motion: reduce` elimina a interpolação.
- A transformação mantém `image-rendering: pixelated`, sem suavizar os pixels das artes originais.
- Os comandos não afetam a simulação da colônia nem o salvamento em `localStorage`.
- Durante pan e pinça, o jogo não coloca tarefas no terreno por acidente.
- Controles de câmera não são ativados quando o usuário digita em formulários ou usa janelas modais.
- Ao iniciar ou retomar, a câmera retorna a 100% sem alterar o progresso do jogo.

## Testes

O workflow de QA visual executa testes de zoom por roda ao redor do cursor, movimento contínuo com WASD, botão do meio, tecla H, limites de zoom, minimapa e controles de celular. As capturas são publicadas na página **Actions** do GitHub.
