extends SceneTree
## Integração real de atlas importados, TileSet e TileMapLayer.
const Adapter = preload("res://scripts/terrain_tilemap.gd")
const Terrain = preload("res://scripts/terrain_autotile.gd")

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error(reason)
	quit(1)

func _run() -> void:
	var packed: PackedScene = load("res://scenes/TerrainPreview.tscn")
	if packed == null:
		_fail("Cena da prévia de terrenos não foi carregada.")
		return
	var preview: Node2D = packed.instantiate()
	root.add_child(preview)
	await process_frame
	var base := preview.get_node_or_null("TerrainBase") as TileMapLayer
	var overlay := preview.get_node_or_null("TerrainInnerCorners") as TileMapLayer
	if base == null or overlay == null:
		_fail("Camadas TileMapLayer não foram criadas.")
		return
	if base.get_used_cells().size() != 540:
		_fail("Prévia deveria renderizar seis biomas de 10x9 tiles.")
		return
	var built: Dictionary = Adapter.create_tile_set()
	if built.has("error") or built["source_ids"].size() != 9:
		_fail("Os nove atlas oficiais não foram carregados: %s" % str(built.get("error", "")))
		return
	for biome_index in range(6):
		var expected_source: int = int(built["source_ids"][str(Terrain.atlas_for_biome(["g", "f", "s", "i", "w", "p"][biome_index]))])
		var hits := 0
		for cell in base.get_used_cells():
			if base.get_cell_source_id(cell) == expected_source:
				hits += 1
		if hits != 90:
			_fail("Bioma %d deveria usar 90 tiles do seu atlas próprio; encontrados %d." % [biome_index, hits])
			return
	var source_id: int = int(built["source_ids"]["grassLayer"])
	var ring: Array = [[true, true, true], [true, false, true], [true, true, true]]
	var test_base := TileMapLayer.new()
	var test_overlay := TileMapLayer.new()
	test_base.tile_set = built["tile_set"]
	test_overlay.tile_set = built["tile_set"]
	var result: Dictionary = Adapter.paint_mask(test_base, test_overlay, source_id, ring)
	if not str(result["error"]).is_empty() or result["painted"] != 8 or result["overlays"] != 4:
		_fail("O adaptador não desenhou tiles/cantos internos da máscara de teste.")
		return
	if test_base.get_used_cells().size() != 8 or test_overlay.get_used_cells().size() != 4:
		_fail("TileMapLayer não recebeu as células resolvidas.")
		return
	print("TILLFOLK Godot TileMapLayer: 9 atlas, 6 biomas e cantos internos OK")
	preview.queue_free()
	test_base.queue_free()
	test_overlay.queue_free()
	await process_frame
	quit(0)
