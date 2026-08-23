import type { Entity } from '../entities/entity'
import type { GameState } from '../state/GameState'

/**
 * What bumping into an entity should do, decided before anything is rendered.
 *
 * Separating the decision from the effect is what keeps the educational
 * boundary honest: this module works out that a challenge is needed and what
 * shape it should be, the challenge system answers only whether the player was
 * right, and the caller applies the consequence.
 */
export type InteractionPlan =
  | { readonly kind: 'none' }
  /** Picked up on contact, no question asked. */
  | { readonly kind: 'collect'; readonly entity: Entity }
  /** Blocked for a reason the player can fix, e.g. a missing key. */
  | { readonly kind: 'refused'; readonly entity: Entity; readonly reason: 'needs_key' }
  /** Ask a question; a correct answer resolves or advances the entity. */
  | { readonly kind: 'challenge'; readonly entity: Entity }

export function planInteraction(entity: Entity, state: GameState): InteractionPlan {
  if (entity.type === 'key') {
    if (state.isResolved(entity.id)) return { kind: 'none' }
    // A guarded key cannot be taken until its guard is dealt with.
    if (entity.guardedBy && !state.isResolved(entity.guardedBy)) return { kind: 'none' }
    return { kind: 'collect', entity }
  }

  if (state.isResolved(entity.id)) return { kind: 'none' }

  // Doors and chests lock the same way: the key is the permission, the question
  // is still the work. A child without a key is told why, and nothing is spent.
  if ((entity.type === 'door' || entity.type === 'chest') && entity.requiresKey) {
    if (state.keys <= 0) return { kind: 'refused', entity, reason: 'needs_key' }
  }

  return { kind: 'challenge', entity }
}

/**
 * What a correct answer did, so the caller can show it.
 *
 * The educational system never produces one of these — it only reports
 * correctness. The mapping from "right answer" to "the door opens" happens
 * here, in the game.
 */
export type InteractionOutcome =
  | { readonly kind: 'slime_hit'; readonly entity: Entity; readonly hitsLeft: number }
  | { readonly kind: 'slime_defeated'; readonly entity: Entity }
  | { readonly kind: 'door_unlocked'; readonly entity: Entity }
  | { readonly kind: 'chest_opened'; readonly entity: Entity; readonly stars: number; readonly coins: number }

/** Applies the in-world consequence of a correct answer. */
export function applyCorrectAnswer(entity: Entity, state: GameState): InteractionOutcome {
  switch (entity.type) {
    case 'slime': {
      const defeated = state.landHit(entity.id, entity.hits)
      return defeated
        ? { kind: 'slime_defeated', entity }
        : { kind: 'slime_hit', entity, hitsLeft: Math.max(0, entity.hits - state.hitsOn(entity.id)) }
    }
    case 'door': {
      if (entity.requiresKey) state.spendKey()
      state.resolve(entity.id)
      return { kind: 'door_unlocked', entity }
    }
    case 'chest': {
      if (entity.requiresKey) state.spendKey()
      state.resolve(entity.id)
      state.award(entity.reward)
      return { kind: 'chest_opened', entity, stars: entity.reward.stars, coins: entity.reward.coins }
    }
    case 'key':
      throw new Error('A key is collected, never answered for')
  }
}
