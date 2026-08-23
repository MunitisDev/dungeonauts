/**
 * Locale primitives. The full string catalogue arrives with the HUD (task 5);
 * this module exists now because room data is already localised.
 *
 * `docs/game/EDUCATIONAL_SYSTEM.md` warns against assuming the interface locale
 * and the learning-content locale are always the same, so they are modelled as
 * two independent settings from the start.
 */
export const SUPPORTED_LOCALES = ['es', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'es'

/** A string authored in every supported locale. */
export type LocalizedText = Record<Locale, string>

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export interface LocaleSettings {
  /** Language of menus, HUD and buttons. */
  readonly ui: Locale
  /** Language the educational content is drawn from. */
  readonly content: Locale
}

export function defaultLocaleSettings(): LocaleSettings {
  return { ui: DEFAULT_LOCALE, content: DEFAULT_LOCALE }
}
