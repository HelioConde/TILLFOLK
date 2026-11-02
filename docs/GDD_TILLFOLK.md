# GDD — TILLFOLK: Sobrevivência de Colônia
**Documento central de design (visão do jogo)** · 31/10/2026 · Estado: visão aprovada pelo criador; mecânicas futuras ainda requerem implementação.

> **Regra de consulta:** este GDD define o destino do jogo. `docs/ROADMAP_SOBREVIVENCIA.md` ordena as entregas. Documentos antigos em `docs/` registram implementações específicas e podem estar desatualizados. Nunca tratar uma proposta neste GDD como funcionalidade já implementada.

## 1. Identidade e proposta

**TILLFOLK é um jogo de SOBREVIVÊNCIA e GERENCIAMENTO de colônia, inspirado profundamente nas mecânicas de *Oxygen Not Included*.** Não é um simulador de fazenda sem consequências: a fazenda é uma das formas de produzir o necessário para que pessoas sobrevivam.

O jogador comanda as **prioridades e ordens** de um grupo que chega a um mundo selvagem com poucos recursos. Os colonos precisam de comida e segurança; com o tempo, precisam de infraestrutura, proteção e organização. O grupo começa pequeno, fabrica equipamentos, cultiva a terra, constrói moradias, recruta novos moradores e **expande seu território para acessar recursos diferentes**. Um erro de planejamento pode resultar na morte de personagens e, eventualmente, no fracasso da colônia.

**Referência de mecânicas:** Oxygen Not Included (demandas dos colonos, prioridades, distribuição de trabalho, cadeias produtivas, gestão de escassez, consequências, expansão). **Identidade própria:** TILLFOLK, mundo exterior pixel art com arte Sprout Lands licenciada, sem copiar personagens, arte, mapas ou código de outros jogos.

**Plataforma:** HTML5, desktop e mobile, jogável em GitHub Pages; persistência local sem banco de dados; sistema determinístico ou reproduzível onde possível.

## 2. Princípios inegociáveis [DECIDIDO]

1. **A sobrevivência é a meta central.** Não basta plantar: a colônia precisa produzir e distribuir comida suficiente para não perder seus integrantes.
2. **Pessoas importam.** Cada colono tem nome, características, estado, talentos, limitações e uma função prática na economia da colônia. Quando alguém morre, o impacto no trabalho e na população é real; não reaparece imediatamente sem consequência.
3. **Construir moradias é pré-requisito para crescer.** Recrutar um novo morador exige vaga habitável e recursos/condições de recrutamento.
4. **Explorar e expandir altera as opções estratégicas.** Barreiras, obstáculos, biomas e perigos condicionam o acesso a novos recursos e processos. O mapa inicial não entrega tudo.
5. **O jogador designa o trabalho; os colonos executam.** A IA escolhe autonomamente entre as ordens autorizadas de acordo com prioridade, competência, distância, capacidade e segurança.
6. **Trabalho exige tempo e materiais.** Ferramentas, coleta, agricultura, fabricação, construção e transporte não são instantâneos. A escolha de trabalhadores especializados e a execução paralela importam.
7. **Informação clara e consequências justas.** O jogo avisa sobre fome, tarefas bloqueadas, falta de materiais, perigos e riscos antes de perdas irreversíveis.
8. **Sem backend obrigatório.** O estado completo deve poder ser salvo/recuperado localmente, com migração compatível e opção futura de exportação/importação.

## 3. Loop principal de jogo [DECIDIDO]

**Explorar → designar coleta → transportar e estocar → fabricar ferramentas → plantar/produzir comida → alimentar colonos → construir abrigo → recrutar → organizar produção → desbloquear território/novos recursos → sobreviver a uma demanda maior.**

### Etapas de progressão previstas

| Fase | Experiência desejada | Pressão principal |
| --- | --- | --- |
| 0. Chegada | Dois colonos, clareira em mundo aberto, coleta manual de recursos, tutorial contextual | Poucos materiais e comida inicial limitada |
| 1. Subsistência | Work Station, ferramentas, sementes, água e primeira colheita | Produção regular antes de acabar o alimento |
| 2. Primeira vila | Cabanas, armazenamento e terceiro/quarto colono | Mais braços também significam mais bocas |
| 3. Expansão | Explorar biomas e alcançar minerais/recursos raros; bloqueios de progressão ficam para uma etapa futura | Distâncias, segurança, disponibilidade e transporte |
| 4. Especialização | Múltiplas oficinas, agricultura diversificada, construção e cadeias produtivas | Gargalos, consumo, manutenção e divisão de trabalho |
| 5. Colônia avançada | Rede estável de alimentação, repouso, saúde, água e proteção ambiental | Eventos, escassez e crescimento sustentável |

