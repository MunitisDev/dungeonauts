import { TILE_SIZE } from '../../engine/constants'

export interface TileCoord {
  readonly tx: number
  readonly ty: number
}

export interface WorldPoint {
  readonly x: number
  readonly y: number
}

/** Top-left world pixel of a tile — the placement point for grid tiles. */
export function tileToWorldTopLeft({ tx, ty }: TileCoord): WorldPoint {
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE }
}

/** Geometric centre of a tile. */
export function tileToWorldCenter({ tx, ty }: TileCoord): WorldPoint {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 }
}

/**
 * Placement point for a bottom-center anchored entity standing on a tile
 * (SPRITE_SPEC.md § 2): horizontally centred, vertically on the tile's floor
 * line. A 32x40 hero or 32x48 door then overhangs upward without misaligning.
 */
export function tileToWorldAnchor({ tx, ty }: TileCoord): WorldPoint {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: (ty + 1) * TILE_SIZE }
}

/** Tile containing a world point. Negative coordinates floor away from zero. */
export function worldToTile({ x, y }: WorldPoint): TileCoord {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) }
}

/** Phaser origin pair for each anchor convention in the manifest. */
export const ANCHOR_ORIGIN = {
  'bottom-center': { x: 0.5, y: 1 },
  'top-left': { x: 0, y: 0 },
  center: { x: 0.5, y: 0.5 },
} as const
