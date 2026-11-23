extends SceneTree
## Smoke independente: garante o mesmo contrato sem carregar sprites premium.
const Terrain = preload("res://scripts/terrain_autotile.gd")
const CASES_PATH := "res://tests/terrain_cases.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error(reason)
	quit(1)

func _run() -> void:
	var config: Dictionary = Terrain.contract()
	var expected_roles := {
		"canto_noroeste": "C01_L01", "borda_norte": "C02_L01", "canto_nordeste": "C03_L01",
		"borda_oeste": "C01_L02", "centro": "C02_L02", "borda_leste": "C03_L02",
		"canto_sudoeste": "C01_L03", "borda_sul": "C02_L03", "canto_sudeste": "C03_L03",
		"interno_noroeste": "C07_L03", "interno_nordeste": "C06_L03",
		"interno_sudoeste": "C07_L02", "interno_sudeste": "C06_L02",
		"isolado": null, "horizontal": null, "vertical": null, "ponta_norte": null,
		"ponta_leste": null, "ponta_sul": null, "ponta_oeste": null
	}
	if config.get("schema") != "tillfolk-terrain-autotile/v1" or int(config.get("tileSize", -1)) != 16:
		_fail("Contrato 16x16 oficial nao foi carregado.")
		return
	if int(config.get("atlasColumns", -1)) != 11 or int(config.get("atlasRows", -1)) != 7:
		_fail("Dimensoes 11x7 do atlas foram alteradas.")
		return
	if int(config.get("neighbors", -1)) != 8 or str(config.get("method")) != "cardinal + complementary inner corners":
		_fail("Metodo de oito vizinhos foi alterado.")
		return
	var assigned: Dictionary = config.get("roles", {})
	if assigned != expected_roles:
		_fail("IDs/papeis oficiais do atlas foram alterados.")
		return
	if Terrain.coords("C01_L01") != Vector2i.ZERO or Terrain.coords("C07_L03") != Vector2i(96, 32):
		_fail("Coordenadas do atlas 16x16 incorretas.")
		return
	if Terrain.atlas_rect("C02_L02") != Rect2i(16, 16, 16, 16):
		_fail("Rect da peca de terreno incorreto.")
		return
	for invalid in [null, "", "C00_L01", "C12_L01", "C01_L08", "Caa_L01", "C01_L1"]:
		if Terrain.coords(invalid) != Vector2i(-1, -1):
			_fail("Codigo de atlas invalido foi aceito: %s" % str(invalid))
			return
	var catalog: Dictionary = Terrain.catalog()
	var entries: Dictionary = catalog.get("terrainAtlases", {})
	var biomes: Dictionary = catalog.get("biomeAtlas", {})
	if entries.size() != 9 or biomes.size() != 6:
		_fail("Catalogo nao tem nove atlases e seis biomas.")
		return
	for key in entries:
		var atlas: Dictionary = Terrain.config_for_atlas(str(key))
		if atlas.get("roles") != expected_roles or atlas.get("atlas") != entries[key] or atlas.get("atlasColumns") != 11:
			_fail("Atlas com contrato inconsistente: %s" % str(key))
			return
	if not Terrain.config_for_atlas("slope").is_empty():
		_fail("Atlas de declive nao pode usar grade de terreno 11x7.")
		return
	for biome in biomes:
		if Terrain.atlas_for_biome(str(biome)) != str(biomes[biome]) or not entries.has(biomes[biome]):
			_fail("Bioma aponta para atlas inexistente.")
			return
	var raw: Variant = JSON.parse_string(FileAccess.get_file_as_string(CASES_PATH))
	if not (raw is Array) or raw.size() < 20:
		_fail("Fixtures de papeis insuficientes ou invalidas.")
		return
	for scenario in raw:
		var mask: Array = []
		for line in scenario["rows"]:
			var bits: Array = []
			for index in range(str(line).length()):
				bits.append(str(line).substr(index, 1) == "1")
			mask.append(bits)
		var selected: Dictionary = Terrain.resolve(mask, 1, 1, assigned)
		var expected_role: Variant = scenario["role"]
		if selected.get("role") != expected_role or selected.get("inner", []) != scenario["inner"]:
			_fail("Papel/diagonal diferente do JS: %s" % str(scenario["name"]))
			return
		var expected_fallback: bool = bool(scenario["fallback"])
		var expected_primary: Variant = null
		if expected_role != null:
			expected_primary = assigned.get(expected_role)
			if expected_fallback:
				expected_primary = assigned["centro"]
		var expected_overlays: Array = []
		for inner in scenario["inner"]:
			expected_overlays.append(assigned[inner])
		var expected_missing: Array = []
		if expected_fallback:
			expected_missing.append(expected_role)
		if selected.get("primary") != expected_primary or selected.get("overlays", []) != expected_overlays:
			_fail("Sprite resolvido/overlay incorreto: %s" % str(scenario["name"]))
			return
		if selected.get("usedFallback") != expected_fallback or selected.get("missing", []) != expected_missing:
			_fail("Fallback/peca ausente nao sinalizada: %s" % str(scenario["name"]))
			return
	var missing_overlay: Dictionary = assigned.duplicate(true)
	missing_overlay.erase("interno_noroeste")
	var inner_mask: Array = [[false, true, true], [true, true, true], [true, true, true]]
	var missing: Dictionary = Terrain.resolve(inner_mask, 1, 1, missing_overlay)
	if missing["missing"] != ["interno_noroeste"] or missing["overlays"] != []:
		_fail("Canto interno sem peca nao foi reportado.")
		return
	print("TILLFOLK Godot terrain: 9 atlases, 6 biomas e %d mascaras OK" % raw.size())
	quit(0)
