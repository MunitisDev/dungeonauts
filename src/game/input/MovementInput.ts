import Phaser from 'phaser'
import type { Direction } from '../movement/directions'
import type { TileCoord } from '../world/grid'
import { worldToTile } from '../world/grid'

/**
 * Translates raw input into movement intent.
 *
 * Two ways in, because the audience spans keyboard and tablet:
 *  - arrows or WASD for a held direction, one tile at a time;
 *  - tap or click a tile to walk there.
 *
 * `docs/game/GAME_DESIGN.md` calls for large targets and no precision input, so
 * a tap anywhere reachable is a valid instruction: the scene paths to it.
 */
export interface MovementIntent {
  /** Held direction, or `null` when no movement key is down. */
  readonly held: Direction | null
  /** Tile tapped since the last read, consumed on read. */
  readonly tapped: TileCoord | null
}

export class MovementInput {
  private keys?: Record<Direction, Phaser.Input.Keyboard.Key[]>
  private pendingTap: TileCoord | null = null

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard
    if (keyboard) {
      const key = (code: number) => keyboard.addKey(code, true, true)
      const K = Phaser.Input.Keyboard.KeyCodes
      this.keys = {
        up: [key(K.UP), key(K.W)],
        down: [key(K.DOWN), key(K.S)],
        left: [key(K.LEFT), key(K.A)],
        right: [key(K.RIGHT), key(K.D)],
      }
    }

    scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      // worldXY, not screen, so the tap lands on the right tile at any zoom.
      this.pendingTap = worldToTile({ x: pointer.worldX, y: pointer.worldY })
    })
  }

  read(): MovementIntent {
    const tapped = this.pendingTap
    this.pendingTap = null
    return { held: this.heldDirection(), tapped }
  }

  private heldDirection(): Direction | null {
    if (!this.keys) return null
    // Fixed precedence so pressing two keys picks one axis instead of jittering.
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      if (this.keys[direction].some((key) => key.isDown)) return direction
    }
    return null
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_UP)
  }
}
