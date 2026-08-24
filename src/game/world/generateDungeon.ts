import { ROOM_TILES_HIGH, ROOM_TILES_WIDE } from '../../engine/constants'
import { createRandom, pickInt, shuffle } from '../../core/random'
import type { Difficulty } from '../../education'
import type { LocalizedText } from '../../i18n/locales'
import type { DoorOrientation, Entity } from '../entities/entity'
import { parseEntity } from '../entities/entity'
import type { TileCoord } from './grid'
import { parseRoom, type RoomDefinition, type RoomExit } from './room'

/**
 * Every generated room is the same size, and the size is the one the canvas is
 * built for: `engine/constants.ts` sizes the viewport from these very numbers,
 * so a room is always exactly the room on screen.
 */
const ROOM_W = ROOM_TILES_WIDE
const ROOM_H = ROOM_TILES_HIGH
const MID_X = Math.floor(ROOM_W / 2)
const MID_Y = Math.floor(ROOM_H / 2)

/** Where a doorway sits on each wall, and where you land coming through it. */
const SIDES = {
  north: { door: { tx: MID_X, ty: 0 }, entry: { tx: MID_X, ty: 1 }, dx: 0, dy: -1, from: 'from_south' },
  south: { door: { tx: MID_X, ty: ROOM_H - 1 }, entry: { tx: MID_X, ty: ROOM_H - 2 }, dx: 0, dy: 1, from: 'from_north' },
  west: { door: { tx: 0, ty: MID_Y }, entry: { tx: 1, ty: MID_Y }, dx: -1, dy: 0, from: 'from_east' },
  east: { door: { tx: ROOM_W - 1, ty: MID_Y }, entry: { tx: ROOM_W - 2, ty: MID_Y }, dx: 1, dy: 0, from: 'from_west' },
} as const
type Side = keyof typeof SIDES
const SIDE_NAMES = Object.keys(SIDES) as Side[]
const OPPOSITE: Record<Side, Side> = { north: 'south', south: 'north', west: 'east', east: 'west' }
/** The wall a gap on each side is cut into, as the door art names them. */
const DOOR_WALL: Record<Side, DoorOrientation> = {
  north: 'top',
  south: 'bottom',
  west: 'left',
  east: 'right',
}

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

  const plans = populate(ordered, start, exit, difficulty, random)
  const rooms = ordered.map((cell) =>
    buildRoom(cell, cells, plans.get(cell.id) ?? { entities: [], objective: [] }),
  )

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

/** Everything one room holds, and what it demands before it lets you on. */
interface RoomPlan {
  readonly entities: Entity[]
  readonly objective: string[]
}

/** The three shapes a room's demand can take. */
const TASKS = ['slimes', 'chest', 'mechanism'] as const
type Task = (typeof TASKS)[number]

/**
 * Decides what lives in each room.
 *
 * Every room asks for something before its doorways open — see off one or two
 * creatures, open a chest, light a pedestal — so a child is never walking
 * through scenery. The three shapes are dealt round-robin from a shuffled deck
 * rather than rolled independently, which is what stops a seed producing five
 * fights in a row.
 *
 * The rules that keep it solvable: a room's demand is never something that
 * needs a key, locked doors only ever seal dead-end rooms, and one more key is
 * always handed out than the dungeon demands.
 */
