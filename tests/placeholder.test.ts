import { describe, expect, it } from 'vitest'
import { placeholderColors, placeholderHue } from '../src/engine/assets/placeholder'
import { ASSET_MANIFEST } from '../src/engine/assets/assetManifest'
import { TERRAIN_KINDS, TERRAIN_TEXTURE } from '../src/game/world/room'

describe('placeholder colouring', () => {
  it('is deterministic across calls', () => {
    expect(placeholderHue('tile_wall_stone')).toBe(placeholderHue('tile_wall_stone'))
  })

  it('always produces a valid hue', () => {
    for (const spec of ASSET_MANIFEST) {
      const hue = placeholderHue(spec.id)
      expect(Number.isInteger(hue), spec.id).toBe(true)
      expect(hue, spec.id).toBeGreaterThanOrEqual(0)
      expect(hue, spec.id).toBeLessThan(360)
    }
  })

  it('emits two tones of the same hue', () => {
    const { dark, light } = placeholderColors('hero_adventurer_idle')
    const hue = placeholderHue('hero_adventurer_idle')
    expect(dark).toBe(`hsl(${hue}, 55%, 20%)`)
    expect(light).toBe(`hsl(${hue}, 60%, 45%)`)
  })

  /**
   * The point of hashing the hue is that a debug room stays readable. If two
   * terrain kinds ever collide, the room turns into one flat wash — nudge the
   * asset id or the hash rather than deleting this test.
   */
  it('gives every terrain texture a visually distinct hue', () => {
    const hues = TERRAIN_KINDS.map((kind) => placeholderHue(TERRAIN_TEXTURE[kind]))
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const a = hues[i] as number
        const b = hues[j] as number
        const separation = Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
        expect(
          separation,
          `${TERRAIN_KINDS[i]} (${a}) vs ${TERRAIN_KINDS[j]} (${b})`,
        ).toBeGreaterThan(25)
      }
    }
  })
})
