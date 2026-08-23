/**
 * Core palette — the single source of truth in code for
 * `docs/art/ART_DIRECTION.md` § Core palette.
 *
 * `tests/palette.test.ts` re-reads that document and fails if the two drift, so
 * changing a colour here without changing the doc (or vice versa) breaks CI.
 *
 * Consumed by both worlds:
 *  - Phaser (canvas) via `hexToInt()`
 *  - DOM (HUD, challenge panel) via the `--du-*` custom properties
 */
export const PALETTE = {
  dungeonNavy: '#071A2B',
  deepTeal: '#163A46',
  stoneMint: '#78A99A',
  dungeonPurple: '#514B69',
  adventureGold: '#F1B83B',
  heroGreen: '#83B74E',
  friendlyCoral: '#ED665A',
  warmCream: '#F4E1B9',
  arcaneViolet: '#8C62AE',
} as const

export type PaletteToken = keyof typeof PALETTE

/** Documented intent for each token, mirrored from ART_DIRECTION.md. */
export const PALETTE_USAGE: Record<PaletteToken, string> = {
  dungeonNavy: 'deepest backgrounds, outlines, shadows',
  deepTeal: 'walls, stone structures',
  stoneMint: 'stone highlights, math/UI accents',
  dungeonPurple: 'floors, secondary shadows',
  adventureGold: 'keys, coins, rewards, interactables',
  heroGreen: 'initial hero, positive states',
  friendlyCoral: 'hearts, damage/warnings',
  warmCream: 'educational panels, readable text areas',
  arcaneViolet: 'language, magic, runes',
}

/** `'#F1B83B'` -> `0xf1b83b`, the numeric form Phaser expects. */
export function hexToInt(hex: string): number {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`)
  return Number.parseInt(match[1] as string, 16)
}

/** Token name -> CSS custom property name, e.g. `dungeonNavy` -> `--du-dungeon-navy`. */
export function cssVariableName(token: string): string {
  return `--du-${token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`
}

export function paletteCssVariables(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PALETTE).map(([token, hex]) => [cssVariableName(token), hex]),
  )
}

/** Publishes the palette to the document so CSS and canvas cannot disagree. */
export function applyPaletteToDocument(root: HTMLElement): void {
  for (const [name, value] of Object.entries(paletteCssVariables())) {
    root.style.setProperty(name, value)
  }
}
