// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { parseSave, SaveStore, type SavedRun } from '../src/game/state/SaveStore'
import type { Profile } from '../src/game/state/Profile'
import { GameState } from '../src/game/state/GameState'

const profile: Profile = { name: 'Nil', age: 8, character: 'warrior_girl' }

const run: SavedRun = {
  seed: 12345,
  roomId: 'room_04',
  resolved: ['slime_room_02'],
  slimeProgress: { slime_room_03: 1 },
  hearts: 2,
  keys: 1,
  stars: 3,
  coins: 15,
  visitedRooms: ['room_01', 'room_02'],
}

beforeEach(() => {
  localStorage.clear()
})

describe('SaveStore', () => {
  it('starts empty', () => {
    const store = new SaveStore()
    expect(store.profile).toBeUndefined()
    expect(store.hasRun).toBe(false)
  })

  it('remembers a profile across instances', () => {
    new SaveStore().setProfile(profile)
    expect(new SaveStore().profile).toEqual(profile)
  })

  it('remembers a run across instances', () => {
    const store = new SaveStore()
    store.setProfile(profile)
    store.saveRun(run)
    expect(new SaveStore().run).toEqual(run)
  })

  // A run with nobody playing it cannot be resumed, so it is never written.
  it('refuses to save a run before a profile exists', () => {
    const store = new SaveStore()
    store.saveRun(run)
    expect(store.hasRun).toBe(false)
  })

  it('keeps who is playing when the run is cleared', () => {
    const store = new SaveStore()
    store.setProfile(profile)
    store.saveRun(run)
    store.clearRun()
    expect(store.hasRun).toBe(false)
    expect(store.profile).toEqual(profile)
  })

  it('starting a new profile drops the old run', () => {
    const store = new SaveStore()
    store.setProfile(profile)
    store.saveRun(run)
    store.setProfile({ ...profile, name: 'Ada' })
    expect(store.hasRun).toBe(false)
  })

  // A stale or hand-edited key must never stop the game loading.
  it('treats a corrupt save as no save', () => {
    localStorage.setItem('dungeonauts.save.v1', '{ not json')
    expect(new SaveStore().profile).toBeUndefined()
  })
})

describe('parseSave', () => {
  it('drops a run that cannot rebuild its dungeon', () => {
    expect(parseSave({ profile, run: { ...run, seed: 'x' } })?.run).toBeUndefined()
    expect(parseSave({ profile, run: { ...run, roomId: '' } })?.run).toBeUndefined()
  })

  it('keeps the profile even when the run is unusable', () => {
    expect(parseSave({ profile, run: null })?.profile).toEqual(profile)
  })

  it('ignores junk inside the lists rather than failing the whole save', () => {
    const parsed = parseSave({
      profile,
      run: { ...run, resolved: ['a', 7, null], visitedRooms: 'nope', hearts: -4 },
    })
    expect(parsed?.run?.resolved).toEqual(['a'])
    expect(parsed?.run?.visitedRooms).toEqual([])
    expect(parsed?.run?.hearts).toBe(0)
  })
})

/*
 * The save is only worth anything if it round-trips: what the run wrote must be
 * exactly what the run reads back, or a child loses progress silently.
 */
describe('a run survives the round trip', () => {
  it('restores totals, resolved entities and slime progress', () => {
    const before = new GameState()
    before.landHit('slime_a', 2)
    before.landHit('slime_a', 2)
    before.landHit('slime_b', 2)
    before.collectKey('key_a')
    before.award({ stars: 2, coins: 9 })
    before.loseHeart()

    const after = GameState.restore(before.snapshot())
    expect(after.snapshot()).toEqual(before.snapshot())
    expect(after.isResolved('slime_a')).toBe(true)
    expect(after.hitsOn('slime_b')).toBe(1)
    expect(after.keys).toBe(1)
    expect(after.hearts).toBe(before.hearts)
  })
})
