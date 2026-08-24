import { FLOORS, WALLS, type Art } from '../../engine/assets/tileset'
import { SUPPORTED_LOCALES, type LocalizedText } from '../../i18n/locales'
import { blocksMovement, parseEntity, type Entity } from '../entities/entity'
import type { TileCoord } from './grid'

/**
 * Terrain kinds a room grid can contain.
 *
 * Deliberately small: doors, chests, keys and enemies are *entities* placed on
 * top of terrain (task 4), not terrain types. Keeping the two apart avoids
 * baking gameplay into the tilemap.
 */
export const TERRAIN_KINDS = ['floor', 'floor_alt', 'wall', 'wall_corner'] as const
export type TerrainKind = (typeof TERRAIN_KINDS)[number]

/** Grid character -> terrain, as used in `data/rooms/*.json`. */
export const TERRAIN_LEGEND: Readonly<Record<string, TerrainKind>> = {
  '.': 'floor',
  ',': 'floor_alt',
  '#': 'wall',
  '+': 'wall_corner',
}

const BLOCKING: ReadonlySet<TerrainKind> = new Set<TerrainKind>(['wall', 'wall_corner'])

/**
 * Which drawing a terrain cell gets.
 *
 * A wall cannot be one picture. The tileset draws the brick face, the thin side
 * edges and the bottom lip as different tiles, and which one a cell needs
 * depends on where the floor is around it — so the room data says "wall" and
 * the choice happens here, once, against the artwork.
 */
export function terrainArt(room: RoomDefinition, coord: TileCoord): Art {
  return terrainLayers(room, coord)[0] as Art
}

/**
 * What to draw on a terrain cell, back to front.
 *
 * Usually one tile. Walls are the exception: only the brick face fills its
 * cell, while the side edges and the bottom lip are thin strips drawn over the
 * floor. Without the floor beneath them the room shows a band of empty
 * background where its edge should meet the ground.
 */
export function terrainLayers(room: RoomDefinition, coord: TileCoord): Art[] {
  const kind = terrainAt(room, coord)
  if (kind === undefined) return [WALLS.top]
  if (kind === 'floor' || kind === 'floor_alt') return [floorArt(kind, coord)]

  const wall = wallArt(room, coord)
  return wall === WALLS.top || wall === WALLS.topRivet
    ? [wall]
    : [floorArt('floor', coord), wall]
}

/** Stable per tile: a floor that reshuffles as you re-enter reads as a glitch. */
function floorArt(kind: TerrainKind, coord: TileCoord): Art {
  const variants = kind === 'floor_alt' ? FLOORS.worn : FLOORS.plain
  return variants[Math.abs(coord.tx * 7 + coord.ty * 13) % variants.length] as Art
}

/** True when this cell is somewhere the hero could stand. */
function isFloor(room: RoomDefinition, tx: number, ty: number): boolean {
  const kind = terrainAt(room, { tx, ty })
  return kind === 'floor' || kind === 'floor_alt'
}

/**
 * Picks a wall piece from where the floor is.
 *
 * Orthogonal neighbours nearly settle it: floor below means the top of a room,
 * floor to the right means its left edge. The exception is the cell just above
 * a doorway cut into a side wall — it has floor below it, like a top wall, and
 * would take the brick face, leaving a slab of masonry halfway down the side of
 * the room. So the run the cell belongs to decides first: a cell with walls
 * above and below is part of a vertical run whatever is beneath it.
 */
function wallArt(room: RoomDefinition, { tx, ty }: TileCoord): Art {
  const below = isFloor(room, tx, ty + 1)
  const above = isFloor(room, tx, ty - 1)
  const right = isFloor(room, tx + 1, ty)
  const left = isFloor(room, tx - 1, ty)

  const vertical = Number(isWall(room, tx, ty - 1)) + Number(isWall(room, tx, ty + 1))
  const horizontal = Number(isWall(room, tx - 1, ty)) + Number(isWall(room, tx + 1, ty))
  if (vertical > horizontal) {
    if (right) return WALLS.left
    if (left) return WALLS.right
  }

  if (below) {
    // A rivet every few tiles, so a long wall is not a repeated stamp.
    return tx % 5 === 2 ? WALLS.topRivet : WALLS.top
  }
  if (above) return WALLS.bottom
  if (right) return WALLS.left
  if (left) return WALLS.right

  if (isFloor(room, tx + 1, ty + 1)) return WALLS.topLeft
  if (isFloor(room, tx - 1, ty + 1)) return WALLS.topRight
  if (isFloor(room, tx + 1, ty - 1)) return WALLS.bottomLeft
  if (isFloor(room, tx - 1, ty - 1)) return WALLS.bottomRight
  return WALLS.top
}

