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
export interface TitleActions {
  /** Start a fresh dungeon. */
  readonly onNewGame: () => void
  /** Pick up the saved run. Only offered when there is one. */
  readonly onContinue: () => void
}

export class TitleScreen {
  private readonly heading: HTMLElement
  private readonly tagline: HTMLElement
  private readonly play: HTMLButtonElement
  private readonly newGame: HTMLButtonElement
  private readonly hint: HTMLElement
  /** Row for secondary controls, such as the full-screen toggle. */
  readonly controls: HTMLElement
  /** True while a saved run is being offered, which renames the buttons. */
  private resumable = false

  constructor(
    private readonly root: HTMLElement,
    private readonly settings: Settings,
    private readonly actions: TitleActions,
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
      if (this.resumable) this.actions.onContinue()
      else this.actions.onNewGame()
    })

    // Only shown when there is a run to continue, so the default screen keeps
    // its single obvious button.
    this.newGame = document.createElement('button')
    this.newGame.type = 'button'
    this.newGame.className = 'title-secondary'
    this.newGame.hidden = true
    this.newGame.addEventListener('click', () => {
      this.hide()
      this.actions.onNewGame()
    })

    this.hint = document.createElement('p')
    this.hint.className = 'title-hint'

    this.controls = document.createElement('div')
    this.controls.className = 'title-controls'

    this.root.append(this.heading, this.tagline, this.play, this.newGame, this.controls, this.hint)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  /**
   * Offers to continue a saved run.
   *
   * The primary button becomes "Continue" rather than gaining a third choice:
   * a child returning to the game almost always wants the run they were in, and
   * the biggest button should be the thing they want.
   */
  setResumable(resumable: boolean): void {
    this.resumable = resumable
    this.newGame.hidden = !resumable
    this.refresh()
  }

  refresh(): void {
    const locale: Locale = this.settings.ui
    this.tagline.textContent = t(locale, 'title.tagline')
    this.play.textContent = t(locale, this.resumable ? 'title.continue' : 'title.play')
    this.newGame.textContent = t(locale, 'title.newGame')
    this.hint.textContent = t(locale, 'title.hint')
  }

  /** True when the player has not started yet. */
  get canStart(): boolean {
    return this.isOpen
  }

  show(): void {
    this.root.hidden = false
    this.play.focus()
  }

  hide(): void {
    this.root.hidden = true
  }
}
