import { checkAnswer, type Challenge, type CheckResult } from '../education'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

/**
 * The educational panel, as real DOM rather than canvas text.
 *
 * `ART_DIRECTION.md` says readability beats retro purity here, and DOM is what
 * delivers that: real font scaling, real focus rings, real screen-reader
 * output, and buttons a small finger can actually hit. It is styled with the
 * approved palette so it still belongs to the game.
 *
 * The panel knows how to ask and how to check. It does not know what a correct
 * answer *does* — it resolves with the result and the caller decides.
 */
export interface ChallengeResolution {
  readonly challenge: Challenge
  readonly result: CheckResult
  /** Wrong answers given before getting it right. */
  readonly attempts: number
}

export class ChallengePanel {
  private resolveCurrent: ((resolution: ChallengeResolution) => void) | undefined
  private attempts = 0
  private hintShown = false
  private lastFocused: HTMLElement | null = null

  constructor(
    private readonly root: HTMLElement,
    private readonly announce: (message: string) => void,
  ) {}

  get isOpen(): boolean {
    return !this.root.hidden
  }

  /**
   * Shows a challenge and resolves once the player gets it right.
   *
   * A wrong answer never closes the panel: `EDUCATIONAL_SYSTEM.md` asks for
   * neutral feedback, an optional hint and a retry, so the only way out is
   * understanding it.
   */
  ask(challenge: Challenge, locale: Locale): Promise<ChallengeResolution> {
    this.attempts = 0
    this.hintShown = false
    this.lastFocused = document.activeElement as HTMLElement | null
    this.render(challenge, locale)
    this.root.hidden = false
    this.root.querySelector<HTMLButtonElement>('.challenge-choice')?.focus()

    return new Promise((resolve) => {
      this.resolveCurrent = resolve
    })
  }

  private close(resolution: ChallengeResolution): void {
    this.root.hidden = true
    this.root.textContent = ''
    this.lastFocused?.focus()
    const resolveCurrent = this.resolveCurrent
    this.resolveCurrent = undefined
    resolveCurrent?.(resolution)
  }

  private render(challenge: Challenge, locale: Locale): void {
    this.root.textContent = ''
    this.root.dataset['subject'] = challenge.subject

    const header = document.createElement('h2')
    header.className = 'challenge-header'
    header.textContent = t(locale, challenge.subject === 'math' ? 'challenge.math' : 'challenge.language')
    this.root.append(header)

    const prompt = document.createElement('p')
    prompt.className = 'challenge-prompt'
    prompt.textContent = challenge.prompt
    this.root.append(prompt)

    const choices = document.createElement('div')
    choices.className = 'challenge-choices'
    for (const choice of challenge.choices ?? []) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'challenge-choice'
      button.textContent = choice
      button.addEventListener('click', () => this.answer(challenge, choice, locale))
      choices.append(button)
    }
    this.root.append(choices)

    const feedback = document.createElement('p')
    feedback.className = 'challenge-feedback'
    feedback.hidden = true
    this.root.append(feedback)
  }

  private answer(challenge: Challenge, given: string, locale: Locale): void {
    const result = checkAnswer(challenge, given)
    const feedback = this.root.querySelector<HTMLElement>('.challenge-feedback')

    if (result.correct) {
      this.markChoices(given, true)
      if (feedback) {
        feedback.hidden = false
        feedback.dataset['tone'] = 'correct'
        feedback.textContent = result.explanation ?? t(locale, 'feedback.correct')
      }
      this.announce(`${t(locale, 'feedback.correct')} ${result.explanation ?? ''}`.trim())
      // A beat to read the explanation before the world reacts.
      window.setTimeout(() => this.close({ challenge, result, attempts: this.attempts }), 900)
      return
    }

    this.attempts += 1
    this.markChoices(given, false)
    if (feedback) {
      feedback.hidden = false
      feedback.dataset['tone'] = 'retry'
      // First miss: encourage. Second: offer the hint, per the scaffolding
      // guidance in EDUCATIONAL_SYSTEM.md.
      const showHint = this.attempts >= 2 && result.hint !== undefined && !this.hintShown
      if (showHint) this.hintShown = true
      feedback.textContent = showHint
        ? `${t(locale, 'feedback.hint')} ${result.hint}`
        : t(locale, 'feedback.retry')
    }
    this.announce(feedback?.textContent ?? '')
  }

  /** Marks the chosen button, leaving the others usable for a retry. */
  private markChoices(given: string, correct: boolean): void {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.challenge-choice')) {
      if (button.textContent !== given) continue
      button.dataset['state'] = correct ? 'correct' : 'wrong'
      button.disabled = correct
      if (!correct) {
        // Re-triggerable nudge, respecting reduced-motion via CSS.
        button.classList.remove('is-nudged')
        void button.offsetWidth
        button.classList.add('is-nudged')
      }
    }
    if (correct) {
      for (const button of this.root.querySelectorAll<HTMLButtonElement>('.challenge-choice')) {
        button.disabled = true
      }
    }
  }
}
