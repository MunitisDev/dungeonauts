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
  'locale.label': { es: 'Idioma', en: 'Language' },
  'locale.es': { es: 'Español', en: 'Spanish' },
  'locale.en': { es: 'Inglés', en: 'English' },
  'complete.title': { es: '¡Mazmorra completada!', en: 'Dungeon complete!' },
  'complete.subtitle': {
    es: 'Has resuelto todos los retos y encontrado el tesoro.',
    en: 'You solved every challenge and found the treasure.',
  },
  'complete.again': { es: 'Jugar otra vez', en: 'Play again' },
  'complete.stars': { es: 'Estrellas ganadas', en: 'Stars earned' },
  'complete.coins': { es: 'Monedas', en: 'Coins' },
  'complete.rooms': { es: 'Salas exploradas', en: 'Rooms explored' },
  'title.tagline': {
    es: 'Una aventura de mazmorras con mates y lengua',
    en: 'A dungeon adventure with maths and language',
  },
  'title.play': { es: 'Jugar', en: 'Play' },
  'title.hint': {
    es: 'Toca una casilla para ir hasta ella. También funcionan las flechas del teclado.',
    en: 'Tap a tile to walk there. The arrow keys work too.',
  },
  'sound.on': { es: 'Sonido activado', en: 'Sound on' },
  'sound.off': { es: 'Sonido desactivado', en: 'Sound off' },
  'fullscreen.enter': { es: 'Pantalla completa', en: 'Full screen' },
  'fullscreen.exit': { es: 'Salir de pantalla completa', en: 'Exit full screen' },
  'feedback.timeout': { es: '¡Se acabó el tiempo!', en: "Time's up!" },
  'challenge.timeLeft': { es: 'Tiempo', en: 'Time' },
  'onboarding.title': { es: '¿Quién eres?', en: 'Who are you?' },
  'onboarding.name': { es: 'Tu nombre', en: 'Your name' },
  'onboarding.namePlaceholder': { es: 'Escribe tu nombre', en: 'Type your name' },
  'onboarding.age': { es: 'Tu edad', en: 'Your age' },
  'onboarding.next': { es: 'Siguiente', en: 'Next' },
  'select.title': { es: 'Elige tu Dungeonaut', en: 'Choose your Dungeonaut' },
  'select.start': { es: '¡Comenzar!', en: 'Start!' },
  'select.provisional': { es: 'Sprite provisional', en: 'Placeholder sprite' },
  'character.archer_boy': { es: 'Arquero', en: 'Archer' },
  'character.archer_girl': { es: 'Arquera', en: 'Archer' },
  'character.warrior_boy': { es: 'Guerrero', en: 'Warrior' },
  'character.warrior_girl': { es: 'Guerrera', en: 'Warrior' },
  'character.mage_boy': { es: 'Mago', en: 'Mage' },
  'character.mage_girl': { es: 'Maga', en: 'Mage' },
  'title.continue': { es: 'Continuar', en: 'Continue' },
  'title.newGame': { es: 'Partida nueva', en: 'New game' },
  'save.saved': { es: 'Partida guardada', en: 'Game saved' },
  'gameover.title': { es: '¡Te has quedado sin corazones!', en: 'You ran out of hearts!' },
  'gameover.subtitle': {
    es: 'No pasa nada. Vuelve a intentarlo desde el principio de la mazmorra.',
    en: 'That is fine. Try again from the start of the dungeon.',
  },
  'gameover.retry': { es: 'Volver a intentarlo', en: 'Try again' },
} as const satisfies Record<string, Record<Locale, string>>

export type StringKey = keyof typeof STRINGS

export function t(locale: Locale, key: StringKey): string {
  return STRINGS[key][locale]
}

export const ALL_STRING_KEYS = Object.keys(STRINGS) as StringKey[]
