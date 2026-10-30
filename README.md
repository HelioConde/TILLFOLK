# TILLFOLK 🌱

Jogo web de fazenda, sobrevivência e automação de trabalhadores, desenvolvido com HTML5 e JavaScript.

## Visão

- A fazenda evolui por meio de atividades demoradas: limpar, arar, fertilizar, plantar, regar, colher e transportar.
- Trabalhadores contratados escolhem tarefas automaticamente conforme prioridades e especializações.
- Cada trabalhador pode ter até **3 habilidades positivas** e **3 traços negativos**.
- Todos podem realizar tarefas não proibidas; especialistas executam mais rapidamente suas respectivas atividades.
- Menos especialidades significa maior bônus individual; o jogador precisa equilibrar especialistas e generalistas.

## Sprites

O projeto usa uma **seleção de sprites** do pacote **Sprout Lands – Premium**, de **Cup Nooble**, dentro de `public/assets/sprout-lands/`. O pacote premium original **não** deve ser redistribuído como um conjunto de assets independente.

**Créditos obrigatórios:** Assets — Sprout Lands, by Cup Nooble.

Os sprites podem ser usados em jogos comerciais e não comerciais e projetos de código aberto, mediante créditos e inclusão dos termos originais. A licença proíbe redistribuir/revender o pacote de assets em si e usá-lo para NFTs ou treinamento de IA. Confira os termos completos em `licenses/sprout-lands-premium.txt` após a importação.

### Como importar

1. Baixe legalmente o arquivo ZIP original do pacote Sprout Lands Premium e mantenha-o em `Downloads` (ou informe seu caminho).
2. Tenha Git for Windows instalado e autenticado no GitHub.
3. Clone o repositório: `git clone https://github.com/HelioConde/TILLFOLK.git`.
4. No PowerShell, execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\TILLFOLK\tools\import-sprites.ps1` a partir da pasta em que clonou o projeto.
5. O importador seleciona 28 sprites úteis ao jogo, preserva os termos da licença, cria commit e envia ao GitHub.

O importador pode receber `-ZipPath "C:\caminho\arquivo.zip"` e `-RepoPath "C:\caminho\TILLFOLK"`. Ele **não** publica o ZIP completo nem os arquivos `.aseprite` ou previews.
