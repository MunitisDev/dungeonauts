import type { Settings } from '../game/state/Settings'
import { clampAge, DEFAULT_AGE, MAX_AGE, MAX_NAME_LENGTH, MIN_AGE, sanitiseName } from '../game/state/Profile'
import { t } from '../i18n/strings'

export interface Introduction {
  readonly name: string
  readonly age: number
}

/**
 * Name and age, asked once.
 *
 * The age is the only thing here the game actually needs: it sets the starting
 * difficulty and how long the child gets to answer. It is asked as a row of
 * large buttons rather than a number field because a six-year-old should not
 * have to operate a spinner, and because the answer is one of eight.
 *
 * The name never leaves the browser. It exists so the game can greet a child by
 * the name they chose, which is worth more at this age than it sounds.
 */
export class OnboardingPanel {
  private readonly heading: HTMLElement
  private readonly nameLabel: HTMLLabelElement
  private readonly nameInput: HTMLInputElement
  private readonly ageLabel: HTMLElement
  private readonly ageButtons: HTMLButtonElement[] = []
  private readonly next: HTMLButtonElement
  private age = DEFAULT_AGE
  private onDone: ((introduction: Introduction) => void) | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly settings: Settings,
  ) {
    this.root.classList.add('setup-screen')
    this.root.hidden = true

    this.heading = document.createElement('h2')
    this.heading.className = 'setup-title'

    this.nameLabel = document.createElement('label')
    this.nameLabel.className = 'setup-field'

    this.nameInput = document.createElement('input')
    this.nameInput.type = 'text'
    this.nameInput.className = 'setup-input'
    this.nameInput.maxLength = MAX_NAME_LENGTH
    this.nameInput.autocomplete = 'off'
    this.nameInput.spellcheck = false
    this.nameInput.addEventListener('input', () => this.refreshNext())
    this.nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !this.next.disabled) this.submit()
    })

    this.ageLabel = document.createElement('p')
    this.ageLabel.className = 'setup-legend'

    const ages = document.createElement('div')
    ages.className = 'setup-ages'
    ages.setAttribute('role', 'group')
    for (let age = MIN_AGE; age <= MAX_AGE; age++) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'setup-age'
      button.textContent = String(age)
      button.dataset['age'] = String(age)
      button.addEventListener('click', () => this.setAge(age))
      ages.append(button)
      this.ageButtons.push(button)
    }

    this.next = document.createElement('button')
    this.next.type = 'button'
    this.next.className = 'setup-next'
    this.next.addEventListener('click', () => this.submit())

    this.nameLabel.append(this.nameInput)
    this.root.append(this.heading, this.nameLabel, this.ageLabel, ages, this.next)

    this.setAge(DEFAULT_AGE)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  /** Opens the panel, pre-filled with whatever is known already. */
  open(known: Partial<Introduction>, onDone: (introduction: Introduction) => void): void {
    this.onDone = onDone
    this.nameInput.value = known.name ?? ''
    this.setAge(known.age ?? DEFAULT_AGE)
    this.refresh()
    this.root.hidden = false
    this.nameInput.focus()
  }

  hide(): void {
    this.root.hidden = true
  }

  private setAge(age: number): void {
    this.age = clampAge(age)
    for (const button of this.ageButtons) {
      const selected = Number(button.dataset['age']) === this.age
      button.dataset['selected'] = String(selected)
      button.setAttribute('aria-pressed', String(selected))
    }
  }

  private submit(): void {
    const name = sanitiseName(this.nameInput.value)
    if (!name) {
      this.nameInput.focus()
      return
    }
    this.hide()
    this.onDone?.({ name, age: this.age })
  }

  /** The button stays disabled rather than erroring: nothing to read, nothing to fix. */
  private refreshNext(): void {
    this.next.disabled = sanitiseName(this.nameInput.value) === ''
  }

  private refresh(): void {
    const locale = this.settings.ui
    this.heading.textContent = t(locale, 'onboarding.title')
    this.nameLabel.prepend(labelText(this.nameLabel, t(locale, 'onboarding.name')))
    this.nameInput.placeholder = t(locale, 'onboarding.namePlaceholder')
    this.ageLabel.textContent = t(locale, 'onboarding.age')
    this.next.textContent = t(locale, 'onboarding.next')
    this.refreshNext()
  }
}

/** Reuses the label's own text node, so re-rendering never stacks copies. */
function labelText(label: HTMLLabelElement, text: string): Node {
  const existing = label.querySelector<HTMLElement>('.setup-field-label')
  const node = existing ?? document.createElement('span')
  node.className = 'setup-field-label'
  node.textContent = text
  return node
}
