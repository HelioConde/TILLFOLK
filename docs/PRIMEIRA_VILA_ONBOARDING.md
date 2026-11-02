# Jornada após a primeira cabana

## Motivação
O tutorial já conduz os dois colonos pela agricultura, fabricação do machado, corte da árvore e construção da primeira cabana (13 objetivos). O desafio restante era o encerramento genérico: o jogador concluía a missão e precisava descobrir sozinho qual deveria ser o próximo investimento.

## Solução
A tela **Missões concluídas** passa a listar até **três objetivos reais ainda pendentes do capítulo atual da Jornada**. O jogo consulta `TillfolkProgression.OBJECTIVES` e `TillfolkProgression.read`; não inventa conquistas separadas nem gera tarefas automaticamente.

Após a primeira casa, quando ainda estiverem pendentes, o jogador vê:
- Construir um baú — armazenar recursos;
- Pesquisar agricultura eficiente — melhorar a capacidade da fazenda;
- Armazenar 12 alimentos — enfrentar o consumo crescente.

Conforme as metas forem de fato concluídas, a lista consultada se adapta ao próximo capítulo; nenhuma recompensa é distribuída pela tela. O botão **Abrir Jornada** fecha a conclusão do tutorial, devolve o controle da partida e abre diretamente a interface detalhada de objetivos. **Continuar jogando** e **Voltar ao menu** permanecem disponíveis.

## Compatibilidade
- Nenhuma missão extra ou alteração na versão 6 do tutorial: saves antigos já concluídos continuam concluídos.
- Não muda `state.orders`, `state.progression`, recursos, refeições, pesquisas, trabalhadores ou `localStorage`.
- HTML5 Canvas, Sprout Lands, Pages e contrato imutável `tillfolk-terrain-autotile/v1` intactos.

## Validação
`node --test tests/first-village-guide.test.cjs tests/tutorial-missions.test.cjs`

`npx playwright test tests/first-village-guide.spec.cjs --browser chromium`

Capturas em 1366×768 e 390×844, sem dependências de backend. O smoke de navegador exercita a apresentação e o botão da nova transição com uma partida existente; não pretende substituir um playtest completo de todas as 13 missões.
