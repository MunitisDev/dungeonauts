/**
 * What a message says the player just gained, if anything.
 *
 * Counted rather than written out, because the toast shows each one as its own
 * icon — the same icon the bar counts it with. It used to write `+3\u00a4`, and
 * a currency sign is not a coin to anyone, least of all a six-year-old.
 * `CLAUDE.md` rules out Unicode as final graphics for exactly this reason.
 */
export interface Gains {
  readonly coins?: number
  readonly stars?: number
  readonly hearts?: number
  readonly keys?: number
}

const COUNTERS = ['hearts', 'keys', 'stars', 'coins'] as const

/** Reads the gains out loud, for the screen-reader announcement. */
function spell(gains: Gains, name: (counter: string) => string): string {
  return COUNTERS.filter((c) => (gains[c] ?? 0) > 0)
    .map((c) => `+${String(gains[c])} ${name(c)}`)
    .join(', ')
}

/**
 * Short, transient messages for things that happen in the world: a key taken,
 * a door opening, treasure found.
 *
 * Kept brief and positive. `GAME_DESIGN.md` asks for immediate, satisfying
 * acknowledgement of success and rules out anything that reads as punishment.
 */
export class Feedback {
  constructor(
    private readonly root: HTMLElement,
    private readonly announce: (message: string) => void,
    /** Names the counters for the announcement, in the player's language. */
    private readonly nameOf: (counter: string) => string = (counter) => counter,
  ) {}

  show(message: string, gains?: Gains): void {
    const toast = document.createElement('div')
    toast.className = 'feedback-toast'

    const text = document.createElement('span')
    text.textContent = message
    toast.append(text)

    for (const counter of COUNTERS) {
      const amount = gains?.[counter] ?? 0
      if (amount <= 0) continue
      const gain = document.createElement('span')
      gain.className = 'feedback-gain'
      gain.dataset['counter'] = counter
      gain.textContent = `+${String(amount)}`
      gain.setAttribute('aria-hidden', 'true')
      toast.append(gain)
    }

    this.root.textContent = ''
    this.root.append(toast)
    const spoken = gains ? spell(gains, this.nameOf) : ''
    this.announce(spoken ? `${message} ${spoken}` : message)

    const remove = () => toast.remove()
    toast.addEventListener('animationend', remove, { once: true })
    // Animations do not run under prefers-reduced-motion, so clear it anyway.
    window.setTimeout(remove, 1800)
  }
}