function populate(
  ordered: readonly Cell[],
  start: Cell,
  exit: Cell,
  difficulty: Difficulty,
  random: () => number,
): Map<string, RoomPlan> {
  const byRoom = new Map<string, RoomPlan>()
  const taken = new Map<string, TileCoord[]>()
  const plan = (id: string): RoomPlan => {
    const existing = byRoom.get(id)
    if (existing) return existing
    const fresh: RoomPlan = { entities: [], objective: [] }
    byRoom.set(id, fresh)
    return fresh
  }
  const put = (id: string, entity: Entity, isObjective = false) => {
    const room = plan(id)
    room.entities.push(entity)
    if (isObjective) room.objective.push(entity.id)
  }

  /** A free interior tile, kept a step clear of anything already placed. */
  const spot = (roomId: string): TileCoord => {
    const used = taken.get(roomId) ?? []
    taken.set(roomId, used)
    for (let attempt = 0; attempt < 60; attempt++) {
      const tx = pickInt(2, ROOM_W - 3, random)
      const ty = pickInt(2, ROOM_H - 3, random)
      if (used.some((t) => Math.abs(t.tx - tx) < 2 && Math.abs(t.ty - ty) < 2)) continue
      used.push({ tx, ty })
      return { tx, ty }
    }
    // Scanned, never guessed: a fixed fallback can itself be occupied.
    for (let ty = 2; ty <= ROOM_H - 3; ty++) {
      for (let tx = 2; tx <= ROOM_W - 3; tx++) {
        if (used.some((t) => t.tx === tx && t.ty === ty)) continue
        used.push({ tx, ty })
        return { tx, ty }
      }
    }
    throw new Error(`Room "${roomId}" has no room left for another prop`)
  }

  const subject = (index: number): 'math' | 'language' => (index % 2 === 0 ? 'math' : 'language')
  // One kind of creature per room: a snake and a bat sharing a room reads as a
  // mistake rather than as variety.
  const creatures = shuffle(['snake', 'bat', 'ghost'], random)
  let n = 0
  let keysAvailable = 0
  let lockedThings = 0
  let chestKeys = 0

  // The way out is locked, which is what makes a key worth carrying all the way
  // to the last room rather than spending it on the first door you meet.
  put(
    exit.id,
    parseEntity(
      {
        type: 'chest', id: 'chest_goal', at: { tx: 7, ty: 5 }, goal: true, requiresKey: true,
        challenge: { subject: 'math', difficulty },
        reward: { stars: 3, coins: 15, hearts: 1 },
      },
      exit.id,
      n++,
    ),
    true,
  )
  taken.set(exit.id, [{ tx: 7, ty: 5 }])
  lockedThings += 1

  // Dealt from a shuffled deck rather than rolled per room, so a seed cannot
  // produce five fights in a row. The entrance always draws the gentlest of the
  // three: a child's first question in a run should not be a fight.
  const middle = ordered.filter((c) => c.id !== exit.id)
  const wheel = shuffle(TASKS, random)
  const tasks = new Map<string, Task>()
  middle.forEach((cell, index) => {
    tasks.set(cell.id, cell.id === start.id ? 'mechanism' : (wheel[index % wheel.length] as Task))
  })

  for (const cell of middle) {
    const task = tasks.get(cell.id) as Task
    if (task === 'slimes') {
      // One creature, or two when the room can carry it: "uno o dos enemigos".
      const count = pickInt(1, 2, random)
      const creature = creatures[n % creatures.length] as string
      for (let i = 0; i < count; i++) {
        const slimeId = `slime_${cell.id}_${i + 1}`
        put(
          cell.id,
          parseEntity(
            {
              type: 'slime', id: slimeId, at: spot(cell.id), hits: 2, creature,
              challenge: { subject: subject(n), difficulty },
              drop: { coins: pickInt(2, 4, random), hearts: random() < 0.25 ? 1 : 0 },
            },
            cell.id,
            n++,
          ),
          true,
        )
        // The first creature of a room is guarding a key: keys come from
        // enemies as well as from chests.
        if (i === 0) {
          put(
            cell.id,
            parseEntity({ type: 'key', id: `key_${slimeId}`, at: spot(cell.id), guardedBy: slimeId }, cell.id, n++),
          )
          keysAvailable += 1
        }
      }
      continue
    }

    if (task === 'chest') {
      const chestId = `chest_${cell.id}`
      put(
        cell.id,
        parseEntity(
          {
            type: 'chest', id: chestId, at: spot(cell.id), requiresKey: false,
            challenge: { subject: subject(n), difficulty },
            reward: { stars: 1, coins: pickInt(4, 8, random), hearts: random() < 0.35 ? 1 : 0 },
          },
          cell.id,
          n++,
        ),
        true,
      )
      // The first chest always hides a key, and half the rest do: keys must
      // come from chests on every seed, not merely on most of them. Never a
      // locked chest — a key sealed behind the key that opens it is the one
      // arrangement that deadlocks.
      if (chestKeys === 0 || random() < 0.5) {
        chestKeys += 1
        put(
          cell.id,
          parseEntity({ type: 'key', id: `key_${chestId}`, at: spot(cell.id), guardedBy: chestId }, cell.id, n++),
        )
        keysAvailable += 1
      }
      continue
    }

    put(
      cell.id,
      parseEntity(
        {
          type: 'mechanism', id: `rune_${cell.id}`, at: spot(cell.id),
          challenge: { subject: subject(n), difficulty },
          reward: { coins: pickInt(1, 3, random), hearts: 0 },
        },
        cell.id,
        n++,
      ),
      true,
    )
  }

  const deadEnds = ordered.filter(
    (c) => c.id !== start.id && c.id !== exit.id && Object.keys(c.neighbours).length === 1,
  )

  // A locked treasure chest, as a reward for carrying a spare key. Never part
  // of the room's demand, so it can never block the way on.
  const vault = keysAvailable - lockedThings >= 2 ? deadEnds[0] : undefined
  if (vault) {
    put(
      vault.id,
      parseEntity(
        {
          type: 'chest', id: `vault_${vault.id}`, at: spot(vault.id), requiresKey: true,
          challenge: { subject: 'language', difficulty },
          reward: { stars: 2, coins: pickInt(8, 14, random), hearts: 1 },
        },
        vault.id,
        n++,
      ),
    )
    lockedThings += 1
  }

  /*
   * Locked doors seal dead-end rooms only, and the door is placed in the room
   * you are coming *from*, on the doorway that leads in. Putting it inside the
   * locked room locks the child in rather than out — the transition happens on
   * the neighbour's tile, before the door is ever reached.
   */
  const budget = Math.max(0, Math.min(keysAvailable - lockedThings - 1, 2))
  for (const cell of deadEnds.filter((c) => c !== vault).slice(0, budget)) {
    const approach = SIDE_NAMES.find((side) => cell.neighbours[side] !== undefined)
    if (!approach) continue
    const neighbourId = cell.neighbours[approach] as string
    const side = OPPOSITE[approach]
    put(
      neighbourId,
      parseEntity(
        {
          type: 'door', id: `door_to_${cell.id}`, at: SIDES[side].door, requiresKey: true,
          // Each wall has its own door, and the generator is the only place
          // that knows which wall the gap was cut into.
          orientation: DOOR_WALL[side],
          challenge: { subject: 'language', difficulty },
        },
        neighbourId,
        n++,
      ),
    )
    lockedThings += 1
  }

  return byRoom
}

/** Turns a laid-out cell into a validated `RoomDefinition`. */
function buildRoom(cell: Cell, cells: Map<string, Cell>, plan: RoomPlan): RoomDefinition {
  const { entities, objective } = plan
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
    objective,
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
