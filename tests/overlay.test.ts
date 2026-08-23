// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createOverlay } from '../src/ui/overlay'
import { PALETTE } from '../src/theme/palette'

const OVERLAY_CSS = readFileSync(resolve(import.meta.dirname, '../src/ui/overlay.css'), 'utf8')

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

  /**
   * The HUD and the dev strip must sit outside the stage. Overlaying the HUD on
   * the canvas hid the map's top row — where doorways are — so a child could
   * not see the way out.
   */
  it('keeps the HUD and dev strip out of the canvas stage', () => {
    const overlay = createOverlay(mount)
    const stage = document.getElementById('game-stage') as HTMLElement
    expect(stage.contains(overlay.canvasHost)).toBe(true)
    expect(stage.contains(document.getElementById('game-overlay'))).toBe(true)
    expect(stage.contains(overlay.hud)).toBe(false)
    expect(stage.contains(overlay.devBanner)).toBe(false)
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

/**
 * The overlay sits on top of the canvas, so anything in it that is not
 * interactive must let clicks through. Getting this wrong made the HUD and the
 * dev strip swallow taps on the top and bottom rows of the map — precisely
 * where doorways are — and a tap on a doorway silently did nothing.
 */
describe('overlay pointer transparency', () => {
  const rule = (selector: string, property: string): string | undefined => {
    for (const sheet of document.styleSheets) {
      for (const cssRule of sheet.cssRules) {
        if (!(cssRule instanceof CSSStyleRule)) continue
        if (cssRule.selectorText !== selector) continue
        const value = cssRule.style.getPropertyValue(property)
        if (value) return value.trim()
      }
    }
    return undefined
  }

  beforeEach(() => {
    document.head.innerHTML = `<style>${OVERLAY_CSS}</style>`
  })

  it('makes the overlay layer itself transparent to the pointer', () => {
    expect(rule('.game-overlay', 'pointer-events')).toBe('none')
  })

  it('re-enables the pointer only for the challenge panel', () => {
    expect(rule('.challenge-panel', 'pointer-events')).toBe('auto')
    expect(rule('.game-overlay > *', 'pointer-events')).toBeUndefined()
    expect(rule('.hud', 'pointer-events')).toBeUndefined()
    expect(rule('.dev-banner', 'pointer-events')).toBeUndefined()
  })
})

/**
 * `line-height: 0` on the stage (to kill the canvas descender gap) inherited
 * into the overlay and collapsed every text row in the panels onto one line.
 * The canvas gap is handled by `display: block` instead.
 */
describe('overlay typography is not collapsed by the stage', () => {
  beforeEach(() => {
    document.head.innerHTML = `<style>${OVERLAY_CSS}</style>`
  })

  const declaration = (selector: string, property: string): string | undefined => {
    for (const sheet of document.styleSheets) {
      for (const cssRule of sheet.cssRules) {
        if (!(cssRule instanceof CSSStyleRule)) continue
        if (cssRule.selectorText !== selector) continue
        const value = cssRule.style.getPropertyValue(property)
        if (value) return value.trim()
      }
    }
    return undefined
  }

  it('never sets a zero line-height on an ancestor of the overlay', () => {
    for (const selector of ['.game-stage', '.game-canvas-host', '.game-root']) {
      expect(declaration(selector, 'line-height'), selector).not.toBe('0')
    }
  })

  it('gives the overlay its own readable line-height', () => {
    expect(declaration('.game-overlay', 'line-height')).toBe('1.4')
  })

  it('keeps the canvas a block, which is what removes the descender gap', () => {
    expect(declaration('.game-canvas-host canvas', 'display')).toBe('block')
  })
})

/**
 * The canvas is played by tapping it, so it must own its touches. Without
 * `touch-action: none` a tap-and-drag scrolls the page or starts a pinch-zoom
 * instead of moving the hero.
 */
describe('touch handling', () => {
  beforeEach(() => {
    document.head.innerHTML = `<style>${OVERLAY_CSS}</style>`
  })

  const declaration = (selector: string, property: string): string | undefined => {
    for (const sheet of document.styleSheets) {
      for (const cssRule of sheet.cssRules) {
        if (!(cssRule instanceof CSSStyleRule)) continue
        if (cssRule.selectorText !== selector) continue
        const value = cssRule.style.getPropertyValue(property)
        if (value) return value.trim()
      }
    }
    return undefined
  }

  it('gives the canvas exclusive control of touch gestures', () => {
    expect(declaration('.game-canvas-host canvas', 'touch-action')).toBe('none')
  })

  it('respects the device safe area, for notched phones', () => {
    // Read from the raw rule text: jsdom does not expand a `padding` shorthand
    // built from env() values.
    expect(OVERLAY_CSS).toContain('env(safe-area-inset-top)')
    expect(OVERLAY_CSS).toContain('env(safe-area-inset-bottom)')
  })
})
