/**
 * Logical world tile.
 *
 * 16, matching the dungeon tileset in `assets/packs/`. It was 32 while the art
 * was placeholder squares and nothing depended on the number; the moment real
 * art arrived, the art's own grid won. `docs/art/TILESET_CATALOGUE.md` sets out
 * what the alternative cost: upscaling every tile x2 and living with a dungeon
 * visibly coarser than its hero.
 *
 * Never derive this from a particular sprite. It is the size of a step.
 */
export const TILE_SIZE = 16

/**
 * Room size, in tiles.
 *
 * 13x9 rather than 15x10, and the two tiles came off for the same reason: a
 * room has to fit on a phone held upright, where the width is what runs out
 * first. Every tile of width costs the whole layout scale.
 */
export const ROOM_TILES_WIDE = 13
export const ROOM_TILES_HIGH = 9

/** Room size in logical pixels. The canvas is exactly this: the room, whole. */
export const BASE_WIDTH = ROOM_TILES_WIDE * TILE_SIZE
export const BASE_HEIGHT = ROOM_TILES_HIGH * TILE_SIZE

/**
 * Upper bound on the scale, in CSS pixels per logical pixel.
 *
 * Ten rather than the old six: the tile halved, so the same apparent size on
 * screen now needs twice the zoom.
 */
export const MAX_ZOOM = 10

/**
 * Highest device-pixel ratio the scale is allowed to reason about.
 *
 * Only a guard against a browser reporting something absurd. Four covers every
 * screen that exists; beyond it the arithmetic stops meaning anything.
 */
export const MAX_PIXEL_RATIO = 4
