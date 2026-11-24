extends RefCounted
## Primeiro corte jogável do TILLFOLK em Godot.
## Estado desacoplado da cena: controles escolhem ordens; colonos executam.
const WIDTH := 26
const HEIGHT := 18
const DEPOT := Vector2(4.5, 4.5)
const MOVE_SPEED := 3.0
const JOB_SECONDS := {"collect": 2.0, "fetch_water": 2.0, "till": 1.8, "plant": 1.3, "water": 1.3, "harvest": 2.2, "carry": 1.4}
const TOOLS := ["collect", "till", "plant", "water", "harvest", "carry", "fetch_water"]
const Navigation = preload("res://scripts/navigation.gd")

var tiles: Array = []
var workers: Array = []
var orders: Array = []
var navigation_targets: Dictionary = {} # cache transitorio, nunca salvo
var stocks: Dictionary = {}
var day := 1
var minutes := 360.0
var next_id := 1
var game_over := false

func _init() -> void:
	reset()

func reset() -> void:
	tiles.clear()
	workers.clear()
	orders.clear()
	navigation_targets.clear()
	for y in range(HEIGHT):
		for x in range(WIDTH):
			var roll := (x * 19 + y * 37 + x * y * 7) % 17
			var resource := "empty"
			if x == 20 and y >= 2 and y <= 14:
				resource = "water"
			elif roll == 0:
				resource = "tree"
			elif roll == 3:
				resource = "bush"
			tiles.append({"resource": resource, "tilled": false, "planted": false,
				"watered": false, "growth": 0.0, "produce": 0})
	for y in range(2, 8):
		for x in range(2, 8):
			get_tile(Vector2i(x, y))["resource"] = "empty"
	get_tile(Vector2i(8, 5))["resource"] = "bush"
	get_tile(Vector2i(10, 6))["resource"] = "tree"
	workers = [
		{"name": "Lia", "x": 4.5, "y": 5.5, "hunger": 85.0, "health": 100.0,
			"skills": ["till", "plant"], "blocked_tools": [], "cargo": {}, "order_id": 0},
		{"name": "Nilo", "x": 5.5, "y": 4.5, "hunger": 85.0, "health": 100.0,
			"skills": ["collect", "carry", "fetch_water"], "blocked_tools": [], "cargo": {}, "order_id": 0}
	]
	stocks = {"food": 6, "seeds": 5, "water": 6, "wood": 0}
	day = 1
	minutes = 360.0
	next_id = 1
	game_over = false

