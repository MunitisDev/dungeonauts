import { describe, expect, it } from 'vitest'
import { GridMover } from '../src/game/movement/GridMover'
import { DIRECTION_VECTORS, directionBetween, neighbour } from '../src/game/movement/directions'
import { tileToWorldAnchor } from '../src/game/world/grid'
import { DIRECTION_ROWS } from '../src/engine/assets/assetManifest'

describe('directions', () => {
  it('covers exactly the SPRITE_SPEC directional rows', () => {
    expect(Object.keys(DIRECTION_VECTORS).sort()).toEqual([...DIRECTION_ROWS].sort())
  })

  it('treats down as +y, matching a top-down world', () => {
    expect(DIRECTION_VECTORS.down).toEqual({ dx: 0, dy: 1 })
    expect(DIRECTION_VECTORS.up).toEqual({ dx: 0, dy: -1 })
  })

  it('derives facing from an adjacent step', () => {
    const from = { tx: 5, ty: 5 }
    for (const direction of DIRECTION_ROWS) {
      expect(directionBetween(from, neighbour(from, direction))).toBe(direction)
    }
  })

  it('refuses to derive facing from a non-adjacent or diagonal step', () => {
    expect(directionBetween({ tx: 0, ty: 0 }, { tx: 1, ty: 1 })).toBeNull()
    expect(directionBetween({ tx: 0, ty: 0 }, { tx: 3, ty: 0 })).toBeNull()
    expect(directionBetween({ tx: 0, ty: 0 }, { tx: 0, ty: 0 })).toBeNull()
  })
})

describe('GridMover', () => {
  const start = { tx: 2, ty: 3 }

  it('starts still, on its tile, facing down', () => {
    const mover = new GridMover(start)
    expect(mover.tile).toEqual(start)
    expect(mover.isMoving).toBe(false)
    expect(mover.facing).toBe('down')
    expect(mover.position()).toEqual(tileToWorldAnchor(start))
  })

  it('does nothing when updated with no path', () => {
    const mover = new GridMover(start)
    mover.update(10)
    expect(mover.tile).toEqual(start)
    expect(mover.isMoving).toBe(false)
  })

  it('walks a path one tile at a time', () => {
    const mover = new GridMover(start, 4)
    mover.setPath([
      { tx: 3, ty: 3 },
      { tx: 4, ty: 3 },
    ])
    expect(mover.isMoving).toBe(true)

    mover.update(0.25) // exactly one tile at 4 tiles/second
    expect(mover.tile).toEqual({ tx: 3, ty: 3 })
    mover.update(0.25)
    expect(mover.tile).toEqual({ tx: 4, ty: 3 })
    expect(mover.isMoving).toBe(false)
  })

  it('faces the direction it is walking', () => {
    const mover = new GridMover(start, 4)
    mover.setPath([{ tx: 2, ty: 2 }])
    mover.update(0.01)
    expect(mover.facing).toBe('up')

    mover.update(1)
    mover.setPath([{ tx: 1, ty: 2 }])
    mover.update(0.01)
    expect(mover.facing).toBe('left')
  })

  it('interpolates smoothly between tiles', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([{ tx: 1, ty: 0 }])
    const from = tileToWorldAnchor({ tx: 0, ty: 0 })
    const to = tileToWorldAnchor({ tx: 1, ty: 0 })

    mover.update(0.125) // half a tile
    const half = mover.position()
    expect(half.x).toBeCloseTo((from.x + to.x) / 2, 5)
    expect(half.y).toBe(from.y)
  })

  // A long frame must not lose a step or leave the hero between tiles.
  it('carries leftover time across several tiles in one update', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([
      { tx: 1, ty: 0 },
      { tx: 2, ty: 0 },
      { tx: 3, ty: 0 },
    ])
    mover.update(0.75) // exactly three tiles
    expect(mover.tile).toEqual({ tx: 3, ty: 0 })
    expect(mover.isMoving).toBe(false)
  })

  it('overshooting the end of a path stops cleanly on the last tile', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([{ tx: 1, ty: 0 }])
    mover.update(99)
    expect(mover.tile).toEqual({ tx: 1, ty: 0 })
    expect(mover.position()).toEqual(tileToWorldAnchor({ tx: 1, ty: 0 }))
  })

  it('ignores a negative or zero delta', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([{ tx: 1, ty: 0 }])
    mover.update(-5)
    mover.update(0)
    expect(mover.position()).toEqual(tileToWorldAnchor({ tx: 0, ty: 0 }))
  })

  /** What makes tap-to-move feel responsive rather than queued. */
  it('a new path replaces the old one, but finishes the step in progress', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([
      { tx: 1, ty: 0 },
      { tx: 2, ty: 0 },
    ])
    mover.update(0.125) // mid-step towards (1,0)
    mover.setPath([{ tx: 0, ty: 1 }])

    mover.update(0.125) // completes the step into (1,0)
    expect(mover.tile).toEqual({ tx: 1, ty: 0 })

    // The queued redirect is not adjacent to (1,0), so it is refused, not warped to.
    mover.update(0.25)
    expect(mover.tile).toEqual({ tx: 1, ty: 0 })
  })

  it('refuses a path that jumps rather than teleporting', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([{ tx: 5, ty: 5 }])
    mover.update(1)
    expect(mover.tile).toEqual({ tx: 0, ty: 0 })
    expect(mover.isMoving).toBe(false)
  })

  it('stop() abandons the route but keeps the current tile', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([
      { tx: 1, ty: 0 },
      { tx: 2, ty: 0 },
    ])
    mover.update(0.25)
    mover.stop()
    mover.update(1)
    expect(mover.tile).toEqual({ tx: 1, ty: 0 })
    expect(mover.isMoving).toBe(false)
  })

  it('placeAt teleports for a room transition and clears the route', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.setPath([{ tx: 1, ty: 0 }])
    mover.placeAt({ tx: 7, ty: 1 }, 'up')
    expect(mover.tile).toEqual({ tx: 7, ty: 1 })
    expect(mover.facing).toBe('up')
    expect(mover.isMoving).toBe(false)
    expect(mover.position()).toEqual(tileToWorldAnchor({ tx: 7, ty: 1 }))
  })

  it('turns on the spot only while standing still', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 4)
    mover.face('left')
    expect(mover.facing).toBe('left')

    mover.setPath([{ tx: 1, ty: 0 }])
    mover.update(0.05)
    mover.face('up')
    expect(mover.facing).toBe('right') // still walking right, not turned
  })

  it('snaps rendered positions to whole pixels', () => {
    const mover = new GridMover({ tx: 0, ty: 0 }, 3)
    mover.setPath([{ tx: 1, ty: 0 }])
    mover.update(0.1)
    const { x, y } = mover.snappedPosition()
    expect(Number.isInteger(x)).toBe(true)
    expect(Number.isInteger(y)).toBe(true)
  })
})
