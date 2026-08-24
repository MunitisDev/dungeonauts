import { isGoal, type Entity } from '../entities/entity'
import { parseRoom, type RoomDefinition } from './room'

/**
 * All rooms, loaded and validated from `data/rooms/`.
 *
 * Globbed like the educational content, and for the same reason: adding a room
 * should be a data change, not a code change.
 */
const roomModules = import.meta.glob<{ default: unknown }>('/data/rooms/*.json', { eager: true })

export class Dungeon {
  private readonly rooms: ReadonlyMap<string, RoomDefinition>
  /** Room the hero starts in — the first by file order. */
  readonly startRoomId: string

  constructor(rooms: readonly RoomDefinition[]) {
    if (rooms.length === 0) throw new Error('A dungeon needs at least one room')
    const byId = new Map<string, RoomDefinition>()
    for (const room of rooms) {
      if (byId.has(room.id)) throw new Error(`Duplicate room id "${room.id}"`)
      byId.set(room.id, room)
    }
    this.rooms = byId
    this.startRoomId = rooms[0]?.id as string
    this.assertLinksResolve()
  }

  get roomIds(): string[] {
    return [...this.rooms.keys()]
  }

  get size(): number {
    return this.rooms.size
  }

  /** Entities that must be resolved for the dungeon to be complete. */
  goals(): Entity[] {
    return [...this.rooms.values()].flatMap((room) => room.entities.filter(isGoal))
  }

  /** Every room, in the order they were built. */
  all(): RoomDefinition[] {
    return [...this.rooms.values()]
  }

  room(id: string): RoomDefinition {
    const room = this.rooms.get(id)
    if (!room) throw new Error(`Unknown room "${id}"`)
    return room
  }

  has(id: string): boolean {
    return this.rooms.has(id)
  }

  /**
   * Every exit must name a room that exists and an entry that room declares.
   * Checked once at construction so a broken link is a load-time error rather
   * than a child walking into a doorway that goes nowhere.
   */
  private assertLinksResolve(): void {
    for (const room of this.rooms.values()) {
      for (const exit of room.exits) {
        const destination = this.rooms.get(exit.to)
        if (!destination) {
          throw new Error(`Room "${room.id}" exits to unknown room "${exit.to}"`)
        }
        if (!(exit.entry in destination.entries)) {
          throw new Error(
            `Room "${room.id}" exits to "${exit.to}" entry "${exit.entry}", which is not declared`,
          )
        }
      }
    }
  }
}

let cached: Dungeon | undefined

/**
 * The hand-authored rooms under `data/rooms/`.
 *
 * No longer what a run plays: runs are generated from a seed so a save is a
 * number rather than a copy of the world. These rooms stay as the worked
 * example of the room format, and as fixtures the tests exercise the loader
 * and the pathfinder against.
 */
export function loadDungeon(): Dungeon {
  if (cached) return cached
  const rooms = Object.entries(roomModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, module]) => parseRoom(module.default))
  cached = new Dungeon(rooms)
  return cached
}
