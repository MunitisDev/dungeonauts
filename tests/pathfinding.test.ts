import { describe, expect, it } from 'vitest'
import { findPath } from '../src/game/world/pathfinding'
import { isBlocked, parseRoom } from '../src/game/world/room'
import { loadDungeon } from '../src/game/world/dungeon'
import type { TileCoord } from '../src/game/world/grid'

/** Builds a walkability predicate from an ASCII sketch: `#` blocks. */
function grid(rows: string[]) {
  return (coord: TileCoord) => {
    const row = rows[coord.ty]
    if (row === undefined || coord.tx < 0 || coord.tx >= row.length) return false
    return row[coord.tx] !== '#'
  }
}

describe('findPath', () => {
  it('returns an empty path when already at the goal', () => {
    expect(findPath({ tx: 1, ty: 1 }, { tx: 1, ty: 1 }, grid(['...', '...']))).toEqual([])
  })

  it('walks a straight open corridor', () => {
    const path = findPath({ tx: 0, ty: 0 }, { tx: 3, ty: 0 }, grid(['....']))
    expect(path).toEqual([
      { tx: 1, ty: 0 },
      { tx: 2, ty: 0 },
      { tx: 3, ty: 0 },
    ])
  })

  it('excludes the start and includes the goal', () => {
    const path = findPath({ tx: 0, ty: 0 }, { tx: 2, ty: 0 }, grid(['...']))
    expect(path?.[0]).toEqual({ tx: 1, ty: 0 })
    expect(path?.at(-1)).toEqual({ tx: 2, ty: 0 })
  })

  it('finds the shortest route, not merely a route', () => {
    // Straight line is 6 steps; going around the wall would be longer.
    const path = findPath({ tx: 0, ty: 1 }, { tx: 6, ty: 1 }, grid([
      '.......',
      '.......',
      '.......',
    ]))
    expect(path).toHaveLength(6)
  })

  it('goes around an obstacle', () => {
    const path = findPath({ tx: 0, ty: 1 }, { tx: 2, ty: 1 }, grid([
      '...',
      '.#.',
      '...',
    ]))
    expect(path).not.toBeNull()
    expect(path).toHaveLength(4)
    // Never routes through the wall.
    expect(path?.some((c) => c.tx === 1 && c.ty === 1)).toBe(false)
  })

  it('returns null when the goal is a wall', () => {
    expect(findPath({ tx: 0, ty: 0 }, { tx: 1, ty: 0 }, grid(['.#.']))).toBeNull()
  })

  it('returns null when the goal is walled off', () => {
    const path = findPath({ tx: 0, ty: 1 }, { tx: 4, ty: 1 }, grid([
      '..#..',
      '..#..',
      '..#..',
    ]))
    expect(path).toBeNull()
  })

  it('returns null rather than leaving the grid', () => {
    expect(findPath({ tx: 0, ty: 0 }, { tx: 99, ty: 0 }, grid(['...']))).toBeNull()
  })

  it('never includes a blocked tile in a path it does return', () => {
    const rows = [
      '..........',
      '.####.###.',
      '..........',
      '.###.####.',
      '..........',
    ]
    const canEnter = grid(rows)
    const path = findPath({ tx: 0, ty: 0 }, { tx: 9, ty: 4 }, canEnter)
    expect(path).not.toBeNull()
    for (const step of path as TileCoord[]) expect(canEnter(step), `${step.tx},${step.ty}`).toBe(true)
  })

  it('produces an orthogonally connected path with no jumps', () => {
    const start = { tx: 0, ty: 0 }
    const path = findPath(start, { tx: 4, ty: 3 }, grid([
      '.....',
      '.###.',
      '.....',
      '.....',
    ])) as TileCoord[]
    let previous = start
    for (const step of path) {
      const distance = Math.abs(step.tx - previous.tx) + Math.abs(step.ty - previous.ty)
      expect(distance).toBe(1)
      previous = step
    }
  })

  it('is deterministic when several shortest paths exist', () => {
    const canEnter = grid(['....', '....', '....'])
    const first = findPath({ tx: 0, ty: 0 }, { tx: 3, ty: 2 }, canEnter)
    const second = findPath({ tx: 0, ty: 0 }, { tx: 3, ty: 2 }, canEnter)
    expect(first).toEqual(second)
  })

  it('gives up rather than searching forever on an unbounded grid', () => {
    // Every tile is walkable, so an unreachable goal would search the plane.
    expect(findPath({ tx: 0, ty: 0 }, { tx: 1e6, ty: 1e6 }, () => true, 500)).toBeNull()
  })
})

describe('findPath over the real rooms', () => {
  const dungeon = loadDungeon()

  it('can reach every walkable tile from the spawn in each room', () => {
    for (const id of dungeon.roomIds) {
      const room = dungeon.room(id)
      const canEnter = (coord: { tx: number; ty: number }) => !isBlocked(room, coord)
      for (let ty = 0; ty < room.height; ty++) {
        for (let tx = 0; tx < room.width; tx++) {
          if (!canEnter({ tx, ty })) continue
          expect(
            findPath(room.spawn, { tx, ty }, canEnter),
            `${id}: (${tx}, ${ty}) is walkable but unreachable from spawn`,
          ).not.toBeNull()
        }
      }
    }
  })
})

describe('room parsing rejects broken navigation data', () => {
  const base = {
    id: 'r',
    name: { es: 'a', en: 'b' },
    tiles: ['###', '#.#', '###'],
    spawn: { tx: 1, ty: 1 },
  }

  it('accepts a minimal valid room', () => {
    expect(parseRoom(base).spawn).toEqual({ tx: 1, ty: 1 })
  })

  it('rejects a spawn inside a wall', () => {
    expect(() => parseRoom({ ...base, spawn: { tx: 0, ty: 0 } })).toThrow(/not walkable/)
  })

  it('rejects a spawn outside the room', () => {
    expect(() => parseRoom({ ...base, spawn: { tx: 9, ty: 9 } })).toThrow(/outside the room/)
  })

  it('rejects a non-integer spawn', () => {
    expect(() => parseRoom({ ...base, spawn: { tx: 1.5, ty: 1 } })).toThrow(/integer/)
  })

  it('rejects an entry inside a wall', () => {
    expect(() =>
      parseRoom({ ...base, entries: { north: { tx: 0, ty: 0 } } }),
    ).toThrow(/entry "north" is not walkable/)
  })

  it('rejects an exit with no destination', () => {
    expect(() =>
      parseRoom({ ...base, exits: [{ at: { tx: 1, ty: 1 }, entry: 'north' }] }),
    ).toThrow(/needs a "to" room id/)
  })
})
