import { describe, expect, it } from 'vitest'
import {
  ALL_GENERATORS,
  LANGUAGE_GENERATORS,
  MATH_GENERATORS,
  checkAnswer,
  generatorsFor,
  isSkillOf,
  parseChallenge,
  type ChallengeGenerator,
} from '../src/education'
import { createChallengeRepository } from '../src/education'
import { createRandom } from '../src/core/random'
import { MAX_AGE, MIN_AGE } from '../src/game/state/Profile'
import { SUPPORTED_LOCALES, type Locale } from '../src/i18n/locales'

const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i)
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13)

/** Every question a generator can produce over the sample seeds. */
function samples(generator: ChallengeGenerator, locale: Locale, age: number) {
  return SEEDS.map((seed) => generator.generate({ locale, age, random: createRandom(seed) }))
}

/** Ages a generator actually covers, clamped to the supported band. */
function agesOf(generator: ChallengeGenerator): number[] {
  return AGES.filter((age) => age >= generator.minAge && age <= generator.maxAge)
}

/*
 * The requirement this whole module exists for: a five-year-old and an
 * eleven-year-old must both find at least ten kinds of question waiting for
 * them, in either language. A gap here is a child meeting the same four
 * questions all afternoon.
 */
describe('age coverage', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const age of AGES) {
      it(`offers at least ten kinds of maths at ${age} in ${locale}`, () => {
        expect(generatorsFor({ locale, subject: 'math', age }).length).toBeGreaterThanOrEqual(10)
      })

      it(`offers at least ten kinds of language at ${age} in ${locale}`, () => {
        expect(generatorsFor({ locale, subject: 'language', age }).length).toBeGreaterThanOrEqual(10)
      })
    }
  }

  it('covers every age with both subjects and nothing outside the band', () => {
    for (const generator of ALL_GENERATORS) {
      expect(generator.minAge, generator.id).toBeLessThanOrEqual(generator.maxAge)
      expect(generator.minAge, generator.id).toBeGreaterThanOrEqual(MIN_AGE)
      expect(generator.maxAge, generator.id).toBeLessThanOrEqual(MAX_AGE)
      expect(agesOf(generator).length, generator.id).toBeGreaterThan(0)
    }
  })

  it('has unique generator ids', () => {
    const ids = ALL_GENERATORS.map((generator) => generator.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names a real skill for its subject', () => {
    for (const generator of ALL_GENERATORS) {
      expect(isSkillOf(generator.subject, generator.skill), `${generator.id}/${generator.skill}`).toBe(true)
    }
  })

  it('spreads across many skills rather than dressing up one', () => {
    const mathSkills = new Set(MATH_GENERATORS.map((g) => g.skill))
    const languageSkills = new Set(LANGUAGE_GENERATORS.map((g) => g.skill))
    expect(mathSkills.size).toBeGreaterThanOrEqual(7)
    expect(languageSkills.size).toBeGreaterThanOrEqual(7)
  })
})

/*
 * Every question, in both languages, at every age it claims to serve.
 *
 * A generated question reaches a child without anyone reading it first, so the
 * things a human proofreader would catch have to be assertions: four options,
 * all different, the answer among them, and every other option actually wrong.
 */
