import type { Locale } from './locales'

/**
 * Interface strings.
 *
 * Separate from `content/`: this is the language of the game's chrome, which
 * `EDUCATIONAL_SYSTEM.md` warns may one day differ from the language a child is
 * learning in. Kept as a flat key map so a missing translation is a type error.
 */
const STRINGS = {
  'challenge.math': { es: 'Reto de Matemáticas', en: 'Maths Challenge' },
  'challenge.language': { es: 'Reto de Lengua', en: 'Language Challenge' },
  'feedback.correct': { es: '¡Correcto!', en: 'Correct!' },
  'feedback.retry': { es: 'Casi. Prueba otra vez.', en: 'Almost. Try again.' },
  'feedback.hint': { es: 'Pista:', en: 'Hint:' },
  'prompt.needsKey': { es: 'Necesitas una llave', en: 'You need a key' },
  'event.keyTaken': { es: '¡Has cogido una llave!', en: 'You picked up a key!' },
  'event.slimeHit': { es: '¡Buen golpe!', en: 'Good hit!' },
  'event.slimeDefeated': { es: '¡El slime se retira!', en: 'The slime retreats!' },
  'event.doorUnlocked': { es: '¡La puerta se abre!', en: 'The door opens!' },
  'event.chestOpened': { es: '¡Tesoro!', en: 'Treasure!' },
  'hud.hearts': { es: 'Vidas', en: 'Hearts' },
  'hud.keys': { es: 'Llaves', en: 'Keys' },
  'hud.stars': { es: 'Estrellas', en: 'Stars' },
  'hud.coins': { es: 'Monedas', en: 'Coins' },
} as const satisfies Record<string, Record<Locale, string>>

export type StringKey = keyof typeof STRINGS

export function t(locale: Locale, key: StringKey): string {
  return STRINGS[key][locale]
}

export const ALL_STRING_KEYS = Object.keys(STRINGS) as StringKey[]
