---
name: tillfolk-release-check
description: Use antes de commit, GitHub Actions, Pages ou deploy HTML5.
---

# tillfolk-release-check

Aplicação: TILLFOLK HTML5 Canvas + jogo de sobrevivência de colônia.

## Passos
1. Cheque git status/diff, ausência de segredos, arquivo de licença e assets. 2. `node --check` dos JS alterados. 3. Rode Node tests, Playwright, screenshots e 404. 4. Verifique build em subpasta /TILLFOLK/ e inclusão de assets premium utilizados, sem redistribuição avulsa. 5. Faça commit pequeno. 6. Só informe resultado do Actions realmente consultado; se pendente, diga pendente. 7. Plano de rollback em falhas.

## Critério de conclusão
Código/teste/screenshot coerentes com GDD, nada inventado e save preservado.
