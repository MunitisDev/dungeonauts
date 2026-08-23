// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createOverlay } from '../src/ui/overlay'
import { PALETTE } from '../src/theme/palette'

let mount: HTMLElement

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = '<div id="app"></div>'
  mount = document.getElementById('app') as HTMLElement
})

describe('DOM overlay', () => {
  it('creates the canvas host and every UI region', () => {
    const overlay = createOverlay(mount)
    expect(overlay.canvasHost.id).toBe('game-canvas-host')
    expect(overlay.hud.id).toBe('hud-root')
    expect(overlay.challenge.id).toBe('challenge-root')
    expect(overlay.feedback.id).toBe('feedback-root')
    expect(overlay.devBanner.id).toBe('dev-banner')
    expect(mount.contains(overlay.canvasHost)).toBe(true)
  })

  it('starts with the challenge panel hidden', () => {
    const overlay = createOverlay(mount)
    expect(overlay.challenge.hidden).toBe(true)
    expect(overlay.challenge.getAttribute('role')).toBe('dialog')
    expect(overlay.challenge.getAttribute('aria-modal')).toBe('true')
  })

  it('provides a polite live region for screen readers', () => {
    const overlay = createOverlay(mount)
    expect(overlay.liveRegion.getAttribute('aria-live')).toBe('polite')
    expect(overlay.liveRegion.classList.contains('visually-hidden')).toBe(true)

    overlay.announce('Sala de pruebas cargada')
    expect(overlay.liveRegion.textContent).toBe('Sala de pruebas cargada')
  })

  it('publishes the palette as CSS custom properties', () => {
    createOverlay(mount)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--du-dungeon-navy')).toBe(PALETTE.dungeonNavy)
    expect(style.getPropertyValue('--du-warm-cream')).toBe(PALETTE.warmCream)
  })

  it('is idempotent, so a re-mount does not stack duplicate overlays', () => {
    createOverlay(mount)
    createOverlay(mount)
    expect(document.querySelectorAll('#game-root')).toHaveLength(1)
    expect(document.querySelectorAll('#challenge-root')).toHaveLength(1)
  })
})
