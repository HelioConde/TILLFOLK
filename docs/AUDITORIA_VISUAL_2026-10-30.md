# Auditoria visual e plano contínuo — TILLFOLK

Data: 30/10/2026  
Objetivo: tornar o protótipo HTML5 um jogo de fazenda legível, coerente e testável por screenshots, preservando o funcionamento no GitHub Pages sem banco de dados.

## Evidências realmente examinadas

- `screenshots/menu-1366x768.png`, `screenshots/recrutamento-1125x790.png` — primeiros artefatos do workflow **QA visual**.
- `screenshots/jogo-1366x768.png`, `screenshots/jogo-1600x900.png`, `screenshots/atlas-personagens.png` — novas capturas Playwright da partida real, geradas em GitHub Actions.
- `screenshots/jogo-imersivo-1600x900.png`, `screenshots/jogo-cultivo-1600x900.png`, `screenshots/jogo-390x844.png` — comparações adicionais de interface, cultivo e celular.

Todos são anexados ao workflow `.github/workflows/menu-screenshots.yml` em **Actions > QA visual**. Não confundir sucesso do workflow com aprovação artística: o teste automatizado só observa os critérios documentados.

## Diagnóstico

1. **Movimento:** a rotina original aproximava as coordenadas diretamente do alvo, sem rota nem colisão com a casa, árvores, pedras e poço.
2. **Animação:** utilizava sempre a linha inicial do sprite, mesmo para andar nas demais direções.
3. **Encaixe no terreno:** o sprite não distinguia claramente a posição dos pés e não passava atrás de árvores.
4. **Cena:** grande área de grama repetida, pouca hierarquia entre caminhos, casa, área de cultivo e poço.
5. **HUD:** o jogo parecia uma página administrativa; ações e mapa não estavam visualmente integrados.
6. **Responsividade:** em telas estreitas, a horta ficava fora da visualização inicial; em tela cheia visual o painel de ferramentas podia ficar abaixo da viewport.
7. **Publicação:** o pacote mínimo de GitHub Pages necessita copiar explicitamente todas as folhas CSS usadas pelo HTML.
8. **Cobertura:** o QA anterior fotografava apenas menu e recrutamento.

## Etapas sequenciais — não é necessário um comando por etapa

| Etapa | Trabalho | Situação |
| --- | --- | --- |
| 01 | Inventariar atlas, dimensões/linhas de frente, costas, esquerda e direita; fotografar frames reais | Feito |
| 02 | Adicionar screenshots da partida normal, modo imersivo, plantio e celular | Feito |
| 03 | Substituir deslocamento em linha reta por caminho em grade contornando obstáculos | Feito |
| 04 | Animar o sprite apenas durante movimento e conforme direção; prender os pés ao chão | Feito |
| 05 | Ordenar colonos/árvores/objetos por profundidade para oclusão adequada | Feito |
| 06 | Construir caminhos e cercas legíveis sem trocar os assets licenciados | Feito |
| 07 | Criar botão Tela de jogo / Mostrar gestão para dar protagonismo ao mapa | Feito |
| 08 | Compactar HUD, foco de teclado, reduzir movimento e centralizar a horta no celular | Feito |
| 09 | Copiar folhas CSS para o artefato de GitHub Pages e validar via Actions | Feito — sujeito ao workflow |
| 10 | Auditoria de todas as coordenadas e transparências de atlas (casas, plantas, ferramentas, efeitos) | Pendente |
| 11 | Melhorar atlas e variedade de biomas, caminhos, objetos sazonais e feedback de seleção | Pendente |
| 12 | Refinar colisões dinâmicas, evitar trabalhadores se sobrepondo e melhorar feedback de trabalho | Pendente |
| 13 | Criar zoom/arrasto do mapa com foco, sem perder resolução dos pixels | Pendente |
| 14 | Testar automação longa: horas simuladas, colheita, persistência, restrições de tarefas, recrutamento | Pendente |
| 15 | QA por screenshot em todos os estados e resoluções após cada fase | Processo contínuo |

## Critérios de qualidade

- Não desenhar uma imagem em um recorte `source x/y/w/h` que extrapole as dimensões naturais do atlas.
- O pé do trabalhador e sua sombra devem permanecer na mesma coordenada de mundo; andar usa os frames 4–7 do atlas de 48 px, parado usa 0–3.
- O trabalhador deve contornar, e não atravessar, construções/árvores/pedras/poço.
- O jogo oferece modo de visualização centrado no mapa, sem perder os controles de gerenciamento.
- O menu, o recrutamento, o jogo normal e o modo imersivo são fotografados e verificados a partir de um servidor HTTP local no GitHub Actions.
- O produto permanece completamente estático: HTML, CSS, JS, assets e `localStorage`, sem API ou banco de dados.

## Próxima rodada recomendada

Priorizar revisão visual dos atlas de cultivos, pedras e árvores com pranchas de sprites; corrigir coordenadas de cada objeto identificando a célula exata; depois introduzir animações de uso de ferramenta e feedback claro de limpar/aragem/rega/colheita. Preservar a licença dos sprites originais, sem usá-los para treino de IA.
