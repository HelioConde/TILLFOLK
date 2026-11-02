# Prompt único — Evolução integral do TILLFOLK

> Plano de implementação para um agente de código conectado ao GitHub. Revisado em 02/11/2026 a partir do projeto real. É um **plano**, não a declaração de que todas as melhorias já foram feitas.

## PROMPT PARA COPIAR E EXECUTAR

Atue como **game director, game designer de sobrevivência, engenheiro JavaScript/Canvas, especialista em IA de trabalhadores, UX/UI, QA e release engineer** do projeto **TILLFOLK**:
- Repositório: https://github.com/HelioConde/TILLFOLK
- Jogo: https://helioconde.github.io/TILLFOLK/
- Motor atual: JavaScript + HTML5 Canvas, sem backend, banco de dados ou migração de engine.
- Objetivo: torná-lo um jogo de **sobrevivência e gerenciamento de colônia que seja divertido, legível, desafiador, estável e que incentive a continuidade**, inspirado em sistemas de *Oxygen Not Included*, mas com identidade, arte, código e mundo próprios.

**Execute as fases abaixo em sequência, de forma autônoma, sem exigir um comando meu para cada fase.** Antes de mudar qualquer funcionalidade, verifique o que já existe: **não reimplemente uma mecânica pronta, não esconda defeitos, não diga que passou um teste que não rodou**. Se um teste falhar, investigue a causa; distinga bug do produto, teste obsoleto, flakiness ou problema do CI. Faça PRs pequenos e coerentes, com commits, testes e documentação. Não publique mudanças que sabidamente quebrem o jogo. Se houver bloqueio real, registre-o com precisão e prossiga apenas para tarefas independentes.

