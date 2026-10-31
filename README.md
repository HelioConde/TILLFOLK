# TILLFOLK 🌱
**Sobrevivência de colônia, produção, exploração e automação de trabalhadores.** Jogo HTML5 2D pixel art, com identidade visual Sprout Lands e forte inspiração nas mecânicas de **Oxygen Not Included**.

> **Visão oficial (31/10/2026):** o objetivo não é só ter uma fazenda bonita. O jogador deve **manter seus colonos vivos**, produzir comida, trabalhar com recursos limitados, construir abrigo para recrutar moradores e abrir caminhos para regiões com novos materiais. Cada habitante tem talentos, traços e uma função importante na dinâmica da colônia.

**Documentos centrais:** [GDD completo](./docs/GDD_TILLFOLK.md) · [Roadmap de sobrevivência](./docs/ROADMAP_SOBREVIVENCIA.md) · [Plano visual e QA](./docs/ROADMAP_VISUAL.md).

## Como o jogo deve funcionar

1. **Começar vulnerável:** uma pequena equipe chega ao vale selvagem com poucos recursos, sem casas ou plantações prontas.
2. **Coletar e fabricar:** dar ordens para recolher gravetos, fibras, madeira e pedras; fabricar ferramentas na Work Station.
3. **Produzir alimento:** arar, plantar, regar, colher, transportar e guardar comida. Sem reposição suficiente, os habitantes passam fome e podem morrer — **mortalidade ainda precisa ser implementada**.
4. **Organizar a equipe:** escolher prioridades e especialidades, acompanhar riscos e tarefas bloqueadas. Cada pessoa deve contribuir com o trabalho que executa melhor.
5. **Construir e crescer:** novas cabanas abrem vagas para recrutamento; cada habitante adicional aumenta as necessidades da colônia.
6. **Explorar:** abrir barreiras, alcançar biomas diferentes, buscar recursos exclusivos e construir cadeias produtivas mais eficientes.
7. **Sobreviver no longo prazo:** logística, descanso, saúde, tecnologia e riscos ambientais passam a importar à medida que a vila cresce.

**Regra de controle:** o jogador designa as ordens; os trabalhadores escolhem quem faz e como executar conforme prioridades, trajetos, habilidades e restrições. Um clique da ferramenta Universal não dispara sozinho todas as etapas de plantio.

## Trabalhadores e especializações

- Cada pessoa tem **até 3 habilidades positivas** e **até 3 traços negativos**.
- Todos podem realizar qualquer tarefa **exceto as proibidas pelos próprios traços negativos**. Ser especialista não desbloqueia trabalhos — melhora sua eficiência.
- Um trabalhador com uma única especialização é mais eficiente nela do que outro com duas ou três especializações. O protótipo usa multiplicadores de 2,0×, 1,6× e 1,3×.
- Perfis úteis: coletor, agricultor, construtor, minerador, transportador e fabricante. Futuramente: cozinheiro, cuidador, pesquisador e outras funções **sem classes rígidas**.
- As tarefas são demoradas de propósito: mais trabalhadores, boas especialidades e planejamento economizam tempo.

## Estado atual do protótipo (31/10/2026)

| Área | Existe no protótipo | Falta / objetivo de design |
| --- | --- | --- |
| Mundo | Geração procedural, seis biomas, obstáculos e passagem do vale | Exploração economicamente relevante, perigos e recursos únicos |
| Trabalho | Ordens explícitas, IA de atribuição, especialidades e traços negativos | Melhor IA sob fome, risco, distância, saúde e urgência |
| Comida | Plantações, 19 espécies gráficas, estoque e desconto diário por habitante no modo sobrevivência | Refeições pessoais, saciedade, fome, saúde, morte e derrota |
| Construções | Blueprint, cabanas, Work Station e ferramentas | Depósitos físicos, cozinha, camas, proteção, cadeia produtiva |
| População | Dois colonos iniciais, candidatos, contratação condicionada à moradia | Necessidades individuais, rotinas, bem-estar e impacto de perdas |
| Interface | HUD, menus, minimapa, zoom, velocidade/pausa, tutorial | HUD de risco de fome, dias de estoque, alertas antecipados |
| Salvamento | `localStorage`, autosave e retomada de partida | Exportar/importar backups e múltiplos slots |

**O protótipo ainda NÃO é uma simulação completa de sobrevivência.** Em `src/game.js`, comida zero apenas provoca aviso: nenhuma pessoa morre por isso atualmente. O primeiro grande marco de implementação é tornar a fome e suas consequências reais, sem sacrificar compatibilidade de saves.

## Como executar

O jogo é estático e não exige backend nem banco de dados. Abra a versão hospedada ou use um servidor local:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080/`. Para produção, o GitHub Actions publica o site no GitHub Pages.

**Jogar:** https://helioconde.github.io/TILLFOLK/

## Estrutura principal

- `index.html`, `styles.css` e arquivos CSS adicionais: menu, HUD, janelas e interface.
- `src/game.js`: simulação do tempo, trabalhadores, tarefas, movimento, produção, recrutamento e salvamento.
- `src/task-orders.js`: validação de ordens e pré-requisitos; `src/crafting.js`: equipamentos e Work Station.
- `src/wild-world.js`, `src/biomes.js`: geração procedural, biomas e obstáculos.
- `src/crop-catalog.js`: espécies e sprites de cultivo.
- `src/missions.js`, `src/tutorial.js`: missões e guia.
- `docs/GDD_TILLFOLK.md`: **única fonte de verdade sobre a visão de longo prazo**.
- `docs/ROADMAP_SOBREVIVENCIA.md`: prioridade das próximas implementações.
- `tests/`, `.github/workflows/`: testes, screenshots e publicação.

## Documentação adicional

[Colônia sustentável — protótipo](./docs/COLONIA_SUSTENTAVEL.md) · [Ordens da colônia](./docs/ORDENS_DA_COLONIA.md) · [Cultivos e Work Station](./docs/CULTIVOS_E_WORKSTATION.md) · [Mundo selvagem](./docs/MUNDO_SELVAGEM.md) · [Construção com blueprints](./docs/BLUEPRINTS_CONSTRUCAO.md) · [Design System](./docs/DESIGN_SYSTEM.md)

**Nota:** documentos antigos são registros históricos de implementação e podem refletir parâmetros anteriores. Antes de codificar, consultar o GDD e conferir os valores atuais no código.

## Créditos e licença

**Sprites: Sprout Lands, por Cup Nooble.** Consultar [créditos](./docs/ASSET_CREDITS.md) e [licença premium](./licenses/sprout-lands-premium.txt). Não redistribuir o pacote isolado e não utilizar os assets licenciados para treinamento de IA. O objetivo é criar um jogo próprio com mecânicas inspiradas em Oxygen Not Included, sem copiar arte, código ou personagens.
