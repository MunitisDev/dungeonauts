import { describe, expect, it } from 'vitest'
import { parseEntity, blocksMovement, entityTexture, type Entity } from '../src/game/entities/entity'
import { GameState, STARTING_HEARTS } from '../src/game/state/GameState'
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
const chest = (): Entity =>
  parseEntity(
    {
      type: 'chest', id: 'c1', at: { tx: 4, ty: 1 },
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
    expect(c.type === 'chest' && c.reward).toEqual({ stars: 1, coins: 0 })
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
    expect(entityTexture(slime(), false)).toBe('slime_green_idle')
    expect(entityTexture(slime(), true)).toBe('slime_green_defeat')
    expect(entityTexture(door(true), false)).toBe('door_wood_closed')
    expect(entityTexture(door(true), true)).toBe('door_wood_open')
    expect(entityTexture(chest(), true)).toBe('chest_open')
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
    expect(outcome).toMatchObject({ kind: 'chest_opened', stars: 3, coins: 10 })
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
