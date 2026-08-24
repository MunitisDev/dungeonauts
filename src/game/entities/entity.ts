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
export const ENTITY_TYPES = ['slime', 'key', 'door', 'chest', 'mechanism', 'trapdoor'] as const
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

/**
 * What kind of creature a `slime` actually is.
 *
 * The type is called `slime` because that is what the rooms and the saved games
 * say, and renaming it is a content migration. The tileset has no slime, so it
 * is drawn as one of these three.
 */
export const CREATURES = ['snake', 'bat', 'ghost'] as const
export type Creature = (typeof CREATURES)[number]

export interface SlimeEntity extends EntityBase {
  readonly type: 'slime'
  /** Correct answers needed to see it off. Two keeps the encounter short. */
  readonly hits: number
  readonly challenge: ChallengeGate
  readonly creature: Creature
  /** Left behind when it is seen off. */
  readonly drop: Reward
}

export interface KeyEntity extends EntityBase {
  readonly type: 'key'
  /** Hidden until this entity is resolved, e.g. the slime guarding it. */
  readonly guardedBy?: string
}

/**
 * Which wall a door stands in, which decides what it looks like.
 *
 * Not a compass bearing but a point of view: `top` is the far wall of the room
 * and `bottom` the near one, and the two are drawn nothing like each other.
 */
export const DOOR_ORIENTATIONS = ['top', 'bottom', 'left', 'right'] as const
export type DoorOrientation = (typeof DOOR_ORIENTATIONS)[number]

export interface DoorEntity extends EntityBase {
  readonly type: 'door'
  readonly requiresKey: boolean
  /**
   * The wall the door stands in. Each of the four is drawn its own way, so a
   * door meant for one of them looks wrong in any of the others.
   */
  readonly orientation: DoorOrientation
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

/**
 * The way down to the next floor of the dungeon.
 *
 * Not a challenge of its own: it asks nothing and cannot be answered. It opens
 * when the lever named by `openedBy` has been thrown, somewhere else in the
 * maze, and stepping on it once open is what finishes the floor.
 */
export interface TrapdoorEntity extends EntityBase {
  readonly type: 'trapdoor'
  /** Id of the mechanism whose lever opens it. */
  readonly openedBy: string
  /** Going down it completes the floor. */
  readonly goal?: boolean
}

export type Entity =
  | SlimeEntity
  | KeyEntity
  | DoorEntity
  | ChestEntity
  | MechanismEntity
  | TrapdoorEntity

/**
 * Which drawing an entity gets, in a given state.
 *
 * The creature is a snake rather than a slime: the tileset ships a bat, a snake
 * and two ghosts, and no slime. The entity is still called `slime` in the data
 * because that is what the rooms and the saves say; renaming it is a content
 * migration, not an art decision.
 */
const CREATURE_ART: Readonly<Record<Creature, { idle: Art; defeated: Art }>> = {
  snake: { idle: ANIMS.snakeIdle[0] as Art, defeated: ANIMS.snakeDefeated[0] as Art },
  bat: { idle: ANIMS.batIdle[0] as Art, defeated: ANIMS.batDefeated[0] as Art },
  ghost: { idle: ANIMS.ghostIdle[0] as Art, defeated: ANIMS.ghostDefeated[0] as Art },
}

/** The door drawn for a wall, with no entity involved. */
export function doorArt(wall: DoorOrientation): Art {
  return DOOR_ART[wall]
}

const DOOR_ART: Readonly<Record<DoorOrientation, Art>> = {
  top: PROPS.doorTop,
  bottom: PROPS.doorBottom,
  left: PROPS.doorLeft,
  right: PROPS.doorRight,
}

export function entityArt(entity: Entity, resolved: boolean): Art {
  switch (entity.type) {
    case 'slime': {
      const art = CREATURE_ART[entity.creature]
      return resolved ? art.defeated : art.idle
    }
    case 'key':
      return PROPS.keyGold
    case 'door':
      // An opened door is simply a gap in the wall; the tileset has no open
      // door, and a doorway you can walk through reads as open without one.
      return DOOR_ART[entity.orientation]
    case 'chest':
      return entity.goal
        ? (resolved ? PROPS.chestGoalOpen : PROPS.chestGoalClosed)
        : (resolved ? PROPS.chestOpen : PROPS.chestClosed)
    case 'mechanism':
      return resolved ? PROPS.leverOn : PROPS.leverOff
    case 'trapdoor':
      // `resolved` here means "open", which the scene works out from the lever
      // rather than from the trapdoor itself.
      return resolved ? PROPS.trapdoorOpen : PROPS.trapdoorShut
  }
}

/** Animation key to play for an entity, when its art moves. */
export function entityAnimation(entity: Entity, resolved: boolean): string | undefined {
  if (entity.type !== 'slime') return undefined
  return `${entity.creature}_${resolved ? 'defeated' : 'idle'}`
}

/** What a defeated creature leaves lying on its tile, if anything. */
export interface Drop {
  readonly art: Art
  readonly anim?: string
}

/**
 * How the run remembers that a creature's drop has been picked up.
 *
 * Derived from the creature's own id rather than being an entity of its own:
 * it goes into the same resolved set as everything else, so it survives a save
 * without the save format having to learn about drops.
 */
export function dropId(entityId: string): string {
  return `drop_${entityId}`
}

/**
 * The thing a creature leaves behind.
 *
 * The creature fades and its reward stays where it stood, to be walked over.
 * That is the whole beat: beat it, see what it gave, go and get it. The heart
 * matters more than the coins, so it is what gets shown when both are due — a
 * child reads one object, not a pile, and picking it up pays for both.
 *
 * A guarded key is not here. It is already an entity of its own, revealed on
 * the same beat and picked up the same way.
 */
export function entityDrop(entity: Entity): Drop | undefined {
  if (entity.type !== 'slime') return undefined
  if (entity.drop.hearts > 0) return { art: PROPS.dropHeart }
  if (entity.drop.coins > 0) return { art: PROPS.dropCoin, anim: 'coin' }
  return undefined
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
    // You step onto the way down; it is a doorway in the floor, not furniture.
    case 'trapdoor':
      return false
  }
}

/** True when finishing this entity counts towards completing the floor. */
export function isGoal(entity: Entity): boolean {
  if (entity.type === 'trapdoor') return entity.goal === true
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
      const creature = raw['creature'] ?? 'snake'
      if (!CREATURES.includes(creature as Creature)) {
        throw new Error(`${label}: "creature" must be one of ${CREATURES.join(', ')}`)
      }
      return {
        type: 'slime',
        id,
        at,
        hits: hits as number,
        challenge: parseGate(raw['challenge'], label),
        creature: creature as Creature,
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
    case 'door': {
      const orientation = raw['orientation'] ?? 'top'
      if (!DOOR_ORIENTATIONS.includes(orientation as DoorOrientation)) {
        throw new Error(`${label}: "orientation" must be one of ${DOOR_ORIENTATIONS.join(', ')}`)
      }
      return {
        type: 'door',
        id,
        at,
        requiresKey: raw['requiresKey'] === true,
        orientation: orientation as DoorOrientation,
        challenge: parseGate(raw['challenge'], label),
      }
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
    case 'trapdoor': {
      const openedBy = raw['openedBy']
      if (typeof openedBy !== 'string' || openedBy.length === 0) {
        throw new Error(`${label}: a trapdoor needs "openedBy", the id of the lever that opens it`)
      }
      return {
        type: 'trapdoor',
        id,
        at,
        openedBy,
        ...(raw['goal'] === true ? { goal: true as const } : {}),
      }
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