Nenhuma duração ou população-alvo é fixa até o balanceamento.

## 4. Colonos, funções e IA [DECIDIDO / APROFUNDAR]

- Cada personagem pode ter **até 3 habilidades positivas** e **até 3 traços negativos**.
- **Todo colono pode executar qualquer atividade**, exceto as explicitamente proibidas pelos próprios traços negativos. Especialização **não é licença ou desbloqueio**: é bônus de eficiência e preferência de alocação.
- Quanto **menos especialidades positivas**, maior o benefício em cada uma delas: protótipo atual usa **1 habilidade: 2,0×; 2: 1,6×; 3: 1,3×** em tarefas correspondentes. Um especialista em irrigação é mais rápido ao regar que um generalista e que alguém com três especialidades.
- Cada colono tem uma função prática **emergente de seu perfil e das prioridades**, não uma classe rígida. Exemplos: coletor/explorador, agricultor, construtor, carregador/logístico, minerador, fabricante, cozinheiro, cuidador/pesquisador (últimas profissões dependem de futuros sistemas).
- O jogador configura prioridades globais e por trabalhador (1–9), podendo intervir em tarefas urgentes; a IA escolhe autonomamente a melhor ordem **já disponível**, respeitando restrições, habilidades e caminhos.
- Fadiga, fome, estado de saúde e perigos devem eventualmente afetar disponibilidade, rendimento e decisões; trabalhador sem condições não deve executar tarefas como se estivesse saudável.
- Hábitos e conversas naturais reforçam a personalidade, mas não substituem feedback de jogo.
- Ferramentas são fabricadas numa estação, carregadas/atribuídas por trabalhador; bloqueios devem explicar **quem** precisa de **qual** ferramenta.
- **Regra permanente de equipamento e traços vermelhos (01/11/2026):** restrição vermelha de *arar* proíbe equipar/fabricar para si a enxada; de *regar*, o regador; de *limpar*, machado/pá/picareta usados para limpeza. Equipamentos de proteção não são bloqueados por essa regra. Nenhum personagem deve receber automaticamente uma ferramenta que não consegue usar; saves antigos transferem ferramentas incompatíveis a colonos aptos quando possível.
- **Regra permanente dos dois colonos iniciais:** não podem compartilhar qualquer habilidade vermelha, incluindo *transportar/coletar pilhas*. Sorteio inicial, re-sorteio individual, re-sorteio da dupla e confirmação devem validar o mesmo requisito; isso mantém ao menos um colono habilitado para cada atividade. A proibição de *transportar* também se aplica a coleta de pilhas do solo, armazenamento e entregas de materiais. Um colono autorizado pode entregar os recursos da construção, mesmo quando outro será responsável por concluí-la, evitando impasses na fabricação e nas obras.

- **A definir:** aprendizado de habilidade, traços avançados, conflitos, humor, profissões visuais e pesos da IA.

## 5. Sobrevivência e mortalidade [S0–S3 IMPLEMENTADOS; S4 PENDENTE]

### Estado atual comprovado no motor

- Cada colono tem saciedade e saúde; a saciedade cai 70 pontos por dia. O HUD avisa em 50% e classifica como faminto abaixo de 30%.
- Um colono faminto procura refeição por iniciativa própria. Cada refeição consome atomicamente 1 unidade de `state.food` e restaura até 70 pontos; o estoque nunca fica negativo. Comer não cria ordens agrícolas. O consumo é salvo imediatamente para impedir que recarregar restaure a comida já consumida.
- Sem comida, a perda de saciedade continua; depois de 1 dia contínuo em inanição, a saúde cai 10 pontos por dia. Fome/saúde baixa reduz a eficiência de trabalho. Os avisos precedem dano e risco fatal.
- A morte remove o colono da população, libera sua tarefa para reatribuição, solta moradia e transfere itens/equipamentos carregados com segurança. O histórico registra a perda.
- Se não houver sobreviventes, o Game Over é persistido; o jogador pode retornar ao menu ou iniciar nova colônia.
- O HUD exibe população viva, estoque, consumo diário estimado, dias restantes e saciedade/saúde por pessoa. O modo `relaxed` mantém as necessidades de sobrevivência desativadas.
- A taxa estimada é 1 unidade de comida por colono/dia; os 8 itens iniciais para 2 colonos representam cerca de 4 dias. Isso não comprova sustentabilidade: produção agrícola e balanceamento permanecem em S4.

