# TILLFOLK — Modernização do mundo, câmera, biomas e UX

Data: 31/10/2026. Base: `main`, jogo HTML5 estático no GitHub Pages.

## Escopo concluído nesta rodada

- **Mapa procedural:** passou de 28×18 (504 tiles) para 80×50 (4.000 tiles); seed armazenado no `localStorage`. Centro seguro com dois colonos, sem fazenda automaticamente construída.
- **Compatibilidade retroativa:** saves antigos mantêm o mesmo identificador `tillfolk-v01`; `World.expand` preserva objetos, lagoas, parcelas, cultivos, ordens, construções e trabalhadores da região antiga e adiciona o exterior. Não é necessário reiniciar a partida.
- **Seis biomas:** grama, floresta, areia, gelo, pântano e veneno gerados deterministicamente com ruído interpolado, massas de terreno e transições naturais. Os biomas ficam compactados numa string `biomeMap` no save.
- **Gameplay específico de bioma:** diferenças de custo de movimento, fertilidade agrícola e permissão de cultivo/construção. Gelo e veneno impedem novas ordens agrícolas, pântano não aceita construção comum. A produtividade varia com a fertilidade.
- **Câmera:** zoom suave no cursor no estilo ONI, agora até 600%, sem suavizar a pixel art; minimapa completo e independente do canvas, com cores por bioma.
- **Interface:** legenda do minimapa com seis botões de acesso às regiões, com foco por teclado e aparência consistente com a UI Sprout Lands já incluída no projeto.
- **Otimização:** renderizar apenas tiles e objetos visíveis, limitar limpeza do canvas à área observada, indexar vegetação/obstáculos/lagoas em mapas e usar cache de parcelas para localizar objetos sem varredura linear a cada consulta.
- **GitHub Pages:** includes de `biomes.js` e checagem de sintaxe no build; nenhuma dependência de banco de dados ou API externa em tempo de jogo.
- **Testes novos:** `tests/biomes.spec.cjs` verifica geração, seed/biomas, zoom, saves antigos, tipos de terreno e screenshots em 390×844, 1366×768, 1600×900, 1920×1080. Workflow separado `biome-smoke.yml`.

## Arquivos relevantes

- `src/biomes.js`: definições e malha de terreno.
- `src/wild-world.js`: geração, renderização, expansão de partidas antigas, índices de obstáculos.
- `src/game.js`: câmera, janela visível, movimento, agricultura e salvamento.
- `src/task-orders.js`: limites dinâmicos de ordens e restrições por bioma.
- `index.html`, `camera-ui.css`: HUD, navegação e minimapa.
- `.github/workflows/pages.yml`, `.github/workflows/biome-smoke.yml`, `.github/workflows/menu-screenshots.yml`: publicação e validação.

## Estado das etapas do plano original

| Etapa | Estado | Observações |
| --- | --- | --- |
| 1. Auditoria | Parcial | Identificados limites 28×18, gargalo de renderização e testes de regressão anteriores |
| 2. Sprites | Parcial | Atlas Sprout original conservado; novos biomas usam terreno pixelado estilizado e não introduzem imagens externas |
| 3. HUD | Parcial | Legenda de biomas e minimapa existentes; redesenho geral de todas as janelas não refeito nesta rodada |
| 4. Câmera | Implementado, com QA em execução | Zoom no cursor 100–600%, WASD, arrasto e pinça mantidos |
| 5. Mundo | Implementado, com QA em execução | 80×50, seed e migração aditiva |
| 6. Biomas | Implementado, com QA em execução | Seis tipos e regras básicas de terreno |
| 7. Personagens | Parcial | Custo de locomoção por bioma; novas animações e colisões entre colonos pendentes |
| 8. IA | Parcial | Pathfinding acelerado por índice; replanejamento complexo e pesos de terreno pendentes |
| 9. Agricultura | Parcial | Fertilidade e bloqueios integrados; irrigação avançada pendente |
| 10. Construções | Parcial | Validação de terreno; rotação e modelos novos pendentes |
| 11. QA | Em execução | Playwright para tela e saves; suíte legada precisa adaptar coordenadas fixas após ampliação |
| 12. Entrega | Parcial | Build estático publicado; aprovação integral do QA pendente |

## Registros de risco e pendências

1. **A suíte antiga do Playwright ainda usa coordenadas 28×18 e trabalhadores nas células (13,9)** em vários testes; ela não pode ser marcada como aprovada sem adaptar as premissas para o novo mundo. Não eliminar esses testes apenas para obter status verde.
2. **IA de colonos:** agora consulta obstáculos rapidamente, mas ainda usa busca de caminho em grade simples; terrenos lentos não são ponderados na escolha do caminho mais rápido.
3. **Veneno:** terreno visualmente distinto e impróprio para cultivo/construção; danos por contaminação e equipamentos de proteção ainda não existem.
4. **Biomas:** efeitos pixelados gerados em canvas para areia, gelo e veneno; assets específicos poderiam ser adicionados depois de conferir licenças e consistência.
5. **Economia/automação:** as regras anteriores são mantidas. Não foram implementadas profissões novas, estações, tecnologias ou múltiplos slots de save nesta rodada.
6. **Playwright:** resultados precisos devem ser consultados nos workflows de QA e no artifact de screenshots; sucesso de publicação isoladamente não valida gameplay.

## Próxima execução sugerida

- Corrigir testes legados para lidar com largura/altura do mundo e spawn dinâmico.
- Implementar busca A* com custo de movimento por bioma e prevenção de colisão entre trabalhadores.
- Criar progressão de ferramentas para gelo e veneno, com recursos específicos.
- Testar várias horas de simulação em resolução mobile e melhorar custo de renderização quando houver muitos colonos.
- Elaborar telas de gestão totalmente Sprout Lands e revisar atlas dos novos objetos.

Todas as melhorias de UI e gameplay devem preservar a licença dos assets já presentes no projeto.
