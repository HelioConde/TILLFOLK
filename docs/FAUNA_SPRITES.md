# Auditoria da fauna — TILLFOLK (01/11/2026)

## Problema
Os PNGs demonstrativos de `assets_premium_preview/animals` produzem quadrados cinzentos e sprites desfocados. O jogo agora usa apenas os arquivos finais já existentes no repositório.

## Sprites usados
| Animal | Recurso local | Quadros |
|---|---|---|
| Vaca | Sprout Lands premium / Animals/Cow/Light cow animations.png | 3 × 32×32 |
| Galinha | Sprout Lands premium / Animals/Chicken/chicken default.png | 4 × 16×16 |
| Coelho | FREE 64 Tiny Animals / Pets/rabbit.png | 1 × 32×32 |
| Raposa | FREE 64 Tiny Animals / Forest Animals/fox.png | 1 × 32×32 |
| Porco | FREE 64 Tiny Animals / Farm Animals/pig.png | 1 × 32×32 |
| Pássaro | FREE 64 Tiny Animals / Birds/sparrow.png | 1 × 32×32 |
| Sapo | Sprout Sorry / frog/frog_spritesheet.png | quadros de 16px |
| Morcego | Little Dreamyland / BAT/Bat idle.png | quadros horizontais |

Os animais com apenas um frame usam o sprite original transparente, deslocamento suave durante a caminhada e espelhamento lateral; não se criam frames fictícios. A vaca domesticada também utiliza a animação original. Renderização pixelated e sombra discreta.

## Integridade
Não foi alterada a geometria do mapa, a lógica dos seis biomas, as regras imutáveis do autotile, a distribuição dos animais, o transporte de recursos, as profissões ou o save. Todos os caminhos são relativos para GitHub Pages.

## QA
Executar `node --test tests/wildlife-animations.test.cjs`, além dos testes de terreno; validar no navegador a presença dos animais (quatro direções, parado e andando), modo pausado, escala da câmera e carregamento de save antigo.

## Créditos e licenças
O pacote *FREE 64 Tiny Animals* (JedimeisterX / Pixel-Deck.com) permite uso em projetos pessoais e comerciais, sem redistribuição isolada. Manter os créditos/termos do **Sprout Lands — Cup Nooble**, inclusive as restrições para treinamento de IA, e dos demais pacotes locais. 
