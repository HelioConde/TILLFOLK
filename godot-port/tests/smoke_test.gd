extends SceneTree

const ColonyState = preload("res://scripts/colony_state.gd")

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error(message)
	quit(1)

func _run() -> void:
	var scene := load("res://scenes/Main.tscn") as PackedScene
	if scene == null:
		_fail("Cena Godot do TILLFOLK não carregou.")
		return
	var main := scene.instantiate()
	root.add_child(main)
	await process_frame
	var colony = main.get("colony")
	if colony == null or colony.workers.size() != 2:
		_fail("A primeira colônia deve começar com dois colonos.")
		return
	if not colony.queue_order(Vector2i(8, 5), "collect"):
		_fail("Coleta real na clareira não entrou na fila.")
		return
	if colony.queue_order(Vector2i(8, 5), "collect"):
		_fail("Ordens duplicadas foram aceitas.")
		return
	var food_before := int(colony.stocks["food"])
	colony.step(0.1)
	if int(colony.stocks["food"]) != food_before:
		_fail("Comida apareceu no estoque antes do transporte físico.")
		return
	for i in range(220):
		colony.step(0.1)
	if int(colony.stocks["food"]) != food_before + 2:
		_fail("A coleta não foi transportada até o depósito.")
		return
	if colony.get_tile(Vector2i(8, 5))["resource"] != "empty":
		_fail("Arbusto coletado permaneceu no mapa.")
		return
	var farming := Vector2i(6, 6)
	if not colony.queue_order(farming, "till"):
		_fail("A ordem de arar não foi aceita.")
		return
	for i in range(120):
		colony.step(0.1)
	if not bool(colony.get_tile(farming)["tilled"]):
		_fail("Colono não arou o terreno.")
		return
	if not colony.queue_order(farming, "plant"):
		_fail("A semeadura não foi autorizada.")
		return
	for i in range(100):
		colony.step(0.1)
	if not bool(colony.get_tile(farming)["planted"]):
		_fail("Plantar sementes não mudou o solo.")
		return
	if not colony.queue_order(farming, "water"):
		_fail("Rega não foi enfileirada.")
		return
	for i in range(190):
		colony.step(0.1)
	if float(colony.get_tile(farming)["growth"]) < 0.99:
		_fail("A cultura não amadureceu após água e tempo.")
		return
	if not colony.queue_order(farming, "harvest"):
		_fail("Colheita madura recusada.")
		return
	for i in range(130):
		colony.step(0.1)
	if int(colony.get_tile(farming)["produce"]) != 3:
		_fail("Colheita não foi deixada fisicamente no canteiro.")
		return
	if not colony.queue_order(farming, "carry"):
		_fail("Transporte da safra não foi enfileirado.")
		return
	for i in range(170):
		colony.step(0.1)
	if int(colony.get_tile(farming)["produce"]) != 0:
		_fail("Safra coletada permaneceu duplicada no canteiro.")
		return
	var previous_food := int(colony.stocks["food"])
	var saved: Dictionary = colony.snapshot()
	var restored = ColonyState.new()
	if not restored.restore(saved):
		_fail("Save Godot válido não foi restaurado.")
		return
	if int(restored.stocks["food"]) != previous_food or restored.workers.size() != colony.workers.size():
		_fail("Save Godot mudou o estoque ou os trabalhadores.")
		return
	if restored.restore({"schema": 1, "tiles": []}):
		_fail("Save incompleto foi aceito.")
		return
	if int(restored.stocks["food"]) != previous_food:
		_fail("Save inválido modificou estado anterior.")
		return
	# Teste de colisao: arvore no caminho, arbusto alem dela.
	var blocked = ColonyState.new()
	blocked.workers[1]["health"] = 0.0
	blocked.workers[0]["x"] = 5.5
	blocked.workers[0]["y"] = 5.5
	blocked.get_tile(Vector2i(6, 5))["resource"] = "tree"
	blocked.get_tile(Vector2i(7, 5))["resource"] = "bush"
	if not blocked.queue_order(Vector2i(7, 5), "collect"):
		_fail("Coleta atras de obstaculo foi rejeitada.")
		return
	for i in range(240):
		blocked.step(0.1)
		var pos := Vector2i(floori(float(blocked.workers[0]["x"])), floori(float(blocked.workers[0]["y"])))
		if pos == Vector2i(6, 5):
			_fail("Colono atravessou uma arvore durante a coleta.")
			return
	if int(blocked.stocks["food"]) != 8:
		_fail("O caminho alternativo nao concluiu a coleta e o transporte.")
		return
	# Coleta de agua deve acontecer na margem, nao dentro do rio.
	var river = ColonyState.new()
	river.workers[1]["health"] = 0.0
	river.workers[0]["x"] = 19.5
	river.workers[0]["y"] = 5.5
	river.get_tile(Vector2i(19, 5))["resource"] = "empty"
	if not river.queue_order(Vector2i(20, 5), "fetch_water"):
		_fail("Buscar agua no rio foi rejeitado.")
		return
	for i in range(280):
		river.step(0.1)
		var pos := Vector2i(floori(float(river.workers[0]["x"])), floori(float(river.workers[0]["y"])))
		if river.get_tile(pos).get("resource") == "water" or river.get_tile(pos).get("resource") == "tree":
			_fail("Colono atravessou obstaculo ao buscar agua.")
			return
	if int(river.stocks["water"]) != 9:
		_fail("Agua nao chegou fisicamente ao deposito.")
		return
	# Alvo totalmente bloqueado continua na fila, sem atribuir ou criar recursos.
	var isolated = ColonyState.new()
	var target := Vector2i(12, 9)
	isolated.get_tile(target)["resource"] = "bush"
	for direction in [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]:
		isolated.get_tile(target + direction)["resource"] = "tree"
	if not isolated.queue_order(target, "collect"):
		_fail("Ordem distante bloqueada nao deveria ser descartada silenciosamente.")
		return
	for i in range(30):
		isolated.step(0.1)
	if int(isolated.orders[0]["worker"]) != -1 or int(isolated.stocks["food"]) != 6:
		_fail("Trabalho inacessivel foi executado sem um caminho livre.")
		return
	print("TILLFOLK Godot: pathfinding, costa, bloqueio, estoque e save OK")

	quit(0)