### Verificação da entrega

- Testes Node: 15 cenários de fome, morte/liberação e HUD; migração de save coberta no Playwright.
- Playwright: 5 cenários de save, refeição persistente, pausa/velocidades, Game Over/reinício e HUD/cartões em 1366×768, 1600×900 e 390×844.
- O teste local não substitui a validação de publicação no GitHub Pages.

### Design-alvo

1. **Fome individual**: cada colono tem saciedade/necessidade alimentar; refeições consomem alimento do depósito e ocorrem numa rotina de alimentação. O estoque global não substitui o estado pessoal.
2. **Escassez real**: sem alimento, o colono sente fome; avisos crescentes → rendimento comprometido → risco à saúde → morte após um período de carência (jamais morte instantânea por um único dia sem estoque).
3. **Consequências**: morte remove o colono da força de trabalho, deixa posto/tarefa e moradia vagos, é registrada no histórico e afeta a produção/colônia. Toda ordem e recurso reservados são liberados com segurança.
4. **Derrota**: se todos os colonos morrerem, o jogo encerra a partida com tela de resultado e escolhas claras (menu/recomeçar/carregar backup se disponível). Salvar um colono deve ser sempre mais útil que sacrificar a equipe sem feedback.
5. **Previsão e alarmes**: interface mostra dias estimados de comida, consumo diário, população, colonos famintos, produção esperada e risco de morte, com avisos acessíveis.
6. **Qualidade de vida (etapas seguintes)**: sede/água potável, cansaço/sono, higiene, doenças, conforto, humor e temperatura/ambiente, cada uma adicionada com HUD, regras e testes. Não criar dez medidores sem gameplay funcional.
7. **Pausar e acelerar** não devem criar mortalidade falsa por bugs de temporização, saves ou troca de aba.

**Ainda a definir:** sustentabilidade e rendimento de cada cultivo, reposição de sementes, efeitos de doenças, regras de recrutamento após mortes e diferenças futuras entre modos.

## 6. Alimentação, agricultura e cadeia produtiva [PARCIAL HOJE]

- Cultivar depende de limpar, arar, semear, regar, esperar o crescimento, colher e **transportar a comida**. Durante o aprendizado, a execução dessas etapas exige ordens manuais; a ação Universal só decide a próxima etapa. **Depois de transportar a primeira colheita ao estoque**, os canteiros que o jogador já arou ou plantou passam a ter autorização permanente para manutenção agrícola (semeadura → rega → colheita → transporte → replantio), como em uma fazenda gerenciada. A autorização **não** se estende a abrir novos canteiros, limpar vegetação, fabricar ferramentas, construir ou explorar. O jogador pode desativar a rotina em Gestão ou cancelar uma tarefa automática para pausar apenas o canteiro correspondente. Sementes, água, ferramentas, mão de obra e transporte continuam reais, finitos e sujeitos a proibições dos colonos.
- `src/crop-catalog.js` já identifica 19 culturas e suas imagens; cada variedade deve ganhar identidade mecânica: **tempo de crescimento, rendimento, necessidades de água, fertilidade, segurança alimentar e valor nutricional** [PLANEJADO].
- Comer e cultivar competem por recursos. Guardar sementes para a próxima safra versus consumir a produção deve ser decisão estratégica.
- Cadeia futura: comida bruta → armazenamento → preparo/conservação → distribuição e refeição. Produção animal e fertilização entram **depois** de uma agricultura básica equilibrada.
- Sem estufa, cozinha, geladeira ou animais mágicos desde o início: equipamentos devem depender de materiais e desbloqueios.

## 7. Construção, moradia e expansão [PARCIAL HOJE]

