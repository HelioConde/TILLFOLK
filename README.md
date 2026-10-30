# TILLFOLK 🌱

Jogo HTML5 de **fazenda, sobrevivência e automação de trabalhadores** com visual 2D pixel art. A inspiração nas listas de tarefas de *Oxygen Not Included* está no gerenciamento, não no gênero de combate.

## Protótipo v0.3 — fluxo de criação e gerenciamento

- Menu inicial com **cenário panorâmico montado diretamente dos sprites de Sprout Lands** (tiles, telhas, paredes, árvores, trabalhadores, plantações, cercas e poço), botões HTML funcionais, tela cheia e cartões com sprites. `src/menu-scene.js` é testado e empacotado no GitHub Actions; os sprites necessários estão selecionados dentro do diretório `public/assets/sprout-lands`, sem depender de pacotes inteiros.
- Continuar e instruções; salvamento local pelo navegador.
- **Nova fazenda:** seleção de modos com prévias feitas de sprites originais, escolha do modo Sobrevivência/Fazenda Tranquila, nome da fazenda e seleção de exatamente 2 trabalhadores iniciais gratuitos. A tela agora apresenta personagens ampliados em pixel art, explicação individual de habilidades/traços, eficiência, atividades permitidas e tempos de execução por tarefa. Permite renomear e sortear individualmente ou em conjunto; a partida só começa após confirmação.
- Cena de fazenda com sprites de grama, plantas, árvores, pedras, poço e trabalhadores de Sprout Lands.
- Selecione **Cultivar** e clique no solo: o sistema cria uma sequência automática de tarefas.
- Ciclo: **limpar → arar → fertilizar → semear → regar → crescer → colher → transportar**.
- Trabalhadores escolhem tarefas autonomamente considerando prioridades e restrições.
- Contratação com até **3 habilidades positivas** e **3 traços negativos** por pessoa.
- Especialidades oferecem bônus: 1 habilidade (+100%), 2 (+60%) ou 3 (+30%).
- Ações são demoradas para valorizar especialização e ajuda de vários trabalhadores.
- Prioridades globais (1–9) e **matriz individual de prioridade por trabalhador**, respeitando restrições e especialidades, além de velocidade da simulação 1×, 3×, 6× ou pausa.
- Tela **Habilidades** com tempos e bônus atuais de cada trabalhador; progressão avançada ainda não implementada.
- Economia inicial simples de sementes, água, comida e moedas.

## Rodar

Abra o arquivo [index.html](./index.html) em um navegador moderno, ou use um servidor estático:

\`\`\`bash
python -m http.server 8080
\`\`\`

Depois acesse http://localhost:8080. Não há dependências nem banco de dados. O jogo pode ser publicado com **GitHub Pages** usando a pasta raiz da branch \`main\`.

### Estrutura principal

- \`index.html\`: cenário visual, HUD, menu e janelas.
- \`styles.css\`: interface responsiva com tipografia Sprout Lands UI Basic.
- \`src/game.js\`: simulação, renderização em canvas, automação, recrutamento e salvamento.
- \`public/assets/sprout-lands/\`: sprites selecionados para a fazenda.
- \`public/assets/Sprout Lands - UI Pack - Basic pack/\`: fonte e elementos da UI original.

## Estado de desenvolvimento

**Protótipo de mecânicas**, não jogo concluído. A construção, personagens mais elaborados, navegação com obstáculos, sistemas de comida/necessidades detalhados, IA avançada, animações direcionais e balanceamento serão desenvolvidos em etapas. O crescimento acontece ao longo de tempo simulado.

## Créditos e licença

**Assets — Sprout Lands, por Cup Nooble.** Veja [licenças](./licenses/sprout-lands-premium.txt) e [créditos](./docs/ASSET_CREDITS.md). Os materiais premium não podem ser revendidos ou distribuídos como pacote independente de assets. Proibido uso para treinamento de IA conforme licença do autor.
