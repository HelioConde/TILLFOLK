extends Node2D
## Prototipo do TILLFOLK Godot: gestao top-down, sem modificar Eclipse Vanguard.
const ColonyState = preload("res://scripts/colony_state.gd")
const CELL := 30.0
const ORIGIN := Vector2(18, 94)
const SAVE_PATH := "user://tillfolk-godot-v1.json"
const TOOL_LABELS := {
	"collect": "Coletar", "till": "Arar", "plant": "Semear",
	"water": "Regar", "harvest": "Colher", "carry": "Levar",
	"fetch_water": "Buscar água"
}
const TOOL_KEYS := ["collect", "till", "plant", "water", "harvest", "carry", "fetch_water"]
var colony = ColonyState.new()
var selected_tool := "collect"
var selected_priority := 5
var priority_label: Label
var hud_label: Label
var help_label: Label
var message_label: Label
var tool_buttons: Dictionary = {}
var pause_button: Button
var speed_buttons: Dictionary = {}
var simulation_paused := false
var simulation_speed := 1
var render_elapsed := 0.0

func _ready() -> void:
	_build_hud()
	_update_hud()

func _build_hud() -> void:
	var overlay := CanvasLayer.new()
	add_child(overlay)
	var title := Label.new()
	title.text = "TILLFOLK  •  GODOT EDITION"
	title.position = Vector2(20, 12)
	title.add_theme_font_size_override("font_size", 25)
	title.add_theme_color_override("font_color", Color("#f8efd8"))
	overlay.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "Protótipo de migração inspirado na arquitetura Godot do Eclipse Vanguard"
	subtitle.position = Vector2(20, 48)
	subtitle.add_theme_color_override("font_color", Color("#a9be98"))
	overlay.add_child(subtitle)
	hud_label = Label.new()
	hud_label.position = Vector2(824, 112)
	hud_label.add_theme_font_size_override("font_size", 18)
	hud_label.add_theme_color_override("font_color", Color("#f8efd8"))
	overlay.add_child(hud_label)
	priority_label = Label.new()
	priority_label.position = Vector2(824, 299)
	priority_label.add_theme_font_size_override("font_size", 16)
	priority_label.add_theme_color_override("font_color", Color("#f4d18b"))
	overlay.add_child(priority_label)
	for change in [-1, 1]:
		var priority_button := Button.new()
		priority_button.text = "-" if change < 0 else "+"
		priority_button.position = Vector2(1090 if change < 0 else 1146, 294)
		priority_button.custom_minimum_size = Vector2(48, 32)
		priority_button.pressed.connect(_change_priority.bind(change))
		overlay.add_child(priority_button)
	help_label = Label.new()
	help_label.position = Vector2(824, 345)
	help_label.add_theme_color_override("font_color", Color("#e4d2a7"))
	overlay.add_child(help_label)
	message_label = Label.new()
	message_label.position = Vector2(22, 647)
	message_label.add_theme_color_override("font_color", Color("#f4d18b"))
	overlay.add_child(message_label)
	pause_button = Button.new()
	pause_button.position = Vector2(824, 62)
	pause_button.custom_minimum_size = Vector2(100, 30)
	pause_button.pressed.connect(_toggle_pause)
	overlay.add_child(pause_button)
	for i in range(3):
		var speed := i + 1
		var speed_button := Button.new()
		speed_button.text = "%dx" % speed
		speed_button.position = Vector2(934 + i * 74, 62)
		speed_button.custom_minimum_size = Vector2(66, 30)
		speed_button.pressed.connect(_set_speed.bind(speed))
		overlay.add_child(speed_button)
		speed_buttons[speed] = speed_button
	for i in range(TOOL_KEYS.size()):
		var tool: String = TOOL_KEYS[i]
		var button := Button.new()
		button.text = "%d %s" % [i + 1, TOOL_LABELS[tool]]
		button.position = Vector2(18 + i * 114, 675)
		button.custom_minimum_size = Vector2(110, 36)
		button.focus_mode = Control.FOCUS_NONE
		button.pressed.connect(_select_tool.bind(tool))
		overlay.add_child(button)
		tool_buttons[tool] = button
	var save_button := Button.new()
	save_button.text = "Salvar"
	save_button.position = Vector2(827, 670)
	save_button.custom_minimum_size = Vector2(96, 36)
	save_button.pressed.connect(_save_game)
	overlay.add_child(save_button)
	var load_button := Button.new()
	load_button.text = "Carregar"
	load_button.position = Vector2(933, 670)
	load_button.custom_minimum_size = Vector2(96, 36)
	load_button.pressed.connect(_load_game)
	overlay.add_child(load_button)
	var reset_button := Button.new()
	reset_button.text = "Novo jogo"
	reset_button.position = Vector2(1039, 670)
	reset_button.custom_minimum_size = Vector2(116, 36)
	reset_button.pressed.connect(_new_game)
	overlay.add_child(reset_button)

