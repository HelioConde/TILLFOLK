# Auditoria Visual e UX/UI - TILLFOLK

**Data:** 31/10/2026  
**Base de análise:** Código fonte (HTML, CSS, JS) - Playwright indisponível (libXdamage.so.1 ausente)

---

## 1. INTERFACE GERAL

### ✅ Pontos Fortes
- **Design System coerente**: Paleta dark/verde bem definida (`--bg:#152721`, `--surface:#21382f`, `--green:#b6de81`, `--gold:#f4d18b`, `--red:#f4b0a7`)
- **Pixel art autêntica**: Uso real do pack Sprout Lands (sprites, UI, nine-slice borders via `border-image`)
- **Tipografia**: Fonte Sprout (pixel) para títulos + system-ui para UI - boa legibilidade
- **Escala responsiva**: Breakpoints em 1240px, 980px, 760px, 610px, 460px
- **Acessibilidade**: ARIA labels, focus-visible, prefers-reduced-motion, color-scheme:dark

### ❌ Problemas Identificados

#### Hierarquia Visual & Excesso de Informação
1. **Topbar overloaded**: 5 grupos competindo (brand, metrics, speed, management-nav, hud-panels, menu-btn) - falta agrupamento visual claro
2. **Métricas de sobrevivência ocultas**: 4 métricas (`survival-food`, `survival-days`, `survival-consumption`, `survival-alert`) com `hidden` - descoberta difícil
3. **Scene-head flutuante**: Posicionamento absolute com `top:88px` - pode colidir com topbar em mobile
4. **Hint-bar fixa**: Texto longo de instruções ocupa espaço valioso na tela de jogo
5. **World-tag**: Texto "ESCOLHA ORDENS PARA SUA EQUIPE" permanente - ruído visual após aprendizado

#### Contraste & Legibilidade
1. **Métricas small text**: `font-size:9px` / `8px` em mobile - ilegível
2. **Worker tags**: `font-size:10px` com padding 4px 6px - apertado
3. **Priority matrix**: `font-size:11px` em cells - difícil leitura em densidade alta
4. **Modal text**: `font-size:13px` - OK mas poderia ser 14px base

#### Espaçamento & Alinhamento
1. **Gap inconsistente**: Topbar `gap:25px` vs `.metrics gap:9px` vs `.hud-panels gap:7px`
2. **Panel padding**: `17px` base vs `14px` play-session vs `10px` sprout-ui - 3 valores diferentes
3. **Border-radius fragmentado**: 12px, 9px, 8px, 7px, 6px, 5px, 4px, 3px, 2px - sem escala unificada

#### Consistência de Botões
1. **4 sistemas de botão coexistindo**:
   - `.tool` (tooltray) - grid 2-row, sprite sheet
   - `.hud-panels button` - nine-slice Sprout
   - `.speed-wrap button` - nine-slice Sprout
   - `.orders-choices button` - nine-slice wood
   - `.title-menu-button` - gradient custom
   - `.large-primary/.small-primary` - gradient custom
2. **Estados hover/focus/active/disabled** inconsistentes entre sistemas

---

## 2. FLUXO DE INTERAÇÃO

### Menu Inicial
- ✅ Canvas animado com sprites reais (title-scene-canvas)
- ✅ Navegação por teclado (Tab, Enter, setas)
- ❌ **Cards informativos** (title-cards) competem com menu principal - ruído
- ❌ **Botão "Sair"** em jogo web - desnecessário (fechar aba)
- ❌ **Tela cheia** duplicada: `title-fullscreen` + `focus-game-btn` + `game-fullscreen-setting`

### Seleção de Modo
- ✅ Preview visual em canvas (mode-art)
- ✅ Descrição clara das diferenças
- ❌ **Canvas 192x72** muito pequeno para mostrar diferenças reais

### Seleção de Iniciadores (Starter)
- ✅ Comparação lado a lado
- ✅ Tooltip de especialidade ao hover/focus
- ❌ **Canvas de retrato 200x152** - escala inconsistente
- ❌ **Reroll individual** ausente - só "Sortear os dois"
- ❌ **Nome da fazenda** campo solto no footer - deveria estar no header

### Gameplay (HUD Principal)
- ✅ Toolbar de ferramentas (tooltray) fixa bottom - bom padrão
- ✅ Universal tool como padrão - reduz cliques
- ❌ **Métricas de sobrevivência** (comida, dias, consumo, alerta) **ESCONDIDAS** - jogador não vê risco
- ❌ **HUD-selection** posição fixa `bottom: calc(... + 97px)` - quebrado em zoom/mobile
- ❌ **Drag-mode** button no hud-selection - escondido, descoberta difícil

### Painel Lateral (Sidebar)
- ✅ 4 abas: Trabalhadores, Ordens, Inventário, Diário
- ✅ Worker cards com retrato, tags, barra de progresso, especialização
- ❌ **Painel de trabalhadores** não mostra saciedade/saúde por padrão (só se <100)
- ❌ **Matriz de prioridades** 780px min-width - horizontal scroll em mobile
- ❌ **Ordenação de prioridades** botões +/- sem feedback numérico claro

### Work Station (Oficina)
- ✅ Lista de ferramentas com custos
- ✅ Conversão sementes (2 comida → 3 sementes)
- ❌ **Imagem atlas** carregada inline via `<img>` - bloqueia render, sem fallback
- ❌ **Receitas de culturas** grid sem indicação visual de "já tem sementes"

