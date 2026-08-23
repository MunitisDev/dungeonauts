import type { CharacterId } from '../../engine/assets/assetManifest'

export interface HeroSheets {
  readonly idle: string
  readonly walk: string
}

/**
 * Gameplay sheets that actually exist.
 *
 * Only the warrior boy has approved production art so far. The rest of the
 * roster exists as portraits — UI art — and their 32x40 sheets are still to be
 * produced, so nothing here invents them.
 */
const APPROVED: Partial<Record<CharacterId, HeroSheets>> = {
  warrior_boy: { idle: 'hero_warrior_boy_idle', walk: 'hero_warrior_boy_walk' },
}

/** The character whose art stands in until the rest of the roster arrives. */
export const STAND_IN: CharacterId = 'warrior_boy'

/** True when this character has its own approved gameplay sheets. */
export function hasOwnSprites(character: CharacterId): boolean {
  return APPROVED[character] !== undefined
}

/**
 * Sheets to animate for a character.
 *
 * A character without its own art borrows the one approved set rather than
 * rendering as a magenta placeholder: the placeholder is the right answer for
 * a missing prop, but a hero the child cannot see is not a playable game. The
 * substitution is called out on the character-select screen, so it is visible
 * rather than silent.
 */
export function heroSheets(character: CharacterId): HeroSheets {
  return APPROVED[character] ?? (APPROVED[STAND_IN] as HeroSheets)
}
