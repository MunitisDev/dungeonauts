import type { Subject } from './types'

/**
 * Skill ids, per `docs/game/EDUCATIONAL_SYSTEM.md`.
 *
 * A skill is a stable identifier for content authoring and filtering. Adding
 * one is a content decision, so the list lives here rather than being inferred
 * from whatever files happen to exist.
 */
export const MATH_SKILLS = [
  'counting',
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'number_comparison',
  'number_sequence',
  'basic_geometry',
  'word_problem',
] as const

export const LANGUAGE_SKILLS = [
  'vocabulary',
  'spelling',
  'word_recognition',
  'sentence_completion',
  'sentence_ordering',
  'synonyms',
  'antonyms',
  'basic_grammar',
  'reading_comprehension',
] as const

export type MathSkill = (typeof MATH_SKILLS)[number]
export type LanguageSkill = (typeof LANGUAGE_SKILLS)[number]
export type Skill = MathSkill | LanguageSkill

export const SKILLS_BY_SUBJECT: Readonly<Record<Subject, readonly Skill[]>> = {
  math: MATH_SKILLS,
  language: LANGUAGE_SKILLS,
}

/**
 * The subset authored for the vertical slice. The rest are valid ids with no
 * content behind them yet, which is why this list exists separately: it is what
 * the coverage test holds us to.
 */
export const MVP_SKILLS: Readonly<Record<Subject, readonly Skill[]>> = {
  math: ['addition', 'subtraction'],
  language: ['vocabulary', 'sentence_completion'],
}

export function isSkillOf(subject: Subject, skill: string): boolean {
  return (SKILLS_BY_SUBJECT[subject] as readonly string[]).includes(skill)
}
