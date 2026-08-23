import { describe, expect, it } from 'vitest'
import {
  answerSeconds,
  clampAge,
  DEFAULT_AGE,
  isCharacterId,
  MAX_AGE,
  MAX_NAME_LENGTH,
  MIN_AGE,
  parseProfile,
  sanitiseName,
  startingDifficulty,
} from '../src/game/state/Profile'
import { CHARACTER_IDS } from '../src/engine/assets/assetManifest'

describe('startingDifficulty', () => {
  it('never leaves the 1-5 band the content is written in', () => {
    for (let age = 0; age <= 20; age++) {
      const difficulty = startingDifficulty(age)
      expect(difficulty).toBeGreaterThanOrEqual(1)
      expect(difficulty).toBeLessThanOrEqual(5)
    }
  })

  it('rises with age and never falls', () => {
    for (let age = MIN_AGE; age < MAX_AGE; age++) {
      expect(startingDifficulty(age + 1)).toBeGreaterThanOrEqual(startingDifficulty(age))
    }
  })
})

/*
 * GAME_DESIGN.md allows a clock but requires it never be the hard part. Age
 * scaling is how that holds, so it is pinned: the youngest players always get
 * the most time, and nobody gets a rushed one.
 */
describe('answerSeconds', () => {
  it('gives younger children more time, never less', () => {
    for (let age = MIN_AGE; age < MAX_AGE; age++) {
      expect(answerSeconds(age + 1)).toBeLessThanOrEqual(answerSeconds(age))
    }
  })

  it('is generous enough to read a question twice', () => {
    for (let age = MIN_AGE; age <= MAX_AGE; age++) {
      expect(answerSeconds(age)).toBeGreaterThanOrEqual(15)
    }
  })
})

describe('sanitiseName', () => {
  it('keeps letters, accents and spaces', () => {
    expect(sanitiseName('  María  José ')).toBe('María José')
  })

  it('drops anything that could be markup or a URL', () => {
    expect(sanitiseName('<script>x</script>')).toBe('scriptxscript')
  })

  it('caps the length so it always fits the HUD', () => {
    expect(sanitiseName('a'.repeat(50))).toHaveLength(MAX_NAME_LENGTH)
  })
})

describe('clampAge', () => {
  it('holds the age inside the supported band', () => {
    expect(clampAge(2)).toBe(MIN_AGE)
    expect(clampAge(99)).toBe(MAX_AGE)
    expect(clampAge(Number.NaN)).toBe(DEFAULT_AGE)
    expect(clampAge(7.6)).toBe(8)
  })
})

describe('parseProfile', () => {
  it('accepts a complete profile', () => {
    expect(parseProfile({ name: 'Nil', age: 7, character: 'mage_girl' })).toEqual({
      name: 'Nil',
      age: 7,
      character: 'mage_girl',
    })
  })

  it('rejects anything missing or unrecognised', () => {
    expect(parseProfile(undefined)).toBeUndefined()
    expect(parseProfile({ name: '', age: 7, character: 'mage_girl' })).toBeUndefined()
    expect(parseProfile({ name: 'Nil', character: 'mage_girl' })).toBeUndefined()
    expect(parseProfile({ name: 'Nil', age: 7, character: 'dragon' })).toBeUndefined()
  })

  it('pulls an out-of-range stored age back into the band', () => {
    expect(parseProfile({ name: 'Nil', age: 40, character: 'archer_boy' })?.age).toBe(MAX_AGE)
  })
})

describe('isCharacterId', () => {
  it('accepts every character on the roster and nothing else', () => {
    for (const id of CHARACTER_IDS) expect(isCharacterId(id)).toBe(true)
    expect(isCharacterId('warrior')).toBe(false)
    expect(isCharacterId(3)).toBe(false)
  })
})
