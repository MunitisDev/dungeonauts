import { DIRECTION_VECTORS, type Direction } from '../movement/directions'
import type { TileCoord } from './grid'

/** Deterministic neighbour order, so an equal-length path is always the same one. */
const SEARCH_ORDER: readonly Direction[] = ['up', 'left', 'down', 'right']

const key = (coord: TileCoord): string => `${coord.tx},${coord.ty}`

/**
 * Shortest walkable path from `start` to `goal`, excluding `start`.
 *
 * Breadth-first, because every step costs the same on a uniform grid and BFS is
 * both optimal and trivial to reason about at this size. Returns `null` when the
 * goal is unreachable — the caller decides what to do, which for tap-to-move is
 * simply to ignore the tap rather than walking somewhere unexpected.
 *
 * Pathfinding matters for the audience: a child on a tablet should tap where
 * they want to go, not tap eight times to cross a room.
 */
export function findPath(
  start: TileCoord,
  goal: TileCoord,
  canEnter: (coord: TileCoord) => boolean,
  maxVisited = 4096,
): TileCoord[] | null {
  if (start.tx === goal.tx && start.ty === goal.ty) return []
  if (!canEnter(goal)) return null

  const cameFrom = new Map<string, TileCoord | null>([[key(start), null]])
  const queue: TileCoord[] = [start]
  let head = 0

  while (head < queue.length) {
    if (cameFrom.size > maxVisited) return null
    const current = queue[head++] as TileCoord

    for (const direction of SEARCH_ORDER) {
      const { dx, dy } = DIRECTION_VECTORS[direction]
      const next = { tx: current.tx + dx, ty: current.ty + dy }
      const nextKey = key(next)
      if (cameFrom.has(nextKey) || !canEnter(next)) continue

      cameFrom.set(nextKey, current)
      if (next.tx === goal.tx && next.ty === goal.ty) return reconstruct(cameFrom, next)
      queue.push(next)
    }
  }
  return null
}

function reconstruct(cameFrom: Map<string, TileCoord | null>, goal: TileCoord): TileCoord[] {
  const path: TileCoord[] = []
  let cursor: TileCoord | null = goal
  while (cursor) {
    path.push(cursor)
    cursor = cameFrom.get(key(cursor)) ?? null
  }
  path.pop() // drop the start tile
  return path.reverse()
}
