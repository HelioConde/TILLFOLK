# Tutorial interativo e missões — TILLFOLK

O menu separa dois caminhos:

- **Como jogar:** o guia ilustrado existente, independente da simulação; não completa missões.
- **Tutorial · missões:** abre a configuração de uma nova fazenda. Após escolher modo e dois trabalhadores, o jogador recebe objetivos dentro do mundo. **Nova Fazenda** também começa com missões, para integrar o aprendizado à partida.
- **Continuar:** retoma a mesma fazenda e o progresso salvo em `state.tutorial`. Jogos salvos antes desta versão continuam sem objetivos retroativos.

## Sequência (validação por ações concluídas)

| Etapa | Missão | Validação |
| --- | --- | --- |
| 1 | O vale está vivo | Um colono efetivamente remove grama alta |
| 2 | Uma surpresa entre as folhas | Encontrar uma semente ao cortar grama (25% por tufo) |
| 3 | A terra precisa respirar | Conclusão da ordem Arar |
| 4 | O primeiro plantio | Conclusão da ordem Semear |
| 5 | Água para o amanhã | Conclusão da ordem Regar (busca na lagoa permitida pela ordem) |
| 6 | Paciência que vira alimento | Colher cultura com crescimento completo |
| 7 | Nada fica para trás | Transportar colheita para o estoque |
| 8 | Um futuro para a colônia | Criar blueprint de cabana ou canteiro, sem forçar construção instantânea |

Não há tarefas auto-enfileiradas pelo tutorial. A ferramenta Universal continua criando somente a próxima ordem, e o clique direito cancela ordens ou blueprints. O botão **Mostrar no mapa** localiza um objetivo e seleciona a ferramenta adequada. **Detalhes** abre instruções no toque/click; passar o mouse sobre o cartão também revela a ajuda. Um balão no mapa alterna a fala contextual entre os primeiros colonos.

Ao cumprir o último objetivo, a simulação pausa, salva o estado e exibe duas opções: **Continuar jogando** (restaura a velocidade anterior) e **Voltar ao menu inicial** (salva antes de sair). A conclusão não reaparece ao carregar a fazenda.

## Verificações

Execute `node --test tests/tutorial-missions.test.cjs` para testar as regras e o save sem dependências. Para revisão visual, teste a versão publicada no GitHub Pages em desktop e mobile, incluindo a leitura da missão por mouse e por toque, o botão localizador, o diálogo final e o retorno com Continuar. A inspeção visual ainda precisa ser feita no navegador.
