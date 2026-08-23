import { describe, expect, it } from 'vitest'
import {
  MAX_LEVEL,
  Progression,
  progressFor,
  XP_AWARDS,
  xpForLevel,
  xpToReach,
} from '../src/game/state/Progression'

describe('the level curve', () => {
  it('starts everybody at level one with an empty bar', () => {
    expect(progressFor(0)).toMatchObject({ level: 1, into: 0 })
  })

  it('never goes backwards as experience is earned', () => {
    let previous = 0
    for (let xp = 0; xp <= xpToReach(MAX_LEVEL) + 500; xp += 7) {
      const { level } = progressFor(xp)
      expect(level).toBeGreaterThanOrEqual(previous)
      previous = level
    }
  })

  it('reaches each level at exactly the experience it says it needs', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(progressFor(xpToReach(level)).level, `level ${level}`).toBe(level)
      if (level > 1) expect(progressFor(xpToReach(level) - 1).level).toBe(level - 1)
    }
  })

  it('stops at the cap rather than running away', () => {
    expect(progressFor(xpToReach(MAX_LEVEL) + 10_000)).toMatchObject({
      level: MAX_LEVEL,
      fraction: 1,
    })
  })

  it('keeps the bar inside 0 to 1', () => {
    for (let xp = 0; xp < 2000; xp += 13) {
      const { fraction } = progressFor(xp)
      expect(fraction).toBeGreaterThanOrEqual(0)
      expect(fraction).toBeLessThanOrEqual(1)
    }
  })

  // A curve a six-year-old can see moving: the first level inside a few rooms.
  it('gives the first level away in a handful of successes', () => {
    expect(Math.ceil(xpForLevel(1) / XP_AWARDS.chest_opened)).toBeLessThanOrEqual(3)
  })

  it('treats junk experience as none', () => {
    expect(progressFor(Number.NaN).level).toBe(1)
    expect(progressFor(-50).level).toBe(1)
  })
})

describe('Progression', () => {
  it('awards experience and reports a new level once', () => {
    const progression = new Progression(xpToReach(2) - XP_AWARDS.slime_defeated)
    expect(progression.level).toBe(1)
    const result = progression.award('slime_defeated')
    expect(result.levelledUpTo).toBe(2)
    expect(progression.award('slime_hit').levelledUpTo).toBeUndefined()
  })

  it('tells listeners when the bar moves', () => {
    const progression = new Progression()
    const seen: number[] = []
    progression.onChange((p) => seen.push(p.into))
    progression.award('mechanism_activated')
    progression.award('mechanism_activated')
    expect(seen).toEqual([XP_AWARDS.mechanism_activated, XP_AWARDS.mechanism_activated * 2])
  })

  it('stops notifying once unsubscribed', () => {
    const progression = new Progression()
    let calls = 0
    const stop = progression.onChange(() => (calls += 1))
    progression.award('door_unlocked')
    stop()
    progression.award('door_unlocked')
    expect(calls).toBe(1)
  })

  it('rewards finishing a dungeon more than any single obstacle', () => {
    const single = Math.max(
      XP_AWARDS.slime_defeated,
      XP_AWARDS.chest_opened,
      XP_AWARDS.mechanism_activated,
    )
    expect(XP_AWARDS.dungeon_complete).toBeGreaterThan(single)
  })
})
