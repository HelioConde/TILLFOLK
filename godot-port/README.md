# TILLFOLK — primeiro port jogável para Godot 4.7.2

Este é o **primeiro recorte de migração do TILLFOLK**, colocado em \`godot-port/\` para proteger a versão HTML5 em produção. O repositório [Re-Dream / Eclipse Vanguard](https://github.com/HelioConde/Re-Dream) foi consultado como referência de stack (Godot 4.7.2, GDScript, importação headless e smoke test); **não é o destino dos arquivos de TILLFOLK**, porque são jogos de gêneros diferentes.

## O que funciona neste recorte
- Mapa top-down reproduzível com clareira, árvores, arbustos e fonte de água.
- Dois colonos com nomes, fome, saúde, habilidade preferencial e autonomia para selecionar ordens explícitas.
- Coleta de alimentos, sementes e madeira; busca de água; transporte físico ao depósito.
- Navegação por grade contorna árvores e rios; madeira e água são coletadas de células adjacentes transitáveis, sem atravessar obstáculos ou gerar recursos à distância.
- Arar → semear → regar → amadurecer → colher → transportar. As etapas **não são criadas automaticamente**.
- Consumo de comida, fome, dano e derrota; dia e horário.
- Ordem por clique, cancelamento com botão direito, seleção de ferramentas 1–7.
- **Prioridades de ordem de 1 a 9:** o jogador escolhe antes de enviar a tarefa com os botões `-`/`+` ou teclas `-`/`=`; 9 tem precedência sobre 1, sem automatizar ordens. Contornos mais grossos destacam urgência alta. A prioridade de cada ordem fica registrada no save.
- **Traços e especialidades (primeiro corte):** o núcleo já respeita até três atividades proibidas por colono (`blocked_tools`) e bônus do GDD (1 especialidade = 2,0×; 2 = 1,6×; 3 = 1,3×). A configuração visual das restrições e as prioridades globais/individuais por trabalhador ainda não foram portadas.
- Pausa e retomada (`P` ou botão) e velocidades de simulação 1x, 2x e 3x (`8`, `9`, `0` ou botões). A pausa congela o relógio, os colonos, a fome e os trabalhos; mudar a velocidade retoma a partida. Os controles de tempo são da sessão e não alteram o formato do save.
- Novo jogo, salvar e carregar no sistema de arquivos local do Godot (\`user://\`), com verificação mínima de integridade.
- Um smoke test GDScript sem dependências de servidor, incluindo desvio de árvore, trabalho na margem do rio, tarefas isoladas, reatribuição de ordens após morte, prioridade, restrições, bônus e saves legados.
- **Núcleo de autotile oficial em GDScript:** `scripts/terrain_autotile.gd` reproduz bordas, cantos, cantos internos e fallback do contrato `tillfolk-terrain-autotile/v1` (16×16, 11×7, 8 vizinhos). O JSON e o catálogo dos nove atlases/seis biomas são comparados automaticamente com HTML5. A renderização em TileMapLayer ainda não foi implementada.

## Rodar localmente

1. Instale Godot 4.7.2, padrão GDScript (não .NET).
2. Abra **\`godot-port/project.godot\`** no Godot e pressione F5.
3. Escolha uma ferramenta com o botão ou com as teclas 1 a 7, clique no mapa e acompanhe os colonos até concluírem a tarefa.
4. Clique direito cancela uma ordem ainda pendente. Ajuste a prioridade da próxima ordem com os botões `-`/`+` do painel direito ou com as teclas `-`/`=`. Isso não altera prioridades de ordens já criadas.

Testes:
\`\`\`sh
godot --headless --editor --path godot-port --quit
godot --headless --path godot-port --script res://tests/smoke_test.gd
godot --headless --path godot-port --script res://tests/terrain_contract_test.gd
node --test tests/godot-terrain-parity.test.cjs tests/terrain-contract.test.cjs tests/terrain-biomes.test.cjs tests/terrain-autotile.test.cjs
\`\`\`


## Versão Web para testes (sem alterar GitHub Pages)

A Action `TILLFOLK — Godot 4 (port experimental)` faz importação, smoke e exportação Web. Depois de passar, abra a execução da PR Godot mais recente, baixe o artefato `tillfolk-godot-web-preview` e sirva os arquivos localmente com `python -m http.server 8080` na pasta extraída. Não abra o HTML direto via `file://`, porque WebAssembly precisa de HTTP. O preview **não é publicado** em `helioconde.github.io/TILLFOLK/`.

## O que AINDA NÃO foi migrado

Esta versão é um vertical slice, **não uma conversão completa**. Falta desenhar os nove atlases Sprout Lands via TileSet/TileMapLayer (o contrato e catálogo de seleção já estão migrados), mapa grande com seis biomas, navegação avançada (terrenos/custos dinâmicos e reservas), logística de reservas, 19 culturas e economia S4, Work Station e ferramentas, moradias/recrutamento, turismo/animais, mapa dinâmico, tutorial, HUD detalhado, publicação Web e migração de saves do \`localStorage\` antigo. Os visuais atuais são formas procedurais **temporárias**; não são sprites PixelLab nem os sprites premium da versão JS.

Saves `schema: 1` anteriores continuam aceitos: a prioridade de ordens antigas ausente no JSON é interpretada como 5 e a lista de atividades proibidas ausente é tratada como vazia. A edição desses novos campos não altera o esquema, os materiais ou os saves da versão HTML5.

As texturas/tilemaps oficiais do JavaScript não foram alterados. **Não tratar \`user://tillfolk-godot-v1.json\` como compatível com \`tillfolk-v01\`.** O sistema de saves do Godot exige um migrador próprio antes da substituição do site. Nenhum dado legado do navegador é apagado.

## Próximos marcos

1. Usar o contrato \`tillfolk-terrain-autotile/v1\` já portado para construir um TileSet/TileMapLayer visual sem alterar IDs, papéis ou coordenadas.
2. Integrar os sprites autorizados de Sprout Lands com orientação e animações verificadas, preservando a licença.
3. Portar a lógica real de save e a economia agrária com testes comparativos entre JS e Godot.
4. Evoluir o pathfinding básico com custos e reservas, prioridades globais/individuais por trabalhador (além das prioridades por ordem já portadas), trabalho com ferramentas, física de transporte e profissões.
5. Adicionar testes visuais desktop/mobile e só então configurar uma publicação Web **alternativa**, sem substituir a versão HTML5 atual.

O jogo de ação **Eclipse Vanguard** continua exclusivamente no repositório \`Re-Dream\`.
