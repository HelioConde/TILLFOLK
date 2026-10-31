#!/usr/bin/env python3
"""Recorta Grass_Tile_Layers.png em células 16x16 sem reamostrar pixel art."""
from __future__ import annotations
import json
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/ground tiles/New tiles"
SOURCE = BASE / "Grass_Tile_Layers.png"
OUTPUT = BASE / "Grass_Tile_Layers_recortes"
TILE = 16


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    width, height = source.size
    if width % TILE or height % TILE:
        raise ValueError(f"Arquivo com dimensões incompatíveis: {width}x{height}, tile {TILE}x{TILE}")
    columns, rows = width // TILE, height // TILE
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    size = 74
    pad_x, pad_y = 40, 66
    sheet = Image.new("RGB", (pad_x + columns * size + 12, pad_y + rows * size + 16), "#21382b")
    draw = ImageDraw.Draw(sheet)
    font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        normal = ImageFont.truetype(font_file, 12)
        headline = ImageFont.truetype(font_file, 18)
    except OSError:
        normal = headline = ImageFont.load_default()
    draw.text((pad_x, 13), "GRASS_TILE_LAYERS  |  MAPA DE REFERENCIA", fill="#f5e4af", font=headline)
    draw.text((pad_x, 39), f"Grade: {columns} colunas x {rows} linhas  |  Tile: {TILE}x{TILE} px  |  C = coluna, L = linha", fill="#bde0b0", font=normal)
    for col in range(columns):
        draw.text((pad_x + col * size + 24, 52), f"{col+1:02}", fill="#e2d6a6", font=normal)
    for row in range(rows):
        draw.text((8, pad_y + row * size + 19), f"L{row+1:02}", fill="#e2d6a6", font=normal)
        for col in range(columns):
            name = f"C{col+1:02}_L{row+1:02}"
            x, y = col * TILE, row * TILE
            tile = source.crop((x, y, x + TILE, y + TILE))
            tile.save(OUTPUT / (name + ".png"), optimize=True)
            occupied = tile.getchannel("A").getbbox() is not None
            records.append({
                "id": name, "coluna": col + 1, "linha": row + 1,
                "x": x, "y": y, "largura": TILE, "altura": TILE,
                "arquivo": "Grass_Tile_Layers_recortes/" + name + ".png",
                "tem_pixels_visiveis": occupied, "tipo": None,
                "observacao": ""
            })
            px = pad_x + col * size
            py = pad_y + row * size
            draw.rectangle((px + 3, py + 3, px + 67, py + 56), fill="#617466")
            for cy in range(4):
                for cx in range(4):
                    if (cx + cy) % 2:
                        draw.rectangle((px + 3 + cx * 16, py + 3 + cy * 13,
                                        px + 18 + cx * 16, py + 15 + cy * 13), fill="#89968c")
            enlarged = tile.resize((48, 48), Image.Resampling.NEAREST)
            sheet.paste(enlarged, (px + 11, py + 5), enlarged)
            draw.rectangle((px + 3, py + 3, px + 67, py + 56), outline="#b9a777", width=2)
            draw.text((px + 11, py + 57), name, fill="#e7e5c9" if occupied else "#a2afa1", font=normal)
    sheet.save(BASE / "Grass_Tile_Layers_MAPA.png", optimize=True)
    manifest = {
        "fonte": "Grass_Tile_Layers.png", "largura": width, "altura": height,
        "tile_size": TILE, "colunas": columns, "linhas": rows,
        "total": len(records), "coordenadas": "Coluna e linha a partir de 1; pixels a partir de 0",
        "tiles": records
    }
    (BASE / "Grass_Tile_Layers_mapeamento.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    guide = f"""# Grass_Tile_Layers — recortes para mapeamento

O sprite original foi preservado. Foram extraídas **{len(records)} células** de **{TILE}×{TILE} px** ({columns} colunas × {rows} linhas), incluindo eventuais células transparentes.

- **Grass_Tile_Layers_MAPA.png**: prancha numerada com fundo quadriculado para enxergar transparências.
- **Grass_Tile_Layers_recortes/**: um PNG RGBA original por célula.
- **Grass_Tile_Layers_recortes.zip**: todos os recortes em um arquivo.
- **Grass_Tile_Layers_mapeamento.json**: coordenadas em pixels e campos \`tipo\` / \`observacao\` vazios, para classificar depois.
- **mapear_grama.html**, na raiz do GitHub Pages: ferramenta interativa para clicar, classificar e exportar um JSON.

## Como me enviar o mapeamento

Diga por exemplo: **C01_L02 = canto superior esquerdo**, **C02_L02 = borda superior**, **C05_L04 = centro**.

Ou abra \`mapear_grama.html\`, clique nas peças, escolha a categoria e use **Copiar mapeamento** para colar aqui.

As etiquetas são coordenadas e não suposições sobre o uso de cada tile. O código do terreno não foi alterado.
"""
    (BASE / "Grass_Tile_Layers_LEIA-ME.md").write_text(guide, encoding="utf-8")
    zip_path = BASE / "Grass_Tile_Layers_recortes.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(OUTPUT.glob("*.png")):
            archive.write(file, arcname="Grass_Tile_Layers_recortes/" + file.name)
    print(f"Separados {len(records)} tiles ({columns}x{rows}) em {OUTPUT}")


if __name__ == "__main__":
    main()
