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
  ) {}

  show(message: string): void {
    const toast = document.createElement('div')
    toast.className = 'feedback-toast'
    toast.textContent = message
    this.root.textContent = ''
    this.root.append(toast)
    this.announce(message)

    const remove = () => toast.remove()
    toast.addEventListener('animationend', remove, { once: true })
    // Animations do not run under prefers-reduced-motion, so clear it anyway.
    window.setTimeout(remove, 1800)
  }
}
