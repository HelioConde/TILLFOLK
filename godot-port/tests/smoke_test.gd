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
	# A cena principal usa o atlas oficial no mapa jogável, não só na prévia.
	var terrain_base := main.get_node_or_null("TerrainBase") as TileMapLayer
	var terrain_overlay := main.get_node_or_null("TerrainInnerCorners") as TileMapLayer
	if terrain_base == null or terrain_overlay == null:
		_fail("O mapa principal não integrou as camadas TileMapLayer oficiais.")
		return
	if terrain_base.get_used_cells().size() != ColonyState.WIDTH * ColonyState.HEIGHT - 13:
		_fail("O terreno principal deve pintar o chão e deixar o rio como camada independente.")
		return
	if absf(terrain_base.scale.x - 30.0 / 16.0) > 0.001:
		_fail("O atlas de 16 px não está alinhado à grade de trabalho de 30 px.")
		return
	# Tempo: pausa congela toda a simulação; 3x executa três passos reais.
	var start_minutes: float = float(colony.minutes)
	main.call("_toggle_pause")
	main.call("_process", 0.2)
	if absf(float(colony.minutes) - start_minutes) > 0.001:
		_fail("Simulação continuou avançando durante a pausa.")
		return
	main.call("_set_speed", 3)
	if bool(main.get("simulation_paused")) or int(main.get("simulation_speed")) != 3:
		_fail("Selecionar 3x não retomou a simulação.")
		return
	main.call("_process", 0.1)
	if absf(float(colony.minutes) - start_minutes - 2.4) > 0.001:
		_fail("Velocidade 3x não avançou três passos da simulação.")
		return
	main.call("_set_speed", 1)
	if int(main.get("simulation_speed")) != 1:
		_fail("Velocidade normal não foi restaurada.")
		return
	# A morte nao deve bloquear uma ordem que outro colono ainda pode executar.
	var death = ColonyState.new()
	death.workers[0]["x"] = 7.5
	death.workers[0]["y"] = 5.5
	if not death.queue_order(Vector2i(8, 5), "collect"):
		_fail("Ordem de coleta para teste de morte nao entrou na fila.")
		return
	death.step(0.1)
	if int(death.orders[0]["worker"]) != 0:
		_fail("Primeiro colono nao recebeu a ordem antes de morrer.")
		return
	death.workers[0]["health"] = 0.0
	death.step(0.1)
	if int(death.workers[0]["order_id"]) != 0 or int(death.orders[0]["worker"]) != 1:
		_fail("Morte manteve a ordem presa no trabalhador falecido.")
		return
	if int(death.stocks["food"]) != 6:
		_fail("Troca de trabalhador criou comida antes da entrega.")
		return
	for i in range(240):
		death.step(0.1)
	if not death.orders.is_empty() or int(death.stocks["food"]) != 8:
		_fail("Trabalhador sobrevivente nao finalizou coleta e transporte.")
		return
	# Ordem urgente deve vencer a ordem mais proxima; a escolha e do jogador.
	var priority = ColonyState.new()
	priority.workers[0]["health"] = 0.0
	if not priority.queue_order(Vector2i(8, 5), "collect", 1):
		_fail("Ordem de prioridade baixa nao foi aceita.")
		return
	if not priority.queue_order(Vector2i(10, 6), "collect", 9):
		_fail("Ordem urgente nao foi aceita.")
		return
	if priority.queue_order(Vector2i(6, 6), "till", 0) or priority.queue_order(Vector2i(6, 6), "till", 10):
		_fail("Prioridade fora da faixa 1 a 9 foi aceita.")
		return
	priority.step(0.1)
	if int(priority.orders[0]["worker"]) != -1 or int(priority.orders[1]["worker"]) != 1:
		_fail("Ordem urgente mais distante nao foi selecionada antes da coleta comum.")
		return
	# Um trabalhador nunca executa atividade proibida por traco negativo.
	var restriction = ColonyState.new()
	restriction.workers[0]["blocked_tools"] = ["collect"]
	restriction.workers[1]["health"] = 0.0
	if not restriction.queue_order(Vector2i(8, 5), "collect", 9):
		_fail("Ordem explicita para testar traco negativo foi recusada.")
		return
	restriction.step(0.1)
	if int(restriction.orders[0]["worker"]) != -1 or int(restriction.stocks["food"]) != 6:
		_fail("Traco negativo nao bloqueou a atribuicao ou criou recursos.")
		return
	restriction.workers[1]["health"] = 100.0
	restriction.step(0.1)
	if int(restriction.orders[0]["worker"]) != 1:
		_fail("Atividade proibida nao foi entregue ao outro trabalhador apto.")
		return
	# Restricao aplicada a tarefa ja atribuida libera a ordem sem perder recursos.
	var midtask = ColonyState.new()
	midtask.workers[1]["health"] = 0.0
	midtask.workers[0]["x"] = 7.5
	midtask.workers[0]["y"] = 5.5
	if not midtask.queue_order(Vector2i(8, 5), "collect", 7):
		_fail("Tarefa para validar elegibilidade durante a execucao foi recusada.")
		return
	midtask.step(0.1)
	if int(midtask.orders[0]["worker"]) != 0:
		_fail("Tarefa nao foi atribuida antes da alteracao de restricao.")
		return
	midtask.workers[0]["blocked_tools"] = ["collect"]
	midtask.step(0.1)
	if int(midtask.orders[0]["worker"]) != -1 or int(midtask.workers[0]["order_id"]) != 0 or int(midtask.stocks["food"]) != 6:
		_fail("Atividade proibida continuou em execucao ou consumiu recursos.")
		return
	midtask.workers[1]["health"] = 100.0
	midtask.step(0.1)
	if int(midtask.orders[0]["worker"]) != 1:
		_fail("Ordem suspensa por restricao nao foi liberada ao colono apto.")
		return
	# Bonus conforme GDD: uma especialidade 2.0x, duas 1.6x e tres 1.3x.
	if absf(priority._skill_multiplier({"skills": ["water"]}, "water") - 2.0) > 0.001:
		_fail("Bonus para uma especialidade diferente do GDD.")
		return
	if absf(priority._skill_multiplier({"skills": ["water", "till"]}, "water") - 1.6) > 0.001:
		_fail("Bonus para duas especialidades diferente do GDD.")
		return
	if absf(priority._skill_multiplier({"skills": ["water", "till", "plant"]}, "water") - 1.3) > 0.001:
		_fail("Bonus para tres especialidades diferente do GDD.")
		return
	if absf(priority._skill_multiplier({"skills": ["water"]}, "carry") - 1.0) > 0.001:
		_fail("Trabalho sem especialidade recebeu bonus indevido.")
		return
	# Controles de prioridade do HUD respeitam os limites e nao mudam o tempo.
	var time_before_priority: float = float(colony.minutes)
	main.call("_change_priority", 99)
	if int(main.get("selected_priority")) != 9:
		_fail("HUD nao limitou prioridade maxima em 9.")
		return
	main.call("_change_priority", -99)
	if int(main.get("selected_priority")) != 1:
		_fail("HUD nao limitou prioridade minima em 1.")
		return
	if absf(float(colony.minutes) - time_before_priority) > 0.001:
		_fail("Mudar prioridade alterou tempo da colonia.")
		return
	# Novo save preserva prioridade. Save v1 legado (sem novos campos) continua valido.
	var priority_save: Dictionary = priority.snapshot()
	var priority_restored = ColonyState.new()
	if not priority_restored.restore(priority_save) or int(priority_restored.orders[1]["priority"]) != 9:
		_fail("Prioridade nao foi persistida no save Godot.")
		return
	var legacy_save: Dictionary = priority_save.duplicate(true)
	for order in legacy_save["orders"]:
		order.erase("priority")
	for worker in legacy_save["workers"]:
		worker.erase("blocked_tools")
	var legacy_colony = ColonyState.new()
	if not legacy_colony.restore(legacy_save):
		_fail("Save Godot anterior sem prioridade/traco nao foi aceito.")
		return
	if int(legacy_colony.orders[0].get("priority", 5)) != 5:
		_fail("Save anterior nao recebeu prioridade padrao 5.")
		return
	var corrupt_save: Dictionary = priority_save.duplicate(true)
	corrupt_save["orders"][0]["priority"] = 10
	if priority_restored.restore(corrupt_save) or int(priority_restored.orders[1]["priority"]) != 9:
		_fail("Save com prioridade invalida foi aceito ou corrompeu o estado.")
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
