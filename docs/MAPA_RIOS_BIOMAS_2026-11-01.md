# Mapa ampliado e rios entre os biomas — 2026-11-01

## Tamanho e distribuição

- **Novo mundo:** 128 × 80 células (10.240 tiles), antes 80 × 50 (4.000 tiles), ou 2,56 vezes a área.
- **Seis ecossistemas:** pradaria, floresta, deserto, gelo, pântano e veneno. A clareira da equipe permanece no centro em partidas novas.
- **Rios naturais:** a geração compara as regiões vizinhas. Quando duas células caminháveis pertencem a biomas distintos, a água cobre os dois lados da divisa. A lagoa e os cursos d'água são conectados, sem faixas secas entre margens.
- **Travessias:** cinco rotas de madeira sobre a água conduzem da região inicial para o núcleo de cada bioma especializado. A água sob a ponte permanece representada no mundo. Os colonos podem andar nas pontes, mas não plantar ou construir nelas.
- **Desempenho:** a distância até a água para gerar vegetação é calculada por uma malha local, e não comparando cada célula com cada tile de rio. O desenho do terreno continua limitado à área visível; o minimapa representa o mundo todo.

## Autotile preservado

O jogo **continua usando** `src/terrain-autotile.js` e `src/terrain-catalog.js`, com o mapeamento 16×16 aprovado para todos os biomas: cantos, bordas, centro e cantos internos. Nenhuma coordenada, sprite original ou regra de cantos foi substituída. As pontes usam `Wooden_Bridge_v2.png` já presente no pacote Sprout Lands do repositório.

## Salvamentos e compatibilidade

- Uma partida nova começa no centro do mapa de 128 × 80.
- Uma partida anterior de 80 × 50 ou 28 × 18 é expandida **sem deslocar trabalhadores e construções**. O retângulo antigo conserva seu mapa de biomas, água e objetos; o espaço extra usa a nova geração.
- Nas partidas antigas, o trecho preservado pode manter margens anteriores que não tinham separação por rios. Isso evita colocar água sobre fazendas e construções existentes.
- O navegador salva em LocalStorage; GitHub Pages continua funcionando **sem banco de dados**.

## Verificação

```bash
node --test tests/biome-rivers.test.cjs tests/world-water.test.cjs tests/terrain-autotile.test.cjs
npx playwright test tests/biomes.spec.cjs
```

Cobertura: dimensões, biomas, divisão por água, continuidade dos rios, pontes transitáveis, caminhos até os biomas, compatibilidade de saves e manutenção do atlas.
