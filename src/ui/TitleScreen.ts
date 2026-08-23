import type { Settings } from '../game/state/Settings'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

/**
 * The first thing a child sees, and the gesture that starts the audio.
 *
 * Browsers refuse to create an audio context without a real user interaction,
 * so the play button is not only a nicety — it is the only legitimate moment to
 * start the music. One large control, nothing else to get wrong.
 */
export class TitleScreen {
  private readonly heading: HTMLElement
  private readonly tagline: HTMLElement
  private readonly play: HTMLButtonElement
  private readonly hint: HTMLElement

  constructor(
    private readonly root: HTMLElement,
    private readonly settings: Settings,
    private readonly onPlay: () => void,
  ) {
    this.heading = document.createElement('h1')
    this.heading.className = 'title-name'
    this.heading.textContent = 'Dungeonauts'

    this.tagline = document.createElement('p')
    this.tagline.className = 'title-tagline'

    this.play = document.createElement('button')
    this.play.type = 'button'
    this.play.className = 'title-play'
    this.play.addEventListener('click', () => {
      this.hide()
      this.onPlay()
    })

    this.hint = document.createElement('p')
    this.hint.className = 'title-hint'

    this.root.append(this.heading, this.tagline, this.play, this.hint)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  refresh(): void {
    const locale: Locale = this.settings.ui
    this.tagline.textContent = t(locale, 'title.tagline')
    this.play.textContent = t(locale, 'title.play')
    this.hint.textContent = t(locale, 'title.hint')
  }

  show(): void {
    this.root.hidden = false
    this.play.focus()
  }

  hide(): void {
    this.root.hidden = true
  }
}
