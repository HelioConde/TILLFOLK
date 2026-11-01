# TILLFOLK — Evolução de mineração pelos seis mapas

**Data:** 2026-11-01 · GitHub Pages, sem banco de dados · não apaga saves.

## Evolução das áreas

| Ordem | Área do mapa | Recurso exclusivo | Ferramenta necessária | Para que serve |
|---|---|---|---|---|
| 1 | Ilha central (grama) | Gravetos, cascalho e pedras comuns | Mãos para cascalho e gravetos; picareta de pedra para rochas grandes | Primeiras ferramentas, oficina, sobrevivência |
| 2 | Bosque | Sucata de bronze | Picareta de pedra + luvas | Fundir picareta de bronze para entrar na próxima fase |
| 3 | Deserto | Minério de ferro | Picareta de bronze + manto | Picareta de ferro, suporte estrutural e liga |
| 4 | Gelo | Veios de ouro | Picareta de ferro + roupa de frio | Circuitos de alta condutividade para a nave |
| 5 | Pântano | Cristais de diamante | Picareta de ferro + botas | Picareta de diamante, motor espacial |
| 6 | Cogumelos tóxicos | Bauxita | Picareta de diamante + máscara | Produzir liga de alumínio na Work Station |

A ordem usa os biomas existentes `g → f → s → i → w → p`, preserva os rios, pontes e sprites atuais. **Bronze não ocorre na natureza como minério simples**: a região do bosque contém fragmentos/sucata de antigas estruturas de bronze de uma civilização anterior. **Liga de alumínio não é extraída pronta**: o último continente contém bauxita que é processada com ferro na oficina. Essa mudança conserva a lógica do universo fictício e cria uma cadeia de produção.

## Ferramentas iniciais e sua evolução

- Machado de pedra — 4 gravetos + 2 cascalhos; derrubar árvores.
- Pá — 4 gravetos + 2 cascalhos; retirar tocos.
- Enxada — 3 gravetos + 1 cascalho; arar solo.
- Regador — 3 gravetos + 2 cascalhos + 1 fibra; irrigar.
- Picareta de pedra — 5 gravetos + 4 cascalhos; extrair pedras e bronze.
- Picareta de bronze — 5 gravetos + 7 bronze + 2 cascalhos; extrair ferro.
- Picareta de ferro — 5 gravetos + 9 ferro + 3 bronze; extrair ouro e diamante.
- Picareta de diamante — 5 gravetos + 8 ferro + 6 diamantes; extrair bauxita.

Picaretas de nível maior substituem o requisito de níveis menores; continuam **individuais** no inventário de cada colono. A equipe escolhe ordens de mineração conforme suas ferramentas e os EPIs da região; não surgem equipamentos automaticamente.

## Fundição e circuitos espaciais

Na Work Station:
- **Liga de alumínio:** 3 bauxitas + 1 ferro → 2 ligas de alumínio. Exige pesquisa 4.
- **Circuito de ouro:** 3 ouros + 1 bronze → 1 circuito. Exige pesquisa 3.

A fabricação exige ordens de craft e **entrega física dos materiais ao destino**. O resultado também cai no chão da oficina e pode ser guardado ou transportado por colonos.

A construção final foi reequilibrada:
- Plataforma: 18 madeiras + 12 pedras.
- Casco: 18 madeiras + 8 bronze + 14 ferro + **12 ligas de alumínio**.
- Motor: **20 ligas de alumínio** + 6 circuitos de ouro + 5 diamantes + 8 ferros.
- Suporte de vida: **12 ligas de alumínio** + 4 circuitos de ouro + 10 fibras + 9 ervas.

**Total de ligas:** 44 para um foguete. São necessárias 66 bauxitas e 22 ferros para refinar essas ligas. Depósitos do sexto bioma são finitos, mas existem reservas suficientes para concluir a campanha; o jogador ainda precisa de metais das áreas anteriores, cultivo, pesquisa, moradias, equipe e abastecimento.

## Regras do mapa e do save

- A distribuição é determinística em função do seed e só ocorre quando `world.mineralVersion` não está definido.
- O carregamento de partidas antigas adiciona recursos em posições livres, evitando rios, animais, cultivos, construções, ordens e recursos existentes.
- Não apaga o minério que o jogador minerou. Salvar e recarregar não recria depósitos.
- Minérios aparecem com marcações coloridas sobre o sprite original de pedra, no canvas, sem depender de novos assets externos.
- Cascalhos são coletáveis à mão; os minérios são depósitos grandes e só podem ser quebrados por uma picareta adequada.
- Cada minério é derrubado no chão e carregado até destino; a coleta registra sua descoberta e a Jornada concede conhecimento apenas uma vez.
- Novas picaretas não são concedidas gratuitamente a salvamentos antigos.

## Novas conquistas

No capítulo de exploração, o jogo registra obter bronze, ferro, ouro e diamante. O capítulo espacial ganha a meta **produzir a primeira liga de alumínio**. O painel Jornada mostra seis regiões com seus depósitos e recursos, incluindo os que já foram descobertos.

## Sugestões para a próxima fase

1. **Fundição verdadeira:** acrescentar forno, carvão, consumo de combustível e tempo de refinamento para não usar eternamente a Work Station.
2. **Desgaste e manutenção:** equipamentos mais fortes duram mais e operam em terrenos difíceis; mas evitar quebrar ferramentas durante o tutorial.
3. **Qualidade dos minérios:** depósitos pequenos e gigantes; picaretas melhores produzem mais por ciclo, não apenas desbloqueiam uma categoria.
4. **Transporte e entrepostos:** baús regionais e pontes como infraestrutura crítica; colono especialista em carga pode levar vários minérios.
5. **Tecnologia real do foguete:** pesquisar eletrônica, metalurgia, motor e suporte de vida; cada módulo ocupa espaço e precisa de especialistas.
6. **Defesa do planeta:** novas regiões trazem ameaças ambientais, com risco crescente sem EPI — sem forçar combate antes de existir um sistema de luta.

## Código e testes

`src/mineral-progression.js` mantém o catálogo, minerais, spawn determinístico, tiers e progressão. Os módulos `src/crafting.js`, `src/wild-world.js`, `src/game.js`, `src/space-program.js`, `src/progression.js` integram todos os sistemas.

```bash
node --test tests/mineral-progression.test.cjs
node --test tests/crafting.test.cjs
node --test tests/space-program.test.cjs
```
