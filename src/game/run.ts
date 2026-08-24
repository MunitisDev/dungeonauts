import type { Profile } from './state/Profile'
import type { RunTotals } from './state/GameState'
import type { SavedRun } from './state/SaveStore'

/** Asks the world to begin, either fresh or from a save. */
export interface RunRequest {
  readonly profile: Profile
  /** Seed the dungeon is generated from. Same seed, same dungeon. */
  readonly seed: number
  /** Floor of the dungeon to build. The first is 1. */
  readonly floor?: number
  /**
   * Hearts, keys, stars and coins to carry into a new floor.
   *
   * Not a save: a new floor is a new maze with nothing resolved in it. This is
   * only what the child is carrying down the ladder.
   */
  readonly carry?: RunTotals
  /** Present when continuing rather than starting over. */
  readonly restore?: SavedRun
}

/**
 * Events between the DOM shell and the world.
 *
 * The shell owns the screens before play (title, onboarding, character select)
 * and tells the world when to start; the world reports back what it built. Kept
 * as events rather than a direct call because the scene may not exist yet when
 * the shell is ready.
 */
export const EVENT_START_RUN = 'dungeonauts:start-run'
/** Raised once the world can accept a run request. */
export const EVENT_WORLD_READY = 'dungeonauts:world-ready'
export const EVENT_ROOM_READY = 'dungeonauts:room-ready'
export const EVENT_RUN_SAVED = 'dungeonauts:run-saved'
/** Carries the unpacked tileset to the DOM shell, which cuts HUD icons from it. */
export const EVENT_TILESET_READY = 'dungeonauts:tileset-ready'
