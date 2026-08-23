import { createRandom, pickInt, shuffle } from '../../core/random'
import type { Difficulty } from '../../education'
import type { LocalizedText } from '../../i18n/locales'
import type { Entity } from '../entities/entity'
import { parseEntity } from '../entities/entity'
import type { TileCoord } from './grid'
import { parseRoom, type RoomDefinition, type RoomExit } from './room'

/** Every generated room is the same size, so the camera rules stay simple. */
const ROOM_W = 15
const ROOM_H = 10

/** Where a doorway sits on each wall, and where you land coming through it. */
const SIDES = {
  north: { door: { tx: 7, ty: 0 }, entry: { tx: 7, ty: 1 }, dx: 0, dy: -1, from: 'from_south' },
  south: { door: { tx: 7, ty: 9 }, entry: { tx: 7, ty: 8 }, dx: 0, dy: 1, from: 'from_north' },
  west: { door: { tx: 0, ty: 4 }, entry: { tx: 1, ty: 4 }, dx: -1, dy: 0, from: 'from_east' },
  east: { door: { tx: 14, ty: 4 }, entry: { tx: 13, ty: 4 }, dx: 1, dy: 0, from: 'from_west' },
} as const
type Side = keyof typeof SIDES
const SIDE_NAMES = Object.keys(SIDES) as Side[]
const OPPOSITE: Record<Side, Side> = { north: 'south', south: 'north', west: 'east', east: 'west' }

export interface DungeonPlan {
  readonly seed: number
  readonly rooms: readonly RoomDefinition[]
  readonly startRoomId: string
  /** Room holding the dungeon's goal chest. */
  readonly exitRoomId: string
}

export interface GenerateOptions {
  readonly seed: number
  /** Question difficulty the challenges are asked at. */
  readonly difficulty: Difficulty
  readonly minRooms?: number
  readonly maxRooms?: number
}

interface Cell {
  readonly gx: number
  readonly gy: number
  readonly id: string
  neighbours: Partial<Record<Side, string>>
  /** Steps from the start room, along the corridor graph. */
  depth: number
}

/**
 * Builds a dungeon.
 *
 * Rooms are laid out by a random walk on a grid, which guarantees the map is
 * connected without needing a separate repair pass: every room is reached by
 * walking there. Locks are then placed only where they cannot strand anybody,
 * and the tests replay each seed as a player would, because a dungeon a child
 * cannot finish is worse than a boring one.
 */
export function generateDungeon(options: GenerateOptions): DungeonPlan {
  const { seed, difficulty, minRooms = 10, maxRooms = 12 } = options
  const random = createRandom(seed)
  const target = pickInt(minRooms, maxRooms, random)

  const cells = layout(target, random)
  const ordered = [...cells.values()].sort((a, b) => a.depth - b.depth)
  const start = ordered[0] as Cell
  const exit = ordered[ordered.length - 1] as Cell

  const plan = populate(ordered, start, exit, difficulty, random)
  const rooms = ordered.map((cell) => buildRoom(cell, cells, plan.get(cell.id) ?? []))

  return { seed, rooms, startRoomId: start.id, exitRoomId: exit.id }
}

/** Random walk that never revisits, so the result is a connected tree of rooms. */
function layout(target: number, random: () => number): Map<string, Cell> {
  const key = (gx: number, gy: number) => `${gx},${gy}`
  const cells = new Map<string, Cell>()
  const add = (gx: number, gy: number, depth: number): Cell => {
    const cell: Cell = { gx, gy, id: `room_${String(cells.size + 1).padStart(2, '0')}`, neighbours: {}, depth }
    cells.set(key(gx, gy), cell)
    return cell
  }

  let current = add(0, 0, 0)
  let guard = 0
  while (cells.size < target && guard++ < 500) {
    const options = shuffle(SIDE_NAMES, random)
    let moved = false
    for (const side of options) {
      const { dx, dy } = SIDES[side]
      const nx = current.gx + dx, ny = current.gy + dy
      // Keep the map compact so a saved seed always rebuilds the same shape.
      if (Math.abs(nx) > 3 || Math.abs(ny) > 3) continue
      const existing = cells.get(key(nx, ny))
      const next = existing ?? add(nx, ny, current.depth + 1)
      current.neighbours[side] = next.id
      next.neighbours[OPPOSITE[side]] = current.id
      if (existing) next.depth = Math.min(next.depth, current.depth + 1)
      current = next
      moved = true
      break
    }
    // Boxed in: hop back to a random room already placed and carry on.
    if (!moved) current = [...cells.values()][Math.floor(random() * cells.size)] as Cell
  }
  return cells
}

