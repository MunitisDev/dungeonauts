import Phaser from 'phaser'
import { REGISTRY_KEY_SERVICES } from '../game/keys'
import { BootScene } from '../game/scenes/BootScene'
import { RoomScene } from '../game/scenes/RoomScene'
import type { GameServices } from '../game/services'
import { hexToInt, PALETTE } from '../theme/palette'
import { BASE_HEIGHT, BASE_WIDTH } from './constants'
import { computeIntegerZoom } from './scale'

/**
 * Builds the Phaser game with a pixel-perfect configuration.
 *
 * `pixelArt: true` turns off antialiasing and sets nearest-neighbour filtering
 * on every texture; `roundPixels` keeps sprites on whole pixels so a moving
 * sprite never lands on a half texel. Scaling is `NONE` plus a manual whole
 * number zoom, because Phaser's FIT mode happily produces fractional scales,
 * which `docs/art/ART_DIRECTION.md` rules out.
 */
export function createGame(parent: HTMLElement, services: GameServices): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    zoom: currentZoom(),
    pixelArt: true,
    roundPixels: true,
    backgroundColor: hexToInt(PALETTE.dungeonNavy),
    scale: {
      mode: Phaser.Scale.NONE,
      // The overlay wrapper is centred by CSS; Phaser must not also move it.
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, RoomScene],
    // Registered through the config so it is present before any scene runs,
    // rather than racing the boot sequence from the caller.
    callbacks: {
      preBoot: (booting) => booting.registry.set(REGISTRY_KEY_SERVICES, services),
    },
  })

  const applyZoom = () => game.scale.setZoom(currentZoom())
  window.addEventListener('resize', applyZoom)
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', applyZoom)
  })

  return game
}

function currentZoom(): number {
  return computeIntegerZoom(window.innerWidth, window.innerHeight, BASE_WIDTH, BASE_HEIGHT)
}