- Objetos são posicionados por **blueprints**; até a equipe transportar material e completar o trabalho, continuam planejamento, com indicação azul de validade e motivos em vermelho quando bloqueado.
- Casas concluídas liberam vaga para recrutamento; moradores novos não surgem sem espaço suficiente.
- Construções planejadas: Work Station, cabana, canteiro, depósito, cozinha, enfermaria, camas, poço/filtragem, infraestrutura de transporte e defesa ambiental. **Cozinha, enfermaria etc. são propostas, não recursos disponíveis.**
- O mapa inicial é aberto; a antiga muralha e o tronco que bloqueava a saída foram removidos. **Passagens e bloqueios de progressão ficam para uma etapa futura**, quando houver novas regiões e recursos que justifiquem essa barreira.
- Futuro: tecnologia por recursos/experimentos, melhoria de cabanas, logística e edifícios que transformam/consomem materiais.

## 8. Logística e automação [PARCIAL HOJE]

- **Princípio ONI adaptado:** jogador cria objetivos e prioridades; IA resolve a sequência de execução **permitida por essa ordem**. Ex.: regar permite buscar água, mas não autoriza plantar ou construir por conta própria.
- **Meta:** materiais têm origem, estoque/depósito, transporte, reserva por tarefa, capacidade, disponibilidade e destino visível no mapa. Evitar recursos teleportados da mina para a construção.
- Colonos com especialidade logística devem melhorar throughput; cargas pesadas, caminhos longos e bloqueios tornam-se custos reais.
- Padrões repetitivos/ordens permanentes (manter estoque, irrigar até certo limiar) podem existir como **opt-in explícito**, com interruptor para desligar.
- Ninguém deve construir ou plantar sem pedido, salvo tarefas pessoais de sobrevivência (comer, dormir, procurar abrigo), quando elas forem implementadas e autorizadas pelas regras do modo.

## 9. Mundo, risco e descoberta [PARCIAL HOJE]

- Geração procedural com sementes de mapa e seis biomas existentes; o mundo inicial é aberto.
- Futuras tarefas de exploração poderão liberar caminhos e recursos; áreas distantes têm custos logísticos/ambientais.
- Em fases seguintes, incluir regiões com minérios, solos melhores/piores, plantas raras, fontes de água, eventos sazonais e perigos progressivos.
- Adaptar **temperatura, contaminação e qualidade de água/ar** ao mundo superior 2D do TILLFOLK *quando houver sistemas de sobrevivência básicos completos*. Não presumir uma simulação de gases igual ao código de ONI sem decisão e orçamento técnico.
- Conflitos/combatentes **não são o foco principal**; riscos vêm primariamente de ambiente, fome, recursos e decisões de planejamento.

## 10. Interface, modos e experiência [DECIDIDO / EM EVOLUÇÃO]

- Prioridade máxima para UI de sobrevivência: habitantes vivos, comida no estoque, previsão de consumo, alertas, tarefas urgentes, moradias livres e gargalos de produção.
- Mostrar estados de trabalho (indo, esperando material, fabricando, transportando, descansando, faminto), motivos de bloqueio, ferramentas exigidas e progresso de execução.
- **Sobrevivência** é o modo principal e exige condições reais de vitória parcial/derrota. **Fazenda Tranquila** preserva criação livre sem penalidades fatais ou com necessidades reduzidas; definir o comportamento exato no balanço.
- Tutorial ensina **a manter pessoas vivas**, não apenas clicar em ferramentas. Ao terminar as missões, a partida continua.
- Em desktop e celular: legibilidade, zoom, atalhos, clique direito para cancelar, feedback de interação, sprites originais coerentes; respeitar acessibilidade e movimento reduzido.

## 11. Estado atual vs. meta (31/10/2026)

