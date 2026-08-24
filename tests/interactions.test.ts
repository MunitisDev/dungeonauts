import { describe, expect, it } from 'vitest'
import {
  parseEntity,
  blocksMovement,
  entityArt,
  entityDrop,
  isGoal,
  type Entity,
} from '../src/game/entities/entity'
import { GameState, MAX_HEARTS, STARTING_HEARTS } from '../src/game/state/GameState'
import { applyCorrectAnswer, planInteraction } from '../src/game/interaction/interactions'

const slime = (): Entity =>
  parseEntity(
    { type: 'slime', id: 's1', at: { tx: 1, ty: 1 }, hits: 2, challenge: { subject: 'math', difficulty: 1 } },
    'r',
    0,
  )
const key = (guardedBy?: string): Entity =>
  parseEntity({ type: 'key', id: 'k1', at: { tx: 2, ty: 1 }, ...(guardedBy ? { guardedBy } : {}) }, 'r', 0)
const door = (requiresKey: boolean): Entity =>
  parseEntity(
    { type: 'door', id: 'd1', at: { tx: 3, ty: 1 }, requiresKey, challenge: { subject: 'language', difficulty: 2 } },
    'r',
    0,
  )
const chest = (requiresKey = false): Entity =>
  parseEntity(
    {
      type: 'chest', id: 'c1', at: { tx: 4, ty: 1 }, requiresKey,
      challenge: { subject: 'language', difficulty: 2 },
      reward: { stars: 3, coins: 10 },
    },
    'r',
    0,
  )

describe('entity parsing', () => {
  it('defaults a slime to two hits and a chest to one star', () => {
    const s = parseEntity({ type: 'slime', id: 's', at: { tx: 0, ty: 0 }, challenge: { subject: 'math', difficulty: 1 } }, 'r', 0)
    expect(s.type === 'slime' && s.hits).toBe(2)
    const c = parseEntity({ type: 'chest', id: 'c', at: { tx: 0, ty: 0 }, challenge: { subject: 'math', difficulty: 1 } }, 'r', 0)
    expect(c.type === 'chest' && c.reward).toEqual({ stars: 1, coins: 0, hearts: 0 })
  })

  it('names the room and index in every error', () => {
    expect(() => parseEntity({ type: 'ghost', id: 'g', at: { tx: 0, ty: 0 } }, 'room_09', 3)).toThrow(
      /Room "room_09" entity 3/,
    )
  })

  it('rejects a bad challenge gate', () => {
    const at = { tx: 0, ty: 0 }
    expect(() => parseEntity({ type: 'door', id: 'd', at, challenge: { subject: 'art', difficulty: 1 } }, 'r', 0))
      .toThrow(/math or language/)
    expect(() => parseEntity({ type: 'door', id: 'd', at, challenge: { subject: 'math', difficulty: 9 } }, 'r', 0))
      .toThrow(/difficulty/)
  })

  it('blocks movement for everything except a key', () => {
    expect(blocksMovement(key(), false)).toBe(false)
    expect(blocksMovement(slime(), false)).toBe(true)
    expect(blocksMovement(slime(), true)).toBe(false)
    expect(blocksMovement(door(true), false)).toBe(true)
    expect(blocksMovement(door(true), true)).toBe(false)
    // A chest stays solid once open: it is furniture, not a doorway.
    expect(blocksMovement(chest(), true)).toBe(true)
  })

  it('maps each entity state to a manifest asset', () => {
    // Every state draws something, and the two states never draw the same
    // thing: a chest that looked identical open and shut would be a bug the
    // player meets, not the test.
    for (const entity of [slime(), chest(), mechanism()]) {
      const shut = entityArt(entity, false)
      const done = entityArt(entity, true)
      expect(shut.key, entity.type).toBeTruthy()
      expect(`${shut.key}#${String(shut.frame)}`, entity.type)
        .not.toBe(`${done.key}#${String(done.frame)}`)
    }
    // A door is the exception: there is no open-door drawing, and none is
    // needed — the scene hides it, and a doorway you can walk through reads as
    // open on its own.
    expect(entityArt(door(true), true)).toEqual(entityArt(door(true), false))
  })
})

describe('GameState', () => {
  it('starts with hearts and nothing else', () => {
    const state = new GameState()
    expect(state.totals()).toEqual({ hearts: STARTING_HEARTS, keys: 0, stars: 0, coins: 0 })
  })

  it('needs every hit before a slime is done', () => {
    const state = new GameState()
    expect(state.landHit('s1', 2)).toBe(false)
    expect(state.isResolved('s1')).toBe(false)
    expect(state.landHit('s1', 2)).toBe(true)
    expect(state.isResolved('s1')).toBe(true)
  })

  it('counts a key once, however many times it is collected', () => {
    const state = new GameState()
    state.collectKey('k1')
    state.collectKey('k1')
    expect(state.keys).toBe(1)
  })

  it('will not spend a key it does not have', () => {
    const state = new GameState()
    expect(state.spendKey()).toBe(false)
    state.collectKey('k1')
    expect(state.spendKey()).toBe(true)
    expect(state.keys).toBe(0)
  })

  it('never drops hearts below zero', () => {
    const state = new GameState()
    for (let i = 0; i < 10; i++) state.loseHeart()
    expect(state.hearts).toBe(0)
  })
})

