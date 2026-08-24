import { ANIMS, PROPS, type Art } from '../../engine/assets/tileset'
import type { Subject } from '../../education'
import type { TileCoord } from '../world/grid'

/**
 * Things placed on top of terrain.
 *
 * Entities are kept out of the tilemap on purpose: a slime is not a kind of
 * floor. Terrain says where you may walk; entities say what is there and what
 * happens when you meet it.
 */
export const ENTITY_TYPES = ['slime', 'key', 'door', 'chest', 'mechanism'] as const
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

/**
 * What dealing with something gives you.
 *
 * One shape for chests and for what a defeated creature leaves behind, so the
 * game has a single place that turns "you did it" into hearts, coins and stars
 * rather than a special case per entity.
 */
export interface Reward {
  readonly stars: number
  readonly coins: number
  /** Hearts, capped by `MAX_HEARTS`; a full player simply gains nothing. */
  readonly hearts: number
}

export const NO_REWARD: Reward = { stars: 0, coins: 0, hearts: 0 }

export interface SlimeEntity extends EntityBase {
  readonly type: 'slime'
  /** Correct answers needed to see it off. Two keeps the encounter short. */
  readonly hits: number
  readonly challenge: ChallengeGate
  /** Left behind when it is seen off. */
  readonly drop: Reward
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
  /** A locked chest needs a key as well as a right answer. */
  readonly requiresKey: boolean
  readonly reward: Reward
  /** Resolving every goal entity completes the dungeon. */
  readonly goal?: boolean
}

/**
 * A rune pedestal: a puzzle with no fight in it.
 *
 * Every room asks the child for something before it lets them on, and a room
 * whose only answer was "beat the monster" would make the dungeon relentless.
 * A mechanism is the quiet version of the same beat — one question, one thing
 * lights up, the way opens.
 */
export interface MechanismEntity extends EntityBase {
  readonly type: 'mechanism'
  readonly challenge: ChallengeGate
  readonly reward: Reward
}

export type Entity = SlimeEntity | KeyEntity | DoorEntity | ChestEntity | MechanismEntity

/**
 * Which drawing an entity gets, in a given state.
 *
 * The creature is a snake rather than a slime: the tileset ships a bat, a snake
 * and two ghosts, and no slime. The entity is still called `slime` in the data
 * because that is what the rooms and the saves say; renaming it is a content
 * migration, not an art decision.
 */
export function entityArt(entity: Entity, resolved: boolean): Art {
  switch (entity.type) {
    case 'slime':
      return (resolved ? ANIMS.snakeDefeated[0] : ANIMS.snakeIdle[0]) as Art
    case 'key':
      return PROPS.keyGold
    case 'door':
      return resolved ? PROPS.doorOpen : PROPS.doorClosed
    case 'chest':
      return entity.goal
        ? (resolved ? PROPS.chestGoalOpen : PROPS.chestGoalClosed)
        : (resolved ? PROPS.chestOpen : PROPS.chestClosed)
    case 'mechanism':
      return resolved ? PROPS.leverOn : PROPS.leverOff
  }
}

/** Animation key to play for an entity, when its art moves. */
export function entityAnimation(entity: Entity, resolved: boolean): string | undefined {
  if (entity.type !== 'slime') return undefined
  return resolved ? 'snake_defeated' : 'snake_idle'
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
    case 'mechanism':
      return true
  }
}

/** True when finishing this entity counts towards completing the dungeon. */
export function isGoal(entity: Entity): boolean {
  return entity.type === 'chest' && entity.goal === true
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
      return {
        type: 'slime',
        id,
        at,
        hits: hits as number,
        challenge: parseGate(raw['challenge'], label),
        drop: parseReward(raw['drop'], label, { stars: 0, coins: 2, hearts: 0 }),
      }
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
    case 'chest':
      return {
        type: 'chest',
        id,
        at,
        challenge: parseGate(raw['challenge'], label),
        requiresKey: raw['requiresKey'] === true,
        reward: parseReward(raw['reward'], label, { stars: 1, coins: 0, hearts: 0 }),
        ...(raw['goal'] === true ? { goal: true } : {}),
      }
    case 'mechanism':
      return {
        type: 'mechanism',
        id,
        at,
        challenge: parseGate(raw['challenge'], label),
        reward: parseReward(raw['reward'], label, { stars: 0, coins: 1, hearts: 0 }),
      }
  }
}

/** Validates a reward, filling in whatever the author left out. */
function parseReward(value: unknown, label: string, fallback: Reward): Reward {
  if (value === undefined) return fallback
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${label}: a reward must be an object`)
  }
  const raw = value as Record<string, unknown>
  const read = (key: keyof Reward): number => {
    const given = raw[key]
    if (given === undefined) return fallback[key]
    if (!Number.isInteger(given) || (given as number) < 0) {
      throw new Error(`${label}: "${key}" must be a whole number, zero or more`)
    }
    return given as number
  }
  return { stars: read('stars'), coins: read('coins'), hearts: read('hearts') }
}
