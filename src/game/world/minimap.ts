import type { RoomPlacement } from './generateDungeon'
import { objectiveMet, type RoomDefinition } from './room'

/**
 * A room as the map shows it.
 *
 * Deliberately not a `RoomDefinition`: the map has no business knowing what is
 * inside a room, only whether the child has been there, whether they finished
 * what it asked, and whether it is the way down.
 */
export interface MapRoom {
  readonly id: string
  /** Grid position, already shifted so the top-left room sits at (0, 0). */
  readonly gx: number
  readonly gy: number
  /** Rooms this one joins onto, whether or not they are on the map yet. */
  readonly links: readonly string[]
  /** Been there. */
  readonly visited: boolean
  /** Been there and done what it asked. */
  readonly done: boolean
  /** Standing in it right now. */
  readonly current: boolean
  /** Holds the way down to the next floor. */
  readonly exit: boolean
}

export interface MapModel {
  readonly rooms: readonly MapRoom[]
  /** Grid size, so a drawing can size itself without measuring again. */
  readonly width: number
  readonly height: number
  readonly visited: number
  readonly done: number
  readonly total: number
}

export interface MapInput {
  readonly layout: readonly RoomPlacement[]
  readonly rooms: readonly RoomDefinition[]
  readonly visited: ReadonlySet<string>
  readonly currentId: string
  readonly exitRoomId: string
  readonly isResolved: (entityId: string) => boolean
}

/**
 * Builds what the map should show, which is not the whole dungeon.
 *
 * A map that shows every room from the first step is a walkthrough: the child
 * would know where the way down is before setting off, and exploring would
 * stop meaning anything. So it shows the rooms that have been walked into, plus
 * the ones a doorway leads to from them — a way out that is known to exist and
 * not yet taken. Everything beyond that is not on the map at all.
 *
 * Positions come back shifted so the visible corner is the origin, because the
 * generator's grid is centred on the entrance and runs negative.
 */
export function buildMap(input: MapInput): MapModel {
  const { layout, rooms, visited, currentId, exitRoomId, isResolved } = input
  const byId = new Map(rooms.map((room) => [room.id, room]))

  const known = new Set<string>()
  for (const placement of layout) {
    if (!visited.has(placement.id)) continue
    known.add(placement.id)
    for (const link of placement.links) known.add(link)
  }

  const shown = layout.filter((placement) => known.has(placement.id))
  if (shown.length === 0) {
    return { rooms: [], width: 0, height: 0, visited: 0, done: 0, total: layout.length }
  }

  const minX = Math.min(...shown.map((p) => p.gx))
  const minY = Math.min(...shown.map((p) => p.gy))

  const mapped = shown.map((placement): MapRoom => {
    const room = byId.get(placement.id)
    const seen = visited.has(placement.id)
    return {
      id: placement.id,
      gx: placement.gx - minX,
      gy: placement.gy - minY,
      links: placement.links,
      visited: seen,
      // A room nobody has walked into is never "done", whatever its objective
      // says: an empty room's demand is met from the start, and showing it
      // finished before it is entered would give the shape of the map away.
      done: seen && room !== undefined && objectiveMet(room, isResolved),
      current: placement.id === currentId,
      exit: placement.id === exitRoomId,
    }
  })

  return {
    rooms: mapped,
    width: Math.max(...mapped.map((r) => r.gx)) + 1,
    height: Math.max(...mapped.map((r) => r.gy)) + 1,
    visited: mapped.filter((r) => r.visited).length,
    done: mapped.filter((r) => r.done).length,
    total: layout.length,
  }
}
