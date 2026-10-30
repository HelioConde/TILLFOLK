param(
    [string]$ZipPath = "",
    [string]$RepoPath = (Join-Path $HOME "TILLFOLK"),
    [switch]$SkipPush
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Instale o Git for Windows." }
if (-not $ZipPath) {
    $found = Get-ChildItem -LiteralPath (Join-Path $HOME "Downloads") -Filter "Sprout Lands - Sprites - premium pack*.zip" -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $found) { throw "ZIP nao encontrado em Downloads. Use -ZipPath com o caminho completo." }
    $ZipPath = $found.FullName
}
$ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
$RepoPath = [IO.Path]::GetFullPath($RepoPath)
if (-not (Test-Path -LiteralPath (Join-Path $RepoPath ".git"))) {
    if ((Test-Path -LiteralPath $RepoPath) -and @(Get-ChildItem -LiteralPath $RepoPath -Force).Count -gt 0) {
        throw "Pasta nao vazia sem repositorio Git. Informe outro -RepoPath."
    }
    & git clone "https://github.com/HelioConde/TILLFOLK.git" $RepoPath
    if ($LASTEXITCODE -ne 0) { throw "Falha no clone." }
}
Push-Location $RepoPath
try {
    & git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw "Falha no pull. Resolva conflitos." }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $assets = [ordered]@{
        "Characters/Basic Charakter Spritesheet.png" = "characters/worker-basic.png"
        "Characters/Premium Charakter Spritesheet.png" = "characters/worker-variants.png"
        "Characters/Basic Charakter Actions.png" = "characters/worker-actions.png"
        "Characters/Tools.png" = "characters/tools.png"
        "Characters/water from wateringcan frames.png" = "characters/watering-effects.png"
        "Objects/Farming Plants.png" = "farming/crops.png"
        "Objects/Items/Farming Plants items.png" = "farming/crop-items.png"
        "Objects/Items/items-spritesheet.png" = "items/items.png"
        "Objects/Items/tools and meterials.png" = "items/tools-materials.png"
        "Objects/Mushrooms, Flowers, Stones.png" = "environment/forageables.png"
        "Objects/Trees, stumps and bushes.png" = "environment/trees-and-bushes.png"
        "Objects/Tree animations/tree sprites.png" = "environment/tree-animations.png"
        "Objects/Water Objects.png" = "environment/water-objects.png"
        "Objects/Water well.png" = "structures/water-well.png"
        "Objects/work station.png" = "structures/work-station.png"
        "Tilesets/ground tiles/New tiles/Grass_tiles_v2.png" = "terrain/grass.png"
        "Tilesets/ground tiles/New tiles/Soil_Ground_Tiles.png" = "terrain/soil.png"
        "Tilesets/ground tiles/New tiles/Stone_Ground_Tiles.png" = "terrain/stone.png"
        "Tilesets/ground tiles/Old tiles/Tilled_Dirt_v2.png" = "terrain/tilled-dirt.png"
        "Tilesets/ground tiles/water frames/Water.png" = "terrain/water.png"
        "Tilesets/Building parts/Fences.png" = "structures/fences.png"
        "Tilesets/Building parts/Fence gates animation sprites .png" = "structures/fence-gates.png"
        "Tilesets/Building parts/Paths.png" = "structures/paths.png"
        "Tilesets/Building parts/Chest.png" = "structures/chest.png"
        "Tilesets/Building parts/Animal Structures/Barn structures.png" = "structures/barn.png"
        "Animals/Chicken/chicken default.png" = "animals/chicken.png"
        "Animals/Chicken_Egg/Egg_Spritesheet.png" = "animals/egg.png"
        "Animals/Cow/Light cow animations.png" = "animals/cow.png"
    }
    $archive = [IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $prefix = "Sprout Lands - Sprites - premium pack/"
        foreach ($source in $assets.Keys) {
            $entry = $archive.GetEntry($prefix + $source)
            if ($null -eq $entry) { throw "Sprite ausente no pacote: $source" }
            $dest = Join-Path $RepoPath ("public/assets/sprout-lands/" + $assets[$source])
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dest)) | Out-Null
            $inputStream = $entry.Open()
            $outputStream = [IO.File]::Create($dest)
            try { $inputStream.CopyTo($outputStream) }
            finally { $outputStream.Dispose(); $inputStream.Dispose() }
        }
        $licenseEntry = $archive.GetEntry($prefix + "read_me.txt")
        if ($null -eq $licenseEntry) { throw "Licenca original ausente." }
        $licensePath = Join-Path $RepoPath "licenses/sprout-lands-premium.txt"
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($licensePath)) | Out-Null
        $licInput = $licenseEntry.Open()
        $licOutput = [IO.File]::Create($licensePath)
        try { $licInput.CopyTo($licOutput) }
        finally { $licOutput.Dispose(); $licInput.Dispose() }
    }
    finally { $archive.Dispose() }
    & git add -- "public/assets/sprout-lands" "licenses/sprout-lands-premium.txt"
    if ($LASTEXITCODE -ne 0) { throw "Falha no git add." }
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Host "Os sprites ja estao atualizados."; return }
    & git commit -m "assets: import curated Sprout Lands sprites for TILLFOLK"
    if ($LASTEXITCODE -ne 0) { throw "Falha no commit." }
    if ($SkipPush) { Write-Host "Commit criado. Execute git push origin main." }
    else {
        & git push origin main
        if ($LASTEXITCODE -ne 0) { throw "Commit local criado, mas o push falhou." }
        Write-Host "28 sprites publicados em https://github.com/HelioConde/TILLFOLK"
    }
}
finally { Pop-Location }
