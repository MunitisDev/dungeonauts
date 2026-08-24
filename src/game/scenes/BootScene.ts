import Phaser from 'phaser'
import { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { ANIMS, loadTileset, type Art } from '../../engine/assets/tileset'
import { EVENT_TILESET_READY } from '../run'
import { REGISTRY_KEY_ASSETS, SCENE_KEYS } from '../keys'

/**
 * Brings up the artwork: the packed dungeon tileset first, then the manifest
 * assets, then placeholders for whatever is still missing.
 *
 * The pack has to be fetched and unpacked before Phaser can be handed anything,
 * which is why it happens in `create` rather than `preload` — the loader is
 * restarted once the sheets exist. Missing manifest files produce 404s in the
 * network log; that is expected while the rest of the art is being produced.
 */
export class BootScene extends Phaser.Scene {
  private readonly assets = new AssetRegistry()

  constructor() {
    super(SCENE_KEYS.boot)
  }

  preload(): void {
    // The manifest assets are not queued: nothing in the world draws them any
    // more, and asking for 28 files that do not exist means 28 404s on every
    // boot. The manifest still governs the character portraits and is still
    // held to the documents by the tests; one line brings it back the day art
    // lands at those paths.
    this.assets.materialisePlaceholders(this.textures)
  }

  create(): void {
    this.registry.set(REGISTRY_KEY_ASSETS, this.assets)
    void this.bringUpTileset().then(() => this.scene.start(SCENE_KEYS.room))
  }

  /**
   * Unpacks the tileset and registers its animations.
   *
   * A failure here is fatal to how the game looks but not to whether it runs,
   * so it is reported and stepped over: a dungeon of magenta placeholders is
   * still playable, and a black screen is not.
   */
  private async bringUpTileset(): Promise<void> {
    try {
      const base = (import.meta.env.BASE_URL as string | undefined) ?? '/'
      const pack = await loadTileset(this.load, base)
      console.info(`[dungeonauts] tileset: ${String(pack.sheets.size)} sheets, ${String(pack.tile)}px cells`)
      this.registerAnimations()
      // The shell wants the sheets too, to cut HUD icons out of them.
      this.game.events.emit(EVENT_TILESET_READY, pack)
    } catch (error) {
      console.error('[dungeonauts] the tileset could not be unpacked:', error)
    }
  }

  private registerAnimations(): void {
    const define = (key: string, frames: readonly Art[], frameRate: number, repeat = -1) => {
      if (this.anims.exists(key)) return
      this.anims.create({
        key,
        frames: frames.map((art) => ({ key: art.key, frame: art.frame })),
        frameRate,
        repeat,
      })
    }
    define('snake_idle', ANIMS.snakeIdle, 6)
    define('snake_defeated', ANIMS.snakeDefeated, 4)
    define('bat_idle', ANIMS.batIdle, 8)
    define('bat_defeated', ANIMS.batDefeated, 5)
    define('ghost_idle', ANIMS.ghostIdle, 5)
    define('ghost_defeated', ANIMS.ghostDefeated, 4)
    define('torch', ANIMS.torch, 8)
    define('coin', ANIMS.coin, 8)
    define('knight_idle_right', ANIMS.knightIdleRight, 4)
    define('knight_idle_left', ANIMS.knightIdleLeft, 4)
    define('knight_walk_right', ANIMS.knightWalkRight, 8)
    define('knight_walk_left', ANIMS.knightWalkLeft, 8)
  }
}
