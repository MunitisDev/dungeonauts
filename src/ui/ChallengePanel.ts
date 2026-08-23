import type { Sfx } from '../audio/sfx'
import { checkAnswer, type Challenge } from '../education'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

/**
 * How a challenge ended.
 *
 * `solved` is the only outcome that changes the world; the game decides what
 * that means. A `timeout` costs a heart and leaves the obstacle standing, so
 * the child can walk back into it and try again.
 */
export type ChallengeOutcome = 'solved' | 'timeout'

export interface ChallengeResolution {
  readonly challenge: Challenge
  readonly outcome: ChallengeOutcome
  /** Wrong answers given before the challenge ended. */
  readonly attempts: number
}

export interface AskOptions {
  readonly locale: Locale
  /** Seconds allowed, scaled by the player's age. */
  readonly seconds: number
  /** Called on each wrong answer and on a timeout, so a heart is lost as it happens. */
  readonly onPenalty?: () => void
}

/**
 * The educational panel, as real DOM rather than canvas text.
 *
 * `ART_DIRECTION.md` says readability beats retro purity here, and DOM is what
 * delivers it: real font scaling, real focus rings, real screen-reader output,
 * and buttons a small finger can hit.
 *
 * The panel knows how to ask, how to check and how to run the clock. It does
 * not know what a correct answer *does* — it resolves with the outcome and the
 * caller decides.
 */
export class ChallengePanel {
  private resolveCurrent: ((resolution: ChallengeResolution) => void) | undefined
  private attempts = 0
  private hintShown = false
  private lastFocused: HTMLElement | null = null
  private deadline = 0
  private ticker: number | undefined
  private bar: HTMLElement | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly announce: (message: string) => void,
    private readonly sfx: Sfx,
  ) {}

  get isOpen(): boolean {
    return !this.root.hidden
  }

  /**
   * Shows a challenge and resolves when it is solved or the clock runs out.
   *
   * A wrong answer never closes the panel: `EDUCATIONAL_SYSTEM.md` asks for
   * neutral feedback, an optional hint and a retry.
   */
  ask(challenge: Challenge, options: AskOptions): Promise<ChallengeResolution> {
    this.attempts = 0
    this.hintShown = false
    this.lastFocused = document.activeElement as HTMLElement | null
    this.render(challenge, options)
    this.root.hidden = false
    this.root.querySelector<HTMLButtonElement>('.challenge-choice')?.focus()
    this.startClock(challenge, options)

    return new Promise((resolve) => {
      this.resolveCurrent = resolve
    })
  }

  private startClock(challenge: Challenge, options: AskOptions): void {
    this.stopClock()
    const total = Math.max(1, options.seconds) * 1000
    this.deadline = Date.now() + total

    const tick = () => {
      const remaining = Math.max(0, this.deadline - Date.now())
      const fraction = remaining / total
      if (this.bar) {
        this.bar.style.width = `${(fraction * 100).toFixed(2)}%`
        // Warm to cool is not enough on its own; the width is the real signal.
        this.bar.dataset['level'] = fraction > 0.5 ? 'calm' : fraction > 0.2 ? 'low' : 'urgent'
      }
      if (remaining > 0) return
      this.stopClock()
      this.sfx.play('wrong')
      options.onPenalty?.()
      this.announce(t(options.locale, 'feedback.timeout'))
      this.close({ challenge, outcome: 'timeout', attempts: this.attempts })
    }
    tick()
    this.ticker = window.setInterval(tick, 100)
  }

  private stopClock(): void {
    if (this.ticker !== undefined) window.clearInterval(this.ticker)
    this.ticker = undefined
  }

  private close(resolution: ChallengeResolution): void {
    this.stopClock()
    this.root.hidden = true
    this.root.textContent = ''
    this.bar = undefined
    this.lastFocused?.focus()
    const resolveCurrent = this.resolveCurrent
    this.resolveCurrent = undefined
    resolveCurrent?.(resolution)
  }

  private render(challenge: Challenge, options: AskOptions): void {
    this.root.textContent = ''
    this.root.dataset['subject'] = challenge.subject
    // Development only, and stripped from production builds: an automated
    // playthrough has to be able to answer correctly, or it burns through the
    // hearts before it reaches the end of the dungeon it is meant to test.
    if (import.meta.env.DEV) this.root.dataset['devAnswer'] = String(challenge.correctAnswer)

    const header = document.createElement('h2')
    header.className = 'challenge-header'
    header.textContent = t(
      options.locale,
      challenge.subject === 'math' ? 'challenge.math' : 'challenge.language',
    )

    // A draining bar rather than a number: a child reads a shrinking bar faster
    // than a countdown, and it does not demand they can read numerals at speed.
    const timer = document.createElement('div')
    timer.className = 'challenge-timer'
    timer.setAttribute('role', 'timer')
    timer.setAttribute('aria-label', t(options.locale, 'challenge.timeLeft'))
    const bar = document.createElement('div')
    bar.className = 'challenge-timer-bar'
    timer.append(bar)
    this.bar = bar

    const prompt = document.createElement('p')
    prompt.className = 'challenge-prompt'
    prompt.textContent = challenge.prompt
    // A reading-comprehension passage cannot be set at the size of "7 + 5 = ?".
    // The panel decides by length rather than by question type, so it never has
    // to know what kinds of question exist.
    prompt.dataset['length'] = challenge.prompt.length > 140 ? 'long' : 'short'

    const choices = document.createElement('div')
    choices.className = 'challenge-choices'
    for (const choice of challenge.choices ?? []) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'challenge-choice'
      button.textContent = choice
      button.addEventListener('click', () => this.answer(challenge, choice, options))
      choices.append(button)
    }

    const feedback = document.createElement('p')
    feedback.className = 'challenge-feedback'
    feedback.hidden = true

    this.root.append(header, timer, prompt, choices, feedback)
  }

  private answer(challenge: Challenge, given: string, options: AskOptions): void {
    if (!this.isOpen) return
    const result = checkAnswer(challenge, given)
    const feedback = this.root.querySelector<HTMLElement>('.challenge-feedback')

    if (result.correct) {
      this.stopClock()
      this.sfx.play('correct')
      this.markChoices(given, true)
      if (feedback) {
        feedback.hidden = false
        feedback.dataset['tone'] = 'correct'
        feedback.textContent = result.explanation ?? t(options.locale, 'feedback.correct')
      }
      this.announce(`${t(options.locale, 'feedback.correct')} ${result.explanation ?? ''}`.trim())
      // A beat to read the explanation before the world reacts.
      window.setTimeout(
        () => this.close({ challenge, outcome: 'solved', attempts: this.attempts }),
        900,
      )
      return
    }

    this.attempts += 1
    this.sfx.play('wrong')
    options.onPenalty?.()
    this.markChoices(given, false)
    if (feedback) {
      feedback.hidden = false
      feedback.dataset['tone'] = 'retry'
      // First miss: encourage. Second: offer the hint, per the scaffolding
      // guidance in EDUCATIONAL_SYSTEM.md.
      const showHint = this.attempts >= 2 && result.hint !== undefined && !this.hintShown
      if (showHint) this.hintShown = true
      feedback.textContent = showHint
        ? `${t(options.locale, 'feedback.hint')} ${result.hint}`
        : t(options.locale, 'feedback.retry')
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
