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
 * Fallback render resolution, in logical pixels.
 * 240x160 == 15x10 tiles, the size of a compact room.
 */
export const BASE_WIDTH = 240
export const BASE_HEIGHT = 160

/**
 * Upper bound on integer zoom, so a huge monitor does not render absurd tiles.
 *
 * Ten rather than the old six: the tile halved, so the same apparent size on
 * screen now needs twice the zoom.
 */
export const MAX_ZOOM = 10

/**
 * Smallest a tile may be drawn on a touch screen, in CSS pixels.
 *
 * Tapping a tile is how the game is played, so a tile *is* a touch target. The
 * usual 44px guidance therefore applies to the floor itself, not only to
 * buttons — and on a phone that matters more than fitting the whole room on
 * screen at once.
 */
export const MIN_TOUCH_TILE_PX = 44

/**
 * Fewest tiles that should stay visible across each axis.
 *
 * A soft target, not a hard one: on a short landscape phone it cannot be met at
 * the same time as a tappable tile size, and tappability wins. Five tiles is
 * tight but navigable; a tile too small to hit reliably is not playable at all.
 */
export const MIN_VISIBLE_TILES = 5
