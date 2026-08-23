import { applyPaletteToDocument } from '../theme/palette'

/**
 * The DOM layer that sits on top of the Phaser canvas.
 *
 * The world is pixel art on canvas; the HUD and the educational panel are real
 * DOM. That split is deliberate: `docs/art/ART_DIRECTION.md` says the challenge
 * panel must favour readability over retro purity, and real DOM gives us
 * selectable text, browser font scaling, focus rings, large hit targets and
 * screen-reader support for free.
 *
 * This module only builds the empty containers. The HUD (task 5) and the
 * challenge panel (task 4) mount into them later.
 */
export interface GameOverlay {
  /** Wrapper holding both canvas and overlay. */
  readonly root: HTMLElement
  /** Phaser mounts its canvas here. */
  readonly canvasHost: HTMLElement
  /** Persistent HUD: hearts, coins, keys, progress. */
  readonly hud: HTMLElement
  /** Modal educational challenge panel. */
  readonly challenge: HTMLElement
  /** End-of-dungeon summary. */
  readonly completion: HTMLElement
  /** Transient correct/incorrect feedback. */
  readonly feedback: HTMLElement
  /** Visually hidden `aria-live` region for assistive tech. */
  readonly liveRegion: HTMLElement
  /** Temporary strip reporting placeholder art; removed once art lands. */
  readonly devBanner: HTMLElement
  /** Politely announces a message to screen readers. */
  announce(message: string): void
}

function element(tag: string, className: string, id?: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  if (id) node.id = id
  return node
}

export function createOverlay(mount: HTMLElement): GameOverlay {
  mount.textContent = ''
  applyPaletteToDocument(document.documentElement)

  const root = element('div', 'game-root', 'game-root')

  // The HUD sits above the canvas rather than on top of it. Overlaying it hid
  // the map's top row, which is where doorways are, so a child could not see
  // the way out of a room.
  const hud = element('header', 'hud', 'hud-root')
  hud.setAttribute('role', 'status')

  const stage = element('div', 'game-stage', 'game-stage')
  const canvasHost = element('div', 'game-canvas-host', 'game-canvas-host')

  // Absolutely positioned over the canvas, so it never contributes to layout
  // size — otherwise the HUD's natural width stretched the whole frame and the
  // game stopped being centred.
  const overlay = element('div', 'game-overlay', 'game-overlay')

  const challenge = element('section', 'challenge-panel', 'challenge-root')
  challenge.setAttribute('role', 'dialog')
  challenge.setAttribute('aria-modal', 'true')
  challenge.hidden = true

  const completion = element('section', 'complete-panel', 'complete-root')
  completion.setAttribute('role', 'dialog')
  completion.setAttribute('aria-modal', 'true')
  completion.hidden = true

  const feedback = element('div', 'feedback-layer', 'feedback-root')

  const liveRegion = element('div', 'visually-hidden', 'a11y-live')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')

  const devBanner = element('div', 'dev-banner', 'dev-banner')

  overlay.append(challenge, completion, feedback, liveRegion)
  stage.append(canvasHost, overlay)
  root.append(hud, stage, devBanner)
  mount.append(root)

  return {
    root,
    canvasHost,
    hud,
    challenge,
    completion,
    feedback,
    liveRegion,
    devBanner,
    announce(message: string) {
      liveRegion.textContent = message
    },
  }
}
