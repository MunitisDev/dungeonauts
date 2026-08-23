import { isLocale } from '../i18n/locales'
import { isSkillOf } from './skills'
import {
  DIFFICULTIES,
  INTERACTION_TYPES,
  SUBJECTS,
  type Challenge,
  type Difficulty,
  type InteractionType,
  type Subject,
} from './types'

/**
 * Runtime validation for authored content.
 *
 * Content is hand-written JSON, so a typo is a content bug, not a type error.
 * These checks run in the test suite over every file in `content/`, which means
 * a malformed question fails CI instead of reaching a child mid-dungeon.
 */

export class ChallengeValidationError extends Error {
  constructor(
    readonly file: string,
    readonly index: number,
    message: string,
  ) {
    super(`${file}[${index}]: ${message}`)
    this.name = 'ChallengeValidationError'
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Validates one authored entry and returns it as a `Challenge`. */
export function parseChallenge(input: unknown, file: string, index: number): Challenge {
  const fail = (message: string): never => {
    throw new ChallengeValidationError(file, index, message)
  }

  if (typeof input !== 'object' || input === null) return fail('must be an object')
  const raw = input as Record<string, unknown>

  if (!isNonEmptyString(raw['id'])) return fail('"id" must be a non-empty string')
  const id = raw['id']

  if (!isLocale(raw['locale'])) return fail(`"locale" must be a supported locale, got ${String(raw['locale'])}`)
  const locale = raw['locale']

  if (!SUBJECTS.includes(raw['subject'] as Subject)) {
    return fail(`"subject" must be one of ${SUBJECTS.join(', ')}`)
  }
  const subject = raw['subject'] as Subject

  if (!isNonEmptyString(raw['skill'])) return fail('"skill" must be a non-empty string')
  const skill = raw['skill']
  if (!isSkillOf(subject, skill)) return fail(`"${skill}" is not a known ${subject} skill`)

  if (!DIFFICULTIES.includes(raw['difficulty'] as Difficulty)) {
    return fail(`"difficulty" must be one of ${DIFFICULTIES.join(', ')}`)
  }
  const difficulty = raw['difficulty'] as Difficulty

  if (!isNonEmptyString(raw['prompt'])) return fail('"prompt" must be a non-empty string')

  if (!INTERACTION_TYPES.includes(raw['interactionType'] as InteractionType)) {
    return fail(`"interactionType" must be one of ${INTERACTION_TYPES.join(', ')}`)
  }
  const interactionType = raw['interactionType'] as InteractionType

  const correctAnswer = raw['correctAnswer']
  if (correctAnswer === undefined || correctAnswer === null) return fail('"correctAnswer" is required')

  const choices = raw['choices']
  if (choices !== undefined) {
    if (!Array.isArray(choices) || !choices.every(isNonEmptyString)) {
      return fail('"choices" must be an array of non-empty strings')
    }
    if (new Set(choices).size !== choices.length) return fail('"choices" contains duplicates')
  }

  const strict = raw['strict']
  if (strict !== undefined && typeof strict !== 'boolean') {
    return fail('"strict" must be a boolean when present')
  }

  if (interactionType === 'multiple_choice') {
    if (!Array.isArray(choices)) return fail('multiple_choice needs "choices"')
    if (choices.length < 2) return fail('multiple_choice needs at least two choices')
    // A choice the player cannot pick is an unanswerable question.
    if (!choices.includes(String(correctAnswer))) {
      return fail(`"correctAnswer" (${String(correctAnswer)}) is not among "choices"`)
    }
  }

  if (interactionType === 'ordering' && !Array.isArray(correctAnswer)) {
    return fail('ordering needs an array "correctAnswer"')
  }

  if (interactionType === 'numeric_input' && typeof correctAnswer !== 'number') {
    return fail('numeric_input needs a numeric "correctAnswer"')
  }

  const optionalText = (key: 'explanation' | 'hint'): string | undefined => {
    const value = raw[key]
    if (value === undefined) return undefined
    if (!isNonEmptyString(value)) return fail(`"${key}" must be a non-empty string when present`)
    return value
  }
  const explanation = optionalText('explanation')
  const hint = optionalText('hint')

  return {
    id,
    locale,
    subject,
    skill,
    difficulty,
    prompt: raw['prompt'],
    interactionType,
    ...(choices ? { choices: choices as string[] } : {}),
    correctAnswer: correctAnswer as Challenge['correctAnswer'],
    ...(strict === true ? { strict: true } : {}),
    ...(explanation ? { explanation } : {}),
    ...(hint ? { hint } : {}),
  }
}

/** Validates a whole content file: `{ "challenges": [...] }`. */
export function parseChallengeFile(input: unknown, file: string): Challenge[] {
  if (typeof input !== 'object' || input === null) {
    throw new Error(`${file}: content file must be an object`)
  }
  const challenges = (input as Record<string, unknown>)['challenges']
  if (!Array.isArray(challenges)) {
    throw new Error(`${file}: content file must have a "challenges" array`)
  }
  return challenges.map((entry, index) => parseChallenge(entry, file, index))
}
