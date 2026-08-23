/**
 * Public surface of the educational system.
 *
 * Gameplay imports from here and nothing deeper. The whole contract is:
 *
 *   challenges.request({ locale, subject, skill?, difficulty }) -> Challenge | null
 *   checkAnswer(challenge, answer)                              -> CheckResult
 *
 * The result says whether the answer was right. What that *means* — a door
 * unlocking, an attack landing, a chest opening — is the game's decision, made
 * entirely outside this module.
 */
export { ChallengeRepository, difficultyFallback } from './ChallengeRepository'
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