/** True when this cell is masonry, as opposed to floor or outside the room. */
function isWall(room: RoomDefinition, tx: number, ty: number): boolean {
  const kind = terrainAt(room, { tx, ty })
  return kind === 'wall' || kind === 'wall_corner'
}

/**
 * A tile that leads to another room.
 *
 * The link is by room id plus a named entry point rather than by coordinates,
 * so moving a doorway in one room does not silently break its neighbour.
 */
export interface RoomExit {
  readonly at: TileCoord
  readonly to: string
  /** Name of the entry point to arrive at in the destination room. */
  readonly entry: string
}

export interface RoomDefinition {
  readonly id: string
  readonly name: LocalizedText
  readonly width: number
  readonly height: number
  /** Row-major terrain grid, `height` rows of `width` entries. */
  readonly terrain: readonly (readonly TerrainKind[])[]
  /** Where the hero appears when the dungeon starts at this room. */
  readonly spawn: TileCoord
  /** Named arrival points, referenced by exits in other rooms. */
  readonly entries: Readonly<Record<string, TileCoord>>
  readonly exits: readonly RoomExit[]
  /** Slimes, keys, doors, chests and mechanisms placed on top of the terrain. */
  readonly entities: readonly Entity[]
  /**
   * Entities that must be dealt with before the doorways open.
   *
   * Every room asks the child for something — see off the creature, open the
   * chest, light the pedestal — so no room is a corridor they walk through
   * without playing. Empty means the room lets you straight through.
   */
  readonly objective: readonly string[]
}

/**
 * Validates and parses a room document.
 *
 * Rooms are hand-authored JSON, so this throws with a precise message rather
 * than silently rendering a broken level.
 */
