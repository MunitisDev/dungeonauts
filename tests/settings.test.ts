// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from '../src/game/state/Settings'
import { LocaleSwitch } from '../src/ui/LocaleSwitch'
import { CompletionPanel } from '../src/ui/CompletionPanel'
import { FullscreenButton } from '../src/ui/FullscreenButton'
import { Hud } from '../src/ui/Hud'

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('Settings', () => {
  it('defaults to Spanish for both interface and content', () => {
    const settings = new Settings()
    expect(settings.locales).toEqual({ ui: 'es', content: 'es' })
  })

  it('switches both languages together', () => {
    const settings = new Settings()
    settings.setLocale('en')
    expect(settings.locales).toEqual({ ui: 'en', content: 'en' })
  })

  /**
   * EDUCATIONAL_SYSTEM.md warns against assuming the interface language and the
   * learning language are always the same, so they stay independently settable
   * even though today's switch moves both.
   */
  it('can set the interface and content languages independently', () => {
    const settings = new Settings()
    settings.setUiLocale('en')
    expect(settings.locales).toEqual({ ui: 'en', content: 'es' })
    settings.setContentLocale('en')
    expect(settings.locales).toEqual({ ui: 'en', content: 'en' })
  })

  it('notifies listeners, and only on a real change', () => {
    const settings = new Settings()
    const seen: string[] = []
    settings.onChange((l) => seen.push(l.ui))

    settings.setLocale('en')
    settings.setLocale('en')
    settings.setLocale('es')
    expect(seen).toEqual(['en', 'es'])
  })

  it('stops notifying after unsubscribe', () => {
    const settings = new Settings()
    const listener = vi.fn()
    const off = settings.onChange(listener)
    settings.setLocale('en')
    off()
    settings.setLocale('es')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('remembers the choice across sessions', () => {
    new Settings().setLocale('en')
    expect(new Settings().locales).toEqual({ ui: 'en', content: 'en' })
  })

  it('ignores corrupt or unknown stored values', () => {
    localStorage.setItem('dungeonauts.settings.v1', '{"ui":"fr","content":"es"}')
    expect(new Settings().locales).toEqual({ ui: 'es', content: 'es' })
    localStorage.setItem('dungeonauts.settings.v1', 'not json')
    expect(new Settings().locales).toEqual({ ui: 'es', content: 'es' })
  })

  // Private windows and blocked site data make storage throw outright.
  it('still works when storage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    try {
      const settings = new Settings()
      expect(() => settings.setLocale('en')).not.toThrow()
      expect(settings.ui).toBe('en')
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
    }
  })
})

describe('LocaleSwitch', () => {
  const options = () => [...document.querySelectorAll<HTMLButtonElement>('.locale-option')]

  it('offers both languages as a radio group', () => {
    const settings = new Settings()
    new LocaleSwitch(document.body, settings)
    expect(document.querySelector('.locale-switch')?.getAttribute('role')).toBe('radiogroup')
    expect(options().map((b) => b.textContent)).toEqual(['ES', 'EN'])
  })

  it('marks the active language by state, not colour alone', () => {
    const settings = new Settings()
    new LocaleSwitch(document.body, settings)
    const [es, en] = options()
    expect(es?.getAttribute('aria-checked')).toBe('true')
    expect(en?.getAttribute('aria-checked')).toBe('false')
  })

  it('changes the language when clicked', () => {
    const settings = new Settings()
    new LocaleSwitch(document.body, settings)
    options()[1]?.click()
    expect(settings.locales).toEqual({ ui: 'en', content: 'en' })
  })

  it('follows a change made elsewhere', () => {
    const settings = new Settings()
    new LocaleSwitch(document.body, settings)
    settings.setLocale('en')
    expect(options()[1]?.getAttribute('aria-checked')).toBe('true')
  })

  it('names each option in the current interface language', () => {
    const settings = new Settings()
    new LocaleSwitch(document.body, settings)
    expect(options()[1]?.getAttribute('aria-label')).toBe('Inglés')
    settings.setLocale('en')
    expect(options()[1]?.getAttribute('aria-label')).toBe('English')
  })
})

