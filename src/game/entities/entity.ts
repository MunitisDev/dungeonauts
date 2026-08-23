import type { Subject } from '../../education'
import type { TileCoord } from '../world/grid'

/**
 * Things placed on top of terrain.
 *
 * Entities are kept out of the tilemap on purpose: a slime is not a kind of
 * floor. Terrain says where you may walk; entities say what is there and what
 * happens when you meet it.
 */
export const ENTITY_TYPES = ['slime', 'key', 'door', 'chest'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

/**
 * The educational gate on an interaction.
 *
 * The room author picks the *shape* of question — subject, skill, difficulty —
 * and never the question itself. That is the boundary `EDUCATIONAL_SYSTEM.md`
 * requires: content stays swappable without touching a room.
 */
export interface ChallengeGate {
  readonly subject: Subject
  readonly skill?: string
  readonly difficulty: number
}

interface EntityBase {
  readonly id: string
  readonly at: TileCoord
}

export interface SlimeEntity extends EntityBase {
  readonly type: 'slime'
  /** Correct answers needed to see it off. Two keeps the encounter short. */
  readonly hits: number
  readonly challenge: ChallengeGate
}

export interface KeyEntity extends EntityBase {
  readonly type: 'key'
  /** Hidden until this entity is resolved, e.g. the slime guarding it. */
  readonly guardedBy?: string
}

export interface DoorEntity extends EntityBase {
  readonly type: 'door'
  readonly requiresKey: boolean
  readonly challenge: ChallengeGate
}

export interface ChestEntity extends EntityBase {
  readonly type: 'chest'
  readonly challenge: ChallengeGate
  readonly reward: { readonly stars: number; readonly coins: number }
}

export type Entity = SlimeEntity | KeyEntity | DoorEntity | ChestEntity

/** Manifest asset id for an entity in a given state. */
export function entityTexture(entity: Entity, resolved: boolean): string {
  switch (entity.type) {
    case 'slime':
      return resolved ? 'slime_green_defeat' : 'slime_green_idle'
    case 'key':
      return 'key_gold'
    case 'door':
      return resolved ? 'door_wood_open' : 'door_wood_closed'
    case 'chest':
      return resolved ? 'chest_open' : 'chest_closed'
  }
}

/**
 * Whether an entity stops the hero walking onto its tile.
 *
 * A key does not: you collect it by stepping on it. Everything else is an
 * obstacle you resolve, which is what makes the challenge feel like the verb
 * that powers the action rather than a quiz that interrupts one.
 */
export function blocksMovement(entity: Entity, resolved: boolean): boolean {
  switch (entity.type) {
    case 'key':
      return false
    case 'slime':
    case 'door':
      return !resolved
    case 'chest':
      return true
  }
}

const isCoord = (value: unknown): value is TileCoord => {
  if (typeof value !== 'object' || value === null) return false
  const { tx, ty } = value as Record<string, unknown>
  return Number.isInteger(tx) && Number.isInteger(ty)
}

function parseGate(value: unknown, label: string): ChallengeGate {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${label}: "challenge" must be an object`)
  }
  const raw = value as Record<string, unknown>
  if (raw['subject'] !== 'math' && raw['subject'] !== 'language') {
    throw new Error(`${label}: "challenge.subject" must be math or language`)
  }
  const difficulty = raw['difficulty']
  if (!Number.isInteger(difficulty) || (difficulty as number) < 1 || (difficulty as number) > 5) {
    throw new Error(`${label}: "challenge.difficulty" must be an integer 1-5`)
  }
  const skill = raw['skill']
  if (skill !== undefined && typeof skill !== 'string') {
    throw new Error(`${label}: "challenge.skill" must be a string when present`)
  }
  return {
    subject: raw['subject'],
    difficulty: difficulty as number,
    ...(typeof skill === 'string' ? { skill } : {}),
  }
}

/** Validates one authored entity. Throws with the room and index named. */
export function parseEntity(value: unknown, roomId: string, index: number): Entity {
  const label = `Room "${roomId}" entity ${index}`
  if (typeof value !== 'object' || value === null) throw new Error(`${label} must be an object`)
  const raw = value as Record<string, unknown>

  const type = raw['type']
  if (!ENTITY_TYPES.includes(type as EntityType)) {
    throw new Error(`${label}: "type" must be one of ${ENTITY_TYPES.join(', ')}`)
  }
  const id = raw['id']
  if (typeof id !== 'string' || id.length === 0) throw new Error(`${label}: "id" is required`)
  if (!isCoord(raw['at'])) throw new Error(`${label}: "at" must have integer tx and ty`)
  const at = raw['at']

  switch (type as EntityType) {
    case 'slime': {
      const hits = raw['hits'] ?? 2
      if (!Number.isInteger(hits) || (hits as number) < 1) {
        throw new Error(`${label}: "hits" must be a positive integer`)
      }
      return { type: 'slime', id, at, hits: hits as number, challenge: parseGate(raw['challenge'], label) }
    }
    case 'key': {
      const guardedBy = raw['guardedBy']
      if (guardedBy !== undefined && typeof guardedBy !== 'string') {
        throw new Error(`${label}: "guardedBy" must be an entity id`)
      }
      return { type: 'key', id, at, ...(typeof guardedBy === 'string' ? { guardedBy } : {}) }
    }
    case 'door':
      return {
        type: 'door',
        id,
        at,
        requiresKey: raw['requiresKey'] === true,
        challenge: parseGate(raw['challenge'], label),
      }
    case 'chest': {
      const reward = (raw['reward'] ?? {}) as Record<string, unknown>
      const stars = reward['stars'] ?? 1
      const coins = reward['coins'] ?? 0
      if (!Number.isInteger(stars) || !Number.isInteger(coins)) {
        throw new Error(`${label}: "reward.stars" and "reward.coins" must be integers`)
      }
      return {
        type: 'chest',
        id,
        at,
        challenge: parseGate(raw['challenge'], label),
        reward: { stars: stars as number, coins: coins as number },
      }
    }
  }
}