### Tutorial/Help
- ✅ 6 etapas ilustradas com canvas
- ✅ Navegação anterior/próximo
- ❌ **Canvas 384x160** - aspecto 2.4:1, não preenche bem em mobile
- ❌ **Texto explicativo** denso, sem hierarquia visual (subtitle, body, tip misturados)

---

## 3. HUD DO JOGO

### Barra Superior (Topbar)
| Elemento | Estado | Problema |
|----------|--------|----------|
| Brand | OK | ✓ |
| Métricas (Dia/Hora/Comida/Água/Sementes) | Parcial | Survival metrics hidden |
| Speed controls | OK | ✓ |
| Management nav | OK | Labels longos "Prioridades"/"Habilidades" |
| Hud panels (4 botões) | OK | Ícones + labels, mas "▦ Estoque" cryptic |
| Menu btn | OK | ✓ |

### Painel de Trabalhadores
- **Retrato**: 40x42px canvas - OK
- **Nome**: 13px bold - OK
- **Job status**: 11px muted - truncado se longo
- **Tags**: flex wrap - OK mas pequeno
- **Progress bar**: 5px height - OK
- **Hunger/Health bars**: Só aparecem se <100 - **OCULTAS POR PADRÃO**
- **Role text**: 10px - "Especialização: +100%" - jargão técnico

### Painel de Ordens
- Grid de 7 botões (clear, till, fertilize, sow, water, harvest, carry, collectManure)
- Estados: default, pressed, disabled
- **Falta**: indicador visual de pré-requisitos (água, esterco, sementes)

### Minimapa
- 224x144px - pequena
- Bioma legend: 6 botões com color swatch - OK
- Camera controls: zoom +/-, reset, full-map - OK
- **Falta**: indicadores de trabalhadores mais visíveis

---

## 4. MAPA (WORLD)

### Geração Atual (wild-world.js)
- **World 80x50 tiles** (2560x1600px)
- **6 biomas**: grass (g), forest (f), sand (s), ice (i), swamp (w), poison (p)
- **Passagem inicial bloqueada** (ridge + gate)
- **Lagoa central** (water tiles)
- **Objetos**: trees, thickets, boulders, logs, stumps, ridges, gateLog
- **Spawn**: centro (40, 25)

### Problemas Visuais do Mapa
1. **Repetição excessiva**: Grass tile único, sem variação orgânica
2. **Falta de landmarks**: Nada que crie "sense of place" ou orientação
3. **Distribuição uniforme**: Recursos espalhados aleatoriamente - sem "áreas de coleta"
4. **Caminhos inexistentes**: Player deve criar próprios caminhos - sem pistas visuais
5. **Biomas indistintos**: Cores similares (grass #a4d17c, forest #638b57, swamp #63866a)
5. **Área inicial "vazia"**: Clareira genérica sem identidade
6. **Passagem (gate)**: Apenas um gateLog - não comunica "expansão" visualmente
7. **Water body**: Lagoa retangular simples - sem praias, transições

### Oportunidades de Redesign
- **Área inicial segura**: Clareira delimitada por floresta/rochas
- **Zona de coleta básica**: Madeira, pedra, fibra próximas
- **Zona de plantio**: Solo fértil visualmente distinto
- **Zona de construção**: Área plana, livre de obstáculos
- **Gargalo natural**: Passagem visível (canyon, ponte, estreito)
- **Regiões futuras**: Biomas com paletas distintas, landmarks únicos
- **Caminhos naturais**: Trilhas de terra, clareiras lineares

---

## 5. PRIORIZAÇÃO DE MELHORIAS

### 🔴 Crítico (Impacto direto na jogabilidade)
1. **Mostrar métricas de sobrevivência** por padrão (comida, dias, consumo, alerta)
2. **Painel de trabalhadores**: saciedade/saúde sempre visíveis
3. **HUD-selection** responsivo (não position fixed quebrado)
4. **Mapa inicial** com áreas funcionais claras

### 🟡 Alto (Qualidade de vida)
1. **Unificar sistema de botões** (3-4 variantes max)
2. **Tipografia base 14px** + scale consistente
3. **Espaçamento** em escala 4/8/12/16/24px
4. **Painel lateral**: prioridades matrix responsiva
5. **Work Station**: imagem lazy-loaded, receitas com status visual

### 🟢 Médio (Polimento)
1. **Menu inicial**: remover "Sair", unificar tela cheia, simplificar cards
2. **Starter**: reroll individual, nome no header, retratos consistentes
3. **Tutorial**: canvas responsivo, hierarquia visual no texto
4. **Mapa**: landmarks, caminhos, áreas funcionais, biomas distintos

---

## 6. RECOMENDAÇÕES DE IMPLEMENTAÇÃO

### Ordem Sugerida
1. **CSS Foundation**: Variáveis de spacing, typography scale, button system unificado
2. **HUD Core**: Survival metrics visíveis, worker health/satiety sempre
3. **Sidebar**: Worker panel melhorado, priorities matrix responsiva
4. **Mapa**: Nova geração com áreas funcionais
5. **Menus**: Simplificação, consistência
6. **Polimento**: Animações, feedback, estados

### Princípios
- **Jogabilidade > Beleza**: Cada mudança visual deve melhorar clareza
- **Pixel art first**: Manter Sprout Lands, não adicionar assets externos
- **Save compat**: Não quebrar saves existentes
- **Mobile first**: Testar 390x844 em cada mudança