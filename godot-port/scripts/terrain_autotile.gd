extends RefCounted
## Port deterministico da regra de terreno de src/terrain-autotile.js.
## Nao editar os IDs, papéis nulos, ordem de vizinhos ou grade do contrato.
const CONTRACT_PATH := "res://data/terrain_contract.json"
const CATALOG_PATH := "res://data/terrain_catalog.json"
const TILE_SIZE := 16
const ATLAS_COLUMNS := 11
const ATLAS_ROWS := 7
const INVALID_COORDS := Vector2i(-1, -1)

static func _load_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	return parsed if parsed is Dictionary else {}

static func contract() -> Dictionary:
	return _load_json(CONTRACT_PATH)

static func catalog() -> Dictionary:
	return _load_json(CATALOG_PATH)

## Converte C02_L02 em coordenadas de PIXEL (16,16) do atlas 176x112.
static func coords(tile_id: Variant) -> Vector2i:
	if not (tile_id is String):
		return INVALID_COORDS
	var code: String = tile_id
	if code.length() != 7 or code.substr(0, 1) != "C" or code.substr(3, 2) != "_L":
		return INVALID_COORDS
	var col := int(code.substr(1, 2))
	var row := int(code.substr(5, 2))
	if code != "C%02d_L%02d" % [col, row]:
		return INVALID_COORDS
	if col < 1 or col > ATLAS_COLUMNS or row < 1 or row > ATLAS_ROWS:
		return INVALID_COORDS
	return Vector2i((col - 1) * TILE_SIZE, (row - 1) * TILE_SIZE)

static func atlas_rect(tile_id: Variant) -> Rect2i:
	var point := coords(tile_id)
	if point == INVALID_COORDS:
		return Rect2i(INVALID_COORDS, Vector2i.ZERO)
	return Rect2i(point, Vector2i(TILE_SIZE, TILE_SIZE))

static func has(mask: Array, x: int, y: int) -> bool:
	if y < 0 or y >= mask.size():
		return false
	var row: Variant = mask[y]
	return row is Array and x >= 0 and x < row.size() and bool(row[x])

static func role_at(mask: Array, x: int, y: int) -> Dictionary:
	if not has(mask, x, y):
		return {"role": null, "inner": []}
	var n := has(mask, x, y - 1)
	var e := has(mask, x + 1, y)
	var s := has(mask, x, y + 1)
	var w := has(mask, x - 1, y)
	var cardinal := int(n) + int(e) + int(s) + int(w)
	var role := "centro"
	if cardinal == 0:
		role = "isolado"
	elif cardinal == 1:
		role = "ponta_norte" if n else ("ponta_leste" if e else ("ponta_sul" if s else "ponta_oeste"))
	elif n and s and not e and not w:
		role = "vertical"
	elif e and w and not n and not s:
		role = "horizontal"
	elif not n and not w:
		role = "canto_noroeste"
	elif not n and not e:
		role = "canto_nordeste"
	elif not s and not w:
		role = "canto_sudoeste"
	elif not s and not e:
		role = "canto_sudeste"
	elif not n:
		role = "borda_norte"
	elif not e:
		role = "borda_leste"
	elif not s:
		role = "borda_sul"
	elif not w:
		role = "borda_oeste"
	var inner: Array[String] = []
	# Cantos internos exigem vizinhos cardinais e diagonal ausente.
	if n and w and not has(mask, x - 1, y - 1):
		inner.append("interno_noroeste")
	if n and e and not has(mask, x + 1, y - 1):
		inner.append("interno_nordeste")
	if s and w and not has(mask, x - 1, y + 1):
		inner.append("interno_sudoeste")
	if s and e and not has(mask, x + 1, y + 1):
		inner.append("interno_sudeste")
	return {"role": role, "inner": inner}

static func resolve(mask: Array, x: int, y: int, assigned: Dictionary = {}) -> Dictionary:
	var found := role_at(mask, x, y)
	var role: Variant = found["role"]
	if role == null:
		return {"role": null, "primary": null, "overlays": [], "missing": [], "usedFallback": false}
	var missing: Array[String] = []
	var primary: Variant = assigned.get(role)
	if coords(primary) == INVALID_COORDS:
		primary = null
	var fallback := primary == null and coords(assigned.get("centro")) != INVALID_COORDS
	if primary == null:
		missing.append(str(role))
		if fallback:
			primary = assigned["centro"]
	var overlays: Array[String] = []
	for inner_role in found["inner"]:
		var tile_id: Variant = assigned.get(inner_role)
		if coords(tile_id) != INVALID_COORDS:
			overlays.append(str(tile_id))
		else:
			missing.append(str(inner_role))
	return {"role": role, "primary": primary, "overlays": overlays,
		"inner": found["inner"], "missing": missing, "usedFallback": fallback}

static func config_for_atlas(atlas_key: String) -> Dictionary:
	var entries: Dictionary = catalog().get("terrainAtlases", {})
	if not entries.has(atlas_key):
		return {}
	var result: Dictionary = contract()
	result["atlas"] = entries[atlas_key]
	result["terrain"] = "grass" if atlas_key == "grassLayer" else atlas_key
	return result

static func atlas_for_biome(biome: String) -> String:
	var biomes: Dictionary = catalog().get("biomeAtlas", {})
	return str(biomes.get(biome, ""))
