import { describe, expect, it } from 'vitest'
import { BASE_HEIGHT, BASE_WIDTH, MAX_ZOOM } from '../src/engine/constants'
import { computeIntegerZoom } from '../src/engine/scale'

const zoom = (w: number, h: number) => computeIntegerZoom(w, h, BASE_WIDTH, BASE_HEIGHT)

describe('integer zoom', () => {
  it('never returns a fractional scale', () => {
    for (let width = 320; width <= 3840; width += 37) {
      const value = zoom(width, Math.round(width * 0.6))
      expect(Number.isInteger(value), `viewport ${width}`).toBe(true)
    }
  })

  it('picks the largest whole scale that still fits', () => {
    expect(zoom(BASE_WIDTH, BASE_HEIGHT)).toBe(1)
    expect(zoom(BASE_WIDTH * 2, BASE_HEIGHT * 2)).toBe(2)
    // Just short of 3x in height, so 2x is the honest answer.
    expect(zoom(BASE_WIDTH * 3, BASE_HEIGHT * 3 - 1)).toBe(2)
  })

  it('is limited by the tighter of the two axes', () => {
    expect(zoom(BASE_WIDTH * 4, BASE_HEIGHT * 2)).toBe(2)
    expect(zoom(BASE_WIDTH * 2, BASE_HEIGHT * 4)).toBe(2)
  })

  it('clamps to at least 1 so a small viewport crops instead of blurring', () => {
    expect(zoom(320, 200)).toBe(1)
    expect(zoom(1, 1)).toBe(1)
  })

  it('caps the zoom on very large displays', () => {
    expect(zoom(BASE_WIDTH * 40, BASE_HEIGHT * 40)).toBe(MAX_ZOOM)
  })

  it('rejects a nonsensical base resolution', () => {
    expect(() => computeIntegerZoom(1920, 1080, 0, 320)).toThrow()
  })
})

import { computeViewport } from '../src/engine/scale'
import { MIN_TOUCH_TILE_PX, MIN_VISIBLE_TILES, TILE_SIZE } from '../src/engine/constants'

/** The shipped rooms are all 15x10 tiles. */
const ROOM = { roomWidth: 15 * TILE_SIZE, roomHeight: 10 * TILE_SIZE }

const plan = (w: number, h: number, coarse = false) =>
  computeViewport({ availableWidth: w, availableHeight: h, coarsePointer: coarse, ...ROOM })

/** Real CSS viewport sizes, which is what the layout actually has to survive. */
const DEVICES = [
  { name: 'desktop 1440x900', w: 1440, h: 820, coarse: false },
  { name: 'laptop 1280x800', w: 1280, h: 720, coarse: false },
  { name: 'small laptop 1024x640', w: 1024, h: 560, coarse: false },
  { name: 'iPad landscape', w: 1180, h: 720, coarse: true },
  { name: 'iPad portrait', w: 820, h: 1000, coarse: true },
  { name: 'phone landscape', w: 844, h: 330, coarse: true },
  { name: 'phone portrait', w: 390, h: 700, coarse: true },
  { name: 'small phone portrait', w: 320, h: 560, coarse: true },
] as const

describe('responsive viewport', () => {
  it('always chooses a whole-number zoom', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.coarse)
      expect(Number.isInteger(p.zoom), d.name).toBe(true)
      expect(p.zoom, d.name).toBeGreaterThanOrEqual(1)
    }
  })

  it('never renders a canvas larger than the space it is given', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.coarse)
      expect(p.width * p.zoom, `${d.name} width`).toBeLessThanOrEqual(d.w)
      expect(p.height * p.zoom, `${d.name} height`).toBeLessThanOrEqual(d.h)
    }
  })

  it('never renders beyond the walls of the room', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.coarse)
      expect(p.width, `${d.name} width`).toBeLessThanOrEqual(ROOM.roomWidth)
      expect(p.height, `${d.name} height`).toBeLessThanOrEqual(ROOM.roomHeight)
    }
  })

  it('shows the whole room on a desktop', () => {
    for (const d of DEVICES.filter((d) => !d.coarse)) {
      expect(plan(d.w, d.h).showsWholeRoom, d.name).toBe(true)
    }
  })

  /**
   * The rule that drives the whole design: tapping a tile is how the game is
   * played, so a tile is a touch target and the 44px guidance applies to it.
   */
  it('keeps tiles tappable on every touch device', () => {
    for (const d of DEVICES.filter((d) => d.coarse)) {
      const tileCssPx = TILE_SIZE * plan(d.w, d.h, true).zoom
      expect(tileCssPx, `${d.name}: tiles would be ${tileCssPx}px`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TILE_PX,
      )
    }
  })

  it('keeps enough of the room in view to navigate by', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.coarse)
      const tilesWide = p.width / TILE_SIZE
      const tilesHigh = p.height / TILE_SIZE
      // Either the whole room fits, or at least the minimum is visible.
      expect(tilesWide >= Math.min(MIN_VISIBLE_TILES, 15), `${d.name} width`).toBe(true)
      expect(tilesHigh >= Math.min(MIN_VISIBLE_TILES, 10), `${d.name} height`).toBe(true)
    }
  })

  it('scrolls rather than shrinking on a phone', () => {
    // A 15-tile room cannot fit a phone at a tappable size, so it must scroll.
    expect(plan(390, 700, true).showsWholeRoom).toBe(false)
    expect(plan(844, 330, true).showsWholeRoom).toBe(false)
  })

  it('works in both orientations of the same device', () => {
    for (const [w, h] of [
      [390, 700],
      [844, 330],
      [820, 1000],
      [1180, 720],
    ] as const) {
      const portrait = plan(Math.min(w, h), Math.max(w, h), true)
      const landscape = plan(Math.max(w, h), Math.min(w, h), true)
      for (const [label, p] of [['portrait', portrait], ['landscape', landscape]] as const) {
        expect(p.width, `${w}x${h} ${label}`).toBeGreaterThan(0)
        expect(p.height, `${w}x${h} ${label}`).toBeGreaterThan(0)
        expect(TILE_SIZE * p.zoom, `${w}x${h} ${label} tile size`).toBeGreaterThanOrEqual(
          MIN_TOUCH_TILE_PX,
        )
      }
    }
  })

  it('degrades instead of failing on an absurdly small viewport', () => {
    const p = plan(120, 90, true)
    expect(p.zoom).toBeGreaterThanOrEqual(1)
    expect(p.width).toBeGreaterThan(0)
    expect(p.height).toBeGreaterThan(0)
    expect(p.width * p.zoom).toBeLessThanOrEqual(120)
  })

  it('caps the zoom on a very large display', () => {
    expect(plan(6000, 4000).zoom).toBeLessThanOrEqual(6)
  })

  it('rejects a nonsensical room size', () => {
    expect(() =>
      computeViewport({ availableWidth: 800, availableHeight: 600, roomWidth: 0, roomHeight: 320, coarsePointer: false }),
    ).toThrow()
  })
})
