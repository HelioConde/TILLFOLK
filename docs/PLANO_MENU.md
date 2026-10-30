# Plano contínuo — Tela inicial TILLFOLK
A sequência deve ser executada em commits agrupados, sem pedir um comando para cada melhoria.

1. **Auditoria com screenshots** — análise do corte do menu em 1125×790 e 1600×900. Concluído usando capturas fornecidas pelo jogador.
2. **Correção do layout** — regra única, isolada em menu-layout.css, com grid no desktop e coluna no celular. Implementado.
3. **Taste Skill** — espaçamento, hierarquia visual e tokens em docs/DESIGN_SYSTEM.md. Documentado.
4. **Web Design Guidelines** — foco de teclado, rolagem vertical segura e redução de movimento. Implementado.
5. **Image to Code** — preservar o menu inspirado nas referências, com componentes HTML sobre cenário original em sprites. Implementado no menu existente.
6. **Playwright** — capturar imagens de telas reais em várias resoluções, aferir bordas e permitir inspeção pelo artefato no GitHub Actions. Automatizado no workflow QA visual.
7. **GitHub Pages** — HTML/CSS/JS estático, sem banco e com salvamento de jogo em localStorage. Preservado.
8. **Próximas melhorias opcionais** — ajustar composição do cenário, contrastes e legibilidade com base nas novas capturas do QA, sem modificar personagens nesta etapa.

Risco: o workflow visual requer download do Chromium no runner; se falhar por rede/dependência, não interrompe a publicação principal.
