extends RefCounted
## Navegacao por grade: nunca atravessar arvores ou agua e nunca teleportar recursos.
const DIRECTIONS = [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]

static func walkable(cell: Vector2i, tiles: Array, width: int, height: int) -> bool:
	if cell.x < 0 or cell.y < 0 or cell.x >= width or cell.y >= height:
		return false
	var resource: String = str(tiles[cell.y * width + cell.x].get("resource", "empty"))
	return resource != "tree" and resource != "water"

static func find_route(start: Vector2i, destination: Vector2i, tiles: Array, width: int, height: int) -> Array[Vector2i]:
	var targets: Dictionary = {}
	if walkable(destination, tiles, width, height):
		targets[destination] = true
	else:
		# Coleta de madeira e agua acontece de um terreno vizinho acessivel.
		for direction in DIRECTIONS:
			var neighbor: Vector2i = destination + direction
			if walkable(neighbor, tiles, width, height):
				targets[neighbor] = true
	if targets.is_empty():
		return []
	var frontier: Array[Vector2i] = [start]
	var previous: Dictionary = {start: start}
	var index := 0
	while index < frontier.size():
		var current: Vector2i = frontier[index]
		index += 1
		if targets.has(current):
			var path: Array[Vector2i] = []
			var cursor: Vector2i = current
			while cursor != start:
				path.push_front(cursor)
				cursor = previous[cursor]
			path.push_front(start)
			return path
		for direction in DIRECTIONS:
			var neighbor: Vector2i = current + direction
			if previous.has(neighbor) or not walkable(neighbor, tiles, width, height):
				continue
			previous[neighbor] = current
			frontier.append(neighbor)
	return []
