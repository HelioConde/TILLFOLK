# DESIGN.md — linguagem visual do TILLFOLK

**Este design system foi produzido especificamente para TILLFOLK.** O repositório Awesome DESIGN.md (VoltAgent) é apenas referência de estrutura: não copiar identidade de outras marcas.

## Direção visual
- Pixel art agrícola com leitura de colônia industrial/artesanal. Sprout Lands como base para tiles, objetos, casas e UI.
- HUD compacto de sobrevivência: comida, dias restantes, colonos vivos, risco, prioridade, velocidade, moradias livres; deixar a fazenda protagonista.
- Sem visual genérico SaaS, gradientes neon, glassmorphism ou ícones misturados sem regra.
- Pixel art sem blur: `image-rendering: pixelated`; evitar desenhar sprites em escalas que distorçam pixels.

## Cores iniciais (conferir CSS real antes de alterar)
| Papel | Cor | Uso |
| --- | --- | --- |
| canvas escuro | `#152721` | planos de fundo e menus |
| painel | `#21382f` | interfaces principais |
| borda | `#405c49` | molduras |
| texto | `#f8efd8` | títulos e informações |
| ação | `#b6de81` | botão primário, pronto |
| destaque | `#f4d18b` | progresso, texto auxiliar |
| perigo | `#f4b0a7` | falta de comida, dano e ordens impossíveis |

## Layout e acessibilidade
- Escala de espaçamento: 4, 8, 12, 16, 24px. Botões touch preferencialmente >= 44px de altura.
- Estados hover, foco visível, pressionado e desabilitado sempre distintos.
- Painéis responsivos sem cobrir trabalhador, cursor, mission card e minimapa; especialmente <=390px.
- Texto de erro mostra motivo, não só cor. Suporte a `prefers-reduced-motion`.
- No menu inicial, nenhuma janela de missão é exibida.
- Ícones de crafting: **recortar spritesheets usando coordenadas verificadas por screenshot**. Antes de trocar item, comparar original e resultado.

## Critério de pronto para qualquer atualização de UI
1. Screenshot ANTES e DEPOIS desktop 1600×900 e mobile 390×844.
2. Verificar DOM, foco, overflow, texto legível e escala de sprites.
3. Manter identidade Sprout Lands; nenhuma imagem genérica substitui recurso do jogo.
4. Build estático Pages verificado e sem erro 404.

Use Taste Skill, Web Design Guidelines, Impeccable (se instalado), Playwright CLI e a skill local `tillfolk-design-audit` como etapas complementares. Image to Code só se houver ferramenta de imagem autorizada e referência apropriada; **não gerar cópias de Sprout Lands**.