/**
 * Decides what lives in each room.
 *
 * The rules that keep it solvable: locked doors only ever seal dead-end rooms,
 * so a lock can never stand between the child and a key; the chest that hides a
 * key is never itself locked; and one more key is always handed out than the
 * dungeon demands.
 */
function populate(
  ordered: readonly Cell[],
  start: Cell,
  exit: Cell,
  difficulty: Difficulty,
  random: () => number,
): Map<string, Entity[]> {
  const byRoom = new Map<string, Entity[]>()
  const put = (id: string, entity: Entity) => {
    const list = byRoom.get(id) ?? []
    list.push(entity)
    byRoom.set(id, list)
  }
  const spot = (taken: TileCoord[]): TileCoord => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const tx = pickInt(2, ROOM_W - 3, random)
      const ty = pickInt(2, ROOM_H - 3, random)
      if (taken.some((t) => Math.abs(t.tx - tx) < 2 && Math.abs(t.ty - ty) < 2)) continue
      taken.push({ tx, ty })
      return { tx, ty }
    }
    return { tx: 3, ty: 3 }
  }

  const middle = ordered.filter((c) => c.id !== start.id && c.id !== exit.id)
  // Roughly two thirds of the rooms hold a slime, and half of those a key.
  const guarded = shuffle(middle, random).slice(0, Math.max(3, Math.round(middle.length * 0.66)))
  const keyRooms = guarded.slice(0, Math.max(2, Math.round(guarded.length / 2)))

  let n = 0
  for (const cell of guarded) {
    const taken: TileCoord[] = []
    const slimeId = `slime_${cell.id}`
    put(cell.id, parseEntity({
      type: 'slime', id: slimeId, at: spot(taken), hits: 2,
      challenge: { subject: n % 2 === 0 ? 'math' : 'language', difficulty },
    }, cell.id, n++))

    if (keyRooms.includes(cell)) {
      put(cell.id, parseEntity({
        type: 'key', id: `key_${cell.id}`, at: spot(taken), guardedBy: slimeId,
      }, cell.id, n++))
    }
  }

  // A treasure chest in a couple of the deeper rooms.
  //
  // The first is locked, so a key is what opens a treasure room; the second is
  // free, and hides a key of its own. Keys therefore come from enemies AND from
  // chests, and the free chest is never the one gating its own key.
  const treasure = shuffle(middle.filter((c) => c.depth > 1), random).slice(0, 2)
  let keysAvailable = keyRooms.length
  let lockedChests = 0

  treasure.forEach((cell, index) => {
    const locked = index === 0 && treasure.length > 1
    const chestId = `chest_${cell.id}`
    put(cell.id, parseEntity({
      type: 'chest', id: chestId, at: { tx: 7, ty: 5 }, requiresKey: locked,
      challenge: { subject: 'language', difficulty },
      reward: { stars: 1, coins: 5 },
    }, cell.id, n++))
    if (locked) {
      lockedChests += 1
      return
    }
    put(cell.id, parseEntity({
      type: 'key', id: `key_${chestId}`, at: { tx: 9, ty: 5 }, guardedBy: chestId,
    }, cell.id, n++))
    keysAvailable += 1
  })

  // The way out is locked too, which is what makes a key worth carrying all the
  // way to the last room rather than spending on the first door you meet.
  put(exit.id, parseEntity({
    type: 'chest', id: `chest_goal`, at: { tx: 7, ty: 5 }, goal: true, requiresKey: true,
    challenge: { subject: 'math', difficulty },
    reward: { stars: 3, coins: 15 },
  }, exit.id, n++))
  lockedChests += 1

  // Locked doors go only on dead-end rooms, so a lock can never stand between
  // the child and a key they have not found yet — the one way a generated
  // dungeon could become unfinishable. One spare key is always left over.
  const budget = Math.max(0, Math.min(keysAvailable - lockedChests - 1, 2))
  const lockable = ordered
    .filter((c) => c.depth > 1 && c.id !== start.id && c.id !== exit.id)
    .filter((c) => Object.keys(c.neighbours).length === 1)
    .sort((a, b) => b.depth - a.depth)
    .slice(0, budget)

  for (const cell of lockable) {
    const approach = SIDE_NAMES.find((side) => cell.neighbours[side] !== undefined)
    if (!approach) continue
    put(cell.id, parseEntity({
      type: 'door', id: `door_${cell.id}`, at: SIDES[approach].door, requiresKey: true,
      challenge: { subject: 'language', difficulty },
    }, cell.id, n++))
  }

  return byRoom
}

