import Phaser from 'phaser'
import { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { REGISTRY_KEY_ASSETS, SCENE_KEYS } from '../keys'

/**
 * Loads every manifest asset, then fills the gaps with placeholders so the rest
 * of the game can assume a texture always exists for a manifest id.
 *
 * Missing files produce 404s in the network log. That is expected while the art
 * is still being produced; the summary logged at the end is the signal to read.
 */
export class BootScene extends Phaser.Scene {
  private readonly assets = new AssetRegistry()

  constructor() {
    super(SCENE_KEYS.boot)
  }

  preload(): void {
    this.assets.queue(this.load)
  }

  create(): void {
    this.assets.materialisePlaceholders(this.textures)
    this.registry.set(REGISTRY_KEY_ASSETS, this.assets)

    const placeholders = this.assets.placeholderIds()
    const approved = this.assets.approvedIds()
    console.info(
      `[dungeonauts] assets: ${approved.length} approved, ${placeholders.length} placeholder`,
    )
    if (placeholders.length > 0) {
      console.info('[dungeonauts] awaiting production art for:', placeholders.join(', '))
    }

    this.scene.start(SCENE_KEYS.room)
  }
}
