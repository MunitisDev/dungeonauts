import Phaser from 'phaser'
import { REGISTRY_KEY_SERVICES } from '../game/keys'
import { BootScene } from '../game/scenes/BootScene'
import { RoomScene } from '../game/scenes/RoomScene'
import type { GameServices } from '../game/services'
import { hexToInt, PALETTE } from '../theme/palette'
import { BASE_HEIGHT, BASE_WIDTH } from './constants'
import { computeViewport, type ViewportPlan } from './scale'

/** Space the HUD and dev strip take outside the canvas, in CSS pixels. */
function chromeHeight(root: HTMLElement): number {
  const frame = root.closest('.game-root')
  if (!frame) return 0
  return [...frame.children]
    .filter((child) => child !== root.parentElement)
    .reduce((total, child) => total + child.getBoundingClientRect().height, 0)
}

/** True when the primary input is a finger rather than a mouse. */
function hasCoarsePointer(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

/**
 * Builds the Phaser game with a pixel-perfect, responsive configuration.
 *
 * `pixelArt: true` turns off antialiasing and sets nearest-neighbour filtering;
 * `roundPixels` keeps sprites on whole pixels. Scaling is `NONE` plus a manual
 * whole-number zoom, because Phaser's FIT mode produces fractional scales,
 * which `docs/art/ART_DIRECTION.md` rules out.
 *
 * The canvas is resized to the space available rather than being a fixed
 * 480x320 letterboxed into it. On a phone that is the difference between tiles
 * you can tap and tiles you cannot.
 */
export function createGame(parent: HTMLElement, services: GameServices): Phaser.Game {
  const first = planFor(parent)

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: first.width,
    height: first.height,
    zoom: first.zoom,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: hexToInt(PALETTE.dungeonNavy),
    scale: {
      mode: Phaser.Scale.NONE,
      // The wrapper is centred by CSS; Phaser must not also move it.
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, RoomScene],
    // Registered through the config so it is present before any scene runs,
    // rather than racing the boot sequence from the caller.
    callbacks: {
      preBoot: (booting) => booting.registry.set(REGISTRY_KEY_SERVICES, services),
    },
  })

  /*
   * Applying a plan, with a guard against settling into a flicker.
   *
   * The layout is built so the chrome's height cannot depend on the canvas's
   * width, which is what used to drive the loop. This is the belt to that
   * pair of braces: if a plan we have just left comes straight back, the two
   * are fighting, and the smaller one wins until the window genuinely changes.
   */
  let current: ViewportPlan | undefined
  let previous: ViewportPlan | undefined
  let settled = false
  const same = (a: ViewportPlan | undefined, b: ViewportPlan) =>
    a !== undefined && a.zoom === b.zoom && a.width === b.width && a.height === b.height

  const applyViewport = () => {
    if (settled) return
    const plan = planFor(parent)
    if (same(current, plan)) return

    if (same(previous, plan) && current) {
      // A -> B -> A. Take the smaller of the two and stop, rather than let the
      // player watch the game breathe.
      const smaller = plan.zoom <= current.zoom ? plan : current
      settled = true
      commit(smaller)
      return
    }
    commit(plan)
  }

  const commit = (plan: ViewportPlan) => {
    previous = current
    current = plan
    game.scale.setZoom(plan.zoom)
    game.scale.resize(plan.width, plan.height)
    game.events.emit('dungeonauts:viewport', plan)
  }

  /** A real window change starts the negotiation again. */
  const replan = () => {
    settled = false
    previous = undefined
    applyViewport()
  }

  // `resize` covers desktop and most rotations; `orientationchange` fires
  // before the new dimensions settle on some phones, hence the extra pass.
  const onResize = () => replan()
  const onOrientation = () => {
    replan()
    window.setTimeout(replan, 250)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onOrientation)
  document.addEventListener('fullscreenchange', onOrientation)
  window.visualViewport?.addEventListener('resize', onResize)

  /*
   * The chrome around the canvas does not settle at first paint: a webfont
   * lands, a media query narrows the HUD, the dev strip rewraps. Measuring it
   * once left the canvas sized against a HUD that no longer existed — on a
   * landscape phone that cost more than half the visible map.
   */
  let pending = 0
  const observer = new ResizeObserver(() => {
    // Coalesced into one frame: the observer fires per element, and three
    // measurements of the same reflow are three chances to thrash.
    if (pending) return
    pending = requestAnimationFrame(() => {
      pending = 0
      applyViewport()
    })
  })
  const frame = parent.closest('.game-root')
  if (frame) {
    for (const child of frame.children) {
      if (child !== parent.parentElement) observer.observe(child)
    }
  }

  /*
   * Phaser calls preventDefault on every key it watches, which is right for
   * the arrows — they would scroll the page — and catastrophic the moment a
   * DOM text field has focus: the keystrokes never reach it. On the onboarding
   * screen that meant a child could not type their own name.
   *
   * So the game gives the keyboard back whenever a field is focused, and takes
   * it again when focus leaves.
   */
  const isTextField = (node: EventTarget | null): boolean => {
    if (!(node instanceof HTMLElement)) return false
    return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable
  }
  const setKeyboard = (enabled: boolean) => {
    const keyboard = game.input.keyboard
    if (!keyboard) return
    keyboard.enabled = enabled
    keyboard.preventDefault = enabled
  }
  const onFocusIn = (event: FocusEvent) => {
    if (isTextField(event.target)) setKeyboard(false)
  }
  const onFocusOut = (event: FocusEvent) => {
    if (isTextField(event.target)) setKeyboard(true)
  }
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  // A field can already hold focus by the time the game boots.
  if (isTextField(document.activeElement)) setKeyboard(false)

  game.events.once(Phaser.Core.Events.DESTROY, () => {
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onOrientation)
    document.removeEventListener('fullscreenchange', onOrientation)
    window.visualViewport?.removeEventListener('resize', onResize)
    observer.disconnect()
    if (pending) cancelAnimationFrame(pending)
  })

  return game
}

/**
 * The space the page actually has, in CSS pixels.
 *
 * Every candidate measurement is wrong in some situation, so take the smallest:
 * never claim more room than the most conservative reading allows.
 *
 *  - `innerWidth` reports the *layout* viewport, which a mobile browser widens
 *    to fit overflowing content. An oversized canvas therefore inflates the very
 *    number used to size it, and never shrinks back.
 *  - `clientHeight` is the document height on a page that scrolls — inside a
 *    preview page with notes below the game it read 708 where the visible area
 *    was 390.
 *  - `visualViewport` is the honest visible area, but is not everywhere.
 */
function viewportSize(): { width: number; height: number } {
  const doc = document.documentElement
  const visual = window.visualViewport
  const widths = [doc.clientWidth, window.innerWidth, visual?.width]
  const heights = [doc.clientHeight, window.innerHeight, visual?.height]
  const smallest = (values: Array<number | undefined>): number =>
    Math.max(1, Math.floor(Math.min(...values.filter((v): v is number => typeof v === 'number' && v > 0))))
  return { width: smallest(widths), height: smallest(heights) }
}

function planFor(parent: HTMLElement): ViewportPlan {
  const { width, height } = viewportSize()
  return computeViewport({
    availableWidth: width,
    availableHeight: Math.max(1, height - chromeHeight(parent)),
    roomWidth: BASE_WIDTH,
    roomHeight: BASE_HEIGHT,
    coarsePointer: hasCoarsePointer(),
  })
}
