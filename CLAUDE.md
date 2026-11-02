# CLAUDE.md — TILLFOLK

Leia antes de qualquer alteração:
1. `docs/GDD_TILLFOLK.md` e `docs/ROADMAP_SOBREVIVENCIA.md` (se existirem).
2. `GUIA_CLAUDE_TILLFOLK.md` e `DESIGN.md`.
3. Os testes relacionados ao sistema que será alterado.

**Visão:** TILLFOLK é um jogo HTML5/Canvas 2D de **sobrevivência de colônia**, baseado nas mecânicas de gerenciamento de *Oxygen Not Included*, com identidade própria e sprites Sprout Lands. Comer, manter pessoas vivas, ter moradia, construir, especializar trabalhadores e expandir para novos recursos são o centro do design.

## Regras obrigatórias
- **Não migrar o motor de JavaScript/Canvas para Godot, Phaser ou outra stack sem autorização.** Godot MCP e GdUnit4 são para projetos Godot separados.
- Jogador ordena trabalhos; IA escolhe quem executa conforme prioridade, distância, necessidades e limites. **Após a primeira colheita transportada**, o cultivo inicial que o jogador preparou autoriza a manutenção recorrente desse canteiro (semear, regar, colher e guardar). Não abrir novas áreas agrícolas, fabricar ferramentas ou criar outras ordens sem consentimento; a automação pode ser pausada por canteiro e em Gestão.
- Cada trabalhador pode ter até **3 especialidades positivas e 3 traços negativos**. Todos podem trabalhar em qualquer função não proibida pelo traço negativo. Uma única especialidade dá bônus maior que ter várias.
- Sobrevivência tem consequências: falta de comida → fome → perda de capacidade → dano → morte; implementar com aviso, gradualidade e testes. Não declarar mecanismo existente sem constatar no código.
- Mantemos **GitHub Pages + localStorage**. Não adicionar dependência de servidor/banco sem pedido. Respeitar saves antigos.
- Usar somente sprites já autorizados e presentes no repositório; **não usar sprites do pack Sprout Lands para treino de IA**. Não distribuir o pacote premium isolado.
- **Nunca supor coordenadas de spritesheet**. Inspecionar atlas e fazer screenshot da renderização; o erro de confundir machado de pedra e enxada não pode voltar.
- Testar desktop (1366×768/1600×900) e mobile (390×844). Verificar painel visível, ícones corretos, ações por toque, recursos, colônia e UI.
- Antes de commit: `node --check` nos JS alterados, testes node/Playwright aplicáveis, ausência de 404 e regressões; após push observar GitHub Actions e Pages.
- Nunca esconder falhas, contornar testes removendo afirmações, mudar a mecânica sem atualizar o GDD, substituir arquivos de usuário sem backup ou publicar credenciais.
- Seguir Superpowers para design → plano → teste → implementação → revisão. Use Graphify apenas se instalado e disponível; senão faça busca local normal.

## Subagentes recomendados
- `survival-designer`: sistemas de fome, saúde, morte, habitação e balanceamento.
- `colonist-ai`: utility AI, prioridades, habilidades, pathfinding e segurança.
- `gameplay-engineer`: JS/Canvas e refatoração incremental.
- `pixel-art-guardian`: auditoria de sprites e consistência visual.
- `qa-playwright`: testes e screenshots reais.
- `release-guardian`: integridade de saves, CI, publicação.
- `game-director`: sequenciamento, aceite e integração das entregas.

## Ciclo de trabalho
1. Identifique intenção + regra do GDD; se algo não estiver definido, proponha decisão explícita.
2. Inspecione código atual e assets; não reimplemente algo pronto.
3. Crie teste de regressão que falhe no bug real.
4. Implemente alteração mínima mantendo o save.
5. Teste cena em navegador, documente telas e resultados.
6. Registre arquivos alterados, commit e riscos.

Consulte `GUIA_CLAUDE_TILLFOLK.md` para fluxos e prompts específicos.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
