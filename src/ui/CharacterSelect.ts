import {
  assetUrl,
  CHARACTER_IDS,
  getAssetSpec,
  portraitId,
  type CharacterId,
} from '../engine/assets/assetManifest'
import { hasOwnSprites } from '../game/entities/characters'
import type { Settings } from '../game/state/Settings'
import { t, type StringKey } from '../i18n/strings'

/**
 * Choosing who to be.
 *
 * Built from the manifest rather than a hand-written list, so the day a seventh
 * character is added it appears here without touching this file. Portraits are
 * UI art loaded as plain `<img>`: they are 128x128 interface illustrations, not
 * gameplay sprites, and must never go through the world's pixel pipeline.
 */
export class CharacterSelect {
  private readonly heading: HTMLElement
  private readonly grid: HTMLElement
  private readonly start: HTMLButtonElement
  private readonly cards = new Map<CharacterId, HTMLButtonElement>()
  private chosen: CharacterId = 'warrior_boy'
  private onDone: ((character: CharacterId) => void) | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly settings: Settings,
  ) {
    this.root.classList.add('setup-screen')
    this.root.hidden = true

    this.heading = document.createElement('h2')
    this.heading.className = 'setup-title'

    this.grid = document.createElement('div')
    this.grid.className = 'character-grid'
    this.grid.setAttribute('role', 'group')

    for (const character of CHARACTER_IDS) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'character-card'
      card.dataset['character'] = character
      card.addEventListener('click', () => this.choose(character))

      const portrait = document.createElement('img')
      portrait.className = 'character-portrait'
      portrait.width = 128
      portrait.height = 128
      portrait.alt = ''
      portrait.src = assetUrl(getAssetSpec(portraitId(character)))
      // A portrait that fails to load must not leave an empty card: the name
      // below it still identifies the character, so only the broken icon goes.
      portrait.addEventListener('error', () => {
        portrait.hidden = true
        card.dataset['portrait'] = 'missing'
      })

      const name = document.createElement('span')
      name.className = 'character-name'

      card.append(portrait, name)
      if (!hasOwnSprites(character)) {
        const badge = document.createElement('span')
        badge.className = 'character-badge'
        card.append(badge)
      }
      this.grid.append(card)
      this.cards.set(character, card)
    }

    this.start = document.createElement('button')
    this.start.type = 'button'
    this.start.className = 'setup-next'
    this.start.addEventListener('click', () => {
      this.hide()
      this.onDone?.(this.chosen)
    })

    this.root.append(this.heading, this.grid, this.start)
    this.choose(this.chosen)
    this.refresh()
    this.settings.onChange(() => this.refresh())
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  get selection(): CharacterId {
    return this.chosen
  }

  open(known: CharacterId | undefined, onDone: (character: CharacterId) => void): void {
    this.onDone = onDone
    this.choose(known ?? this.chosen)
    this.root.hidden = false
    this.cards.get(this.chosen)?.focus()
  }

  hide(): void {
    this.root.hidden = true
  }

  private choose(character: CharacterId): void {
    this.chosen = character
    for (const [id, card] of this.cards) {
      const selected = id === character
      card.dataset['selected'] = String(selected)
      card.setAttribute('aria-pressed', String(selected))
    }
  }

  private refresh(): void {
    const locale = this.settings.ui
    this.heading.textContent = t(locale, 'select.title')
    this.start.textContent = t(locale, 'select.start')
    for (const [id, card] of this.cards) {
      const name = card.querySelector<HTMLElement>('.character-name')
      if (name) name.textContent = t(locale, `character.${id}` as StringKey)
      const badge = card.querySelector<HTMLElement>('.character-badge')
      if (badge) badge.textContent = t(locale, 'select.provisional')
      card.setAttribute('aria-label', t(locale, `character.${id}` as StringKey))
    }
  }
}
