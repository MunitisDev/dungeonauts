import Phaser from 'phaser'
import type { AssetSpec, Direction } from './assetManifest'
import { ASSET_MANIFEST, getAssetSpec, isStatic, rowFrames } from './assetManifest'
import { buildLoadPlan } from './loadPlan'
import { createPlaceholderCanvas } from './placeholder'

export type AssetStatus = 'approved' | 'placeholder'

/**
 * Single point of contact between game code and artwork.
 *
 * Game code asks for a manifest id and never learns whether it got approved art
 * or a placeholder — that is what makes the ChatGPT-produced PNGs a pure file
 * drop: put the file at the manifest path, reload, done.
 */
export class AssetRegistry {
  private readonly missing = new Set<string>()
  private readonly statuses = new Map<string, AssetStatus>()

  /** Queues every manifest asset and records which ones fail to load. */
  queue(loader: Phaser.Loader.LoaderPlugin): void {
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.missing.add(file.key)
    })

    for (const task of buildLoadPlan()) {
      if (task.frameConfig) {
        loader.spritesheet(task.key, task.url, task.frameConfig)
      } else {
        loader.image(task.key, task.url)
      }
    }
  }

  /**
   * Substitutes a placeholder texture for every asset that failed to load.
   * Must run after the loader completes and before any scene uses a texture.
   */
  materialisePlaceholders(textures: Phaser.Textures.TextureManager): void {
    for (const spec of ASSET_MANIFEST) {
      if (!this.missing.has(spec.id)) {
        this.statuses.set(spec.id, 'approved')
        continue
      }
      // A failed load can still leave a stub entry behind.
      if (textures.exists(spec.id)) textures.remove(spec.id)
      this.addPlaceholderTexture(textures, spec)
      this.statuses.set(spec.id, 'placeholder')
    }
  }

  private addPlaceholderTexture(
    textures: Phaser.Textures.TextureManager,
    spec: AssetSpec,
  ): void {
    const texture = textures.addCanvas(spec.id, createPlaceholderCanvas(spec))
    if (!texture) throw new Error(`Could not register placeholder texture "${spec.id}"`)
    if (isStatic(spec)) return

    // Frame the canvas exactly like a loaded spritesheet, so animation code is
    // identical for placeholder and approved art.
    for (let row = 0; row < spec.rows; row++) {
      for (let column = 0; column < spec.columns; column++) {
        texture.add(
          row * spec.columns + column,
          0,
          column * spec.frameWidth,
          row * spec.frameHeight,
          spec.frameWidth,
          spec.frameHeight,
        )
      }
    }
  }

  status(id: string): AssetStatus {
    const status = this.statuses.get(id)
    if (!status) throw new Error(`Asset "${id}" was never resolved — did the boot scene run?`)
    return status
  }

  isPlaceholder(id: string): boolean {
    return this.status(id) === 'placeholder'
  }

  /** Manifest ids currently rendering as placeholders, for dev reporting. */
  placeholderIds(): string[] {
    return [...this.statuses.entries()]
      .filter(([, status]) => status === 'placeholder')
      .map(([id]) => id)
      .sort()
  }

  approvedIds(): string[] {
    return [...this.statuses.entries()]
      .filter(([, status]) => status === 'approved')
      .map(([id]) => id)
      .sort()
  }

  /**
   * Registers a Phaser animation for one directional row of a hero sheet.
   * Not used yet — hero movement is task 3 — but it keeps the SPRITE_SPEC
   * row order in exactly one place.
   */
  registerDirectionalAnimation(
    anims: Phaser.Animations.AnimationManager,
    id: string,
    direction: Direction,
  ): string {
    const spec = getAssetSpec(id)
    const animKey = `${id}:${direction}`
    if (anims.exists(animKey)) return animKey
    anims.create({
      key: animKey,
      frames: rowFrames(spec, direction).map((frame) => ({ key: id, frame })),
      frameRate: spec.frameRate ?? 6,
      repeat: spec.loop ? -1 : 0,
    })
    return animKey
  }
}
