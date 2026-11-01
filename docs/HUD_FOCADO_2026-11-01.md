# HUD focado — 01/11/2026

## Diagnóstico
Na captura 1589×66, a mesma linha tentava mostrar dia, hora, fase, gestão da colônia, vivos, comida, autonomia, consumo, alerta, quatro velocidades e cinco telas de gestão. O CSS em `top-speed.css` forçava todos os blocos na primeira linha; os indicadores finais ficavam cortados e os botões ocupavam muito espaço.

## Solução
- Barra fixa em 60px no desktop, 94px em tablets e 126px em celulares estreitos, com separação explícita por grade (marca, métricas vitais, velocidade, atalhos e menu).
- Visíveis sem interação: dia/hora, fase (exceto celular pequeno), vivos, comida e alertas de sobrevivência reais; alerta `ok` não ocupa espaço.
- `⋯ Detalhes` abre consumo/dia, autonomia alimentar e Colônia (sono, clima, pesquisa e automação). Fecha fora, Escape ou ao selecionar uma ação.
- No celular estreito, indicadores vitais têm uma linha completa e a velocidade fica na terceira linha, sem cortar comida e população.
- Cinco atalhos mantidos e identificáveis por título, rótulo acessível e ícone. Em telas menores, o rótulo visual some, não o botão; os contadores da jornada/equipe/tarefas continuam atualizados pelo motor.
- Controles de pausa, 1×, 3×, 6× permanecem visíveis e com IDs e listeners originais.
- Apenas index.html e camada visual/JS isolado: sem alteração de save, IA, tiles, mapas, assets ou progressão.

## QA
`npx playwright test tests/hud-focus.spec.cjs` cobre 1600×900, 1366×768, 390×844, geometria dos grupos, botão Detalhes, Escape e abertura do estoque. A suíte existente e os workflows do GitHub Actions são a regressão do projeto. A comparação visual de screenshots do workflow ainda requer inspeção humana.

## Próximas melhorias
- Substituir glifos genéricos dos atalhos pelos recortes corretos do atlas Sprout Lands após inspeção do sprite sheet.
- Indicador textual de perigo que priorize fome, incêndio e tarefas bloqueadas quando as respectivas regras de jogo estiverem disponíveis.
