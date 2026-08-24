import { describe, expect, it } from 'vitest'
import { TILE_SIZE } from '../src/engine/constants'
import {
  ANCHOR_ORIGIN,
  tileToWorldAnchor,
  tileToWorldCenter,
  tileToWorldTopLeft,
  worldToTile,
} from '../src/game/world/grid'

describe('grid coordinates', () => {
  // Written against the constant rather than the number: the tile changed from
  // 32 to 16 when the real art arrived, and these are about the mapping, not
  // about any particular size.
  it('uses a whole-number logical tile', () => {
    expect(Number.isInteger(TILE_SIZE)).toBe(true)
    expect(TILE_SIZE).toBeGreaterThan(0)
  })

  it('maps a tile to its top-left pixel', () => {
    expect(tileToWorldTopLeft({ tx: 0, ty: 0 })).toEqual({ x: 0, y: 0 })
    expect(tileToWorldTopLeft({ tx: 3, ty: 2 })).toEqual({ x: 3 * TILE_SIZE, y: 2 * TILE_SIZE })
  })

  it('maps a tile to its centre', () => {
    const half = TILE_SIZE / 2
    expect(tileToWorldCenter({ tx: 0, ty: 0 })).toEqual({ x: half, y: half })
    expect(tileToWorldCenter({ tx: 3, ty: 2 })).toEqual({
      x: 3 * TILE_SIZE + half,
      y: 2 * TILE_SIZE + half,
    })
  })

  // The convention that lets sprites of different heights share one grid.
  it('anchors entities on the floor line of their tile', () => {
    expect(tileToWorldAnchor({ tx: 0, ty: 0 })).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE })
    expect(tileToWorldAnchor({ tx: 3, ty: 2 })).toEqual({
      x: 3 * TILE_SIZE + TILE_SIZE / 2,
      y: 3 * TILE_SIZE,
    })
  })

  it('keeps a bottom-center sprite inside its tile horizontally, however tall', () => {
    const { x, y } = tileToWorldAnchor({ tx: 5, ty: 4 })
    for (const spriteHeight of [16, 24, 32]) {
      expect(x - TILE_SIZE / 2).toBe(5 * TILE_SIZE) // left edge on the tile boundary
      expect(y).toBe((4 + 1) * TILE_SIZE) // base on the floor line
      expect(y - spriteHeight).toBe((4 + 1) * TILE_SIZE - spriteHeight) // overhangs upward
    }
  })

  it('round-trips a tile through world space', () => {
    for (const coord of [
      { tx: 0, ty: 0 },
      { tx: 7, ty: 3 },
      { tx: 14, ty: 9 },
    ]) {
      expect(worldToTile(tileToWorldCenter(coord))).toEqual(coord)
      expect(worldToTile(tileToWorldTopLeft(coord))).toEqual(coord)
    }
  })

  it('floors negative world coordinates away from zero', () => {
    expect(worldToTile({ x: -1, y: -1 })).toEqual({ tx: -1, ty: -1 })
    expect(worldToTile({ x: -TILE_SIZE, y: -TILE_SIZE })).toEqual({ tx: -1, ty: -1 })
  })

  it('exposes a Phaser origin for every anchor convention', () => {
    expect(ANCHOR_ORIGIN['bottom-center']).toEqual({ x: 0.5, y: 1 })
    expect(ANCHOR_ORIGIN['top-left']).toEqual({ x: 0, y: 0 })
    expect(ANCHOR_ORIGIN.center).toEqual({ x: 0.5, y: 0.5 })
  })
})
