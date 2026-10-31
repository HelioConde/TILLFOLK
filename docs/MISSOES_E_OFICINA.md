# Prólogo de sobrevivência — Missões e Oficina

## Objetivo
O jogador aprende **fazendo**. O prólogo é finito: dez missões, progresso salvo, indicador compacto no jogo, texto de ajuda no hover e detalhes ao clicar (diálogo completo no celular). Ao concluir a última casa, a campanha marca **CONCLUÍDO**, não reinicia e não gera missões infinitas.

## Dez capítulos
1. **O vale começa nas suas mãos** — recolher 3 gravetos e 2 pedras soltas, diretamente da clareira.
2. **Uma oficina improvisada** — fabricar machado e picareta.
3. **O segredo da grama alta** — limpar 3 tufos e encontrar 1 semente. Cada tufo tem 25% de chance; não há promessa de drop por corte.
4. **Ferramentas para cultivar** — fabricar enxada e pá.
5. **Madeira para o futuro** — coletar 8 madeiras usando o machado.
6. **O primeiro canteiro** — arar 1 terreno com a enxada.
7. **O começo da plantação** — semear 1 canteiro (semente do estoque).
8. **Da lagoa ao canteiro** — fabricar balde e regar 1 planta, usando água da lagoa.
9. **A primeira colheita** — colher e transportar 1 produção.
10. **Um lar para recomeçar** — construir 1 cabana, com pá e machado. Conclusão definitiva.

Os marcos usam eventos **de tarefas terminadas**, não apenas ordens na fila. A missão não cria ações nem força trabalho agrícola. O jogador continua comandando cada etapa. As habilidades positivas dão bônus de velocidade e as restrições negativas permanecem proibitivas.

## Receitas (estoque compartilhado)

| Ferramenta | Custo | Uso |
| --- | --- | --- |
| Machado de pedra | 2 gravetos, 2 pedras | Árvores, tocos, troncos e arbustos lenhosos |
| Picareta de pedra | 2 gravetos, 2 pedras | Rochas grandes |
| Enxada | 2 gravetos, 1 pedra | Arar solo |
| Pá | 2 gravetos, 1 pedra | Fundações de cabana (com machado) |
| Balde rústico | 2 madeiras, 1 pedra | Coleta e transporte de água |

Gravetos, pedras soltas e grama alta podem ser coletados sem ferramentas. A nova fazenda começa com **0 madeira, 0 ferramentas, 0 sementes e 0 água**, sem animais. O mapa 80×50 fornece recursos coletáveis perto do ponto de entrada para não deixar o jogo travado. Ferramentas fabricadas são permanentes e usadas por ambos os colonos; não são consumidas por execução.

## Regras e compatibilidade
- Salvamento principal continua em `localStorage:tillfolk-v01`; `prologue`, `tools` e `inventory.twigs` são campos aditivos.
- Saves anteriores sem esses campos **recebem as ferramentas liberadas**, mantêm seus recursos e começam com o prólogo marcado como concluído; novas partidas seguem a progressão primitiva.
- Não usar IA para produzir sprites nem adicionar assets externos. Pedra solta usa o atlas local existente.
- Ao terminar uma ordem, o avanço de missão é salvo de imediato.
- O tutorial não substitui a ajuda estática de `src/tutorial.js`.

## QA
`tests/prologue.spec.cjs` cobre início sem equipamentos e sem animais, recursos de partida, coleta real, custos e fabricação, persistência, fim do prólogo, save legado e screenshots nas resoluções desktop e mobile. O workflow `.github/workflows/prologue-qa.yml` executa essa suíte independente. O QA visual legado da colônia continua sendo requisito de integração à main.

## Limitações
Ferramentas são **compartilhadas**, não atribuídas a cada inventário pessoal. O balde representa um utensílio simples; não existe ainda um sistema visual de fabricar/transportar ferramentas entre edifícios. Não foi criado banco de dados, nem serviço externo.
