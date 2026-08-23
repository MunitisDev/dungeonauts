import type { RunTotals } from '../game/state/GameState'
import type { LevelProgress } from '../game/state/Progression'
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
  /**
   * The counters live in their own container.
   *
   * Rebuilding on a language change used to clear the whole HUD element, which
   * also removed the language switch sitting beside it — leaving no way to
   * switch back.
   */
  private readonly counters: HTMLElement
  /** The player's chosen name, shown so the run is visibly theirs. */
  private readonly playerName: HTMLElement
  /** Level chip and the bar filling towards the next one. */
  private readonly levelChip: HTMLElement
  private readonly levelValue: HTMLElement
  private readonly xpBar: HTMLElement
  private lastProgress: LevelProgress | undefined
  private lastTotals: RunTotals = { hearts: 0, keys: 0, stars: 0, coins: 0 }

  constructor(
    private readonly root: HTMLElement,
    private locale: Locale,
  ) {
    this.playerName = document.createElement('span')
    this.playerName.className = 'hud-player'
    this.playerName.hidden = true

    this.levelChip = document.createElement('div')
    this.levelChip.className = 'hud-level'
    this.levelChip.hidden = true
    this.levelValue = document.createElement('span')
    this.levelValue.className = 'hud-level-value'
    const track = document.createElement('span')
    track.className = 'hud-xp'
    this.xpBar = document.createElement('span')
    this.xpBar.className = 'hud-xp-fill'
    track.append(this.xpBar)
    this.levelChip.append(this.levelValue, track)

    this.counters = document.createElement('div')
    this.counters.className = 'hud-counters'
    this.root.append(this.playerName, this.levelChip, this.counters)
    this.build()
  }

  private build(): void {
    this.counters.textContent = ''
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
      this.counters.append(slot)
      this.values.set(counter.key, value)
    }
  }

  /** Names the player in the HUD. An empty name simply hides the slot. */
  setPlayer(name: string): void {
    this.playerName.textContent = name
    this.playerName.hidden = name === ''
  }

  /**
   * Shows the level and how far into it the player is.
   *
   * The number and the bar together: the number is what a child tells someone
   * else, the bar is what tells them the next question is worth answering.
   */
  setProgress(progress: LevelProgress): void {
    this.lastProgress = progress
    this.levelChip.hidden = false
    this.levelValue.textContent = `${t(this.locale, 'hud.level')} ${progress.level}`
    this.xpBar.style.width = `${Math.round(progress.fraction * 100)}%`
    this.levelChip.setAttribute(
      'aria-label',
      progress.needed === 0
        ? `${t(this.locale, 'hud.level')} ${progress.level}`
        : `${t(this.locale, 'hud.level')} ${progress.level}, ${progress.into}/${progress.needed}`,
    )
  }

  setLocale(locale: Locale): void {
    this.locale = locale
    this.build()
    // Rebuilding resets the displayed numbers, so put them back.
    this.update(this.lastTotals)
    if (this.lastProgress) this.setProgress(this.lastProgress)
  }

  update(totals: RunTotals): void {
    this.lastTotals = totals
    for (const counter of COUNTERS) {
      const node = this.values.get(counter.key)
      if (node) node.textContent = String(totals[counter.key])
    }
    this.counters.setAttribute(
      'aria-label',
      COUNTERS.map((c) => `${t(this.locale, c.label)}: ${totals[c.key]}`).join(', '),
    )
  }
}
