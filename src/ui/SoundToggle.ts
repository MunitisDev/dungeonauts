import type { Settings } from '../game/state/Settings'
import { t } from '../i18n/strings'

/**
 * Mute button.
 *
 * Present from the start, and honest about its state in text as well as shape:
 * a child in a classroom, or a parent in the next room, needs an obvious way to
 * turn the music off.
 */
export class SoundToggle {
  private readonly button: HTMLButtonElement

  constructor(
    root: HTMLElement,
    private readonly settings: Settings,
    private readonly onToggle: (enabled: boolean) => void,
  ) {
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'sound-toggle'
    this.button.addEventListener('click', () => {
      this.settings.setSoundEnabled(!this.settings.soundEnabled)
      this.onToggle(this.settings.soundEnabled)
    })
    root.append(this.button)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  refresh(): void {
    const enabled = this.settings.soundEnabled
    const label = t(this.settings.ui, enabled ? 'sound.on' : 'sound.off')
    this.button.setAttribute('aria-pressed', String(enabled))
    this.button.setAttribute('aria-label', label)
    this.button.title = label
    this.button.dataset['enabled'] = String(enabled)
    // Plain words, not a glyph: ART_DIRECTION.md rules out emoji and Unicode
    // symbols as final graphics, there is no approved speaker icon yet, and a
    // child learning to read is better served by the word anyway.
    this.button.textContent = enabled ? 'ON' : 'OFF'
  }
}
