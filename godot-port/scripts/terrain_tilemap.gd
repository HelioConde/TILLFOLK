extends RefCounted
## Adaptador visual do contrato oficial para TileSet/TileMapLayer.
const Terrain = preload("res://scripts/terrain_autotile.gd")
const TILE_SIZE := 16
const ATLAS_ROOT := "res://assets/terrain/"

static func create_tile_set() -> Dictionary:
	var catalog: Dictionary = Terrain.catalog().get("terrainAtlases", {})
	var tile_set := TileSet.new()
	tile_set.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	var source_ids: Dictionary = {}
	var keys: Array = catalog.keys()
	keys.sort()
	for key in keys:
		var texture_path := ATLAS_ROOT + str(catalog[key])
		var texture := load(texture_path) as Texture2D
		if texture == null or texture.get_width() != 176 or texture.get_height() != 112:
			return {"error": "Atlas ausente ou fora da grade 11x7: %s" % texture_path}
		var source := TileSetAtlasSource.new()
		source.texture = texture
		source.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
		for y in range(7):
			for x in range(11):
				source.create_tile(Vector2i(x, y))
		var source_id := tile_set.add_source(source)
		source_ids[str(key)] = source_id
	return {"tile_set": tile_set, "source_ids": source_ids}

## Pinta uma máscara de um único atlas, deixando cantos internos na camada superior.
static func paint_mask(base_layer: TileMapLayer, overlay_layer: TileMapLayer, source_id: int, mask: Array, assigned: Dictionary = {}, cell_offset: Vector2i = Vector2i.ZERO) -> Dictionary:
	if base_layer == null or overlay_layer == null or source_id < 0:
		return {"error": "Camadas ou origem de atlas inválidas", "painted": 0, "overlays": 0}
	var painted := 0
	var overlays := 0
	var roles: Dictionary = assigned if not assigned.is_empty() else Terrain.contract().get("roles", {})
	for y in range(mask.size()):
		var row: Variant = mask[y]
		if not row is Array:
			continue
		for x in range(row.size()):
			if not bool(row[x]):
				continue
			var resolved: Dictionary = Terrain.resolve(mask, x, y, roles)
			var primary: Variant = resolved.get("primary")
			var atlas_coords := _atlas_coords(primary)
			if atlas_coords.x < 0:
				return {"error": "Papel sem tile válido: %s" % str(resolved.get("role")), "painted": painted, "overlays": overlays}
			var cell := cell_offset + Vector2i(x, y)
			base_layer.set_cell(cell, source_id, atlas_coords)
			painted += 1
			for tile_id in resolved.get("overlays", []):
				var overlay_coords := _atlas_coords(tile_id)
				if overlay_coords.x < 0:
					return {"error": "Tile de sobreposição inválido: %s" % str(tile_id), "painted": painted, "overlays": overlays}
				overlay_layer.set_cell(cell, source_id, overlay_coords)
				overlays += 1
	return {"error": "", "painted": painted, "overlays": overlays}

static func _atlas_coords(tile_id: Variant) -> Vector2i:
	var pixel_coords: Vector2i = Terrain.coords(tile_id)
	if pixel_coords.x < 0:
		return Vector2i(-1, -1)
	return pixel_coords / TILE_SIZE
