import type { Settings } from '../game/state/Settings'
import { SUPPORTED_LOCALES, type Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

/**
 * The Spanish/English switch.
 *
 * A pair of radio-like buttons rather than a dropdown: a child should see both
 * options at once and hit either with a finger, not open a menu. Each language
 * is written in its own name too, so it is recognisable whichever way the
 * interface currently reads.
 */
const NATIVE_NAME: Record<Locale, string> = { es: 'ES', en: 'EN' }

export class LocaleSwitch {
  private readonly buttons = new Map<Locale, HTMLButtonElement>()
  private readonly group: HTMLElement

  constructor(
    private readonly root: HTMLElement,
    private readonly settings: Settings,
  ) {
    this.group = document.createElement('div')
    this.group.className = 'locale-switch'
    this.group.setAttribute('role', 'radiogroup')

    for (const locale of SUPPORTED_LOCALES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'locale-option'
      button.setAttribute('role', 'radio')
      button.textContent = NATIVE_NAME[locale]
      button.addEventListener('click', () => this.settings.setLocale(locale))
      this.buttons.set(locale, button)
      this.group.append(button)
    }

    this.root.append(this.group)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  /** Re-labels for the current interface language and marks the active option. */
  refresh(): void {
    const ui = this.settings.ui
    this.group.setAttribute('aria-label', t(ui, 'locale.label'))
    for (const [locale, button] of this.buttons) {
      const active = this.settings.content === locale
      button.setAttribute('aria-checked', String(active))
      button.dataset['active'] = String(active)
      // The accessible name is the full language name in the current interface
      // language; the visible label stays a short code for space.
      button.setAttribute('aria-label', t(ui, locale === 'es' ? 'locale.es' : 'locale.en'))
    }
  }
}
