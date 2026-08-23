import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  cssVariableName,
  hexToInt,
  PALETTE,
  PALETTE_USAGE,
  paletteCssVariables,
} from '../src/theme/palette'

const ART_DIRECTION = readFileSync(
  resolve(import.meta.dirname, '../docs/art/ART_DIRECTION.md'),
  'utf8',
)

/** Rows of the "Core palette" table: `| Name | \`#HEX\` | use |`. */
function documentedPalette(): Map<string, string> {
  const rows = ART_DIRECTION.matchAll(/^\|\s*([A-Za-z ]+?)\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/gm)
  return new Map([...rows].map((row) => [row[1] as string, (row[2] as string).toUpperCase()]))
}

describe('palette', () => {
  it('uses six-digit uppercase hex for every token', () => {
    for (const [token, hex] of Object.entries(PALETTE)) {
      expect(hex, token).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('documents a usage for every token', () => {
    expect(Object.keys(PALETTE_USAGE).sort()).toEqual(Object.keys(PALETTE).sort())
  })

  // Guard rail: the art document is the source of truth, so a colour changed in
  // one place and not the other must fail rather than quietly diverge.
  it('matches the core palette table in ART_DIRECTION.md', () => {
    const documented = documentedPalette()
    expect(documented.size).toBe(Object.keys(PALETTE).length)

    for (const [name, hex] of documented) {
      // "Dungeon Navy" -> "dungeonNavy"
      const token = name
        .split(' ')
        .map((word, index) =>
          index === 0
            ? word.toLowerCase()
            : word[0]?.toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join('')
      expect(PALETTE, `token ${token} (${name})`).toHaveProperty(token)
      expect(PALETTE[token as keyof typeof PALETTE], name).toBe(hex)
    }
  })

  it('converts hex to the integer form Phaser expects', () => {
    expect(hexToInt('#000000')).toBe(0x000000)
    expect(hexToInt('#FFFFFF')).toBe(0xffffff)
    expect(hexToInt(PALETTE.adventureGold)).toBe(0xf1b83b)
  })

  it('rejects malformed colours instead of silently rendering black', () => {
    expect(() => hexToInt('F1B83B')).toThrow()
    expect(() => hexToInt('#FFF')).toThrow()
  })

  it('derives kebab-case CSS variable names', () => {
    expect(cssVariableName('dungeonNavy')).toBe('--du-dungeon-navy')
    expect(cssVariableName('warmCream')).toBe('--du-warm-cream')
  })

  it('exposes every token as a CSS custom property', () => {
    const variables = paletteCssVariables()
    expect(Object.keys(variables)).toHaveLength(Object.keys(PALETTE).length)
    expect(variables['--du-arcane-violet']).toBe('#8C62AE')
  })
})
