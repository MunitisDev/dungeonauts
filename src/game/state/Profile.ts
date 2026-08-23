import { CHARACTER_IDS, type CharacterId } from '../../engine/assets/assetManifest'
import type { Difficulty } from '../../education'

/**
 * Who is playing.
 *
 * Collected once, at the start, and kept for the life of the browser profile.
 * The age is not decoration: it picks the starting difficulty and how long the
 * child gets to answer, which is the difference between a challenge and a
 * frustration.
 */
export interface Profile {
  /** What the child wants to be called. Never sent anywhere. */
  readonly name: string
  readonly age: number
  readonly character: CharacterId
}

/** The audience `docs/PROJECT_BRIEF.md` names, with a little room either side. */
export const MIN_AGE = 5
export const MAX_AGE = 12
export const DEFAULT_AGE = 8

export const MAX_NAME_LENGTH = 16

/**
 * Starting difficulty for an age.
 *
 * A gentle ramp: a six-year-old opens on the introductory band, an
 * eleven-year-old two steps up. It is only a starting point — the repository
 * widens the difficulty when it cannot find a question, and later work can
 * adapt it as the child plays.
 */
export function startingDifficulty(age: number): Difficulty {
  if (age <= 6) return 1
  if (age <= 7) return 2
  if (age <= 9) return 3
  if (age <= 11) return 4
  return 5
}

/**
 * Seconds allowed to answer.
 *
 * Scaled by age because the clock mostly measures reading speed, not
 * understanding. `GAME_DESIGN.md` requires the clock never be the hard part,
 * so these are deliberately generous: enough to read the question twice.
 */
export function answerSeconds(age: number): number {
  if (age <= 6) return 30
  if (age <= 8) return 25
  if (age <= 10) return 20
  return 18
}

/** Trims and caps a typed name, keeping letters, digits, spaces and hyphens. */
export function sanitiseName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} '\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

export function clampAge(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AGE
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(value)))
}

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value)
}

/** Validates a stored or submitted profile, or returns undefined. */
export function parseProfile(input: unknown): Profile | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const raw = input as Record<string, unknown>
  const name = typeof raw['name'] === 'string' ? sanitiseName(raw['name']) : ''
  if (!name) return undefined
  if (typeof raw['age'] !== 'number') return undefined
  if (!isCharacterId(raw['character'])) return undefined
  return { name, age: clampAge(raw['age']), character: raw['character'] }
}
