import { describe, expect, it } from 'vitest'
import { ChallengeRepository, difficultyFallback } from '../src/education'
import type { Challenge, Difficulty } from '../src/education'
import { createChallengeRepository } from '../src/education'

const challenge = (
  id: string,
  overrides: Partial<Challenge> = {},
): Challenge => ({
  id,
  locale: 'es',
  subject: 'math',
  skill: 'addition',
  difficulty: 2,
  prompt: '1 + 1 = ?',
  interactionType: 'multiple_choice',
  choices: ['1', '2'],
  correctAnswer: '2',
  ...overrides,
})

describe('difficulty fallback order', () => {
  it('tries the requested level first, then the nearest', () => {
    expect(difficultyFallback(3)).toEqual([3, 2, 4, 1, 5])
    expect(difficultyFallback(1)).toEqual([1, 2, 3, 4, 5])
    expect(difficultyFallback(5)).toEqual([5, 4, 3, 2, 1])
  })

  it('prefers the easier side when two are equally close', () => {
    // A child who asked for level 3 is better served by 2 than by 4.
    expect(difficultyFallback(3)[1]).toBe(2)
  })
})

describe('ChallengeRepository', () => {
  it('rejects duplicate ids at construction', () => {
    expect(() => new ChallengeRepository([challenge('dup'), challenge('dup')])).toThrow(
      /Duplicate challenge id "dup"/,
    )
  })

  it('filters on locale, subject, skill and difficulty together', () => {
    const repo = new ChallengeRepository([
      challenge('a'),
      challenge('b', { locale: 'en' }),
      challenge('c', { subject: 'language', skill: 'vocabulary' }),
      challenge('d', { difficulty: 4 }),
      challenge('e', { skill: 'subtraction' }),
    ])

    const found = repo.filter({ locale: 'es', subject: 'math', skill: 'addition', difficulty: 2 })
    expect(found.map((c) => c.id)).toEqual(['a'])
  })

  it('treats an omitted skill as "any skill in this subject"', () => {
    const repo = new ChallengeRepository([
      challenge('a'),
      challenge('e', { skill: 'subtraction' }),
      challenge('c', { subject: 'language', skill: 'vocabulary' }),
    ])
    const found = repo.filter({ locale: 'es', subject: 'math', difficulty: 2 })
    expect(found.map((c) => c.id).sort()).toEqual(['a', 'e'])
  })

  it('returns a matching challenge for a satisfiable request', () => {
    const repo = new ChallengeRepository([challenge('a')])
    const picked = repo.request({ locale: 'es', subject: 'math', skill: 'addition', difficulty: 2 })
    expect(picked?.id).toBe('a')
  })

  it('widens difficulty rather than giving up', () => {
    const repo = new ChallengeRepository([challenge('easier', { difficulty: 2 })])
    const picked = repo.request({ locale: 'es', subject: 'math', skill: 'addition', difficulty: 3 })
    expect(picked?.id).toBe('easier')
  })

  it('drops the skill constraint before giving up, keeping subject and locale', () => {
    const repo = new ChallengeRepository([challenge('sub', { skill: 'subtraction' })])
    const picked = repo.request({
      locale: 'es',
      subject: 'math',
      skill: 'multiplication',
      difficulty: 2,
    })
    expect(picked?.id).toBe('sub')
    expect(picked?.subject).toBe('math')
  })

  // Gameplay must be able to cope: a door with no question should open, not
  // crash a child's session.
  it('returns null when nothing in the locale and subject fits', () => {
    const repo = new ChallengeRepository([challenge('a')])
    expect(repo.request({ locale: 'en', subject: 'math', difficulty: 2 })).toBeNull()
    expect(repo.request({ locale: 'es', subject: 'language', difficulty: 2 })).toBeNull()
  })

  it('avoids excluded ids when there is an alternative', () => {
    const repo = new ChallengeRepository([challenge('a'), challenge('b')])
    for (let i = 0; i < 20; i++) {
      const picked = repo.request({ locale: 'es', subject: 'math', difficulty: 2, exclude: ['a'] })
      expect(picked?.id).toBe('b')
    }
  })

  it('repeats an excluded question rather than returning nothing', () => {
    const repo = new ChallengeRepository([challenge('only')])
    const picked = repo.request({
      locale: 'es',
      subject: 'math',
      difficulty: 2,
      exclude: ['only'],
    })
    expect(picked?.id).toBe('only')
  })

  it('is reproducible for a given seed', () => {
    const build = () =>
      new ChallengeRepository(
        Array.from({ length: 10 }, (_, i) => challenge(`q${i}`)),
        42,
      )
    const draw = (repo: ChallengeRepository) =>
      Array.from({ length: 8 }, () =>
        repo.request({ locale: 'es', subject: 'math', difficulty: 2 })?.id,
      )
    expect(draw(build())).toEqual(draw(build()))
  })

  it('does not always return the same question', () => {
    const repo = new ChallengeRepository(
      Array.from({ length: 10 }, (_, i) => challenge(`q${i}`)),
      7,
    )
    const drawn = new Set(
      Array.from({ length: 40 }, () =>
        repo.request({ locale: 'es', subject: 'math', difficulty: 2 })?.id,
      ),
    )
    expect(drawn.size).toBeGreaterThan(1)
  })
})

describe('repository over the real content', () => {
  const repo = createChallengeRepository(1)

  it('answers every request the vertical slice can make', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const [subject, skills] of [
        ['math', ['addition', 'subtraction']],
        ['language', ['vocabulary', 'sentence_completion']],
      ] as const) {
        for (const skill of skills) {
          for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[]) {
            const picked = repo.request({ locale, subject, skill, difficulty })
            expect(picked, `${locale}/${subject}/${skill}/${difficulty}`).not.toBeNull()
            expect(picked?.locale).toBe(locale)
            expect(picked?.subject).toBe(subject)
          }
        }
      }
    }
  })

  it('never leaks a question from the wrong locale', () => {
    for (let i = 0; i < 100; i++) {
      const picked = repo.request({ locale: 'en', subject: 'language', difficulty: 3 })
      expect(picked?.locale).toBe('en')
    }
  })

  it('reports which skills have authored content', () => {
    expect(repo.skillsFor('es', 'math')).toEqual(['addition', 'subtraction'])
    expect(repo.skillsFor('en', 'language')).toEqual(['sentence_completion', 'vocabulary'])
  })
})
