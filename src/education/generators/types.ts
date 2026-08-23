import type { Locale } from '../../i18n/locales'
import type { Skill } from '../skills'
import type { AnswerValue, Difficulty, InteractionType, Subject } from '../types'

/**
 * Procedurally generated questions.
 *
 * Authored JSON in `content/` gives a handful of carefully written questions;
 * a generator gives an unbounded supply of one *kind* of question. Both are
 * content, and neither knows anything about the game: a generator is handed a
 * locale, an age and a random source, and hands back a question.
 *
 * The age band is the primary key here, not difficulty. `docs/PROJECT_BRIEF.md`
 * spans six to eleven, which is the difference between counting stars and
 * working out a percentage — a single 1-5 scale cannot express that, so each
 * generator states the ages it is actually for.
 */

export interface GeneratorContext {
  readonly locale: Locale
  /** The player's age, already clamped to the supported band. */
  readonly age: number
  /** Seeded, so a run replays identically from its dungeon seed. */
  readonly random: () => number
}

/**
 * One question, minus the bookkeeping.
 *
 * The registry stamps id, locale, subject, skill and difficulty; a generator
 * only has to produce the part a child reads.
 */
export interface GeneratedQuestion {
  readonly prompt: string
  readonly choices: readonly string[]
  readonly correctAnswer: AnswerValue
  /** Set when the options differ only by an accent, a capital or a full stop. */
  readonly strict?: boolean
  readonly hint?: string
  readonly explanation?: string
}

export interface ChallengeGenerator {
  /** Stable id, also used to avoid asking the same *kind* of question twice. */
  readonly id: string
  readonly subject: Subject
  readonly skill: Skill
  /** Inclusive age band this kind of question is written for. */
  readonly minAge: number
  readonly maxAge: number
  readonly difficulty: Difficulty
  /**
   * Locales this generator can produce. Omitted means all of them.
   *
   * Every generator currently works in both, because the parts that do not
   * translate live in the bank rather than in the generator: `lang.transform`
   * asks for a diminutive in Spanish and a comparative in English, and
   * `lang.tricky_spelling` for an accent in one and a homophone in the other.
   * The field exists for the first question that genuinely has no counterpart.
   */
  readonly locales?: readonly Locale[]
  generate(context: GeneratorContext): GeneratedQuestion
}

/**
 * Every generated question is multiple choice, deliberately.
 *
 * `GAME_DESIGN.md` asks for large targets and no precision input, and the panel
 * lays four answers out two by two so the same option is always in the same
 * corner. Even the questions that are conceptually orderings — put these
 * numbers in order, put these words in a sentence — are offered as four
 * candidate orderings to tap, not as a drag. A six-year-old can tap.
 */
export const GENERATED_INTERACTION: InteractionType = 'multiple_choice'

export function supportsLocale(generator: ChallengeGenerator, locale: Locale): boolean {
  return generator.locales === undefined || generator.locales.includes(locale)
}

export function coversAge(generator: ChallengeGenerator, age: number): boolean {
  return age >= generator.minAge && age <= generator.maxAge
}
