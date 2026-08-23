import { defaultLocaleSettings, isLocale, type Locale, type LocaleSettings } from '../../i18n/locales'

const STORAGE_KEY = 'dungeonauts.settings.v1'

/**
 * Player settings, persisted per browser.
 *
 * Interface language and content language are kept apart deliberately:
 * `EDUCATIONAL_SYSTEM.md` warns against assuming a child always learns in the
 * language the menus are in. The switch in the HUD changes both together, which
 * is what anyone actually wants today, but the model does not foreclose a
 * Spanish-speaking child practising English later.
 */
export class Settings {
  private current: LocaleSettings
  private readonly listeners = new Set<(locales: LocaleSettings) => void>()

  constructor(initial: LocaleSettings = loadStored() ?? defaultLocaleSettings()) {
    this.current = initial
  }

  get locales(): LocaleSettings {
    return this.current
  }

  get ui(): Locale {
    return this.current.ui
  }

  get content(): Locale {
    return this.current.content
  }

  /** Switches both languages at once — what the HUD toggle does. */
  setLocale(locale: Locale): void {
    this.apply({ ui: locale, content: locale })
  }

  setUiLocale(locale: Locale): void {
    this.apply({ ...this.current, ui: locale })
  }

  setContentLocale(locale: Locale): void {
    this.apply({ ...this.current, content: locale })
  }

  private apply(next: LocaleSettings): void {
    if (next.ui === this.current.ui && next.content === this.current.content) return
    this.current = next
    persist(next)
    for (const listener of this.listeners) listener(next)
  }

  /** Subscribes to changes. Returns an unsubscribe function. */
  onChange(listener: (locales: LocaleSettings) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

function loadStored(): LocaleSettings | undefined {
  // Storage can throw outright in a private window or with site data blocked,
  // and a missing preference must never stop the game loading.
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!isLocale(parsed['ui']) || !isLocale(parsed['content'])) return undefined
    return { ui: parsed['ui'], content: parsed['content'] }
  } catch {
    return undefined
  }
}

function persist(locales: LocaleSettings): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(locales))
  } catch {
    // A child who cannot save a preference should still be able to play.
  }
}
