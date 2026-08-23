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
  it('uses the 32px logical tile from SPRITE_SPEC.md', () => {
    expect(TILE_SIZE).toBe(32)
  })

  it('maps a tile to its top-left pixel', () => {
    expect(tileToWorldTopLeft({ tx: 0, ty: 0 })).toEqual({ x: 0, y: 0 })
    expect(tileToWorldTopLeft({ tx: 3, ty: 2 })).toEqual({ x: 96, y: 64 })
  })

  it('maps a tile to its centre', () => {
    expect(tileToWorldCenter({ tx: 0, ty: 0 })).toEqual({ x: 16, y: 16 })
    expect(tileToWorldCenter({ tx: 3, ty: 2 })).toEqual({ x: 112, y: 80 })
  })

  // The convention that lets a 32x40 hero and a 32x48 door share one grid.
  it('anchors entities on the floor line of their tile', () => {
    expect(tileToWorldAnchor({ tx: 0, ty: 0 })).toEqual({ x: 16, y: 32 })
    expect(tileToWorldAnchor({ tx: 3, ty: 2 })).toEqual({ x: 112, y: 96 })
  })

  it('keeps a bottom-center sprite inside its tile horizontally, however tall', () => {
    const { x, y } = tileToWorldAnchor({ tx: 5, ty: 4 })
    for (const spriteHeight of [32, 40, 48]) {
      expect(x - 32 / 2).toBe(5 * TILE_SIZE) // left edge on the tile boundary
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
    expect(worldToTile({ x: -32, y: -32 })).toEqual({ tx: -1, ty: -1 })
  })

  it('exposes a Phaser origin for every anchor convention', () => {
    expect(ANCHOR_ORIGIN['bottom-center']).toEqual({ x: 0.5, y: 1 })
    expect(ANCHOR_ORIGIN['top-left']).toEqual({ x: 0, y: 0 })
    expect(ANCHOR_ORIGIN.center).toEqual({ x: 0.5, y: 0.5 })
  })
})
