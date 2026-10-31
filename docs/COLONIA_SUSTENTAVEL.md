# TILLFOLK — Colônia sustentável (marco jogável 01)

## O que entrou no código

O jogador continua decidindo cada **ordem de agricultura**. Os colonos selecionam trabalhos conforme prioridade, distância e restrições. Buscar água ou esterco é um **subpasso logístico autorizado** pela ordem de regar/fertilizar, e não uma nova ordem agrícola autônoma.

1. **Grama e sementes:** `Limpar` sobre grama alta fornece fibras e tem **25% de chance** de entregar uma semente. A fazenda nova começa com zero sementes. Colheitas transportadas devolvem uma semente por ciclo; o RNG do corte não garante sementes em cada tufo.
2. **Água:** água inicial **0**; lagoa não gera estoque automaticamente. Em `Ordens → Buscar água`, clique no lago e um trabalhador caminha até a margem (+4 água). Se um trabalhador recebe `Regar` e não há água em estoque, ele **busca no lago, carrega e retorna ao canteiro** antes de regar. A água só é consumida no atendimento da ordem.
3. **Esterco:** uma vaca do atlas **já existente** surge na clareira com uma unidade de esterco e produz mais uma a cada 120 segundos simulados (máximo três não coletados). `Recolher esterco` junto ao animal entrega ao estoque. Uma ordem de `Fertilizar` também pode buscar esterco diretamente na vaca e levá-lo ao canteiro; consome uma unidade real. Sem esterco disponível aguarda produção.
4. **Madeira e casas:** árvores e troncos fornecem madeira ao concluir `Limpar`. `Construir casa` exige 8 madeiras no estoque, um espaço vazio **2×2** e 180 segundos base de trabalho (antes de bônus). A estrutura não aparece concluída ao clicar: é uma ordem que um trabalhador executa. Cada cabana independente tem uma vaga, desenhada com sprites de madeira já presentes. O editor antigo de pisos, paredes e telhado continua para saves prévios; uma construção antiga com dois pisos, parede e telhado pode contar como uma moradia.
5. **Recrutamento condicionado:** trabalhadores iniciais são gratuitos e não exigem casa para iniciar, mas o próximo ajudante só pode ser comprado quando todos os atuais tiverem moradia e sobrar uma cabana concluída. Dois habitantes → **3 casas completas** para contratar o terceiro (mais o custo em moedas). Os moradores são atribuídos às casas disponíveis ao finalizar ou carregar.
6. **Persistência:** `state.homes`, `state.animals`, `state.inventory.manure` e ordens novas são gravados no mesmo `localStorage`. Saves antigos são migrados. Cargas carregadas por trabalhadores ao recarregar ou cancelar retornam ao estoque. Não há banco nem API externa.

## Como jogar esse marco

- Comece uma fazenda e abra **Ordens**.
- Marque **Limpar** nas gramíneas para tentar encontrar sementes ou em árvores para recolher madeira.
- Marque **Arar**, **Semear** e **Regar** conforme a área preparada. Sem água, o trabalhador se desloca à lagoa por conta da ordem já autorizada.
- Use **Fertilizar** (opcional antes de semear); um colono pega esterco do animal ou do estoque.
- Faça **Construir casa** em terrenos 2×2 livres. A obra fica aguardando madeira se faltar; árvores podem ser limpas em paralelo.
- Com duas pessoas, construa três cabanas para liberar a compra de mais uma pessoa.

## Testes e regras de segurança

- `tests/colony.spec.cjs`: economia inicial, água da lagoa, esterco/animal, obras e vagas de recrutamento, rotas automáticas de irrigação e fertilização.
- `.github/workflows/colony-tests.yml`: executa testes da colônia isoladamente e anexa screenshots; o QA visual geral continua ativo.
- Ninguém cria etapas agrícolas adicionais sem ordem do jogador. Não existe consumo negativo de recursos.
- Todos os sprites utilizados estão em `public/assets/sprout-lands`; os assets Sprout Lands não são usados para treino de IA.

## Limitações conhecidas e próximos marcos

A primeira fase já cria dependências e trabalho real, mas o estoque de madeira ainda é global: não há reserva individual de materiais nem carregamento visual de tábuas até a obra. A vaca ainda tem rotina simples e não consome comida. Casas são cabanas fixas 2×2 e não possuem interiores ou rotinas de sono. O sistema de moradias não adiciona automaticamente construção, limpeza ou plantio: tudo depende das ordens.

Próximas etapas, por dependência:

1. **Logística avançada:** entrega física de madeira às obras, depósito com capacidade, reservas de materiais por trabalho e prevenção de disputas.
2. **Animais e compostagem:** currais, alimentação, produção e armazenamento de resíduos, fertilizantes variados.
3. **Casas habitáveis:** interior, cama, sono, energia, bem-estar, calor e melhorias; conversão visual do editor de casas antigo.
4. **Ferramentas por área:** cortar faixa de grama/árvores, prioridades 1–9 por tarefa e ordens permanentes opt-in.
5. **Balanceamento e sobrevivência:** tempo de descanso, alimentação diária, produtividade, culturas e expansão do mapa.
6. **Evolução visual:** novos recortes dos sprites locais, indicadores de transporte e screenshots de validação em celular/desktop.
