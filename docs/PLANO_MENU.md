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


## Rodada v1.0 — auditoria e correções adicionais
9. Auditoria das capturas de menu v0.9 e jogo v1.0 — concluída.
10. Tokens de interface, contraste, tipografia e foco no ui-polish.css — concluído.
11. Controle de foco menu/fazenda e retorno sem navegação oculta — concluído.
12. Preferências de movimento e estado de tela cheia acessível — concluído.
13. Testes Playwright: menu, modais, teclado e salvamento local — concluído.
14. Correção do mapa que ultrapassava a viewport no desktop — implementado.
15. Teste de canvas e ferramentas 1600x900 e 1366x768 e capturas de regressão — automatizado.
16. Manter GitHub Pages estático, sem banco de dados — preservado.


## Rodada 01/11/2026 — auditoria visual e melhoria da abertura

- Evidência de entrada: captura 1600×811 fornecida pelo criador. A tela original tinha sete botões com peso semelhante e uma horta em grade muito repetitiva.
- "Nova Fazenda" continua como ação principal. O "Tutorial" ganha identificação **Recomendado** sem mudar ID, evento de clique ou nome acessível.
- Configurações, Créditos e Sair recebem tratamento de utilidades, separados pelo espaçamento; mantidos tocáveis, com foco visível e suporte a movimento reduzido.
- A cena ilustrativa preserva seus arquivos de sprites e animações, substituindo a horta única por dois canteiros com corredor de grama. Não muda tilemap real, regras de terreno, saves, progressão ou gameplay.
- Asserção Playwright da frase inicial sincronizada com a história escrita no HTML; teste adicional cobre selo do tutorial, geometria das ações e screenshots em 1600×900, 1366×600 e 390×844.
- **Verificação final:** consultar o workflow de QA e screenshots reais após o push; não marcar um teste ainda não executado como aprovado.
