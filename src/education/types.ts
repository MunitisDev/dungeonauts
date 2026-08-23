import type { Locale } from '../i18n/locales'

/**
 * The educational domain model, per `docs/game/EDUCATIONAL_SYSTEM.md`.
 *
 * Nothing in this module may import from `game/`. The game asks for a challenge
 * and is told whether an answer was right; it never sees question text, and the
 * educational side never decides what happens in the world.
 */

export const SUBJECTS = ['math', 'language'] as const
export type Subject = (typeof SUBJECTS)[number]

export const INTERACTION_TYPES = [
  'multiple_choice',
  'numeric_input',
  'text_input',
  'ordering',
] as const
export type InteractionType = (typeof INTERACTION_TYPES)[number]

/**
 * 1 introductory - 5 advanced for the target age.
 *
 * Difficulty is a property of the question, not of the dungeon: the same room
 * can ask an easier question of a struggling player.
 */
export const DIFFICULTIES = [1, 2, 3, 4, 5] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export type AnswerValue = string | number | string[]

export interface ChallengeMetadata {
  readonly ageBand?: string
  readonly tags?: readonly string[]
}

export interface Challenge {
  readonly id: string
  readonly locale: Locale
  readonly subject: Subject
  readonly skill: string
  readonly difficulty: Difficulty
  readonly prompt: string
  readonly interactionType: InteractionType
  readonly choices?: readonly string[]
  readonly correctAnswer: AnswerValue
  readonly explanation?: string
  readonly hint?: string
  readonly metadata?: ChallengeMetadata
}

/**
 * What gameplay asks for. Note it cannot ask for a *specific question* — only
 * for a shape of question.
 */
export interface ChallengeRequest {
  readonly locale: Locale
  readonly subject: Subject
  readonly skill?: string
  readonly difficulty: Difficulty
  /**
   * Ids to avoid if anything else matches, so a player is not asked the same
   * question twice in a row.
   */
  readonly exclude?: readonly string[]
}

/**
 * The entire contract back to gameplay. Deliberately says nothing about doors,
 * chests or combat: the game decides the consequence.
 */
export interface CheckResult {
  readonly correct: boolean
  /** Offered after a wrong answer, when the question defines one. */
  readonly hint?: string
  /** Shown after the question is resolved, to teach rather than just score. */
  readonly explanation?: string
}
