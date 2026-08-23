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

  const applyViewport = () => {
    const plan = planFor(parent)
    game.scale.setZoom(plan.zoom)
    game.scale.resize(plan.width, plan.height)
    game.events.emit('dungeonauts:viewport', plan)
  }

  // `resize` covers desktop and most rotations; `orientationchange` fires
  // before the new dimensions settle on some phones, hence the extra pass.
  const onResize = () => applyViewport()
  const onOrientation = () => {
    applyViewport()
    window.setTimeout(applyViewport, 250)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onOrientation)
  document.addEventListener('fullscreenchange', onOrientation)

  /*
   * The chrome around the canvas does not settle at first paint: a webfont
   * lands, a media query narrows the HUD, the dev strip rewraps. Measuring it
   * once left the canvas sized against a HUD that no longer existed — on a
   * landscape phone that cost more than half the visible map.
   */
  const observer = new ResizeObserver(() => applyViewport())
  const frame = parent.closest('.game-root')
  if (frame) {
    for (const child of frame.children) {
      if (child !== parent.parentElement) observer.observe(child)
    }
  }

  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onOrientation)
    document.removeEventListener('fullscreenchange', onOrientation)
    observer.disconnect()
  })

  return game
}

/**
 * The space the page actually has, in CSS pixels.
 *
 * `documentElement.clientWidth`, not `window.innerWidth`. On a phone the two
 * disagree: `innerWidth` reports the *layout* viewport, which a mobile browser
 * widens to fit overflowing content — so an oversized canvas inflates the very
 * number used to size it, and the canvas never shrinks back. Rotating to
 * portrait left a 390px-wide phone still rendering an 844px-wide canvas.
 */
function viewportSize(): { width: number; height: number } {
  const doc = document.documentElement
  return {
    width: Math.max(1, doc.clientWidth || window.innerWidth),
    height: Math.max(1, doc.clientHeight || window.innerHeight),
  }
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
