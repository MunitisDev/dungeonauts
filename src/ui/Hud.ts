import type { RunTotals } from '../game/state/GameState'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

/**
 * The permanent HUD: hearts, keys, stars, coins.
 *
 * `ART_DIRECTION.md` asks for a minimal HUD and forbids emoji as final
 * graphics, so each counter is a labelled slot that shows an approved icon once
 * one exists and a plain glyph placeholder until then. Every value carries a
 * visible text label as well as its icon, because `GAME_DESIGN.md` requires
 * that no critical information be conveyed by colour or shape alone.
 */
interface Counter {
  readonly key: 'hearts' | 'keys' | 'stars' | 'coins'
  readonly label: 'hud.hearts' | 'hud.keys' | 'hud.stars' | 'hud.coins'
  readonly placeholder: string
}

const COUNTERS: readonly Counter[] = [
  { key: 'hearts', label: 'hud.hearts', placeholder: 'V' },
  { key: 'keys', label: 'hud.keys', placeholder: 'L' },
  { key: 'stars', label: 'hud.stars', placeholder: 'E' },
  { key: 'coins', label: 'hud.coins', placeholder: 'M' },
]

export class Hud {
  private readonly values = new Map<string, HTMLElement>()

  constructor(
    private readonly root: HTMLElement,
    private locale: Locale,
  ) {
    this.build()
  }

  private build(): void {
    this.root.textContent = ''
    this.values.clear()
    for (const counter of COUNTERS) {
      const slot = document.createElement('div')
      slot.className = 'hud-slot'
      slot.dataset['counter'] = counter.key

      const icon = document.createElement('span')
      icon.className = 'hud-icon'
      icon.dataset['placeholder'] = counter.placeholder
      icon.setAttribute('aria-hidden', 'true')

      const value = document.createElement('span')
      value.className = 'hud-value'
      value.textContent = '0'

      const label = document.createElement('span')
      label.className = 'hud-label'
      label.textContent = t(this.locale, counter.label)

      slot.append(icon, value, label)
      this.root.append(slot)
      this.values.set(counter.key, value)
    }
  }

  setLocale(locale: Locale): void {
    this.locale = locale
    this.build()
  }

  update(totals: RunTotals): void {
    for (const counter of COUNTERS) {
      const node = this.values.get(counter.key)
      if (node) node.textContent = String(totals[counter.key])
    }
    this.root.setAttribute(
      'aria-label',
      COUNTERS.map((c) => `${t(this.locale, c.label)}: ${totals[c.key]}`).join(', '),
    )
  }
}
