# TILLFOLK — Mundo selvagem procedural (v1.2)

> **Direção atual:** o mundo é fonte de recursos e riscos, não apenas cenário. O TILLFOLK é um jogo de sobrevivência de colônia; avançar para outras regiões deve liberar materiais necessários a novas construções, alimentação e manutenção dos habitantes. [GDD](./GDD_TILLFOLK.md) · [Plano de sobrevivência](./ROADMAP_SOBREVIVENCIA.md).


## Objetivo visual

A nova partida **não começa numa fazenda pronta**. Não há casa, horta desenhada, caminhos nem cercas. Dois trabalhadores chegam a uma pequena clareira e podem transformar o vale em fazenda escolhendo onde cultivar.

O mundo é montado por `src/wild-world.js` com um seed armazenado no `localStorage`. Duas partidas podem produzir paisagens diferentes; continuar uma partida preserva os objetos existentes e as ações já realizadas.

## Camadas ambientais

| Camada | Elementos | Interação |
| --- | --- | --- |
| Solo | Grama em tons variados e pequenos pontos naturais | Caminhável, cultivável |
| Bosque | Árvores, arbustos fechados, tocos e troncos | Bloqueiam passagem; limpar remove em etapas e concede madeira |
| Rocha | Pedras pequenas/grandes | Algumas bloqueiam; limpar concede pedra |
| Flora | Flores, grama alta, ervas e cogumelos | Coleta por trabalhadores ao marcar cultivo |
| Água | Lagoa com margem, junco e pequenas ondulações | Obstáculo de travessia; trabalhadores buscam água por ordem explícita na lagoa (sem geração passiva diária) |
| Fauna ambiente | Borboletas perto de flores, sapos junto à lagoa | Visual, não bloqueia navegação |
| Renovação | Flores, gramíneas e cogumelos (mudas raras a cada vários dias) | Nasce em áreas não cultivadas e não ocupadas |

## Regras jogáveis

- Uma área de **clareira inicial** permanece livre; trabalhadores começam nela.
- Nenhuma parcela começa arada, semeada ou marcada.
- `Cultivar` sobre um recurso natural cria a tarefa **Limpar** antes de arar. Recursos são incluídos em `state.inventory`.
- Árvores demandam duas etapas: derrubar, que deixa um toco, e remover o toco.
- O caminho é calculado para um terreno caminhável ao lado de um obstáculo, para evitar atravessar árvores e pedras.
- A água não pode ser cultivada e impede caminhada.
- A geração evita árvores imediatamente na margem da lagoa.
- O inventário aparece no painel de gestão.
- A vegetação regenera lentamente ao virar o dia em terrenos que não estejam cultivados; jamais nasce por cima de campos ativos.
- Progresso salvo somente no navegador, **sem banco de dados ou servidor**.
- Saves anteriores são carregados e recebem mundo natural nas áreas não cultivadas, sem apagar os cultivos existentes.

## QA visual

O GitHub Actions executa `tests/menu.spec.cjs` e publica screenshots de partidas em desktop e celular. Os testes validam:

1. Nenhuma horta pronta, zero parcelas selecionadas e zero cultivos iniciados.
2. Existência dos cinco grupos principais: árvores, pedras, flores, cogumelos e grama, além da lagoa.
3. Clareira inicial sem recursos obstruindo o spawn.
4. Reprodutibilidade da geração e persistência ao recarregar.
5. Transformação de árvore em toco, limpeza da área, regeneração e recursos.
6. Seleção de obstáculo e geração de tarefa de limpeza.
7. O mundo ocupa 100% da janela com HUD sobreposto.

## Futuro

- Biomas maiores, câmera com zoom, aldeias e ruínas exploráveis (sem introduzir construções prontas na clareira).
- Animais com rotinas e necessidades próprias.
- Construção de casas e fazendas pelo jogador, em vez de nascerem no mapa.
- Persistência opcional em arquivo e testes da progressão agrícola completa.

Assets visuais: **Sprout Lands — Cup Nooble**. Consultar licenças originais; não usar o pacote para treinamento de IA.