/**
 * Rebuilding the HUD on a language change used to clear the whole element,
 * taking the language switch with it and leaving no way to switch back.
 */
describe('HUD and the language switch share a container', () => {
  it('keeps the switch alive across a language change', () => {
    const settings = new Settings()
    const hud = new Hud(document.body, settings.ui)
    new LocaleSwitch(document.body, settings)

    hud.update({ hearts: 3, keys: 1, stars: 2, coins: 5 })
    hud.setLocale('en')

    expect(document.querySelectorAll('.locale-option')).toHaveLength(2)
    expect(document.querySelector('.hud-label')?.textContent).toBe('Hearts')
  })

  it('keeps the numbers after a language change', () => {
    const hud = new Hud(document.body, 'es')
    hud.update({ hearts: 3, keys: 1, stars: 2, coins: 5 })
    hud.setLocale('en')
    const values = [...document.querySelectorAll('.hud-value')].map((n) => n.textContent)
    expect(values).toEqual(['3', '1', '2', '5'])
  })
})

describe('CompletionPanel', () => {
  let root: HTMLElement
  beforeEach(() => {
    document.body.innerHTML = '<section id="complete-root" hidden></section>'
    root = document.getElementById('complete-root') as HTMLElement
  })

  const summary = { hearts: 3, keys: 0, stars: 3, coins: 10, roomsExplored: 3, level: 4 }

  it('starts hidden', () => {
    expect(new CompletionPanel(root).isOpen).toBe(false)
  })

  it('shows what was earned', () => {
    new CompletionPanel(root).show(summary, 'es', () => {})
    expect(root.querySelector('.complete-title')?.textContent).toBe('¡Mazmorra completada!')
    const values = [...root.querySelectorAll('dd')].map((n) => n.textContent)
    expect(values).toEqual(['3', '10', '3', '4'])
  })

  it('renders in English too', () => {
    new CompletionPanel(root).show(summary, 'en', () => {})
    expect(root.querySelector('.complete-title')?.textContent).toBe('Dungeon complete!')
    expect(root.querySelector('.complete-replay')?.textContent).toBe('Play again')
  })

  // No score, no grade, no percentage: nothing a child can read as failure.
  it('reports no score or grade', () => {
    new CompletionPanel(root).show(summary, 'es', () => {})
    expect(root.textContent).not.toMatch(/%|punt|score|nota/i)
  })

  it('replays and closes when the button is pressed', () => {
    const onReplay = vi.fn()
    const panel = new CompletionPanel(root)
    panel.show(summary, 'es', onReplay)
    root.querySelector<HTMLButtonElement>('.complete-replay')?.click()
    expect(onReplay).toHaveBeenCalledOnce()
    expect(panel.isOpen).toBe(false)
  })

  it('moves focus to the replay button', () => {
    new CompletionPanel(root).show(summary, 'es', () => {})
    expect(document.activeElement).toBe(root.querySelector('.complete-replay'))
  })
})

describe('FullscreenButton', () => {
  const button = () => document.querySelector<HTMLButtonElement>('.fullscreen-button')

  it('offers full screen when the browser supports it', () => {
    const target = document.createElement('div')
    target.requestFullscreen = () => Promise.resolve()
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })

    new FullscreenButton(document.body, target, new Settings())
    expect(button()?.hidden).toBe(false)
    expect(button()?.textContent).toBe('Pantalla completa')
    expect(button()?.getAttribute('aria-pressed')).toBe('false')
  })

  it('follows the interface language', () => {
    const target = document.createElement('div')
    target.requestFullscreen = () => Promise.resolve()
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })

    const settings = new Settings()
    new FullscreenButton(document.body, target, settings)
    settings.setLocale('en')
    expect(button()?.textContent).toBe('Full screen')
  })

  // iPhone Safari refuses full screen outright. A control that cannot work is
  // worse than no control, so it hides rather than sitting there inert.
  it('hides itself where full screen is unavailable', () => {
    const target = document.createElement('div')
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
    new FullscreenButton(document.body, target, new Settings())
    expect(button()?.hidden).toBe(true)
  })
})