export function parseRoom(input: unknown): RoomDefinition {
  if (typeof input !== 'object' || input === null) throw new Error('Room must be an object')
  const raw = input as Record<string, unknown>

  const id = raw['id']
  if (typeof id !== 'string' || id.length === 0) throw new Error('Room "id" must be a non-empty string')

  const name = raw['name']
  if (typeof name !== 'object' || name === null) throw new Error(`Room "${id}": "name" must be an object`)
  for (const locale of SUPPORTED_LOCALES) {
    if (typeof (name as Record<string, unknown>)[locale] !== 'string') {
      throw new Error(`Room "${id}": missing "name.${locale}"`)
    }
  }

  const rows = raw['tiles']
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Room "${id}": "tiles" must be a non-empty array of strings`)
  }

  const width = (rows[0] as string).length
  const terrain = rows.map((row, y) => {
    if (typeof row !== 'string') throw new Error(`Room "${id}": row ${y} is not a string`)
    if (row.length !== width) {
      throw new Error(`Room "${id}": row ${y} has width ${row.length}, expected ${width}`)
    }
    return [...row].map((char, x) => {
      const kind = TERRAIN_LEGEND[char]
      if (!kind) {
        throw new Error(`Room "${id}": unknown terrain character "${char}" at (${x}, ${y})`)
      }
      return kind
    })
  })

  const height = rows.length
  const inBounds = (coord: TileCoord) =>
    coord.tx >= 0 && coord.ty >= 0 && coord.tx < width && coord.ty < height

  const readCoord = (value: unknown, label: string): TileCoord => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Room "${id}": ${label} must be an object with tx and ty`)
    }
    const { tx, ty } = value as Record<string, unknown>
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) {
      throw new Error(`Room "${id}": ${label} must have integer tx and ty`)
    }
    const coord = { tx: tx as number, ty: ty as number }
    if (!inBounds(coord)) {
      throw new Error(`Room "${id}": ${label} (${coord.tx}, ${coord.ty}) is outside the room`)
    }
    return coord
  }

  const spawn = readCoord(raw['spawn'], '"spawn"')
  const walkable = (coord: TileCoord) => !BLOCKING.has(terrain[coord.ty]?.[coord.tx] as TerrainKind)
  // A hero spawned inside a wall cannot move at all, so catch it at load.
  if (!walkable(spawn)) {
    throw new Error(`Room "${id}": "spawn" (${spawn.tx}, ${spawn.ty}) is not walkable`)
  }

  const rawEntries = raw['entries'] ?? {}
  if (typeof rawEntries !== 'object' || rawEntries === null || Array.isArray(rawEntries)) {
    throw new Error(`Room "${id}": "entries" must be an object`)
  }
  const entries: Record<string, TileCoord> = {}
  for (const [entryName, value] of Object.entries(rawEntries)) {
    const coord = readCoord(value, `entry "${entryName}"`)
    if (!walkable(coord)) {
      throw new Error(`Room "${id}": entry "${entryName}" is not walkable`)
    }
    entries[entryName] = coord
  }

  const rawExits = raw['exits'] ?? []
  if (!Array.isArray(rawExits)) throw new Error(`Room "${id}": "exits" must be an array`)
  const exits: RoomExit[] = rawExits.map((value, index) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Room "${id}": exit ${index} must be an object`)
    }
    const exit = value as Record<string, unknown>
    const at = readCoord(exit['at'], `exit ${index} "at"`)
    if (!walkable(at)) {
      throw new Error(`Room "${id}": exit ${index} sits on a wall at (${at.tx}, ${at.ty})`)
    }
    if (typeof exit['to'] !== 'string' || exit['to'].length === 0) {
      throw new Error(`Room "${id}": exit ${index} needs a "to" room id`)
    }
    if (typeof exit['entry'] !== 'string' || exit['entry'].length === 0) {
      throw new Error(`Room "${id}": exit ${index} needs an "entry" name`)
    }
    return { at, to: exit['to'], entry: exit['entry'] }
  })

  const rawEntities = raw['entities'] ?? []
  if (!Array.isArray(rawEntities)) throw new Error(`Room "${id}": "entities" must be an array`)
  const entities = rawEntities.map((value, index) => {
    const entity = parseEntity(value, id, index)
    if (!inBounds(entity.at)) {
      throw new Error(`Room "${id}": entity "${entity.id}" is outside the room`)
    }
    // An entity inside a wall can never be reached, so it is authoring error.
    if (!walkable(entity.at)) {
      throw new Error(`Room "${id}": entity "${entity.id}" sits on a wall`)
    }
    return entity
  })
  const entityIds = new Set<string>()
  for (const entity of entities) {
    if (entityIds.has(entity.id)) {
      throw new Error(`Room "${id}": duplicate entity id "${entity.id}"`)
    }
    entityIds.add(entity.id)
  }

  const rawObjective = raw['objective'] ?? []
  if (!Array.isArray(rawObjective)) throw new Error(`Room "${id}": "objective" must be an array`)
  const objective = rawObjective.map((value, index) => {
    if (typeof value !== 'string' || !entityIds.has(value)) {
      throw new Error(`Room "${id}": objective ${index} is not an entity in this room`)
    }
    return value
  })
  // A key is taken by walking over it, so gating a doorway on one would mean a
  // child could stand on the exit having already met the objective they cannot
  // see. Objectives must be things you visibly deal with.
  for (const entityId of objective) {
    const entity = entities.find((candidate) => candidate.id === entityId)
    if (entity?.type === 'key') {
      throw new Error(`Room "${id}": objective "${entityId}" is a key, which is collected, not solved`)
    }
  }

  // Spawning or arriving inside a blocking entity would trap the hero, or make
  // them bump a door the instant they walk back through it.
  const blocker = (coord: TileCoord) =>
    entities.find(
      (entity) =>
        entity.at.tx === coord.tx &&
        entity.at.ty === coord.ty &&
        blocksMovement(entity, false),
    )
  const spawnBlocker = blocker(spawn)
  if (spawnBlocker) {
    throw new Error(`Room "${id}": "spawn" is inside entity "${spawnBlocker.id}"`)
  }
  for (const [entryName, coord] of Object.entries(entries)) {
    const entryBlocker = blocker(coord)
    if (entryBlocker) {
      throw new Error(`Room "${id}": entry "${entryName}" is inside entity "${entryBlocker.id}"`)
    }
  }

  return {
    id,
    name: name as LocalizedText,
    width,
    height,
    terrain,
    spawn,
    entries,
    exits,
    entities,
    objective,
  }
}

/** True when nothing is left to do here and the doorways are open. */
export function objectiveMet(
  room: RoomDefinition,
  isResolved: (entityId: string) => boolean,
): boolean {
  return room.objective.every(isResolved)
}

/** The entity on a tile, if any. */
export function entityAt(room: RoomDefinition, coord: TileCoord): Entity | undefined {
  return room.entities.find((entity) => entity.at.tx === coord.tx && entity.at.ty === coord.ty)
}

/** The exit on a tile, if any. */
export function exitAt(room: RoomDefinition, coord: TileCoord): RoomExit | undefined {
  return room.exits.find((exit) => exit.at.tx === coord.tx && exit.at.ty === coord.ty)
}

export function terrainAt(room: RoomDefinition, { tx, ty }: TileCoord): TerrainKind | undefined {
  return room.terrain[ty]?.[tx]
}

/** Blocked when the tile is solid terrain or outside the room entirely. */
export function isBlocked(room: RoomDefinition, coord: TileCoord): boolean {
  const kind = terrainAt(room, coord)
  return kind === undefined || BLOCKING.has(kind)
}
