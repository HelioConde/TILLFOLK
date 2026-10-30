# TILLFOLK — Construção de casas em camadas

Referência de implementação: [Slime-Harvest — HouseBuilder](https://github.com/HelioConde/Slime-Harvest/blob/main/docs/house_building.md) (Godot/GDScript). Esta versão é uma implementação própria em JavaScript/Canvas HTML5, usando apenas imagens já existentes em `public/assets/sprout-lands/structures/`.

## Jogabilidade
- **Construir** (ou tecla **B**) abre o editor de casa dentro da fazenda, sem sair do fullscreen.
- **Piso** (tecla 1): expande a fundação por células vizinhas, respeitando a capacidade total de 25 peças. A casa inicial consome 15, restando 10.
- **Paredes** (tecla 2) e **Telhado** (tecla 3) são pintados e apagados **independentemente**, desde que sustentados pela fundação.
- **Clique esquerdo** coloca; **direito** remove. Em dispositivos touch, ative **Apagar** antes de tocar.
- **R** alterna a exibição do telhado, **Ctrl/Cmd + Z** desfaz até 30 alterações da sessão; **Esc** ou B fecha o editor.
- A prévia verde/vermelha destaca a validade do posicionamento e mensagens explicam erros.
- A célula âncora da fundação é permanente. O piso não pode ficar desconectado, nem ocupar culturas ativas, objetos ou trabalhadores.
- A porta usa os frames originais do pacote e abre quando um trabalhador se aproxima.

## Dados e publicação
- `state.house` v1: `{floor, walls, roof, anchor, door, roofHidden}`; três arrays com chaves `x-y`, serializados junto ao save existente no `localStorage`.
- Saves antigos sem `house` são migrados pela criação da casa inicial, preservando a equipe, moedas, sementes e tarefas.
- O deploy em `.github/workflows/pages.yml` inclui `src/house-building.js`, `house-building.css` e os sprites locais.
- Teste: `tests/house.spec.cjs` faz screenshots desktop/mobile, edição, desfazer, âncora, migração e recarga.
- Sem banco de dados, API ou geração de sprites externos.

## Limitações desta primeira versão
A porta permanece na posição original; a construção é uma casa inicial expansível, não múltiplas residências independentes. Materiais são representados pelo limite de peças de piso em vez de um inventário de madeira que os colonos precisam transportar. Colisão e pathfinding usam as células ocupadas da casa; nenhum trabalhador entra no interior, então o telhado é ocultado manualmente, e não por ocupação interna. Essas etapas podem ser evoluídas mais tarde.
