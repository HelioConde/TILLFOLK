# HUD de jogo v2 — TILLFOLK

## Objetivo

Fazer a interface parecer uma parte natural do jogo de fazenda/colônia, e não um site comum desenhado sobre o mapa.

## Diagnóstico da captura (1366×768)

- A barra superior escura tinha métricas pequenas e monótonas.
- O painel da fazenda era uma janela web sobreposta.
- A barra inferior era um formulário horizontal com botões grandes e pouca diferenciação.
- O aviso de tutorial aparecia como balão claro solto no campo.
- Botões de trabalho e velocidade não partilhavam o estilo do pixel art.
- Verde escuro uniforme competia visualmente com o gramado.

## Regras implementadas

1. **Paleta Sprout Lands**: madeira marrom-escura, borda dourada e tons de creme, com verde usado para estados ativos; tokens em `game-hud.css`.
2. **Sprites originais**: os ícones de ações usam moldura do arquivo já presente `public/assets/Sprout Lands - UI Pack - Basic pack/Sprite sheets/buttons/Square Buttons 26x26.png`; renderização pixelated, sem downloads adicionais.
3. **HUD compacto**: recursos em pequenos slots legíveis, sem bloquear a visão do mapa.
4. **Dock de ferramentas**: cinco ações em slots, seleção forte, velocidade separada. Os rótulos mantêm texto legível para jogadores novos.
5. **Estado contextual**: indicação da ação ativa em `hud-selection` muda quando o jogador seleciona trabalho, construção, pausa ou outro modo; uma única linha de instrução substitui o excesso de pop-ups.
6. **Janela de gestão**: aparência de painel de jogo com madeira, bordas e cartões de colonos.
7. **Camada sobre o mundo**: leve vinheta CSS para profundidade, sem desfocar a pixel art ou bloquear toques/cliques.
8. **Compatibilidade**: não alterar formato de salvamento, motor do jogo, ordem das tarefas, permissões dos trabalhadores ou asset packs.
9. **Acessibilidade**: controles mantêm seus elementos HTML, teclado, aria-pressed, foco visível e preferência por movimento reduzido.

## Atalhos opcionais

- `1`: Arar.
- `2`: Abrir ordens.
- `3`: Cancelar.
- `4`: Inspecionar.
- `5`: Construir.
- `E`: Equipe.
- `T`: Tarefas.
- `Espaço`: Pausar/retomar.

Os atalhos não são acionados quando se está digitando, com modais abertos ou usando os atalhos de camada do editor de construção.

## Validação

`tests/menu.spec.cjs` gera capturas em 1366×768 e 390×844, também com os painéis de ordens e de equipe abertos. Verificar encaixe do dock, largura dos comandos e absence de erros JavaScript. A publicação estática inclui os arquivos novos no GitHub Pages.

## Próximas fases

- Fazer o minimapa e menus de trabalho parecerem partes do mundo.
- Diminuir a densidade visual de elementos naturais sobrepostos nas bordas do mapa.
- Adicionar seleção visual do trabalhador sobre o cenário, feedback de tarefas e zoom opcional.
- Avaliar novos atlas originais do pacote, sempre sem substituir o estilo pixelado.
