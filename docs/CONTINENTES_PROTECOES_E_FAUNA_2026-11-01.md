# TILLFOLK — continentes, proteção e fauna (2026-11-01)

## Mundo

- Dimensões: **192×120 tiles** (23.040 tiles), antes 128×80 (10.240 tiles). Aproximadamente **2,25 vezes** a área.
- A ilha central segura tem raio elíptico de cerca de 28 tiles na geração de biomas (e um cinturão adicional sem animais). Os colonos continuam começando na pradaria.
- Os rios acompanham os limites dos seis biomas. As pontes mantêm a travessia possível, mas o colono precisa ter proteção adequada para caminhar em ambientes hostis.
- O renderizador de biomas continua usando o autotile **16×16 original** do catálogo Sprout Lands. Não foram alterados os papéis de cantos, bordas, centro ou cantos internos.

## Proteção por continente

| Bioma | Risco | Equipamento individual | Custo na Work Station |
|---|---|---|---|
| Ilha central (g) | Seguro | Não necessita | — |
| Floresta (f) | Espinhos | Luvas resistentes | 8 gravetos + 4 fibras |
| Areia (s) | Calor e areia | Manto do deserto | 9 fibras + 4 gravetos |
| Gelo (i) | Frio extremo | Roupa de frio | 12 fibras + 4 madeiras |
| Pântano (w) | Lama e água contaminada | Botas impermeáveis | 7 madeiras + 6 fibras |
| Cogumelos tóxicos (p) | Esporos venenosos | Máscara filtrante | 8 fibras + 8 gravetos + 3 pedras |

Esses equipamentos são **individuais**, fabricados como ferramentas pelo sistema de ordens e entregas físicas. Ao faltar EPI, a lista de ordens mostra a restrição, e o cálculo de rota não permite entrar na região hostil. Para a ilha central não existe exigência. O jogador pode inspecionar terreno para consultar o equipamento necessário.

## Fauna selvagem

- Espécies do pacote local `FREE 64 Tiny Animals – 32x32 Pixel Art Pack`: coelhos e galinhas (pradaria externa); raposas, veados e esquilos (floresta); cabras e zebras (areia); pinguins e focas (gelo); sapos e rãs (pântano); morcegos e aranhas (cogumelos tóxicos).
- Distribuição reproduzível pela semente do mapa e por região; em testes foram gerados aproximadamente **49–51 animais**.
- Nenhum animal é criado na ilha central ou no entorno imediato de um antigo ponto de partida preservado em save migrado.
- Os animais possuem deslocamento local por bioma, sem entrar na água, cruzar de bioma ou pisar em árvores.
- Fauna selvagem é distinta do gado domesticado: **não produz esterco, não participa de reprodução da fazenda e não consome alimento da colônia**. Caça, domesticação e combate com animais **não fazem parte desta atualização**.

## Compatibilidade e implementação

- `src/exploration.js`: riscos, receitas e distribuição/movimentação da fauna.
- `src/crafting.js`: equipamentos individuais na Work Station.
- `src/game.js`: mapa 192×120, restrições de caminho por colono, desenho dos animais e indicadores de proteção.
- `src/biomes.js`: aumento da ilha central, mesmo atlas/máscaras do autotile.
- `src/colony-life.js`: separação de animais selvagens e domesticados.
- `index.html`, `camera-ui.css`: informações de EPI.
- `.github/workflows/pages.yml`: publica seletivamente os 13 sprites usados.
- `tests/continent-protection.test.cjs` e `tests/biomes.spec.cjs`: verificações dos novos sistemas.

O save permanece em **LocalStorage**. A ampliação usa migração não destrutiva: terrenos e objetos das partidas antigas mantêm suas coordenadas. O mapa novo só adiciona terreno ao exterior, por isso uma fazenda antiga pode não estar no centro geométrico do mapa ampliado.

## Validar

```bash
node --test tests/continent-protection.test.cjs tests/biome-rivers.test.cjs
npx playwright test tests/biomes.spec.cjs --browser chromium
```

A publicação é estática no GitHub Pages, sem banco de dados.
