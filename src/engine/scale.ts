import { MAX_ZOOM } from './constants'

/**
 * Largest whole-number zoom at which the base resolution still fits the viewport.
 *
 * Integer-only by design: fractional scaling of pixel art produces uneven
 * texel sizes, which `docs/art/ART_DIRECTION.md` forbids. Clamped to at least 1
 * so a very small viewport crops rather than rendering sub-pixel art.
 */
export function computeIntegerZoom(
  viewportWidth: number,
  viewportHeight: number,
  baseWidth: number,
  baseHeight: number,
  maxZoom: number = MAX_ZOOM,
): number {
  if (baseWidth <= 0 || baseHeight <= 0) throw new Error('Base dimensions must be positive')
  const fit = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight)
  return Math.max(1, Math.min(maxZoom, Math.floor(fit)))
}
