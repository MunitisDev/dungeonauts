import type { Settings } from '../game/state/Settings'
import { t } from '../i18n/strings'

/**
 * Full-screen toggle.
 *
 * Requests full screen on the whole frame rather than the canvas alone, so the
 * HUD goes with it — a full-screen game that loses its heart and key counters
 * is worse than a windowed one.
 *
 * The API needs a user gesture and is refused outright by iOS Safari on iPhone,
 * so the button hides itself where it cannot work rather than sitting there
 * doing nothing.
 */
export class FullscreenButton {
  private readonly button: HTMLButtonElement

  constructor(
    root: HTMLElement,
    private readonly target: HTMLElement,
    private readonly settings: Settings,
  ) {
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'fullscreen-button'
    this.button.addEventListener('click', () => void this.toggle())
    root.append(this.button)

    if (!FullscreenButton.isSupported(target)) this.button.hidden = true

    document.addEventListener('fullscreenchange', () => this.refresh())
    this.settings.onChange(() => this.refresh())
    this.refresh()
  }

  static isSupported(target: HTMLElement): boolean {
    return typeof target.requestFullscreen === 'function' && document.fullscreenEnabled
  }

  private get isFullscreen(): boolean {
    // Coerced rather than compared to null: the property is absent, not null,
    // where the API is unimplemented, and `undefined !== null` would report
    // full screen when there is none.
    return Boolean(document.fullscreenElement)
  }

  private async toggle(): Promise<void> {
    try {
      if (this.isFullscreen) await document.exitFullscreen()
      else await this.target.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      // A refusal is not an error worth surfacing: the game is fully playable
      // windowed, and the browser has already told the user why.
    }
    this.refresh()
  }

  private refresh(): void {
    const label = t(this.settings.ui, this.isFullscreen ? 'fullscreen.exit' : 'fullscreen.enter')
    this.button.textContent = label
    this.button.setAttribute('aria-pressed', String(this.isFullscreen))
    this.button.setAttribute('aria-label', label)
  }
}
