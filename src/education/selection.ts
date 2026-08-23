/**
 * Selection helpers for the educational system.
 *
 * The generator lives in `core/` because the dungeon layout needs the same
 * reproducibility, and neither side should own a private copy of it.
 */
export { createRandom, pick } from '../core/random'
