/**
 * Public surface of the educational system.
 *
 * Gameplay imports from here and nothing deeper. The whole contract is:
 *
 *   challenges.request({ locale, subject, skill?, difficulty, age? }) -> Challenge | null
 *   checkAnswer(challenge, answer)                                    -> CheckResult
 *
 * Questions come from two places behind that one call: the authored JSON in
 * `content/`, and the generators in `generators/`, which build an endless
 * supply from an age and a seeded random source. The caller cannot tell which
 * it got, and should not need to.
 *
 * The result says whether the answer was right. What that *means* — a door
 * unlocking, an attack landing, a chest opening — is the game's decision, made
 * entirely outside this module.
 */
export { ChallengeRepository, challengeFamily, difficultyFallback } from './ChallengeRepository'
export { checkAnswer, normaliseText } from './checkAnswer'
export { authoredContentFiles, loadAuthoredChallenges } from './content'
export {
  LANGUAGE_SKILLS,
  MATH_SKILLS,
  MVP_SKILLS,
  SKILLS_BY_SUBJECT,
  isSkillOf,
  type LanguageSkill,
  type MathSkill,
  type Skill,
} from './skills'
export {
  ChallengeValidationError,
  parseChallenge,
  parseChallengeFile,
} from './validation'
export {
  ALL_GENERATORS,
  GENERATED_INTERACTION,
  LANGUAGE_GENERATORS,
  MATH_GENERATORS,
  coversAge,
  generatorsFor,
  supportsLocale,
  type ChallengeGenerator,
  type GeneratedQuestion,
  type GeneratorContext,
} from './generators'
export {
  DIFFICULTIES,
  INTERACTION_TYPES,
  SUBJECTS,
  type AnswerValue,
  type Challenge,
  type ChallengeRequest,
  type CheckResult,
  type Difficulty,
  type InteractionType,
  type Subject,
} from './types'

import { ChallengeRepository } from './ChallengeRepository'
import { loadAuthoredChallenges } from './content'

/**
 * The repository the game uses, backed by all authored content.
 *
 * `seed` makes question selection reproducible; leave it at the default unless
 * you are testing or replaying a session.
 */
export function createChallengeRepository(seed?: number): ChallengeRepository {
  return new ChallengeRepository(loadAuthoredChallenges(), seed)
}
