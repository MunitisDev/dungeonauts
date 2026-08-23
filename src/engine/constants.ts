/** Logical world tile, per `docs/art/SPRITE_SPEC.md` § 1. Never derive this from art. */
export const TILE_SIZE = 32

/**
 * Fallback render resolution, in logical pixels.
 * 480x320 == 15x10 tiles, the size of a compact room.
 */
export const BASE_WIDTH = 480
export const BASE_HEIGHT = 320

/** Upper bound on integer zoom, so a huge monitor does not render absurd tiles. */
export const MAX_ZOOM = 6

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
