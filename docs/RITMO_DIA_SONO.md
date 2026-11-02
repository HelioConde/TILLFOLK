# Ritmo de dia e noite e rotina de sono — TILLFOLK

## Ajuste de jogabilidade (02/11/2026)

- **Dia (06:00–22:00): 16 horas no relógio do jogo.** A claridade aumenta de 06:00 até 07:00, permanece clara das 07:00 às 21:00 e escurece suavemente entre 21:00 e 22:00.
- **Noite (22:00–06:00): 8 horas**, com escuridão noturna e iluminação local já existente no jogo.
- **Ritmo reduzido:** em velocidade 1×, 1 segundo real avança 0,75 minuto de jogo (antes eram 1,25). Um ciclo de 24 horas agora demora **32 minutos reais** em condições normais, em vez de 19,2. Em 3×, cerca de 10min40s; em 6×, cerca de 5min20s. Pausa 0× não avança.
- As partidas novas começam às **06:00**. Saves existentes mantêm o horário salvo; não são reiniciados nem têm seus dias alterados.
- O multiplicador do tempo agora é único para relógio, necessidades alimentares e rotina de energia/moral. Deslocamentos e tarefas mantêm a velocidade atual para que o jogador tenha mais tempo de agir durante o dia.

## Sono dos trabalhadores

- **Turno padrão diurno:** descansar das **22:00 às 06:00** (8h previstas), acordar às **06:00** independentemente do nível de energia.
- **Turno alternativo noturno:** descansar das **08:00 às 16:00** (8h), preservando uma escolha explícita de turnos.
- O sistema não inicia cochilos fora do turno por energia baixa, nem desperta antes por alcançar energia máxima, nem permite dormir além da janela prevista.
- A ida real até a casa continua necessária; portanto, o tempo efetivamente passado em repouso pode ser menor que 8h conforme a distância ao abrigo. O horário permitido de descanso é fixo, sem teleportes.
- O antigo turno experimental **flexível** não atendia à regra de oito horas. Partidas com trabalhadores nesse turno migram para o diurno ao carregar, mantendo identidade, tarefas e progresso.
- Os efeitos de dormir ao relento, recuperação energética, penalidade por exaustão, priorização e habilidades dos personagens permanecem.

## Verificações

- `node --test tests/day-night.test.cjs tests/colony-life.test.cjs` valida relógio, transições, horários, limites e compatibilidade com turnos antigos.
- `npx playwright test tests/day-routine.spec.cjs --browser chromium` verifica a tela inicial, painel de colonos e migração em desktop 1366×768 e celular 390×844.
- GitHub Pages continua sem banco de dados; todos os nove terrenos e `tillfolk-terrain-autotile/v1` permanecem intocados.

## Futuro

- Playtest para medir se um dia de 32 minutos reais é suficiente para construção e exploração. Ajustar somente após medir tempo de trabalho, fome e rotina de sono.
