import type { Locale } from '../../i18n/locales'
import type { Subject } from '../types'
import { LANGUAGE_GENERATORS } from './language'
import { MATH_GENERATORS } from './math'
import { coversAge, supportsLocale, type ChallengeGenerator } from './types'

export const ALL_GENERATORS: readonly ChallengeGenerator[] = [
  ...MATH_GENERATORS,
  ...LANGUAGE_GENERATORS,
]

export interface GeneratorQuery {
  readonly locale: Locale
  readonly subject: Subject
  readonly age: number
  readonly skill?: string
}

/** Every generator that can answer this request, in declaration order. */
export function generatorsFor(query: GeneratorQuery): ChallengeGenerator[] {
  return ALL_GENERATORS.filter(
    (generator) =>
      generator.subject === query.subject &&
      supportsLocale(generator, query.locale) &&
      coversAge(generator, query.age) &&
      (query.skill === undefined || generator.skill === query.skill),
  )
}

export { LANGUAGE_GENERATORS, MATH_GENERATORS }
export { coversAge, supportsLocale, GENERATED_INTERACTION } from './types'
export type { ChallengeGenerator, GeneratedQuestion, GeneratorContext } from './types'
