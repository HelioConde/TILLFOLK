# TILLFOLK — plano de evolução visual e técnica (30/10/2026)

> **Nota (31/10/2026):** este é um **roadmap de arte, UX e qualidade**, não o plano principal de gameplay. O TILLFOLK é um jogo de **sobrevivência de colônia**, com fome, morte, moradias, recrutamento, divisão de trabalho e expansão territorial como princípios. Priorizar [GDD_TILLFOLK.md](./GDD_TILLFOLK.md) e [ROADMAP_SOBREVIVENCIA.md](./ROADMAP_SOBREVIVENCIA.md). Ajustes visuais não substituem a entrega das mecânicas de sobrevivência.


Objetivo: fazer a fazenda parecer um jogo 2D completo, usando os sprites licenciados já presentes no repositório e respeitando a jogabilidade definida (trabalhadores automáticos, características e tarefas demoradas).

## Método de execução contínua

Executar as etapas abaixo em sequência, com pequenos commits e QA visual em cada alteração significativa. Não solicitar um comando separado para cada etapa. Só marcar concluído quando houver evidência (captura de tela, teste ou commit verificado).

| Etapa | Prioridade | Entrega e critério de aceite |
| --- | --- | --- |
| 01. Publicação | P0 | Incluir `menu-layout.css` no site gerado, evitar diferenças entre testes locais e GitHub Pages. |
| 02. Screenshots reais | P0 | Registrar menu, modos, recrutamento e **fazenda jogável** em 1600×900, 1125×790 e 390×844, com capturas anexadas ao GitHub Actions. |
| 03. Integridade dos assets | P0 | Detectar HTTP 404, recorte fora dos limites do atlas, sprites invisíveis e transparência inesperada; criar atlas visual de comparação. |
| 04. Personagem no chão | P0 | Corrigir âncora nos pés, sombra, direção e frame de repouso/caminhada; testar em movimento e parado para eliminar a impressão de voo. |
| 05. Cena com cara de jogo | P0 | A fazenda deve ocupar a área protagonista: terreno de leitura clara, câmera/mapa em proporção adequada, HUD compacto e painéis recolhíveis. |
| 06. Tilemap consistente | P1 | Ajustar grama, terra, caminhos, telhado, paredes e profundidade/ordem de desenho, sem misturar escalas de sprites incompatíveis. |
| 07. Autômatas legíveis | P1 | Mostrar destino, tarefa atual e progresso sem sobrepor personagens e cultivo; animações de trabalho por categoria. |
| 08. Design System aplicado | P1 | Unificar tamanhos, espaçamentos, tipografia pixel art, contrastes, estados hover/focus/pressed e tokens CSS com `docs/DESIGN_SYSTEM.md`. |
| 09. Menus e recrutamento | P1 | Comparar telas em diferentes resoluções, scroll acessível, opção de teclado, cartão sem recortes e hierarquia legível. |
| 10. Acessibilidade | P1 | Respeitar `prefers-reduced-motion`, fornecer pistas de ação não só por cor, focos visíveis, aria-pressed, teclado e mensagens de status. |
| 11. Persistência estática | P0 | Usar localStorage com versão de save, tratamento de dados corrompidos e opção de exportar/importar backups JSON. Sem servidor/banco. |
| 12. Qualidade e release | P0 | CI com smoke tests e screenshots em cada alteração, revisão de Console/404, funcionalidade na URL `/TILLFOLK/`, GitHub Pages Actions concluído e regressões visuais registradas. |

## Observações iniciais extraídas do código e das capturas do QA

- O workflow de deploy não estava copiando `menu-layout.css`; consequência: o menu publicado poderia divergir do menu testado.
- A cobertura original de screenshots documentava apenas menu, seleção de modo e recrutamento; a fazenda (canvas `#world`) não era capturada.
- O desenho do trabalhador em `src/game.js` selecionava continuamente quatro frames usando relógio de animação, inclusive quando estava parado, sem diferenciar direção nem tarefa. Isso precisa ser validado visualmente.
- O jogo usa muitos recursos de Sprout Lands. Conferir recortes e dimensões da spritesheet antes de trocar tiles ou desenhar personagens.
- O código já tem sistema de prioridades, habilidades positivas/traços negativos, salvamento no navegador e jogo sem backend. Preservar esses comportamentos e adicionar testes em vez de reescrever tudo.
- Cuidado com a licença em `licenses/sprout-lands-premium.txt`: **não usar sprites licenciados para treinamento de IA**.
- Os testes devem reproduzir também o conteúdo do artefato publicado, para não testar apenas os arquivos da raiz do repositório.

## Referências técnicas

- Workflow visual: `.github/workflows/menu-screenshots.yml`
- Teste: `tests/menu.spec.cjs`
- Cena: `src/game.js`
- Composição da abertura: `src/menu-scene.js`
- Interface: `index.html`, `styles.css`, `menu.css`, `menu-layout.css`
- Publicação: `.github/workflows/pages.yml`

## Definição de pronto

Cada etapa deverá ter: (1) screenshot antes/depois quando envolver pixels; (2) teste de funcionamento do fluxo alterado; (3) ausência de erro 404/JavaScript; (4) o mesmo resultado no site estático com caminho `/TILLFOLK/`.
