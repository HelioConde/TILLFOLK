# Menu de pausa — refinamento de 01/11/2026

## Problema observado
Na captura 1594×810, o botão fechar aparecia centralizado sobre o título e cinco ações ocupavam uma coluna indistinta. A regra global de `design-system.css` configurava `.modal` como grid e impunha `place-items:center` no próprio `dialog`, centralizando cada filho.

## Decisões
- Corrigir `display` somente em `#game-options-dialog.modal[open]`, sem alterar o comportamento global de outros modais.
- Destacar **Continuar jogando**, separar **Configurações**, **Estoque** e **Mapa**, e deixar **Salvar e voltar** em rodapé próprio.
- Fechar no canto superior direito; usar `focus-visible`, foco inicial na ação principal, botões clicáveis por toque, responsividade em 390×844 e movimento reduzido.
- A pausa continua ativa ao consultar estoque ou mapa a partir das opções. Fechar esses painéis volta às opções; escolher um ponto do mapa retoma o jogo.
- Corrigir o salvamento ao sair: salvar antes de fechar o diálogo, preservando `sessionSpeed`. Se salvar falhar, não sair.
- Preservar localStorage, motor de Canvas, sprites, terreno e progressão.

## Verificação
`npx playwright test tests/game-options.spec.cjs --browser chromium` e a auditoria existente. O workflow de screenshots inclui este arquivo. Screenshots previstas: `screenshots/pausa-renovada-1600x900.png` e `screenshots/pausa-renovada-390x844.png`.

Nenhum arquivo da pasta de terrenos ou regra de autotile foi alterado.