func inside(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.y >= 0 and cell.x < WIDTH and cell.y < HEIGHT

func get_tile(cell: Vector2i) -> Dictionary:
	if not inside(cell):
		return {}
	return tiles[cell.y * WIDTH + cell.x]

func _valid_work(cell: Vector2i, tool: String) -> bool:
	if not inside(cell):
		return false
	var tile: Dictionary = get_tile(cell)
	var resource: String = str(tile.get("resource", "empty"))
	match tool:
		"collect":
			return resource == "bush" or resource == "tree"
		"fetch_water":
			return resource == "water"
		"till":
			return resource == "empty" and not bool(tile["tilled"]) and int(tile["produce"]) == 0
		"plant":
			return bool(tile["tilled"]) and not bool(tile["planted"]) and int(tile["produce"]) == 0 and int(stocks["seeds"]) > 0
		"water":
			return bool(tile["planted"]) and not bool(tile["watered"]) and int(stocks["water"]) > 0
		"harvest":
			return bool(tile["planted"]) and float(tile["growth"]) >= 1.0
		"carry":
			return int(tile["produce"]) > 0
	return false

func queue_order(cell: Vector2i, tool: String, priority: int = 5) -> bool:
	if game_over or not TOOLS.has(tool) or priority < 1 or priority > 9 or not _valid_work(cell, tool):
		return false
	# Uma ação por célula de cada vez evita acumular etapas não autorizadas.
	for order in orders:
		if int(order["x"]) == cell.x and int(order["y"]) == cell.y:
			return false
	orders.append({"id": next_id, "x": cell.x, "y": cell.y, "tool": tool,
		"priority": priority, "worker": -1, "progress": 0.0})
	next_id += 1
	return true

func cancel_order(cell: Vector2i) -> bool:
	for order in orders:
		if int(order["x"]) == cell.x and int(order["y"]) == cell.y:
			var worker_id: int = int(order["worker"])
			if worker_id >= 0 and worker_id < workers.size():
				workers[worker_id]["order_id"] = 0
				navigation_targets.erase(worker_id)
			orders.erase(order)
			return true
	return false

func _find_order(order_id: int) -> Dictionary:
	for order in orders:
		if int(order["id"]) == order_id:
			return order
	return {}

## O bonus segue o contrato do jogo HTML5: especializar em menos funcoes
## aumenta a eficiencia em cada uma, sem bloquear trabalhos genericos.
func _skill_multiplier(worker: Dictionary, tool: String) -> float:
	var skills: Array = worker.get("skills", [])
	if not skills.has(tool):
		return 1.0
	match skills.size():
		1:
			return 2.0
		2:
			return 1.6
		_:
			return 1.3

func _choose_order(worker_index: int) -> Dictionary:
	var chosen: Dictionary = {}
	var best := INF
	var worker: Dictionary = workers[worker_index]
	for order in orders:
		if int(order["worker"]) >= 0:
			continue
		var cell := Vector2i(int(order["x"]), int(order["y"]))
		var tool: String = str(order["tool"])
		# Tracos vermelhos proíbem a atividade; bonus positivo nao e permissao.
		var forbidden: Array = worker.get("blocked_tools", [])
		if forbidden.has(tool) or not _valid_work(cell, tool):
			continue
		var start := Vector2i(floori(float(worker["x"])), floori(float(worker["y"])))
		var route: Array[Vector2i] = Navigation.find_route(start, cell, tiles, WIDTH, HEIGHT)
		if route.is_empty():
			continue # Nao atribuir trabalho inacessivel.
		var distance := float(route.size() - 1)
		var preferred: float = (_skill_multiplier(worker, tool) - 1.0) * 8.0
		# Prioridade 9 vem antes de 1. A diferenca de 100 pontos evita
		# que uma caminhada longa neutralize a ordem urgente neste mapa.
		# Saves antigos sem priority mantem o padrao intermediario (5).
		var priority: int = clampi(int(order.get("priority", 5)), 1, 9)
		var score: float = float(9 - priority) * 100.0 + distance - preferred
		if score < best:
			best = score
			chosen = order
	if not chosen.is_empty():
		chosen["worker"] = worker_index
		worker["order_id"] = chosen["id"]
	return chosen

func _move_worker(worker: Dictionary, target: Vector2, delta: float) -> bool:
	var current := Vector2(float(worker["x"]), float(worker["y"]))
	var moved := current.move_toward(target, MOVE_SPEED * delta)
	worker["x"] = moved.x
	worker["y"] = moved.y
	return moved.distance_to(target) > 0.08

## -1: inacessivel, 0: chegou, 1: deslocamento em andamento.
## O proximo centro de celula fica fixo ate ser alcancado, impedindo
## movimentos diagonais e atalhos atraves dos obstaculos.
func _travel_worker(worker_index: int, destination: Vector2i, delta: float) -> int:
	var worker: Dictionary = workers[worker_index]
	var cached: Dictionary = navigation_targets.get(worker_index, {})
	var hop: Vector2i
	if cached.is_empty() or cached.get("goal") != destination or not Navigation.walkable(cached["hop"], tiles, WIDTH, HEIGHT):
		var start := Vector2i(floori(float(worker["x"])), floori(float(worker["y"])))
		var route: Array[Vector2i] = Navigation.find_route(start, destination, tiles, WIDTH, HEIGHT)
		if route.is_empty():
			navigation_targets.erase(worker_index)
			return -1
		hop = route[1] if route.size() > 1 else route[0]
		navigation_targets[worker_index] = {"goal": destination, "hop": hop}
	else:
		hop = cached["hop"]
	if _move_worker(worker, Vector2(hop) + Vector2(0.5, 0.5), delta):
		return 1
	navigation_targets.erase(worker_index)
	if hop == destination or (not Navigation.walkable(destination, tiles, WIDTH, HEIGHT) and (hop - destination).length_squared() == 1):
		return 0
	return 1

func _complete_order(order: Dictionary, worker: Dictionary) -> void:
	var cell := Vector2i(int(order["x"]), int(order["y"]))
	var tile: Dictionary = get_tile(cell)
	match str(order["tool"]):
		"collect":
			if tile["resource"] == "tree":
				worker["cargo"] = {"wood": 3}
			elif tile["resource"] == "bush":
				worker["cargo"] = {"food": 2, "seeds": 1}
			tile["resource"] = "empty"
		"fetch_water":
			worker["cargo"] = {"water": 3}
		"till":
			tile["tilled"] = true
		"plant":
			stocks["seeds"] = int(stocks["seeds"]) - 1
			tile["planted"] = true
			tile["watered"] = false
			tile["growth"] = 0.0
		"water":
			stocks["water"] = int(stocks["water"]) - 1
			tile["watered"] = true
		"harvest":
			tile["planted"] = false
			tile["watered"] = false
			tile["growth"] = 0.0
			tile["produce"] = 3
		"carry":
			worker["cargo"] = {"food": int(tile["produce"])}
			tile["produce"] = 0

func _advance_worker(worker_index: int, delta: float) -> void:
	var worker: Dictionary = workers[worker_index]
	if float(worker["health"]) <= 0.0:
		# Um colono falecido nao pode manter uma ordem explicitamente autorizada
		# reservada para sempre. Preservar o progresso e qualquer carga fisica.
		var dead_order_id: int = int(worker["order_id"])
		if dead_order_id != 0:
			var abandoned: Dictionary = _find_order(dead_order_id)
			if not abandoned.is_empty() and int(abandoned["worker"]) == worker_index:
				abandoned["worker"] = -1
			worker["order_id"] = 0
			navigation_targets.erase(worker_index)
		return
	var cargo: Dictionary = worker["cargo"]
	if not cargo.is_empty():
		if _travel_worker(worker_index, Vector2i(4, 4), delta) != 0:
			return
		for kind in cargo.keys():
			stocks[kind] = int(stocks.get(kind, 0)) + int(cargo[kind])
		worker["cargo"] = {}
		return
	var order: Dictionary = _find_order(int(worker["order_id"]))
	if order.is_empty():
		worker["order_id"] = 0
		order = _choose_order(worker_index)
	if order.is_empty():
		return
	# A elegibilidade tambem e verificada durante a execucao, inclusive
	# apos carregar um save com ordem ja reservada.
	var forbidden_now: Array = worker.get("blocked_tools", [])
	if forbidden_now.has(str(order["tool"])):
		order["worker"] = -1
		worker["order_id"] = 0
		navigation_targets.erase(worker_index)
		return
	var cell := Vector2i(int(order["x"]), int(order["y"]))
	if not _valid_work(cell, str(order["tool"])):
		order["worker"] = -1
		worker["order_id"] = 0
		return
	if _travel_worker(worker_index, cell, delta) != 0:
		return
	var bonus: float = _skill_multiplier(worker, str(order["tool"]))
	order["progress"] = float(order["progress"]) + delta * bonus
	if float(order["progress"]) >= float(JOB_SECONDS[order["tool"]]):
		_complete_order(order, worker)
		orders.erase(order)
		worker["order_id"] = 0

func step(delta: float) -> void:
	if game_over:
		return
	var dt := clampf(delta, 0.0, 0.25)
	minutes += dt * 8.0
	while minutes >= 1440.0:
		minutes -= 1440.0
		day += 1
	for tile in tiles:
		if bool(tile["planted"]) and bool(tile["watered"]):
			tile["growth"] = minf(1.0, float(tile["growth"]) + dt * 0.07)
	var living := 0
	for worker in workers:
		if float(worker["health"]) <= 0.0:
			continue
		worker["hunger"] = maxf(0.0, float(worker["hunger"]) - dt * 0.28)
		if float(worker["hunger"]) < 45.0 and int(stocks["food"]) > 0:
			stocks["food"] = int(stocks["food"]) - 1
			worker["hunger"] = minf(100.0, float(worker["hunger"]) + 46.0)
		if float(worker["hunger"]) <= 0.0:
			worker["health"] = maxf(0.0, float(worker["health"]) - dt * 2.0)
		if float(worker["health"]) > 0.0:
			living += 1
	for i in range(workers.size()):
		_advance_worker(i, dt)
	game_over = living == 0

func snapshot() -> Dictionary:
	return {"schema": 1, "tiles": tiles.duplicate(true), "workers": workers.duplicate(true),
		"orders": orders.duplicate(true), "stocks": stocks.duplicate(true),
		"day": day, "minutes": minutes, "next_id": next_id, "game_over": game_over}

func restore(data: Dictionary) -> bool:
	if int(data.get("schema", -1)) != 1:
		return false
	var candidate_tiles: Variant = data.get("tiles", null)
	var candidate_workers: Variant = data.get("workers", null)
	var candidate_orders: Variant = data.get("orders", null)
	var candidate_stocks: Variant = data.get("stocks", null)
	if not (candidate_tiles is Array) or not (candidate_workers is Array) or not (candidate_orders is Array) or not (candidate_stocks is Dictionary):
		return false
	if candidate_tiles.size() != WIDTH * HEIGHT or candidate_workers.is_empty() or candidate_workers.size() > 64 or candidate_orders.size() > 1500:
		return false
	for tile in candidate_tiles:
		if not (tile is Dictionary) or not tile.has_all(["resource", "tilled", "planted", "watered", "growth", "produce"]):
			return false
	for worker in candidate_workers:
		if not (worker is Dictionary) or not worker.has_all(["name", "x", "y", "hunger", "health", "skills", "cargo", "order_id"]):
			return false
		if not (worker["skills"] is Array) or worker["skills"].size() > 3:
			return false
		if worker.has("blocked_tools"):
			if not (worker["blocked_tools"] is Array) or worker["blocked_tools"].size() > 3:
				return false
			for blocked_tool in worker["blocked_tools"]:
				if not TOOLS.has(str(blocked_tool)):
					return false
	for order in candidate_orders:
		if not (order is Dictionary) or not order.has_all(["id", "x", "y", "tool", "worker", "progress"]):
			return false
		if order.has("priority") and (int(order["priority"]) < 1 or int(order["priority"]) > 9):
			return false
	for kind in ["food", "seeds", "water", "wood"]:
		if not candidate_stocks.has(kind) or int(candidate_stocks[kind]) < 0:
			return false
	tiles = candidate_tiles.duplicate(true)
	workers = candidate_workers.duplicate(true)
	orders = candidate_orders.duplicate(true)
	stocks = candidate_stocks.duplicate(true)
	day = maxi(1, int(data.get("day", 1)))
	minutes = clampf(float(data.get("minutes", 360.0)), 0.0, 1439.99)
	next_id = maxi(1, int(data.get("next_id", 1)))
	game_over = bool(data.get("game_over", false))
	navigation_targets.clear()
	return true
