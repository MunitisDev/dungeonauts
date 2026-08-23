import { SUPPORTED_LOCALES, type LocalizedText } from '../../i18n/locales'
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

/** Manifest asset id drawn for each terrain kind. */
export const TERRAIN_TEXTURE: Readonly<Record<TerrainKind, string>> = {
  floor: 'tile_floor_stone_01',
  floor_alt: 'tile_floor_stone_02',
  wall: 'tile_wall_stone',
  wall_corner: 'tile_wall_corner',
}

const BLOCKING: ReadonlySet<TerrainKind> = new Set<TerrainKind>(['wall', 'wall_corner'])

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

  return {
    id,
    name: name as LocalizedText,
    width,
    height,
    terrain,
    spawn,
    entries,
    exits,
  }
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
