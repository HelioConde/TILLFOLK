# Construção com Blueprints — TILLFOLK

## Objetivo

O jogador consegue posicionar obras **antes da execução**. O local recebe um modelo pixel art **azul semitransparente**, retirado dos sprites já existentes no jogo. Terrenos inválidos aparecem em vermelho. A silhueta é visual e não ocupa o mapa como objeto físico.

O sistema reutiliza as ordens, a IA e o `localStorage` da colônia: sem backend, sem criar um formato incompatível de salvamento.

## Construir → Cabana (🏠)

1. Escolha **Construir → Cabana · Equipe**.
2. Movimente o ponteiro pelo mapa para ver a cabana **2×2 azul**. Vermelho significa terreno bloqueado por água, árvores, estruturas, plantações ou bioma inadequado.
3. Clique para criar a ordem `buildHome`. A cabana segue azul até o colono terminar o trabalho (180 unidades de trabalho, sujeitas aos bônus do trabalhador).
4. É necessário ter **8 madeiras** para a construção começar. Com menos madeira, o plano continua visível e a tarefa fica aguardando.
5. Depois da execução, a cabana definitiva substitui a silhueta azul.

## Construir → Plantação (🌱)

1. Escolha **Construir → Plantação · Canteiros**.
2. Passe o cursor sobre o solo cultivável para visualizar uma **célula azul de solo preparado**. A aparência vermelha indica local inválido (árvore, pedra, água, construção, solo já plantado, gelo ou veneno).
3. Clique para planejar um canteiro **1×1**, ou arraste para formar vários canteiros; o limite é de 120 células por seleção.
4. A ação do jogador agenda explicitamente **Arar** e **Semear**. Se o solo já estiver arado, agenda só **Semear**. A semeadura aguarda a conclusão da aração e a disponibilidade de sementes.
5. As ordens seguem prioridades, proibições por traços negativos e o tempo de trabalho já existente.
6. Ao terminar a semeadura, desaparece a cor azul e fica a plantação real. **Regar, colher e transportar** continuam exigindo ordens próprias: não há automação involuntária dessas etapas.

## Editor de peças antigas

Os botões **Piso**, **Paredes** e **Telhado** mantêm o editor direto por peças e seu sistema de desfazer. Agora apresentam o sprite da peça como silhueta azul transparente sob o cursor, ou vermelho quando a alteração é inválida. Diferentemente de Cabana e Plantação, o editor clássico aplica a peça imediatamente após o clique.

## Controles

| Entrada | Resultado |
| --- | --- |
| Botão esquerdo | Confirmar blueprint da cabana ou do canteiro |
| Esquerdo + arrastar em Plantação | Planejar retângulo de canteiros |
| Direito em blueprint | Cancelar as ordens ainda pendentes |
| Direito + arrastar sobre canteiros | Cancelar todos os planos da área |
| Desfazer | Reverter o último conjunto de alterações do construtor |
| Área ligada no celular | Usar o dedo para marcar várias células, sem perder o zoom com pinça |
| Esc / Fechar | Sair do menu de construção |

## Compatibilidade e QA

- Blueprints pendentes são derivados de `state.orders`; **não existe segunda fila** nem campos obrigatórios novos no save.
- O fluxo de conclusão de uma ordem já remove suas tarefas e a silhueta correspondente.
- O renderizador `src/blueprints.js` usa recortes e silhuetas dos assets locais `sprout-lands`.
- `tests/blueprints.spec.cjs` cobre prévia azul, criação, cancelamento, desfazer, salva/continua e arrasto em viewport mobile.
- O workflow `.github/workflows/biome-smoke.yml` tira screenshots desktop e mobile; o Pages verifica a publicação de `src/blueprints.js`.

## Limitações conhecidas

- O editor antigo de piso/parede/telhado ainda aplica peças imediatamente; a construção assíncrona por trabalhadores vale para **Cabana** e **Plantação**.
- A plantação inicial não inicia rega ou colheita automaticamente. Sementes precisam estar disponíveis.
- Blueprints são planejamentos e não bloqueiam a passagem dos colonos até que a construção seja concluída.