describe('planInteraction', () => {
  it('collects an unguarded key on contact', () => {
    expect(planInteraction(key(), new GameState()).kind).toBe('collect')
  })

  it('ignores a key whose guard is still standing', () => {
    const state = new GameState()
    expect(planInteraction(key('s1'), state).kind).toBe('none')
    state.resolve('s1')
    expect(planInteraction(key('s1'), state).kind).toBe('collect')
  })

  it('ignores anything already resolved', () => {
    const state = new GameState()
    state.resolve('d1')
    expect(planInteraction(door(false), state).kind).toBe('none')
  })

  it('refuses a locked door without a key, rather than asking a question', () => {
    const state = new GameState()
    const plan = planInteraction(door(true), state)
    expect(plan).toEqual({ kind: 'refused', entity: door(true), reason: 'needs_key' })
  })

  it('asks a question once the key is in hand', () => {
    const state = new GameState()
    state.collectKey('k1')
    expect(planInteraction(door(true), state).kind).toBe('challenge')
  })

  it('asks a question for a slime and a chest', () => {
    const state = new GameState()
    expect(planInteraction(slime(), state).kind).toBe('challenge')
    expect(planInteraction(chest(), state).kind).toBe('challenge')
  })
})

describe('applyCorrectAnswer', () => {
  it('takes two right answers to see off a two-hit slime', () => {
    const state = new GameState()
    const first = applyCorrectAnswer(slime(), state)
    expect(first.kind).toBe('slime_hit')
    expect(first.kind === 'slime_hit' && first.hitsLeft).toBe(1)

    const second = applyCorrectAnswer(slime(), state)
    expect(second.kind).toBe('slime_defeated')
    expect(state.isResolved('s1')).toBe(true)
  })

  it('unlocks a door and spends the key', () => {
    const state = new GameState()
    state.collectKey('k1')
    const outcome = applyCorrectAnswer(door(true), state)
    expect(outcome.kind).toBe('door_unlocked')
    expect(state.keys).toBe(0)
    expect(state.isResolved('d1')).toBe(true)
  })

  it('does not spend a key on a door that never needed one', () => {
    const state = new GameState()
    state.collectKey('k1')
    applyCorrectAnswer(door(false), state)
    expect(state.keys).toBe(1)
  })

  it('opens a chest and pays out', () => {
    const state = new GameState()
    const outcome = applyCorrectAnswer(chest(), state)
    expect(outcome).toMatchObject({ kind: 'chest_opened', gained: { stars: 3, coins: 10 } })
    expect(state.totals()).toMatchObject({ stars: 3, coins: 10 })
  })

  it('refuses to answer for a key', () => {
    expect(() => applyCorrectAnswer(key(), new GameState())).toThrow(/collected, never answered/)
  })
})

/**
 * The reason the whole educational layer is separable: nothing above produced a
 * question, and nothing in `education/` decided a door should open.
 */
describe('the game decides consequences, not the challenge system', () => {
  it('drives every outcome from the entity, never from the answer', () => {
    const state = new GameState()
    state.collectKey('k1')
    const outcomes = [slime(), door(true), chest()].map((entity) => {
      const fresh = new GameState()
      fresh.collectKey('k1')
      return applyCorrectAnswer(entity, fresh).kind
    })
    // The same "correct" produced three different in-world results.
    expect(new Set(outcomes).size).toBe(3)
  })
})

/*
 * Locked chests are how a key becomes worth carrying: the generated dungeon
 * seals its treasure rooms and its way out behind one, so the rules here have
 * to match the rules for a door exactly.
 */
describe('locked chests', () => {
  it('refuses to open without a key, and spends nothing', () => {
    const state = new GameState()
    const plan = planInteraction(chest(true), state)
    expect(plan).toMatchObject({ kind: 'refused', reason: 'needs_key' })
    expect(state.keys).toBe(0)
  })

  it('asks the question once a key is in hand', () => {
    const state = new GameState()
    state.collectKey('k1')
    expect(planInteraction(chest(true), state).kind).toBe('challenge')
  })

  it('spends the key only when the chest actually opens', () => {
    const state = new GameState()
    state.collectKey('k1')
    applyCorrectAnswer(chest(true), state)
    expect(state.keys).toBe(0)
    expect(state.stars).toBe(3)
  })

  it('leaves an unlocked chest free', () => {
    const state = new GameState()
    state.collectKey('k1')
    applyCorrectAnswer(chest(false), state)
    expect(state.keys).toBe(1)
  })
})

const mechanism = (): Entity =>
  parseEntity(
    {
      type: 'mechanism', id: 'm1', at: { tx: 6, ty: 2 },
      challenge: { subject: 'math', difficulty: 1 },
      reward: { coins: 2 },
    },
    'r',
    0,
  )

/*
 * The puzzle alternative to a fight. Every room asks for something, and a
 * dungeon whose only verb was "beat the monster" would be relentless.
 */
