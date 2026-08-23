// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengePanel } from '../src/ui/ChallengePanel'
import type { Sfx } from '../src/audio/sfx'
import type { Challenge } from '../src/education'
import { ALL_STRING_KEYS, t } from '../src/i18n/strings'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'

const challenge: Challenge = {
  id: 'es.math.addition.001',
  locale: 'es',
  subject: 'math',
  skill: 'addition',
  difficulty: 1,
  prompt: '3 + 2 = ?',
  interactionType: 'multiple_choice',
  choices: ['4', '5', '6', '7'],
  correctAnswer: '5',
  hint: 'Empieza en el 3 y cuenta dos más.',
  explanation: '3 y 2 más son 5.',
}

let root: HTMLElement
let announced: string[]
let sounds: string[]
let panel: ChallengePanel

const choices = () => [...root.querySelectorAll<HTMLButtonElement>('.challenge-choice')]
const choice = (label: string) => choices().find((b) => b.textContent === label) as HTMLButtonElement
const feedbackText = () => root.querySelector('.challenge-feedback')?.textContent ?? ''

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = '<section id="challenge-root" hidden></section>'
  root = document.getElementById('challenge-root') as HTMLElement
  announced = []
  sounds = []
  // A stub, not the real engine: jsdom has no Web Audio, and what matters here
  // is which sound is asked for, not how it is synthesised.
  const sfx = { play: (name: string) => sounds.push(name) } as unknown as Sfx
  panel = new ChallengePanel(root, (m) => announced.push(m), sfx)
})

describe('interface strings', () => {
  it('translates every key into every locale', () => {
    for (const key of ALL_STRING_KEYS) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(t(locale, key), `${key}/${locale}`).toBeTruthy()
      }
    }
  })
})

describe('ChallengePanel', () => {
  it('opens with the prompt and one button per choice', () => {
    void panel.ask(challenge, 'es')
    expect(panel.isOpen).toBe(true)
    expect(root.querySelector('.challenge-prompt')?.textContent).toBe('3 + 2 = ?')
    expect(choices().map((b) => b.textContent)).toEqual(['4', '5', '6', '7'])
  })

  it('labels the subject so it is never colour alone', () => {
    void panel.ask(challenge, 'es')
    expect(root.querySelector('.challenge-header')?.textContent).toBe('Reto de Matemáticas')
    expect(root.dataset['subject']).toBe('math')
  })

  it('renders in the requested locale', () => {
    void panel.ask({ ...challenge, locale: 'en' }, 'en')
    expect(root.querySelector('.challenge-header')?.textContent).toBe('Maths Challenge')
  })

  it('resolves with a correct result once the right answer is picked', async () => {
    const pending = panel.ask(challenge, 'es')
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    const resolution = await pending
    expect(resolution.result.correct).toBe(true)
    expect(resolution.attempts).toBe(0)
    expect(panel.isOpen).toBe(false)
  })

  it('shows the explanation on success', () => {
    void panel.ask(challenge, 'es')
    choice('5').click()
    expect(feedbackText()).toBe('3 y 2 más son 5.')
    expect(announced.join(' ')).toContain('3 y 2 más son 5.')
  })

  // Failure must never end the attempt: EDUCATIONAL_SYSTEM.md asks for neutral
  // feedback, an optional hint and a retry, never a lockout.
  it('keeps the panel open after a wrong answer', () => {
    void panel.ask(challenge, 'es')
    choice('4').click()
    expect(panel.isOpen).toBe(true)
    expect(feedbackText()).toBe('Casi. Prueba otra vez.')
  })

  it('leaves the other choices usable after a miss', () => {
    void panel.ask(challenge, 'es')
    choice('4').click()
    expect(choice('5').disabled).toBe(false)
    expect(choice('4').dataset['state']).toBe('wrong')
  })

  it('offers the hint only on the second miss', () => {
    void panel.ask(challenge, 'es')
    choice('4').click()
    expect(feedbackText()).not.toContain('Pista')
    choice('6').click()
    expect(feedbackText()).toContain('Pista:')
    expect(feedbackText()).toContain('Empieza en el 3')
  })

  it('counts the misses before the right answer', async () => {
    const pending = panel.ask(challenge, 'es')
    choice('4').click()
    choice('6').click()
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).attempts).toBe(2)
  })

  it('locks every button once the answer is right', () => {
    void panel.ask(challenge, 'es')
    choice('5').click()
    expect(choices().every((b) => b.disabled)).toBe(true)
    expect(choice('5').dataset['state']).toBe('correct')
  })

  it('is a modal dialog and moves focus into itself', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    void panel.ask(challenge, 'es')
    expect(document.activeElement).toBe(choice('4'))
  })

  it('returns focus to where it was when it closes', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const pending = panel.ask(challenge, 'es')
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    await pending
    expect(document.activeElement).toBe(opener)
  })

  it('announces feedback to assistive technology', () => {
    void panel.ask(challenge, 'es')
    choice('4').click()
    expect(announced.at(-1)).toBe('Casi. Prueba otra vez.')
  })

  it('plays a distinct sound for right and wrong', () => {
    void panel.ask(challenge, 'es')
    choice('4').click()
    expect(sounds).toEqual(['wrong'])
    choice('5').click()
    expect(sounds).toEqual(['wrong', 'correct'])
  })

  it('clears itself between questions', async () => {
    const first = panel.ask(challenge, 'es')
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    await first

    void panel.ask({ ...challenge, prompt: '9 - 4 = ?', choices: ['3', '5'], correctAnswer: '5' }, 'es')
    expect(choices()).toHaveLength(2)
    expect(root.querySelector('.challenge-prompt')?.textContent).toBe('9 - 4 = ?')
  })
})
