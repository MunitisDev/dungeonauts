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

export interface RoomDefinition {
  readonly id: string
  readonly name: LocalizedText
  readonly width: number
  readonly height: number
  /** Row-major terrain grid, `height` rows of `width` entries. */
  readonly terrain: readonly (readonly TerrainKind[])[]
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

  return { id, name: name as LocalizedText, width, height: rows.length, terrain }
}

export function terrainAt(room: RoomDefinition, { tx, ty }: TileCoord): TerrainKind | undefined {
  return room.terrain[ty]?.[tx]
}

/** Blocked when the tile is solid terrain or outside the room entirely. */
export function isBlocked(room: RoomDefinition, coord: TileCoord): boolean {
  const kind = terrainAt(room, coord)
  return kind === undefined || BLOCKING.has(kind)
}
