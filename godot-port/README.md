# TILLFOLK — primeiro port jogável para Godot 4.7.2

Este é o **primeiro recorte de migração do TILLFOLK**, colocado em \`godot-port/\` para proteger a versão HTML5 em produção. O repositório [Re-Dream / Eclipse Vanguard](https://github.com/HelioConde/Re-Dream) foi consultado como referência de stack (Godot 4.7.2, GDScript, importação headless e smoke test); **não é o destino dos arquivos de TILLFOLK**, porque são jogos de gêneros diferentes.

## O que funciona neste recorte
- Mapa top-down reproduzível com clareira, árvores, arbustos e fonte de água.
- Dois colonos com nomes, fome, saúde, habilidade preferencial e autonomia para selecionar ordens explícitas.
- Coleta de alimentos, sementes e madeira; busca de água; transporte físico ao depósito.
- Arar → semear → regar → amadurecer → colher → transportar. As etapas **não são criadas automaticamente**.
- Consumo de comida, fome, dano e derrota; dia e horário.
- Ordem por clique, cancelamento com botão direito, seleção de ferramentas 1–7.
- Novo jogo, salvar e carregar no sistema de arquivos local do Godot (\`user://\`), com verificação mínima de integridade.
- Um smoke test GDScript sem dependências de servidor.

## Rodar localmente

1. Instale Godot 4.7.2, padrão GDScript (não .NET).
2. Abra **\`godot-port/project.godot\`** no Godot e pressione F5.
3. Escolha uma ferramenta com o botão ou com as teclas 1 a 7, clique no mapa e acompanhe os colonos até concluírem a tarefa.
4. Clique direito cancela uma ordem ainda pendente.

Testes:
\`\`\`sh
godot --headless --editor --path godot-port --quit
godot --headless --path godot-port --script res://tests/smoke_test.gd
\`\`\`


## Versão Web para testes (sem alterar GitHub Pages)

A Action `TILLFOLK — Godot 4 (port experimental)` faz importação, smoke e exportação Web. Depois de passar, abra a execução da PR #72, baixe o artefato `tillfolk-godot-web-preview` e sirva os arquivos localmente com `python -m http.server 8080` na pasta extraída. Não abra o HTML direto via `file://`, porque WebAssembly precisa de HTTP. O preview **não é publicado** em `helioconde.github.io/TILLFOLK/`.

## O que AINDA NÃO foi migrado

Esta versão é um vertical slice, **não uma conversão completa**. Faltam os nove atlases Sprout Lands e o autotile oficial, mapa grande com seis biomas, pathfinding com obstáculos, logística de reservas, 19 culturas e economia S4, Work Station e ferramentas, moradias/recrutamento, turismo/animais, mapa dinâmico, tutorial, HUD detalhado, publicação Web e migração de saves do \`localStorage\` antigo. Os visuais atuais são formas procedurais **temporárias**; não são sprites PixelLab nem os sprites premium da versão JS.

As texturas/tilemaps oficiais do JavaScript não foram alterados. **Não tratar \`user://tillfolk-godot-v1.json\` como compatível com \`tillfolk-v01\`.** O sistema de saves do Godot exige um migrador próprio antes da substituição do site. Nenhum dado legado do navegador é apagado.

## Próximos marcos

1. Portar o contrato \`tillfolk-terrain-autotile/v1\` para um TileSet/TileMapLayer sem mudar IDs ou papéis.
2. Integrar os sprites autorizados de Sprout Lands com orientação e animações verificadas, preservando a licença.
3. Portar a lógica real de save e a economia agrária com testes comparativos entre JS e Godot.
4. Portar pathfinding, ordens/prioridades, trabalho com ferramentas, física de transporte e profissões.
5. Adicionar testes visuais desktop/mobile e só então configurar uma publicação Web **alternativa**, sem substituir a versão HTML5 atual.

O jogo de ação **Eclipse Vanguard** continua exclusivamente no repositório \`Re-Dream\`.
