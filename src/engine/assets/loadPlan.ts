import type { AssetSpec } from './assetManifest'
import { assetsForStage, assetUrl, isStatic } from './assetManifest'

export interface AssetLoadTask {
  /** Phaser texture key. Always equals the manifest id. */
  readonly key: string
  readonly url: string
  readonly spec: AssetSpec
  /** Slicing config for spritesheets; `null` for single-frame images. */
  readonly frameConfig: { readonly frameWidth: number; readonly frameHeight: number } | null
}

/**
 * Turns the manifest into loader instructions. Pure on purpose: it holds the
 * key/url/slicing decisions and can be tested without booting Phaser.
 *
 * Defaults to the vertical-slice stage: post-slice art is registered in the
 * manifest but must not be downloaded before the feature that needs it exists.
 */
export function buildLoadPlan(
  manifest: readonly AssetSpec[] = assetsForStage('slice'),
): AssetLoadTask[] {
  return manifest.map((spec) => ({
    key: spec.id,
    url: assetUrl(spec),
    spec,
    frameConfig: isStatic(spec)
      ? null
      : { frameWidth: spec.frameWidth, frameHeight: spec.frameHeight },
  }))
}