func _select_tool(tool: String) -> void:
	selected_tool = tool
	message_label.text = "Ferramenta escolhida: " + TOOL_LABELS[tool]
	_update_hud()

func _change_priority(change: int) -> void:
	selected_priority = clampi(selected_priority + change, 1, 9)
	message_label.text = "Novas ordens terão prioridade %d." % selected_priority
	_update_hud()

func _toggle_pause() -> void:
	simulation_paused = not simulation_paused
	message_label.text = "Simulação pausada." if simulation_paused else "Simulação retomada."
	_update_hud()

func _set_speed(speed: int) -> void:
	if speed < 1 or speed > 3:
		return
	simulation_speed = speed
	simulation_paused = false
	message_label.text = "Velocidade ajustada para %dx." % speed
	_update_hud()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_P:
			_toggle_pause()
			get_viewport().set_input_as_handled()
			return
		if event.keycode == KEY_MINUS or event.keycode == KEY_EQUAL:
			_change_priority(-1 if event.keycode == KEY_MINUS else 1)
			get_viewport().set_input_as_handled()
			return
		if event.keycode in [KEY_8, KEY_9, KEY_0]:
			_set_speed(1 if event.keycode == KEY_8 else (2 if event.keycode == KEY_9 else 3))
			get_viewport().set_input_as_handled()
			return
		var idx: int = int(event.keycode) - int(KEY_1)
		if idx >= 0 and idx < TOOL_KEYS.size():
			_select_tool(TOOL_KEYS[idx])
			get_viewport().set_input_as_handled()
			return
	if event is InputEventMouseButton and event.pressed:
		var cell := Vector2i(floori((event.position.x - ORIGIN.x) / CELL), floori((event.position.y - ORIGIN.y) / CELL))
		if not colony.inside(cell):
			return
		if event.button_index == MOUSE_BUTTON_RIGHT:
			message_label.text = "Ordem cancelada." if colony.cancel_order(cell) else "Nenhuma ordem nessa célula."
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if colony.queue_order(cell, selected_tool, selected_priority):
				message_label.text = "Ordem P%d: %s" % [selected_priority, TOOL_LABELS[selected_tool]]
			else:
				message_label.text = "Ordem inválida ou sem recursos."
			get_viewport().set_input_as_handled()
		_update_hud()
		queue_redraw()

func _process(delta: float) -> void:
	if not simulation_paused:
		# Executar passos normais preserva os limites de dt da simulação.
		for _tick in range(simulation_speed):
			colony.step(delta)
	render_elapsed += delta
	if render_elapsed >= 0.12:
		render_elapsed = 0.0
		_update_hud()
		queue_redraw()

