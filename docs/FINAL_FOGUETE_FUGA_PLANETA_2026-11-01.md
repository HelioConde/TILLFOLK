# TILLFOLK — Campanha final: Projeto Última Esperança 🚀

**História:** o planeta original está superpovoado. As poucas áreas habitáveis exigem cooperação, agricultura, manutenção de água, moradias e viagens para conseguir conhecimento e materiais. A colônia do jogador começa com duas pessoas na ilha central e cresce para formar uma equipe capaz de deixar o planeta.

**Objetivo final jogável:** construir, abastecer e lançar um foguete. A vitória é persistida no navegador; o jogador pode continuar cuidando da base terrestre.

## Loop principal de evolução

1. **Chegada:** recolher os primeiros materiais manualmente, construir Work Station, produzir ferramentas, plantar e colher.
2. **Colônia:** levantar moradias e depósitos, armazenar comida, pesquisar agricultura, poços e descanso.
3. **Expansão:** recrutar novos personagens (cada um tem habilidades e proibições individuais), fabricar EPIs e explorar os cinco continentes.
4. **Ciência espacial:** concluir as quatro pesquisas existentes e explorar os cinco continentes. Um mínimo de quatro colonos permite abrir a construção espacial.
5. **Foguete:** escolher uma área segura 3×3 na ilha central. Planejar **cada etapa manualmente**; colonos recolhem e **transportam os materiais fisicamente** do chão, baús e estoque até a obra. A obra só avança quando todos os materiais foram entregues e um trabalhador concluiu o serviço.
6. **Partida:** garantir cinco colonos e cinco moradias; selecionar quatro colonos disponíveis, saudáveis e alimentados para embarcar. O quinto permanece para manter a base. Armazenar 30 alimentos e 20 águas para a viagem; autorizar o lançamento, que consome os suprimentos. Os quatro tripulantes deixam a colônia de fato e a partida ganha um final salvo.

## Etapas e materiais da nave

| Etapa | Materiais entregues | Por que |
| --- | --- | --- |
| Plataforma de lançamento | 18 madeiras, 12 pedras | Suporte seguro 3×3 sem água ou obstáculos |
| Casco e cabine | 25 madeiras, 18 pedras, 14 fibras | Espaço estrutural para a tripulação |
| Motor de propulsão | 24 pedras, 8 cogumelos, 7 ervas | Componentes minerais e reagentes naturais |
| Suporte de vida | 12 madeiras, 16 fibras, 9 ervas, 6 cogumelos | Filtragem e habitabilidade |
| Lançamento | 30 alimentos, 20 águas | Estoque consumido somente na partida |

O motor não introduz uma moeda, combustível mágico, loja ou missões automáticas. O projeto usa recursos já presentes no mundo, preservando as capacidades individuais de transporte. A expansão da colônia reduz o gargalo de tarefas paralelas, mas também aumenta a necessidade de comida e casas: **recrutar mais é útil e tem um custo real**.

## Regras de integridade

- Os cinco biomas e o nível 4 de pesquisa são pré-requisitos explícitos.
- Apenas uma plataforma por save; não sobrepor casas, lagoas, árvores, plantações, depósitos ou outras obras.
- Tarefas antigas e o tutorial continuam iguais. Não há foguete inicial ou recursos gratuitos em novo jogo.
- O estoque **não** muda ao planejar a obra. A entrega física consome o recurso em sua origem. Interrupções e cancelamentos devolvem o material para o solo.
- A próxima etapa deve ser escolhida pelo jogador e segue o mesmo sistema de ordens da fazenda.
- A animação do foguete é uma arte em blocos de pixels desenhada pelo próprio motor; não depende de assets externos.
- O lançamento marca `state.rocket.launched=true`, salva o dia e os nomes dos tripulantes, consome os suprimentos e remove os quatro tripulantes do mundo. Uma pessoa permanece na base.
- `src/space-program.js` é autônomo e a implementação não usa banco, API ou serviço externo. Continua no GitHub Pages e no LocalStorage.
- `src/progression.js` amplia a jornada de cinco para **seis capítulos**, com o novo final “Última esperança: abandonar o planeta”.

## Telas

O botão **🧭 Jornada** exibe o enredo, todos os capítulos, as regiões descobertas e o **Projeto Última Esperança**, com progresso da nave, materiais e botões para localizar, planejar ou lançar. O menu **Objetos → 🚀 Foguete** mostra o blueprint 3×3 no mapa e a próxima etapa quando existir uma plataforma. O lançamento abre uma janela de vitória e oferece continuar administrando a colônia ou voltar ao menu.

## Como validar

```sh
node --check src/space-program.js
node --test tests/space-program.test.cjs
node --test tests/progression.test.cjs
node --test tests/logistics.test.cjs
```

O workflow de publicação valida os arquivos e testes; testes Playwright verificam o mapa, o tutorial e a interface de progressão.

## Próximas melhorias possíveis

- Embarque físico dos tripulantes por ordens de deslocamento até a plataforma, com assentos individuais.
- Tecnologia de combustível refinado, cadeias de produção e estruturas maiores.
- Animação de decolagem usando sprites desenhados especificamente para TILLFOLK.
- Colonização do próximo planeta como campanha pós-final, sem substituir a vitória atual.
