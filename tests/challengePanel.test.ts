// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengePanel, type AskOptions } from '../src/ui/ChallengePanel'
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
const timerBar = () => root.querySelector<HTMLElement>('.challenge-timer-bar')

/** The panel's own defaults; individual tests override what they care about. */
const ask = (c: Challenge = challenge, options: Partial<AskOptions> = {}) =>
  panel.ask(c, { locale: 'es', seconds: 20, ...options })

beforeEach(() => {
  vi.useFakeTimers()
  // A test that leaves a challenge open leaves its clock running, and the
  // stubs below are shared by reference — without this, one test's timeout
  // sound lands in the next test's list.
  vi.clearAllTimers()
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
    void ask()
    expect(panel.isOpen).toBe(true)
    expect(root.querySelector('.challenge-prompt')?.textContent).toBe('3 + 2 = ?')
    expect(choices().map((b) => b.textContent)).toEqual(['4', '5', '6', '7'])
  })

  it('labels the subject so it is never colour alone', () => {
    void ask()
    expect(root.querySelector('.challenge-header')?.textContent).toBe('Reto de Matemáticas')
    expect(root.dataset['subject']).toBe('math')
  })

  it('renders in the requested locale', () => {
    void ask({ ...challenge, locale: 'en' }, { locale: 'en' })
    expect(root.querySelector('.challenge-header')?.textContent).toBe('Maths Challenge')
  })

  it('resolves with a correct result once the right answer is picked', async () => {
    const pending = ask()
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    const resolution = await pending
    expect(resolution.outcome).toBe('solved')
    expect(resolution.attempts).toBe(0)
    expect(panel.isOpen).toBe(false)
  })

  it('shows the explanation on success', () => {
    void ask()
    choice('5').click()
    expect(feedbackText()).toBe('3 y 2 más son 5.')
    expect(announced.join(' ')).toContain('3 y 2 más son 5.')
  })

  // Failure must never end the attempt: EDUCATIONAL_SYSTEM.md asks for neutral
  // feedback, an optional hint and a retry, never a lockout.
  it('keeps the panel open after a wrong answer', () => {
    void ask()
    choice('4').click()
    expect(panel.isOpen).toBe(true)
    expect(feedbackText()).toBe('Casi. Prueba otra vez.')
  })

  it('leaves the other choices usable after a miss', () => {
    void ask()
    choice('4').click()
    expect(choice('5').disabled).toBe(false)
    expect(choice('4').dataset['state']).toBe('wrong')
  })

  it('offers the hint only on the second miss', () => {
    void ask()
    choice('4').click()
    expect(feedbackText()).not.toContain('Pista')
    choice('6').click()
    expect(feedbackText()).toContain('Pista:')
    expect(feedbackText()).toContain('Empieza en el 3')
  })

  it('counts the misses before the right answer', async () => {
    const pending = ask()
    choice('4').click()
    choice('6').click()
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).attempts).toBe(2)
  })

  it('locks every button once the answer is right', () => {
    void ask()
    choice('5').click()
    expect(choices().every((b) => b.disabled)).toBe(true)
    expect(choice('5').dataset['state']).toBe('correct')
  })

  it('is a modal dialog and moves focus into itself', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    void ask()
    expect(document.activeElement).toBe(choice('4'))
  })

  it('returns focus to where it was when it closes', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const pending = ask()
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    await pending
    expect(document.activeElement).toBe(opener)
  })

  it('announces feedback to assistive technology', () => {
    void ask()
    choice('4').click()
    expect(announced.at(-1)).toBe('Casi. Prueba otra vez.')
  })

  it('plays a distinct sound for right and wrong', () => {
    void ask()
    choice('4').click()
    expect(sounds).toEqual(['wrong'])
    choice('5').click()
    expect(sounds).toEqual(['wrong', 'correct'])
  })

  it('clears itself between questions', async () => {
    const first = ask()
    choice('5').click()
    await vi.advanceTimersByTimeAsync(1000)
    await first

    void ask({ ...challenge, prompt: '9 - 4 = ?', choices: ['3', '5'], correctAnswer: '5' })
    expect(choices()).toHaveLength(2)
    expect(root.querySelector('.challenge-prompt')?.textContent).toBe('9 - 4 = ?')
  })
})

/*
 * The clock and the heart penalty were asked for explicitly, and they pull
 * against GAME_DESIGN.md's "minimal time pressure". These tests pin the two
 * mitigations that keep them gentle: the time is generous and scaled by age,
 * and a miss never ends the attempt.
 */
describe('answer clock', () => {
  it('drains the bar as the time runs down', async () => {
    void ask(challenge, { seconds: 10 })
    expect(Number.parseFloat(timerBar()?.style.width ?? '0')).toBe(100)
    await vi.advanceTimersByTimeAsync(5000)
    expect(Number.parseFloat(timerBar()?.style.width ?? '0')).toBeLessThan(55)
  })

  it('escalates the bar level without relying on colour alone', async () => {
    void ask(challenge, { seconds: 10 })
    expect(timerBar()?.dataset['level']).toBe('calm')
    await vi.advanceTimersByTimeAsync(6000)
    expect(timerBar()?.dataset['level']).toBe('low')
    await vi.advanceTimersByTimeAsync(2500)
    expect(timerBar()?.dataset['level']).toBe('urgent')
  })

  it('ends the challenge when the time runs out', async () => {
    const pending = ask(challenge, { seconds: 5 })
    await vi.advanceTimersByTimeAsync(5100)
    const resolution = await pending
    expect(resolution.outcome).toBe('timeout')
    expect(panel.isOpen).toBe(false)
    expect(sounds).toEqual(['wrong'])
  })

  it('charges a heart for a timeout', async () => {
    let penalties = 0
    const pending = ask(challenge, { seconds: 5, onPenalty: () => (penalties += 1) })
    await vi.advanceTimersByTimeAsync(5100)
    await pending
    expect(penalties).toBe(1)
  })

  it('charges a heart per wrong answer but never closes on one', () => {
    let penalties = 0
    void ask(challenge, { onPenalty: () => (penalties += 1) })
    choice('4').click()
    choice('6').click()
    expect(penalties).toBe(2)
    expect(panel.isOpen).toBe(true)
  })

  it('stops the clock once the answer is right', async () => {
    let penalties = 0
    const pending = ask(challenge, { seconds: 5, onPenalty: () => (penalties += 1) })
    choice('5').click()
    await vi.advanceTimersByTimeAsync(6000)
    const resolution = await pending
    expect(resolution.outcome).toBe('solved')
    expect(penalties).toBe(0)
  })
})
