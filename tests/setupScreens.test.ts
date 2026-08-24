// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { CharacterSelect } from '../src/ui/CharacterSelect'
import { OnboardingPanel } from '../src/ui/OnboardingPanel'
import { TitleScreen } from '../src/ui/TitleScreen'
import { Settings } from '../src/game/state/Settings'
import { DEFAULT_AGE, MAX_AGE, MIN_AGE } from '../src/game/state/Profile'
import { CHARACTER_IDS } from '../src/engine/assets/assetManifest'
import { hasOwnSprites } from '../src/game/entities/characters'

let root: HTMLElement
let settings: Settings

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<section id="root"></section>'
  root = document.getElementById('root') as HTMLElement
  settings = new Settings({ ui: 'es', content: 'es', sound: true })
})

describe('OnboardingPanel', () => {
  const ageButtons = () => [...root.querySelectorAll<HTMLButtonElement>('.setup-age')]
  const next = () => root.querySelector<HTMLButtonElement>('.setup-next') as HTMLButtonElement
  const nameInput = () => root.querySelector<HTMLInputElement>('.setup-input') as HTMLInputElement

  it('offers one large button per supported age', () => {
    new OnboardingPanel(root, settings)
    expect(ageButtons().map((b) => b.textContent)).toEqual(
      Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => String(MIN_AGE + i)),
    )
  })

  it('starts on a sensible age rather than nothing', () => {
    new OnboardingPanel(root, settings)
    const selected = ageButtons().filter((b) => b.dataset['selected'] === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toBe(String(DEFAULT_AGE))
  })

  // Nothing to read, nothing to fix: the way on is simply not available yet.
  it('will not continue without a name', () => {
    const panel = new OnboardingPanel(root, settings)
    panel.open({}, () => {})
    expect(next().disabled).toBe(true)
    nameInput().value = 'Nil'
    nameInput().dispatchEvent(new Event('input'))
    expect(next().disabled).toBe(false)
  })

  it('reports the name and the chosen age', () => {
    const panel = new OnboardingPanel(root, settings)
    let got: { name: string; age: number } | undefined
    panel.open({}, (introduction) => (got = introduction))
    nameInput().value = '  Nil  '
    nameInput().dispatchEvent(new Event('input'))
    ageButtons().find((b) => b.textContent === '10')?.click()
    next().click()
    expect(got).toEqual({ name: 'Nil', age: 10 })
    expect(panel.isOpen).toBe(false)
  })

  it('offers back what it was told last time', () => {
    const panel = new OnboardingPanel(root, settings)
    panel.open({ name: 'Ada', age: 11 }, () => {})
    expect(nameInput().value).toBe('Ada')
    expect(ageButtons().find((b) => b.dataset['selected'] === 'true')?.textContent).toBe('11')
  })

  it('follows the interface language', () => {
    const panel = new OnboardingPanel(root, settings)
    panel.open({}, () => {})
    expect(root.querySelector('.setup-title')?.textContent).toBe('¿Quién eres?')
    settings.setLocale('en')
    expect(root.querySelector('.setup-title')?.textContent).toBe('Who are you?')
  })

  it('never stacks duplicate labels when the language changes', () => {
    new OnboardingPanel(root, settings)
    settings.setLocale('en')
    settings.setLocale('es')
    expect(root.querySelectorAll('.setup-field-label')).toHaveLength(1)
  })
})

describe('CharacterSelect', () => {
  const cards = () => [...root.querySelectorAll<HTMLButtonElement>('.character-card')]

  it('shows the whole roster, built from the manifest', () => {
    new CharacterSelect(root, settings)
    expect(cards().map((c) => c.dataset['character'])).toEqual([...CHARACTER_IDS])
  })

  it('points each card at that character portrait', () => {
    new CharacterSelect(root, settings)
    for (const card of cards()) {
      const src = card.querySelector<HTMLImageElement>('.character-portrait')?.getAttribute('src')
      expect(src).toContain(`portrait_${card.dataset['character']}.png`)
    }
  })

  it('marks exactly one card as chosen', () => {
    const select = new CharacterSelect(root, settings)
    select.open(undefined, () => {})
    cards().find((c) => c.dataset['character'] === 'mage_girl')?.click()
    expect(cards().filter((c) => c.dataset['selected'] === 'true')).toHaveLength(1)
    expect(select.selection).toBe('mage_girl')
  })

  it('reports the chosen character', () => {
    const select = new CharacterSelect(root, settings)
    let chosen: string | undefined
    select.open(undefined, (character) => (chosen = character))
    cards().find((c) => c.dataset['character'] === 'archer_girl')?.click()
    root.querySelector<HTMLButtonElement>('.setup-next')?.click()
    expect(chosen).toBe('archer_girl')
  })

  // Substituted art must be visible, never silent: the badge is how the child
  // and the person producing the sheets both find out.
  it('badges every character still waiting on its gameplay sheets', () => {
    new CharacterSelect(root, settings)
    for (const card of cards()) {
      const id = card.dataset['character'] as (typeof CHARACTER_IDS)[number]
      const badge = card.querySelector('.character-badge')
      expect(Boolean(badge), id).toBe(!hasOwnSprites(id))
    }
  })

  it('names the characters in the interface language', () => {
    new CharacterSelect(root, settings)
    const name = () =>
      cards().find((c) => c.dataset['character'] === 'warrior_girl')
        ?.querySelector('.character-name')?.textContent
    expect(name()).toBe('Guerrera')
    settings.setLocale('en')
    expect(name()).toBe('Warrior')
  })
})

describe('character sprites', () => {
  // Nobody has their own sheet yet: every character walks the dungeon as the
  // knight from the tileset, and the selection screen has to say so.
  it('badges every character that is borrowing the knight', () => {
    for (const id of CHARACTER_IDS) {
      expect(hasOwnSprites(id), id).toBe(false)
    }
  })
})

describe('TitleScreen', () => {
  const primary = () => root.querySelector<HTMLButtonElement>('.title-play') as HTMLButtonElement
  const secondary = () => root.querySelector<HTMLButtonElement>('.title-secondary') as HTMLButtonElement

  it('offers only a new game when there is nothing to continue', () => {
    const title = new TitleScreen(root, settings, { onNewGame: () => {}, onContinue: () => {} })
    title.setResumable(false)
    expect(primary().textContent).toBe('Jugar')
    expect(secondary().hidden).toBe(true)
  })

  // The biggest button should be the thing a returning child wants.
  it('makes continue the primary action once a run is saved', () => {
    let continued = 0
    let fresh = 0
    const title = new TitleScreen(root, settings, {
      onNewGame: () => (fresh += 1),
      onContinue: () => (continued += 1),
    })
    title.setResumable(true)
    expect(primary().textContent).toBe('Continuar')
    expect(secondary().hidden).toBe(false)
    primary().click()
    expect(continued).toBe(1)
    title.show()
    secondary().click()
    expect(fresh).toBe(1)
  })
})