| Sistema | Hoje | Falta para visão |
| --- | --- | --- |
| Mundo 2D, biomas e passagem | Protótipo jogável | Recompensa de exploração, regiões e riscos por bioma |
| Trabalho, prioridades e habilidades | Funcional básico | Necessidades na tomada de decisões, IA logística avançada |
| Comida | Saciedade individual, refeições, inanição, morte, derrota e previsão | Agricultura sustentável, diferenças entre cultivos e equilíbrio de calorias/tempo |
| Plantação | Plantio, rega, crescimento, colheita, 19 tipos gráficos | Diferenças reais entre cultivos, equilíbrio de calorias/tempo |
| Casas e recrutamento | Construção e vagas básicas | Acomodação habitável, sono, conforto, expansão com consequências |
| Ferramentas/Work Station | Receitas e trabalho de fabricação | Encadeamento industrial, materiais por fase |
| Inventário | Inventário global e ferramentas de colonos | Depósito físico, reservas, transporte efetivo, capacidade |
| Sobrevivência ambiental | Dano de saúde por inanição e penalidade de trabalho | Fadiga, clima, segurança e água potável |
| Persistência | `localStorage` e migrações | Exportar/importar saves, slots e recuperação |
| Arte/UI | Sprout Lands e HUD jogável | Mais animações, legibilidade de tarefas, feedback visual |

Estes rótulos descrevem o design e o código inspecionado, não certificam a ausência de bugs.

## 12. Marcos de aceitação

**MVP de sobrevivência convincente:**
- Nova partida de 2 colonos → coleta → primeira plantação → alimento armazenado → refeições consumidas sem zerar saciedade.
- Sem novas fontes de comida, sobrevém fome real, deterioração gradual, morte e tela de derrota caso ninguém sobreviva.
- Com comida suficiente e abrigo, colônia consegue recrutar mais um trabalhador; isso aumenta o consumo, exigindo ampliar a produção.
- Ao acessar um recurso exclusivo de outra área, o jogador deverá explorar e deslocar trabalhador/carga de verdade; bloqueios de passagem ainda não fazem parte do início atual.
- Um especialista conclui sua tarefa mais rápido que um generalista; traço negativo realmente bloqueia a atividade.
- Pause/velocidade, sair e entrar, atualizar, salvar e retomar não duplicam comida, colonos ou tarefas.
- QA com cenários felizes, fome, mortalidade, contratação, expansão, autosave e interface mobile.

**MVP avançado:** cadeia de cozinha/depósito, descanso, mais construções, perigos simples por bioma, rotinas de saúde e múltiplos desafios com recursos finitos.

**Longo prazo (não prometido):** temperatura/contaminação avançadas, pesquisa extensa, eventos, automação industrial, sistemas sociais, múltiplas colônias e vitória estruturada.

## 13. Referências internas

- Plano por dependência: [ROADMAP_SOBREVIVENCIA.md](./ROADMAP_SOBREVIVENCIA.md)
- Mecânica de ordens: [ORDENS_DA_COLONIA.md](./ORDENS_DA_COLONIA.md)
- Colônia do protótipo: [COLONIA_SUSTENTAVEL.md](./COLONIA_SUSTENTAVEL.md)
- Agricultura/estação: [CULTIVOS_E_WORKSTATION.md](./CULTIVOS_E_WORKSTATION.md)
- Mundo procedural: [MUNDO_SELVAGEM.md](./MUNDO_SELVAGEM.md)
- Roadmap de arte/QA: [ROADMAP_VISUAL.md](./ROADMAP_VISUAL.md)
- Identidade da interface: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

## 14. Decisões ainda pendentes

- Qual ritmo de consumo e quanta comida inicial permite aprender o jogo sem morte injusta?
- Quais necessidades além da alimentação entram no primeiro lançamento?
- Como ficam contratação, custo, população máxima e recuperação após perdas?
- Quais recursos exclusivos e obstáculos de cada bioma?
- Quais condições de vitória de campanha, além de sobrevivência indefinida?
- Teremos futuramente calor, gases, poluição e doenças com complexidade similar à inspiração, ou versões simplificadas adaptadas à perspectiva 2D?

Registrar escolhas neste documento **antes** de alterar a mecânica correspondente. Não confundir visão futura com status de implementação.


### Integridade de equipamentos em salvamentos antigos (01/11/2026)

Se um trabalhador antigo carrega ferramenta incompatível com um traço vermelho e não houver outro colono apto, a ferramenta **não é apagada do salvamento** nem pode ser usada por ele. Assim que um trabalhador apto for contratado, o equipamento pode ser transferido uma única vez, sem duplicação ou consumo de recursos. A regra vale para ferramentas de plantio e mineração, inclusive picaretas avançadas.
