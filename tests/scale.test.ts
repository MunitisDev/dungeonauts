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