describe('every generated question is answerable', () => {
  for (const generator of ALL_GENERATORS) {
    for (const locale of SUPPORTED_LOCALES) {
      it(`${generator.id} (${locale})`, () => {
        for (const age of agesOf(generator)) {
          for (const question of samples(generator, locale, age)) {
            const where = `${generator.id}/${locale}/${age}`

            expect(question.prompt.trim(), where).not.toBe('')
            expect(question.prompt, where).not.toMatch(/undefined|NaN|null|\[object/)

            expect(question.choices.length, `${where}: needs four options`).toBe(4)
            expect(new Set(question.choices).size, `${where}: duplicate options`).toBe(4)
            for (const choice of question.choices) {
              expect(choice.trim(), `${where}: blank option`).not.toBe('')
              expect(choice, where).not.toMatch(/undefined|NaN|\[object/)
            }

            const answer = String(question.correctAnswer)
            expect(question.choices, `${where}: answer not offered`).toContain(answer)

            // An option that differs only in spacing is not a wrong answer, it
            // is the same answer written invisibly differently.
            for (const choice of question.choices) {
              if (choice === answer) continue
              expect(choice.trim(), `${where}: "${choice}" is the answer with different spacing`)
                .not.toBe(answer.trim())
            }

            // The validator is what the repository runs in production, so a
            // question that fails it would reach a child as a crash.
            const challenge = parseChallenge(
              {
                id: `${generator.id}#test`,
                locale,
                subject: generator.subject,
                skill: generator.skill,
                difficulty: generator.difficulty,
                prompt: question.prompt,
                interactionType: 'multiple_choice',
                choices: question.choices,
                correctAnswer: question.correctAnswer,
                ...(question.strict ? { strict: true } : {}),
                ...(question.hint ? { hint: question.hint } : {}),
                ...(question.explanation ? { explanation: question.explanation } : {}),
              },
              generator.id,
              0,
            )

            expect(checkAnswer(challenge, answer).correct, `${where}: right answer rejected`).toBe(true)
            for (const choice of question.choices) {
              if (choice === answer) continue
              expect(
                checkAnswer(challenge, choice).correct,
                `${where}: "${choice}" also passes as an answer`,
              ).toBe(false)
            }
          }
        }
      })
    }
  }
})

describe('generated questions teach, not just score', () => {
  it('offers a hint and an explanation on every kind of question', () => {
    for (const generator of ALL_GENERATORS) {
      for (const locale of SUPPORTED_LOCALES) {
        const question = samples(generator, locale, agesOf(generator)[0] as number)[0]
        expect(question?.hint?.trim(), `${generator.id}/${locale}: no hint`).toBeTruthy()
        expect(question?.explanation?.trim(), `${generator.id}/${locale}: no explanation`).toBeTruthy()
      }
    }
  })
})

describe('randomness', () => {
  it('gives the same question for the same seed', () => {
    for (const generator of ALL_GENERATORS) {
      const age = agesOf(generator)[0] as number
      const first = generator.generate({ locale: 'es', age, random: createRandom(99) })
      const second = generator.generate({ locale: 'es', age, random: createRandom(99) })
      expect(second, generator.id).toEqual(first)
    }
  })

  // A generator that ignored its random source would look fine in every other
  // test and be dull in exactly the way this feature exists to fix.
  it('varies its content across seeds', () => {
    for (const generator of ALL_GENERATORS) {
      const age = agesOf(generator)[0] as number
      // Prompt *and* options: "which row has more?" is always the same
      // sentence, and all of its variety is in what it offers.
      const seen = new Set(
        samples(generator, 'es', age).map((q) => `${q.prompt}|${q.choices.join('|')}`),
      )
      expect(seen.size, `${generator.id} always asks the same thing`).toBeGreaterThan(3)
    }
  })

  it('shuffles where the answer sits, so the corner is never a tell', () => {
    for (const generator of ALL_GENERATORS) {
      const age = agesOf(generator)[0] as number
      const positions = new Set(
        samples(generator, 'es', age).map((q) => q.choices.indexOf(String(q.correctAnswer))),
      )
      expect(positions.size, `${generator.id} keeps the answer in one place`).toBeGreaterThan(1)
    }
  })
})

/*
 * The arithmetic itself, checked by evaluating the prompt rather than trusting
 * the generator that wrote it. A sign error would otherwise be invisible: the
 * answer would agree with the options and every other test would pass.
 */
describe('the sums are actually right', () => {
  const OPERATIONS: ReadonlyArray<readonly [RegExp, (parts: number[]) => number]> = [
    [/^(\d+) \+ (\d+) \+ (\d+) = \?$/, ([a, b, c]) => (a as number) + (b as number) + (c as number)],
    [/^(\d+) \+ (\d+) = \?$/, ([a, b]) => (a as number) + (b as number)],
    [/^(\d+) − (\d+) = \?$/, ([a, b]) => (a as number) - (b as number)],
    [/^(\d+) × (\d+) = \?$/, ([a, b]) => (a as number) * (b as number)],
    [/^(\d+) ÷ (\d+) = \?$/, ([a, b]) => (a as number) / (b as number)],
  ]

  it('evaluates every plain arithmetic prompt and agrees with the answer', () => {
    let checked = 0
    for (const generator of MATH_GENERATORS) {
      for (const age of agesOf(generator)) {
        for (const question of samples(generator, 'es', age)) {
          for (const [pattern, evaluate] of OPERATIONS) {
            const match = pattern.exec(question.prompt)
            if (!match) continue
            const parts = match.slice(1).map(Number)
            expect(Number(question.correctAnswer), `${generator.id}: ${question.prompt}`).toBe(
              evaluate(parts),
            )
            checked += 1
            break
          }
        }
      }
    }
    expect(checked, 'no arithmetic prompts were checked at all').toBeGreaterThan(500)
  })

  it('keeps a missing addend consistent with its total', () => {
    const generator = MATH_GENERATORS.find((g) => g.id === 'math.missing_addend') as ChallengeGenerator
    for (const age of agesOf(generator)) {
      for (const question of samples(generator, 'es', age)) {
        const match = /^(\d+) \+ \? = (\d+)$/.exec(question.prompt)
        expect(match, question.prompt).not.toBeNull()
        const [known, total] = (match as RegExpExecArray).slice(1).map(Number)
        expect(Number(question.correctAnswer)).toBe((total as number) - (known as number))
      }
    }
  })

  it('never asks a young child to go below zero', () => {
    for (const generator of MATH_GENERATORS) {
      for (const age of agesOf(generator)) {
        for (const question of samples(generator, 'es', age)) {
          for (const choice of question.choices) {
            if (!/^-?\d+$/.test(choice)) continue
            expect(Number(choice), `${generator.id} offers ${choice}`).toBeGreaterThanOrEqual(0)
          }
        }
      }
    }
  })

  it('respects the ceiling each generator promises in its name', () => {
    const ceilings: Readonly<Record<string, number>> = {
      'math.add_within_5': 5,
      'math.add_within_10': 10,
      'math.add_within_20': 20,
      'math.sub_within_5': 5,
      'math.sub_within_10': 10,
      'math.sub_within_20': 20,
    }
    for (const [id, ceiling] of Object.entries(ceilings)) {
      const generator = MATH_GENERATORS.find((g) => g.id === id) as ChallengeGenerator
      for (const age of agesOf(generator)) {
        for (const question of samples(generator, 'es', age)) {
          const numbers = (question.prompt.match(/\d+/g) ?? []).map(Number)
          for (const value of numbers) expect(value, `${id}: ${question.prompt}`).toBeLessThanOrEqual(ceiling)
          expect(Number(question.correctAnswer), `${id}: ${question.prompt}`).toBeLessThanOrEqual(ceiling)
        }
      }
    }
  })

  it('gives an older child bigger numbers than a younger one', () => {
    const generator = MATH_GENERATORS.find((g) => g.id === 'math.compare_numbers') as ChallengeGenerator
    const largest = (age: number) =>
      Math.max(...samples(generator, 'es', age).flatMap((q) => q.choices.map(Number)))
    expect(largest(10)).toBeGreaterThan(largest(5))
  })
})

/*
 * The repository is where generators meet the game. What matters here is not
 * that a question comes back — it is that a child playing for twenty minutes
 * meets twenty different kinds of question rather than the same one dressed up.
 */
describe('the repository draws on the generators', () => {
  const ask = (age: number, exclude: string[] = []) =>
    createChallengeRepository(7).request({
      locale: 'es',
      subject: 'math',
      difficulty: 2,
      age,
      exclude,
    })

  it('builds a question when it is told the age', () => {
    const challenge = ask(7)
    expect(challenge).not.toBeNull()
    expect(challenge?.id).toMatch(/#\d+$/)
    expect(challenge?.metadata?.tags).toContain('generated')
    expect(challenge?.metadata?.ageBand).toMatch(/^\d+-\d+$/)
  })

  it('falls back to the authored files when it is not', () => {
    const challenge = createChallengeRepository(7).request({
      locale: 'es',
      subject: 'math',
      difficulty: 1,
    })
    expect(challenge).not.toBeNull()
    expect(challenge?.id).not.toMatch(/#/)
  })

  it('gives every question its own id', () => {
    const repository = createChallengeRepository(3)
    const ids = Array.from({ length: 60 }, () =>
      repository.request({ locale: 'es', subject: 'language', difficulty: 2, age: 8 })?.id,
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does not ask the same kind twice in a row', () => {
    const repository = createChallengeRepository(11)
    const asked: string[] = []
    for (let i = 0; i < 30; i++) {
      const challenge = repository.request({
        locale: 'es',
        subject: 'math',
        difficulty: 2,
        age: 9,
        exclude: asked.slice(-6),
      })
      asked.push(challenge?.id as string)
    }
    const families = asked.map((id) => id.split('#')[0])
    for (let i = 1; i < families.length; i++) {
      expect(families[i], `repeated ${families[i]} back to back`).not.toBe(families[i - 1])
    }
  })

  it('keeps a whole session varied', () => {
    const repository = createChallengeRepository(5)
    const asked: string[] = []
    for (let i = 0; i < 40; i++) {
      const challenge = repository.request({
        locale: 'es',
        subject: 'language',
        difficulty: 2,
        age: 7,
        exclude: asked.slice(-8),
      })
      asked.push(challenge?.id as string)
    }
    const families = new Set(asked.map((id) => id.split('#')[0]))
    expect(families.size, 'a session should not live on a handful of question types')
      .toBeGreaterThanOrEqual(10)
  })

  it('asks a maths question even when the room asked for a skill nothing covers', () => {
    const challenge = createChallengeRepository(2).request({
      locale: 'es',
      subject: 'math',
      skill: 'word_problem',
      difficulty: 2,
      age: 5,
    })
    // Nothing generates word problems for a five-year-old, so it must widen to
    // another kind of maths rather than leaving a door with no question.
    expect(challenge?.subject).toBe('math')
  })

  it('degrades to the authored files for an age nothing covers', () => {
    const challenge = createChallengeRepository(2).request({
      locale: 'es',
      subject: 'math',
      difficulty: 1,
      age: 30,
    })
    expect(challenge).not.toBeNull()
    expect(challenge?.id).not.toMatch(/#/)
  })

  it('answers in the language it was asked in', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const challenge = createChallengeRepository(4).request({
        locale,
        subject: 'language',
        difficulty: 2,
        age: 9,
      })
      expect(challenge?.locale).toBe(locale)
    }
  })
})
