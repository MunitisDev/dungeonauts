import type { Direction } from '../../engine/assets/assetManifest'
import type { TileCoord } from '../world/grid'

export type { Direction }

/**
 * Grid offset for each facing.
 *
 * `down` is +y because the world is top-down with y growing downward, matching
 * the directional row order in `docs/art/SPRITE_SPEC.md` § 3.
 */
export const DIRECTION_VECTORS: Readonly<Record<Direction, { dx: number; dy: number }>> = {
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
}

export function neighbour(coord: TileCoord, direction: Direction): TileCoord {
  const { dx, dy } = DIRECTION_VECTORS[direction]
  return { tx: coord.tx + dx, ty: coord.ty + dy }
}

/**
 * Facing implied by a single-tile move, or `null` if the tiles are not
 * orthogonally adjacent.
 */
export function directionBetween(from: TileCoord, to: TileCoord): Direction | null {
  const dx = to.tx - from.tx
  const dy = to.ty - from.ty
  for (const [direction, vector] of Object.entries(DIRECTION_VECTORS)) {
    if (vector.dx === dx && vector.dy === dy) return direction as Direction
  }
  return null
}

export function sameTile(a: TileCoord, b: TileCoord): boolean {
  return a.tx === b.tx && a.ty === b.ty
}
