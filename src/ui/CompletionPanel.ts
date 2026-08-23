import type { RunTotals } from '../game/state/GameState'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

export interface CompletionSummary extends RunTotals {
  readonly roomsExplored: number
}

/**
 * End of the dungeon.
 *
 * A short, entirely positive summary: what was earned, and an obvious way to
 * play again. `GAME_DESIGN.md` asks for a small end reward and visible progress
 * rather than a score screen, so there is no grade, no percentage and nothing a
 * child could read as having done badly.
 */
export class CompletionPanel {
  private onReplay?: () => void

  constructor(private readonly root: HTMLElement) {}

  get isOpen(): boolean {
    return !this.root.hidden
  }

  show(summary: CompletionSummary, locale: Locale, onReplay: () => void): void {
    this.onReplay = onReplay
    this.root.textContent = ''

    const title = document.createElement('h2')
    title.className = 'complete-title'
    title.textContent = t(locale, 'complete.title')

    const subtitle = document.createElement('p')
    subtitle.className = 'complete-subtitle'
    subtitle.textContent = t(locale, 'complete.subtitle')

    const stats = document.createElement('dl')
    stats.className = 'complete-stats'
    const rows: ReadonlyArray<[string, number]> = [
      [t(locale, 'complete.stars'), summary.stars],
      [t(locale, 'complete.coins'), summary.coins],
      [t(locale, 'complete.rooms'), summary.roomsExplored],
    ]
    for (const [label, value] of rows) {
      const term = document.createElement('dt')
      term.textContent = label
      const definition = document.createElement('dd')
      definition.textContent = String(value)
      stats.append(term, definition)
    }

    const replay = document.createElement('button')
    replay.type = 'button'
    replay.className = 'complete-replay'
    replay.textContent = t(locale, 'complete.again')
    replay.addEventListener('click', () => {
      this.hide()
      this.onReplay?.()
    })

    this.root.append(title, subtitle, stats, replay)
    this.root.hidden = false
    replay.focus()
  }

  hide(): void {
    this.root.hidden = true
    this.root.textContent = ''
  }
}
