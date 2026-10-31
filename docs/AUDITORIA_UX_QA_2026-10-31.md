# TILLFOLK — auditoria e rodada UX/UI + QA + engenharia (31/10/2026)

> **Estado: WIP / não publicado.** A integração à main depende de Playwright e revisão das alterações concorrentes. Proibido usar sprites externos, banco de dados ou arquivos premium para treinamento de IA.

## Evidências da auditoria

- Projeto atual é HTML/CSS/JS estático com canvas grande 80×50, câmera, trabalhadores, ordens e saves em localStorage. Ver `src/game.js`, `src/task-orders.js`, `src/wild-world.js`.
- O deploy antigo `.github/workflows/pages.yml` validava sintaxe e assets, mas **não verificava resultado dos testes Playwright**; falhas podiam coexistir com um deploy marcado verde.
- Workflow `QA visual — menu e jogo TILLFOLK`, execução 41173450996 (baseline): **33 testes passaram e 22 falharam**. Houve incompatibilidades após a expansão 80×50, tests de posicionamento de telhado, timeouts e verificações de câmera. Não confundir com prova de que os 22 bugs estão no gameplay; várias asserções usam 28×18 e condições visuais antigas.
- Screenshot do menu, recrutamento, fazenda, gestão e fila: artefato de QA da execução acima. Comparar com os artefatos de screenshots da PR.
- Questão aberta #9: ferramenta universal contextual e seleção retangular. Evitar duplicar ou reverter implementação simultânea.
- Conflito recente: o menu pode exibir vacas de forma ilustrativa; **a fazenda nova não pode iniciar com animais**. Toda alteração deve testar o estado real `state.animals` separado da vinheta decorativa do menu.

## Alterações nesta PR

| Área | Implementado no branch | Teste/prova |
|---|---|---|
| UI da casa | Alinhamento da janela e porta abaixo do beiral, preservando assets do projeto | `tests/menu.spec.cjs` (asserções geométricas) |
| UX de gestão | Abas internas Equipe/Ordens acessíveis pelo teclado, sem clicar atrás do backdrop | `tests/release-smoke.spec.cjs` |
| Desempenho | Não renderizar listas e recalcular todas as rotas de trabalhadores com a gaveta fechada | Validação visual e de jogabilidade pela suíte |
| Saves | Backup JSON, restauração, formato legado sem mundo/nome, rejeição de arquivos inválidos | `tests/save-backup.spec.cjs` |
| Saves | Impedir que Continuar com save corrompido gere fazenda vazia; versão interna 2 compatível | Testes de save |
| QA | Screenshots e erros de console/404 para quatro resoluções, cinco telas | `tests/release-smoke.spec.cjs` |
| Release | GitHub Pages só aceita commit exato de `main` com QA de push aprovado; sem forçar merge | `.github/workflows/pages.yml`, `.github/workflows/menu-screenshots.yml` |
| Acessibilidade | Foco visível, botões da gaveta com tamanho mínimo e movimento reduzido | CSS + smoke tests |

## Próximas etapas ainda não concluídas

1. **P0:** corrigir a suíte de regressão inteira para mundo 80×50, incluindo fixtures de bioma cultivável e câmera com coordenadas reais.
2. **P0:** confirmar fluxo completo de sementes, lagoa, esterco quando introduzido, casas e contratação após migração.
3. **P0:** definir único contrato de saves com migração versionada, cópia de segurança em caso de erro e verificação pós-importação.
4. **P0:** refatorar `src/game.js` incrementalmente por módulos (motor, IA, renderização, persistência) com testes em cada etapa; evitar reescrita global.
5. **P1:** pilhas de material em locais físicos, reserva/entrega de madeira para construção e conflitos entre tarefas.
6. **P1:** prioridades/cancelamentos em lote, com limite e resumo de confirmação e reversão segura.
7. **P1:** auditoria de atalhos e gestos de câmera no mobile; ampliar imagens com referenciais de 80×50.
8. **P1:** revisar telas de recrutamento, HUD e tutorial; aplicar os tokens do `docs/DESIGN_SYSTEM.md` sem criar mais CSS divergente.
9. **P1:** validar todos os sprites e seus direitos, atlas e frames horizontais, trilhas de recolhimento e feedback de construção.
10. **P1:** avaliar perfis de desempenho no mapa 80×50 com 100–1500 ordens e múltiplos colonos.

## Critérios de lançamento (bloqueadores)

- Todos os testes críticos do Playwright e cenários da colônia concluídos com sucesso, sem exceções ocultas.
- Sem erros JavaScript ou HTTP 404 em assets CSS, JS, PNG nas resoluções 1600×900, 1366×768, 1024×768, 390×844.
- Screenshots de menu, recrutamento, mundo, gestão, ordens e construção auditados visualmente. Nenhum sprite externo.
- Compatibilidade de saves antigos (incluindo a fazenda original) e backups exportáveis.
- Pages criado somente após sucesso do QA no SHA exato de main; PR não mesclada na presença de regressões.
