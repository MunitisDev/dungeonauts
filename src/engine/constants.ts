/** Logical world tile, per `docs/art/SPRITE_SPEC.md` § 1. Never derive this from art. */
export const TILE_SIZE = 32

/**
 * Base render resolution, in logical pixels, before integer scaling.
 * 480x320 == 15x10 tiles, which is one screenful of a compact room.
 */
export const BASE_WIDTH = 480
export const BASE_HEIGHT = 320

/** Upper bound on integer zoom, so a huge monitor does not render absurd tiles. */
export const MAX_ZOOM = 6