/** Turns a laid-out cell into a validated `RoomDefinition`. */
function buildRoom(cell: Cell, cells: Map<string, Cell>, entities: Entity[]): RoomDefinition {
  const rows: string[][] = []
  for (let ty = 0; ty < ROOM_H; ty++) {
    const row: string[] = []
    for (let tx = 0; tx < ROOM_W; tx++) {
      const edge = tx === 0 || ty === 0 || tx === ROOM_W - 1 || ty === ROOM_H - 1
      const corner = (tx === 0 || tx === ROOM_W - 1) && (ty === 0 || ty === ROOM_H - 1)
      row.push(corner ? '+' : edge ? '#' : '.')
    }
    rows.push(row)
  }

  const entries: Record<string, TileCoord> = {}
  const exits: RoomExit[] = []
  for (const side of SIDE_NAMES) {
    const neighbourId = cell.neighbours[side]
    if (!neighbourId) continue
    const { door, entry, from } = SIDES[side]
    ;(rows[door.ty] as string[])[door.tx] = '.'
    entries[from] = entry
    const neighbour = [...cells.values()].find((c) => c.id === neighbourId)
    exits.push({ at: door, to: neighbourId, entry: SIDES[OPPOSITE[side]].from })
    void neighbour
  }

  // A little decorative variation, kept clear of doorways and entities.
  const busy = new Set<string>([
    ...entities.map((e) => `${e.at.tx},${e.at.ty}`),
    ...Object.values(entries).map((e) => `${e.tx},${e.ty}`),
  ])
  const decorRandom = createRandom(hash(cell.id))
  for (let i = 0; i < 4; i++) {
    const tx = 2 + Math.floor(decorRandom() * (ROOM_W - 4))
    const ty = 2 + Math.floor(decorRandom() * (ROOM_H - 4))
    if (busy.has(`${tx},${ty}`)) continue
    ;(rows[ty] as string[])[tx] = ','
  }

  // Scanned rather than guessed: a fixed fallback can itself be occupied, and
  // a room whose spawn is inside a chest fails to load at all.
  const occupied = new Set(entities.map((e) => `${e.at.tx},${e.at.ty}`))
  const doorways = new Set(exits.map((e) => `${e.at.tx},${e.at.ty}`))
  let spawn: TileCoord | undefined
  for (let ty = ROOM_H - 2; ty >= 1 && !spawn; ty--) {
    for (let tx = 1; tx < ROOM_W - 1; tx++) {
      const at = `${tx},${ty}`
      if (occupied.has(at) || doorways.has(at)) continue
      spawn = { tx, ty }
      break
    }
  }
  if (!spawn) throw new Error(`Room "${cell.id}" has nowhere to stand`)

  return parseRoom({
    id: cell.id,
    name: roomName(cell),
    tiles: rows.map((row) => row.join('')),
    spawn,
    entries,
    exits,
    entities: entities.map(toPlain),
  })
}

function roomName(cell: Cell): LocalizedText {
  const n = cell.id.replace('room_', '')
  return { es: `Sala ${n}`, en: `Room ${n}` }
}

/** `parseRoom` re-validates, so entities go back through as plain data. */
function toPlain(entity: Entity): Record<string, unknown> {
  return { ...entity } as unknown as Record<string, unknown>
}

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}