func _update_hud() -> void:
	if hud_label == null:
		return
	var hours: int = floori(colony.minutes / 60.0)
	var mins: int = floori(fmod(colony.minutes, 60.0))
	var remaining := 0
	for worker in colony.workers:
		if float(worker["health"]) > 0.0:
			remaining += 1
	hud_label.text = "COLÔNIA\nDia %d  •  %02d:%02d\nTempo: %s\n\nVivos: %d / %d\nComida: %d\nSementes: %d\nÁgua: %d\nMadeira: %d\nOrdens: %d" % [
		colony.day, hours, mins, ("PAUSADO" if simulation_paused else "%dx" % simulation_speed), remaining, colony.workers.size(),
		colony.stocks["food"], colony.stocks["seeds"],
		colony.stocks["water"], colony.stocks["wood"], colony.orders.size()
	]
	priority_label.text = "Próxima ordem: P%d / 9" % selected_priority
	help_label.text = "TRABALHO\n1–7: selecionar ordem\nP: pausar / retomar\n8 / 9 / 0: 1x / 2x / 3x\n- / =: prioridade\nClique: colocar ordem\nDireito: cancelar\n\nA coleta precisa chegar ao\nacampamento para virar estoque.\nA agricultura exige etapas:\narar → semear → regar →\ncolher → transportar.\n\n%s" % ("COLÔNIA PERDIDA" if colony.game_over else "Proteja seus colonos da fome.")
	pause_button.text = "Retomar" if simulation_paused else "Pausar"
	for speed in speed_buttons:
		speed_buttons[speed].modulate = Color("#b6de81") if speed == simulation_speed and not simulation_paused else Color.WHITE
	for tool in TOOL_KEYS:
		var button: Button = tool_buttons[tool]
		button.modulate = Color("#b6de81") if tool == selected_tool else Color.WHITE

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(1280, 720)), Color("#152721"))
	draw_rect(Rect2(Vector2(810, 94), Vector2(446, 550)), Color("#21382f"))
	for y in range(ColonyState.HEIGHT):
		for x in range(ColonyState.WIDTH):
			var cell := Vector2i(x, y)
			var tile: Dictionary = colony.get_tile(cell)
			var p := ORIGIN + Vector2(x, y) * CELL
			var resource: String = str(tile["resource"])
			var ground := Color("#507d4d") if (x + y) % 2 == 0 else Color("#5c8a55")
			if bool(tile["tilled"]):
				ground = Color("#786145")
			if resource == "water":
				ground = Color("#427c9c")
			draw_rect(Rect2(p, Vector2(CELL - 1, CELL - 1)), ground)
			if resource == "tree":
				draw_rect(Rect2(p + Vector2(12, 15), Vector2(6, 14)), Color("#6c4b35"))
				draw_circle(p + Vector2(15, 12), 11.0, Color("#264f30"))
			elif resource == "bush":
				draw_circle(p + Vector2(14, 17), 8.0, Color("#315f36"))
				draw_circle(p + Vector2(19, 13), 3.0, Color("#d8b86b"))
			elif bool(tile["planted"]):
				var grown := float(tile["growth"])
				draw_circle(p + Vector2(15, 18), 3.0 + grown * 6.0, Color("#a7cc68"))
				if bool(tile["watered"]):
					draw_circle(p + Vector2(22, 22), 2.0, Color("#78b8e8"))
			elif int(tile["produce"]) > 0:
				draw_circle(p + Vector2(15, 15), 8.0, Color("#e6b66a"))
	for order in colony.orders:
		var p := ORIGIN + Vector2(int(order["x"]), int(order["y"])) * CELL
		var urgency: int = clampi(int(order.get("priority", 5)), 1, 9)
		var outline: Color = Color("#ff9a70") if urgency >= 7 else Color("#f4d18b")
		draw_rect(Rect2(p + Vector2(2, 2), Vector2(CELL - 5, CELL - 5)), outline, false, 1.0 + float(urgency) * 0.25)
	var depot_pos := ORIGIN + ColonyState.DEPOT * CELL
	draw_rect(Rect2(depot_pos - Vector2(12, 12), Vector2(24, 24)), Color("#dab66d"))
	for i in range(colony.workers.size()):
		var worker: Dictionary = colony.workers[i]
		var p := ORIGIN + Vector2(float(worker["x"]), float(worker["y"])) * CELL
		var color := Color("#e1c386") if i == 0 else Color("#b4d3fa")
		if float(worker["health"]) <= 0.0:
			color = Color("#777777")
		draw_circle(p, 9.0, color)
		draw_circle(p + Vector2(2, -2), 2.0, Color("#25342b"))

func _save_game() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		message_label.text = "Erro ao salvar a partida."
		return
	file.store_string(JSON.stringify(colony.snapshot()))
	file.close()
	message_label.text = "Partida Godot salva localmente."

func _load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		message_label.text = "Não existe partida Godot salva."
		return
	var raw := FileAccess.get_file_as_string(SAVE_PATH)
	var data: Variant = JSON.parse_string(raw)
	if data is Dictionary and colony.restore(data):
		message_label.text = "Partida Godot restaurada."
		_update_hud()
		queue_redraw()
	else:
		message_label.text = "Save inválido; partida atual preservada."

func _new_game() -> void:
	colony.reset()
	message_label.text = "Nova colônia iniciada."
	_update_hud()
	queue_redraw()