describe('mechanisms', () => {
  it('asks a question, like any other obstacle', () => {
    expect(planInteraction(mechanism(), new GameState()).kind).toBe('challenge')
  })

  it('lights up and pays out on a correct answer', () => {
    const state = new GameState()
    const outcome = applyCorrectAnswer(mechanism(), state)
    expect(outcome.kind).toBe('mechanism_activated')
    expect(state.isResolved('m1')).toBe(true)
    expect(state.coins).toBe(2)
  })

  it('never needs a key', () => {
    expect(planInteraction(mechanism(), new GameState()).kind).not.toBe('refused')
  })

  it('stays solid, so walking into it is what triggers it', () => {
    expect(blocksMovement(mechanism(), false)).toBe(true)
    expect(blocksMovement(mechanism(), true)).toBe(true)
  })

  it('shows a different sprite once lit', () => {
    expect(entityArt(mechanism(), false)).not.toEqual(entityArt(mechanism(), true))
  })

  it('is asked for again after nothing: resolving is permanent', () => {
    const state = new GameState()
    applyCorrectAnswer(mechanism(), state)
    expect(planInteraction(mechanism(), state).kind).toBe('none')
  })
})

/*
 * Hearts are the one reward with a ceiling, which is what makes finding one
 * feel like a rescue rather than a number going up.
 */
describe('hearts as a reward', () => {
  it('is handed out by a defeated creature', () => {
    const state = new GameState()
    state.loseHeart()
    const slime = parseEntity(
      {
        type: 'slime', id: 's9', at: { tx: 2, ty: 2 }, hits: 1,
        challenge: { subject: 'math', difficulty: 1 },
        drop: { coins: 3, hearts: 1 },
      },
      'r',
      0,
    )
    const outcome = applyCorrectAnswer(slime, state)
    expect(outcome).toMatchObject({ kind: 'slime_defeated', gained: { heartsGained: 1 } })
    expect(state.hearts).toBe(STARTING_HEARTS)
    expect(state.coins).toBe(3)
  })

  it('reports nothing gained when the player is already full', () => {
    const state = new GameState()
    state.gainHearts(MAX_HEARTS)
    expect(state.hearts).toBe(MAX_HEARTS)
    const { heartsGained } = state.award({ hearts: 2 })
    expect(heartsGained).toBe(0)
    expect(state.hearts).toBe(MAX_HEARTS)
  })

  it('never lets a run exceed the cap', () => {
    const state = new GameState()
    state.award({ hearts: 99 })
    expect(state.hearts).toBe(MAX_HEARTS)
  })
})

describe('the way down', () => {
  const trapdoor = (openedBy = 'rune_r2'): Entity =>
    parseEntity(
      { type: 'trapdoor', id: 't1', at: { tx: 5, ty: 1 }, openedBy, goal: true },
      'r',
      0,
    )

  it('needs a lever to name', () => {
    expect(() => parseEntity({ type: 'trapdoor', id: 't1', at: { tx: 5, ty: 1 } }, 'r', 0)).toThrow(
      /openedBy/,
    )
  })

  // It is a doorway in the floor, so you walk onto it rather than into it —
  // shut or open, it never stops the hero.
  it('does not stand in the hero\'s way', () => {
    expect(blocksMovement(trapdoor(), false)).toBe(false)
    expect(blocksMovement(trapdoor(), true)).toBe(false)
  })

  // Whether it is open is the room's business, not a question's.
  it('is never offered as a challenge', () => {
    expect(planInteraction(trapdoor(), new GameState())).toEqual({ kind: 'none' })
  })

  it('is what finishes the floor', () => {
    expect(isGoal(trapdoor())).toBe(true)
    expect(isGoal(chest())).toBe(false)
  })

  // Shut and open have to be different drawings, or a child cannot tell that
  // throwing the lever did anything.
  it('is drawn differently shut and open', () => {
    const shut = entityArt(trapdoor(), false)
    const open = entityArt(trapdoor(), true)
    expect(`${shut.key}#${String(shut.frame)}`).not.toBe(`${open.key}#${String(open.frame)}`)
  })
})

describe('what a beaten creature leaves behind', () => {
  const creature = (drop: Record<string, number>): Entity =>
    parseEntity(
      {
        type: 'slime', id: 's9', at: { tx: 1, ty: 1 }, hits: 1,
        challenge: { subject: 'math', difficulty: 1 },
        drop,
      },
      'r',
      0,
    )

  it('shows the heart when it gave one, whatever else it gave', () => {
    const heart = entityDrop(creature({ coins: 4, hearts: 1 }))
    const coins = entityDrop(creature({ coins: 4, hearts: 0 }))
    expect(heart).toBeDefined()
    expect(coins).toBeDefined()
    expect(heart?.art).not.toEqual(coins?.art)
  })

  it('leaves nothing when it gave nothing', () => {
    expect(entityDrop(creature({ coins: 0, hearts: 0 }))).toBeUndefined()
  })

  it('is only ever a creature that leaves something', () => {
    expect(entityDrop(chest())).toBeUndefined()
    expect(entityDrop(key())).toBeUndefined()
  })
})