### 0. Ler as regras e inspecionar o estado real (P0)
1. Leia integralmente: \`AGENTS.md\`, \`CLAUDE.md\`, \`GUIA_CLAUDE_TILLFOLK.md\`, \`DESIGN.md\`, \`docs/GDD_TILLFOLK.md\`, \`docs/ROADMAP_SOBREVIVENCIA.md\`, \`docs/ROADMAP_VISUAL.md\`, \`docs/AUTOTILE_PADRAO_IMUTAVEL.md\`, além dos documentos recentes em \`docs/\`.
2. Identifique e siga os agentes em \`.claude/agents/\`: \`game-director\`, \`survival-designer\`, \`colonist-ai\`, \`gameplay-engineer\`, \`pixel-art-guardian\`, \`qa-playwright\` e \`release-guardian\` quando presentes. Leia as skills relevantes: \`router\`, \`survival-crafting\`, \`game-ai\`, \`save-systems\`, \`tillfolk-save-compat\`, \`game-ui-ux\`, \`game-feel\`, \`procedural-gen\`, \`performance-optimization\`, \`playwright-cli\` e \`tillfolk-design-audit\` quando disponíveis. Não trate a existência de uma skill como garantia de que seus comandos funcionam.
3. Se o grafo Graphify e a CLI estiverem disponíveis, siga as regras em \`CLAUDE.md\` para consultá-lo antes das buscas no código; se não estiverem, use leitura de arquivos e registre a limitação.
4. Inspecione a \`main\` mais recente, issues, PRs, GitHub Actions, código, saves, sprites, scripts, CSS e testes. Monte inventário **implementado / parcial / inexistente / regressão / documentação desatualizada**, com evidências e dependências.

### 1. Estabilizar a base e corrigir o QA primeiro (P0, obrigatório)
1. Investigue o histórico real das Actions, principalmente a execução visual **41386880974**, que registrou **40 testes falhando e 50 passando** numa versão anterior (não extrapolar para a \`main\` atual). Verifique também os resultados mais recentes. Entre os sinais desse run havia expectativas antigas sobre fauna inicial, fluxos de ordens, UI e tempos limite.
2. Execute \`node --test tests/*.test.cjs\`, \`node --check\` nos módulos, testes de contrato do terreno e Playwright; reproduza as falhas com seed e fixtures fixos. Categorize cada caso: bug real, teste obsoleto após mudança deliberada do GDD, teste dependente de tempo, seletores quebrados, screenshot/overflow ou problema de ambiente.
3. Corrija **código quando a regra do jogo falha** e **teste quando a expectativa é comprovadamente obsoleta**; nunca apague uma asserção somente para deixar a Action verde. Garanta CI sem 404, sem erro JS, com publicação que respeita o caminho \`/TILLFOLK/\`. Preserve as evidências dos testes.
4. Atualize \`README.md\` e o roadmap, cujos trechos históricos ainda descrevem fome, mortalidade ou descanso como pendentes apesar de existirem módulos mais novos. Não marque sistema completo sem checar gameplay ponta a ponta.

### 2. Melhorar os primeiros 15–30 minutos do jogo (P0)
1. Faça a jornada inicial ser fácil de entender e progressivamente interessante: chegada de dois colonos → gravetos → Work Station → ferramenta correta → limpar/arar → semente → regar → colher → **transportar comida fisicamente** → fabricar machado → cabana → primeiro mutirão e nova decisão. Não conceder recursos mágicos para simular progresso.
2. Audite \`src/missions.js\`, \`src/tutorial-pointer.js\`, \`src/tutorial.js\`, o botão "Mostrar no mapa", a mãozinha Catpaw existente, missões, notificações e a experiência de alguém que jogou somente até obter o machado. Corrija qualquer passo sem destino ou pointer invisível.
3. Depois do machado, destaque **uma única próxima meta clara**, sem excesso de janelas: construir abrigo, organizar estoque ou primeiro cultivo sustentável. Mantenha "Como jogar" separado do tutorial jogável e permita continuar a mesma partida.
4. Meça tempos reais até cada marco por seed; reduza espera inútil, mas conserve o peso das tarefas agrícolas e o benefício de ter especialistas/mais trabalhadores. Garanta que nenhuma combinação inicial permitida de traços impede a progressão.

### 3. IA dos colonos, prioridades e prevenção de impasses (P0)
1. Inspecione \`src/game.js\`, \`src/task-orders.js\`, \`src/crafting.js\`, \`src/logistics.js\`, caminhos e estado do colono. Melhore **a escolha de tarefas já autorizadas pelo jogador** com pontuação explicável: prioridade global/individual, especialização, distância real, acesso ao destino, recursos entregues, fome, energia, saúde, riscos e urgência.
2. Respeite estritamente: **até 3 habilidades positivas e 3 traços negativos**; tarefas são livres salvo proibição vermelha; menos especializações positivas significam maior bônus em cada uma. Traço vermelho também impede equipar ferramenta da atividade proibida. Os dois colonos iniciais não podem ter a mesma proibição vermelha, inclusive transporte.
3. Evite trabalhador parado com ordem apta, dois colonos reservando a mesma entrega, transporte duplicado, tentativas infinitas sem caminho, loop de atribuição/cancelamento, tarefa mantida após colheita/chuva, equipamento usado por trabalhador proibido e recursos retirados do inventário sem entrega.
4. Mostre em linguagem natural **o que cada pessoa está fazendo, por que está ociosa e o que falta**. Prioridade de emergência deve evitar inanição, mas **não criar plantação, coleta ou construção sem ordem do jogador**.

### 4. Economia agrícola e sobrevivência sustentável (P0)
1. Preserve a agricultura estratégica já existente: 19 culturas com tempo, rendimento, estação ideal, 1–3 regas, chuva, retorno de sementes, seleção do próximo plantio e comando explícito de regas em lote.
2. Balanceie produção, consumo, água, sementes, ferramentas, deterioração, distâncias e transporte para **2, 3 e 5 colonos**, com cenários reprodutíveis de 7, 14 e 28 dias e múltiplas seeds. Diferencie meta orientativa de produtividade real. Não aumente comida sem uma colheita entregue.
3. Faça \`state.food\` e \`foodLedger\` permanecerem coerentes: histórico de colheitas não é estoque disponível. Refeições, Conselho, recrutamento, deterioração e crafting devem ser atômicos; saldos nunca podem ser negativos ou duplicados.
4. Encontre e remova gargalos impossíveis: falta irreversível de sementes iniciais, necessidade de ferramenta sem receita acessível, água inalcançável, solo não cultivável perto do início ou tutorial que exige colheita antes de preparar a infraestrutura.
5. Ajuste números por **medição**, não por palpite. A sobrevivência deve ter decisões reais, avisos antecipados e caminhos de recuperação; não tornar a colônia infinita nem condená-la automaticamente.

### 5. Dia, noite, sono e rotina (P0 — regra já decidida)
1. **Não reverta a configuração atual**: dia 06h–22h (16h), noite 22h–06h (8h), velocidade 1× com ciclo de 32 minutos reais; 0×, 3× e 6× proporcionais.
2. Colonos padrão dormem no turno **22h–06h**, acordam às **06h** e não iniciam cochilos por conta da energia fora do turno. Turno noturno opcional 08h–16h, também 8h. O retorno físico até a cama deve continuar, sem teleporte.
3. Investigue se o colono sai tarde demais para chegar ao abrigo, se o repouso recupera energia suficiente, se 6× gera travamentos, se tarefas retomam após acordar e se o tutorial pode ficar bloqueado no horário de dormir.
4. Corrija apenas o necessário, preservando a regra de 8 horas. Verifique relógio, fome, energia, moral e crescimento usando tempo coerente, inclusive ao pausar e carregar saves antigos.

### 6. Logística física, construção e crescimento da vila (P1)
1. Audite coleta → item caído → transporte por capacidade → baú/estoque → entrega na obra → construção. Materiais nunca podem se teleportar, ser reservados duas vezes ou desaparecer no cancelamento, na morte ou no reload.
2. Diferencie carregador especializado (mais eficiência/capacidade) do generalista; teste pilhas múltiplas, caixa cheia, fonte esgotada, distâncias grandes e prioridade de construção.
3. Preserve os blueprints azul/transparente para válidos e vermelho para inválidos, com texto de material faltante e cancelamento pelo botão direito. Controle de ordens deve ser compatível com arrastar seleção e touch.
4. Casa fornece vagas reais; recrutar requer vaga, recursos e custo de alimentação. A partir de 3–5 moradores, o esforço de sustentar a vila aumenta. Expandir não pode tornar a equipe automaticamente invulnerável.

### 7. Exploração dos seis biomas com recompensa real (P1)
1. Use os seis biomas existentes, recursos distintos, distância e preparação para explorar. Compare seeds, passagens, pontes, rios, áreas perigosas, recursos necessários e segurança do spawn.
2. Faça a exploração oferecer decisões úteis (novos materiais, pesquisa, construção, melhorias de logística, ferramentas e etapas do foguete), sem bloquear o início por recursos inalcançáveis.
3. **CONTRATO PERMANENTE: NÃO ALTERAR** \`tillfolk-terrain-autotile/v1\`, os nove atlas originais, \`ROLES\`, IDs, cantos, tiles 16×16, grade 11×7 ou algoritmo de oito vizinhos. Água, pontes, vegetação e objetos são camadas independentes.
4. Proteger licença dos sprites Sprout Lands: use **somente os arquivos já autorizados no projeto**, sem gerar imitações nem treinar IA com o pack premium.

### 8. Diversão, recompensas e decisões (P1)
1. Preserve **Mutirões do Vale, Conselho do Vale e a jornada principal**, sem reimplementá-los. Conecte progresso de curto prazo ao objetivo longo de sobreviver e construir o foguete.
2. Adicione, só se fizer sentido após playtest, pequenos dilemas de recursos, eventos sazonais com aviso antecipado, descobertas de áreas e melhorias de produção. Nunca use recursos gratuitos, cronômetros artificiais ou punições manipulativas para forçar retorno.
3. Dê feedback de conclusão do trabalho: sprite certo, animações, partículas discretas, som opcional e texto curto (material coletado, safra entregue, obra concluída), sem cobrir o mapa.
4. Meça funil de objetivos: chegada → Work Station → enxada → primeira safra → machado → cabana → primeira decisão pós-tutorial. Registrar apenas dados locais de teste, sem coletar dados pessoais de jogadores.

### 9. UX/UI, acessibilidade e arte (P1)
1. Audite tela inicial, HUD, Estoque, Oficina, Ordens, colono, pesquisa, minimapa, recrutamento e tutorial em **1600×900, 1366×768 e 390×844**.
2. O mapa é protagonista: reduzir elementos repetidos e texto excessivo; mostrar comida, risco, pessoas vivas, hora, velocidade, missão e alertas essenciais. Painéis secundários devem ser acessíveis sem ocupar metade da tela.
3. Não deixar botões invisíveis, elementos fora da viewport, fontes pequenas sem contraste, tooltip inacessível ao toque, modal que não fecha, ausência de foco, ou áreas arrastadas presas após cancelar. Respeitar \`prefers-reduced-motion\`.
4. Conferir cada recorte de sprites nos arquivos reais antes de alterar animações; corrigir esquerda/direita, profundidade, pés no chão, casa e animais mediante screenshots, **não por suposição de coordenadas**.

### 10. Desempenho, arquitetura e salvamento (P1)
1. Medir FPS/frame time, uso de memória e responsividade com mapa 192×120, vários trabalhadores, ordens e animais a 1×/3×/6×. Profilar antes de otimizar. Preferir cache de caminhos, redução de buscas repetidas, atualização parcial do DOM e desenho somente da área visível.
2. Refatorar \`src/game.js\` gradualmente em módulos testáveis, se isso reduzir risco real; não fazer reescrita total nem mudar o motor. Evite regressão em APIs globais e na ordem de scripts do HTML.
3. Preservar saves \`localStorage\` (\`tillfolk-v01\`), workers, nomes em homenagem a Simone, mundo/seed, inventário, ferramentas, casas, ordens, tutorial e horário. Migrar em leitura com defaults sem criar itens; testar saves legados e corrompidos.
4. Implementar exportação/importação **opcional** de backups JSON com validação de esquema, confirmação e restauração segura, depois de garantir que a retomada atual está estável.
5. Atualizar a documentação para distinguir sonho do GDD, sistema implementado e bug conhecido. Medir desempenho antes/depois e informar os números reais, não estimativas sem teste.

### 11. Testes, screenshots, PRs e publicação (obrigatório em cada fase)
1. Trabalhar numa branch por conjunto coerente; criar PR, testar, revisar diffs e mesclar apenas quando não houver regressões bloqueantes.
2. Executar \`node --check\` nos JS alterados, \`node --test tests/*.test.cjs\` e, **obrigatoriamente**, \`node --test tests/terrain-contract.test.cjs tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs\`.
3. Rodar Playwright dos fluxos mudados e, antes de declarar release, suíte completa. Testar clique, arrastar, botão direito, pausa, 1×/3×/6×, dia/noite, dormir/acordar, fome, Work Station, plantio, colheita, transporte, casa, recrutamento e save/reload.
4. Tirar **screenshots reais** antes/depois das telas alteradas no desktop e celular. Capturar console, requisições 404, exceções, cortes de interface, sprites errados e travamentos. Validar o conteúdo realmente montado em \`_site/\` e servido em \`/TILLFOLK/\`, não apenas na raiz local.
5. Conferir \`.github/workflows/pages.yml\`, \`.github/workflows/full-audit.yml\`, \`.github/workflows/menu-screenshots.yml\` e outras Actions relacionadas. Nunca confundir workflow "queued", "in progress" ou falha de Playwright com aprovação.
6. Se um deploy ou o CI falhar, registrar URL, teste, erro e causa identificada, corrigir e executar novamente antes de afirmar que a atualização está pronta.
7. Entregar ao final **um relatório único**, com tabela por fase: problema identificado, melhoria realizada, arquivos e commits, resultados de testes, screenshots, estado da Action/Pages, limitações e as próximas prioridades. Se parte não foi implementada, marcar **pendente**, sem inventar.

**Ordem de prioridade:** integridade e QA → primeiros minutos e fluxo crítico → IA sem impasses → sustentabilidade da comida → rotina e sono → logística e moradia → exploração → prazer de jogar/UX → desempenho e arquitetura. Preserve tudo que já está correto. Seu objetivo não é produzir muitos commits: é melhorar de fato a experiência de jogar TILLFOLK e publicar um jogo estável.
