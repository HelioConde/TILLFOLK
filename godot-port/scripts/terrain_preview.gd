extends Node2D
## Prévia isolada do atlas oficial: seis áreas para demonstrar a escolha de bioma.
const Terrain = preload("res://scripts/terrain_autotile.gd")
const TilemapAdapter = preload("res://scripts/terrain_tilemap.gd")
const BIOMES := ["g", "f", "s", "i", "w", "p"]
const REGION_WIDTH := 10
const REGION_HEIGHT := 9

func _ready() -> void:
	var built: Dictionary = TilemapAdapter.create_tile_set()
	if built.has("error"):
		push_error(str(built["error"]))
		return
	var tile_set: TileSet = built["tile_set"]
	var ids: Dictionary = built["source_ids"]
	var base := TileMapLayer.new()
	base.name = "TerrainBase"
	base.tile_set = tile_set
	add_child(base)
	var overlays := TileMapLayer.new()
	overlays.name = "TerrainInnerCorners"
	overlays.tile_set = tile_set
	overlays.z_index = 1
	add_child(overlays)
	for region_index in range(BIOMES.size()):
		var biome: String = BIOMES[region_index]
		var atlas_key := Terrain.atlas_for_biome(biome)
		var source_id := int(ids.get(atlas_key, -1))
		var origin := Vector2i((region_index % 3) * REGION_WIDTH, (region_index / 3) * REGION_HEIGHT)
		var mask: Array = _region_mask()
		var state: Dictionary = TilemapAdapter.paint_mask(base, overlays, source_id, mask, Terrain.config_for_atlas(atlas_key).get("roles", {}), origin)
		if not str(state.get("error", "")).is_empty():
			push_error(str(state["error"]))
			return
	queue_redraw()

func _region_mask() -> Array:
	var mask: Array = []
	for _y in range(REGION_HEIGHT):
		var row: Array[bool] = []
		for _x in range(REGION_WIDTH):
			row.append(true)
		mask.append(row)
	return mask

func _draw() -> void:
	var names := ["Pradaria", "Pradaria escura", "Solo", "Pedra", "Solo sombrio", "Bosque"]
	for i in range(names.size()):
		var x := (i % 3) * REGION_WIDTH * 16 + 12
		var y := (i / 3) * REGION_HEIGHT * 16 + 4
		draw_string(ThemeDB.fallback_font, Vector2(x, y), names[i], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#fff1d0"))
