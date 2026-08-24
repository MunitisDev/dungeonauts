import { describe, expect, it } from 'vitest'
import { BASE_HEIGHT, BASE_WIDTH, MAX_ZOOM, TILE_SIZE } from '../src/engine/constants'
import { computeViewport } from '../src/engine/scale'

const ROOM = { roomWidth: BASE_WIDTH, roomHeight: BASE_HEIGHT }

const plan = (w: number, h: number, pixelRatio = 1) =>
  computeViewport({ availableWidth: w, availableHeight: h, pixelRatio, ...ROOM })

/**
 * Real devices, with the CSS space left after the chrome and the device-pixel
 * ratio each one actually reports. The ratio is not a detail here: it is what
 * decides how large the room can be drawn.
 */
const DEVICES = [
  { name: 'desktop 1440x900', w: 1440, h: 780, dpr: 1 },
  { name: 'laptop 1280x800', w: 1280, h: 690, dpr: 1 },
  { name: 'small laptop 1024x640', w: 1024, h: 530, dpr: 1 },
  { name: 'macbook retina', w: 1440, h: 780, dpr: 2 },
  { name: 'iPad landscape', w: 1180, h: 700, dpr: 2 },
  { name: 'iPad portrait', w: 820, h: 980, dpr: 2 },
  { name: 'phone landscape', w: 844, h: 300, dpr: 3 },
  { name: 'phone portrait', w: 390, h: 730, dpr: 3 },
  { name: 'small phone portrait', w: 320, h: 540, dpr: 2 },
] as const

describe('responsive viewport', () => {
  /*
   * The rule the whole design now turns on. A child cannot plan a route through
   * a room they can only see part of, and a camera that decides for them is
   * worse on a small screen than on a large one, not better.
   */
  it('shows the whole room on every device, in either orientation', () => {
    for (const d of DEVICES) {
      expect(plan(d.w, d.h, d.dpr).showsWholeRoom, d.name).toBe(true)
      // And rotated: whichever way the device is held, the room still fits.
      const rotated = plan(d.h, d.w, d.dpr)
      expect(rotated.showsWholeRoom, `${d.name} rotated`).toBe(true)
    }
  })

  it('never renders a canvas larger than the space it is given', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.dpr)
      expect(p.width * p.zoom, `${d.name} width`).toBeLessThanOrEqual(d.w)
      expect(p.height * p.zoom, `${d.name} height`).toBeLessThanOrEqual(d.h)
    }
  })

  it('never renders beyond the walls of the room', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.dpr)
      expect(p.width, `${d.name} width`).toBeLessThanOrEqual(ROOM.roomWidth)
      expect(p.height, `${d.name} height`).toBeLessThanOrEqual(ROOM.roomHeight)
    }
  })

  /*
   * `ART_DIRECTION.md` forbids fractional scaling, and this is what keeps that
   * promise: whole *device* pixels per texel. A fractional CSS zoom is fine and
   * often necessary — 5/3 on a three-times screen is five whole pixels — but a
   * texel must never straddle a device pixel.
   */
  it('puts a whole number of device pixels in every texel', () => {
    for (const d of DEVICES) {
      const p = plan(d.w, d.h, d.dpr)
      expect(Number.isInteger(p.devicePixels), d.name).toBe(true)
      expect(p.devicePixels, d.name).toBeGreaterThanOrEqual(1)
      expect(p.zoom * d.dpr, `${d.name} device pixels per texel`).toBeCloseTo(p.devicePixels, 10)
    }
  })

  it('falls back to whole CSS pixels where there is no device scaling', () => {
    for (const d of DEVICES.filter((d) => d.dpr === 1)) {
      expect(Number.isInteger(plan(d.w, d.h, 1).zoom), d.name).toBe(true)
    }
  })

  /*
   * The point of counting in device pixels. On the phone from the bug report a
   * whole-CSS-pixel scale would be 1, drawing a 208px room on a 390px screen
   * and wasting nearly half the width.
   */
  it('uses the screen it has on a high-density phone', () => {
    const p = plan(390, 730, 3)
    expect(p.zoom).toBeGreaterThan(1)
    expect(p.width * p.zoom).toBeGreaterThan(320)
  })

  it('draws tiles at a size a child can see and hit', () => {
    for (const d of DEVICES) {
      const tileCssPx = TILE_SIZE * plan(d.w, d.h, d.dpr).zoom
      expect(tileCssPx, `${d.name}: ${tileCssPx}px tiles`).toBeGreaterThanOrEqual(24)
    }
  })

  it('degrades instead of failing on a viewport narrower than the room', () => {
    const p = plan(120, 90, 1)
    expect(p.zoom).toBeGreaterThanOrEqual(1)
    expect(p.showsWholeRoom).toBe(false)
    expect(p.width).toBeGreaterThan(0)
    expect(p.height).toBeGreaterThan(0)
    expect(p.width * p.zoom).toBeLessThanOrEqual(120)
  })

  it('caps the zoom on a very large display', () => {
    expect(plan(6000, 4000).zoom).toBeLessThanOrEqual(MAX_ZOOM)
    expect(plan(6000, 4000, 2).zoom).toBeLessThanOrEqual(MAX_ZOOM)
  })

  it('ignores a nonsensical device-pixel ratio', () => {
    expect(plan(1280, 690, 0).zoom).toBe(plan(1280, 690, 1).zoom)
    expect(plan(1280, 690, 400).zoom).toBeLessThanOrEqual(MAX_ZOOM)
  })

  it('rejects a nonsensical room size', () => {
    expect(() =>
      computeViewport({ availableWidth: 800, availableHeight: 600, roomWidth: 0, roomHeight: 320 }),
    ).toThrow()
  })
})
