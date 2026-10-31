---
name: tillfolk-save-compat
description: Use quando mudar state, localStorage, tutorial, ordens, recursos, worker ou construção.
---

# tillfolk-save-compat

Aplicação: TILLFOLK HTML5 Canvas + jogo de sobrevivência de colônia.

## Passos
1. Identifique SAVE_KEY e esquema de dados antigo. 2. Escreva fixtures: save sem campo, versões intermediárias, save completo e save corrompido. 3. Migre em leitura, com defaults explícitos e sem dupla concessão. 4. Preserve nomes, estoque, ferramentas, world seed, moradia, tarefas e tutorial. 5. Autosave em pagehide/visibilitychange nunca sobrescreve save inválido silenciosamente. 6. Teste ida/volta do menu e tempo pausado. 7. Se houver alteração incompatível, exija plano de backup.

## Critério de conclusão
Código/teste/screenshot coerentes com GDD, nada inventado e save preservado.
