# Backups JSON de partidas — TILLFOLK

## O que foi implementado
- Em **Opções → Configurações → Backup da partida** o usuário pode exportar a partida ativa como um arquivo JSON legível.
- O botão Importar permite selecionar `.json` localmente. O jogo valida os campos estruturais (dia, horário, mundo, trabalhadores, canteiros, ordens) e confirma a substituição.
- **Se já existe uma partida salva, exportar um backup na sessão atual é pré-requisito para importar outra.** Isso protege contra substituições acidentais.
- Formato de exportação: `tillfolk-save-backup/v1`, `game: TILLFOLK`, `exportedAt`, `state`. Saves JSON brutos legados também podem ser reconhecidos, desde que válidos.
- Sem contas, backend, banco de dados, compartilhamento automático nem upload para servidores: o arquivo permanece no computador do usuário.

## Segurança e compatibilidade
- O importador não executa scripts do JSON. A importação é rejeitada quando o conteúdo é inválido, o formato é desconhecido ou os limites estruturais são ultrapassados (arquivo até 15 MB).
- Ao confirmar, a partida importada é guardada temporariamente em `sessionStorage` para sobreviver ao `pagehide` da sessão anterior. O módulo `src/save-backup.js` aplica o novo estado **antes** do boot de `src/game.js`, e o motor original recupera o save pelo `localStorage` com migrações normais.
- Se o `localStorage` falhar por quota/permissão, o save anterior não é substituído e a importação pendente é descartada.
- A importação preserva conteúdos válidos do save: trabalhadores/nomes, mundo/seed, recursos, sementes, ordens, tutorial, casas e horários.
- A opção não altera o formato do save corrente `tillfolk-v01`, o contrato de autotile, os workers, os sprites licenciados, nem a economia do jogo.

## QA
- `node --test tests/save-backup.test.cjs` — roundtrip, JSON legado, arquivo inválido, staging e falha de armazenamento.
- `npx playwright test tests/save-backup.spec.cjs --browser chromium` — baixar arquivo real, reimportar partida com progresso e bloquear substituição acidental no celular.
- Confirmar no GitHub Pages sem 404 e com caminhos compatíveis com `/TILLFOLK/`.

## Limites
- Backups dependem de um arquivo que o jogador efetivamente guarda; exportar não sincroniza entre dispositivos.
- Importar um arquivo não garante a compatibilidade com versões futuras ilimitadas. Se um save antigo falhar na migração, conservar o arquivo de backup para recuperação.
- Não usar importação para injetar JSON não confiável em outros aplicativos.
