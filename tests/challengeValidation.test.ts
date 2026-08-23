import { describe, expect, it } from 'vitest'
import { ChallengeValidationError, parseChallenge, parseChallengeFile } from '../src/education'

const valid = {
  id: 'es.math.addition.999',
  locale: 'es',
  subject: 'math',
  skill: 'addition',
  difficulty: 2,
  prompt: '1 + 1 = ?',
  interactionType: 'multiple_choice',
  choices: ['1', '2', '3'],
  correctAnswer: '2',
}

const parse = (overrides: Record<string, unknown>) =>
  parseChallenge({ ...valid, ...overrides }, 'test.json', 0)

describe('challenge validation', () => {
  it('accepts a well-formed challenge', () => {
    expect(parse({}).id).toBe('es.math.addition.999')
  })

  it('reports the file and index in the error, so content bugs are findable', () => {
    try {
      parseChallenge({ ...valid, difficulty: 9 }, 'content/es/math/addition.json', 3)
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ChallengeValidationError)
      expect((error as Error).message).toContain('content/es/math/addition.json[3]')
    }
  })

  it('rejects an unsupported locale', () => {
    expect(() => parse({ locale: 'fr' })).toThrow(/locale/)
  })

  it('rejects an unknown subject', () => {
    expect(() => parse({ subject: 'history' })).toThrow(/subject/)
  })

  it('rejects a skill that does not belong to the subject', () => {
    // "vocabulary" is real, but it is a language skill, not a maths one.
    expect(() => parse({ skill: 'vocabulary' })).toThrow(/not a known math skill/)
    expect(() => parse({ skill: 'not_a_skill' })).toThrow(/not a known math skill/)
  })

  it('rejects a difficulty outside 1-5', () => {
    expect(() => parse({ difficulty: 0 })).toThrow(/difficulty/)
    expect(() => parse({ difficulty: 6 })).toThrow(/difficulty/)
    expect(() => parse({ difficulty: 2.5 })).toThrow(/difficulty/)
  })

  it('rejects empty text where text is required', () => {
    expect(() => parse({ prompt: '   ' })).toThrow(/prompt/)
    expect(() => parse({ id: '' })).toThrow(/id/)
  })

  // The failure mode that would actually reach a child: an unanswerable question.
  it('rejects a multiple-choice answer that is not among the choices', () => {
    expect(() => parse({ correctAnswer: '4' })).toThrow(/not among "choices"/)
  })

  it('rejects multiple choice with fewer than two options', () => {
    expect(() => parse({ choices: ['2'], correctAnswer: '2' })).toThrow(/at least two choices/)
    expect(() => parse({ choices: undefined })).toThrow(/needs "choices"/)
  })

  it('rejects duplicate choices', () => {
    expect(() => parse({ choices: ['2', '2', '3'] })).toThrow(/duplicates/)
  })

  it('requires a numeric answer for numeric input', () => {
    expect(() =>
      parse({ interactionType: 'numeric_input', choices: undefined, correctAnswer: '2' }),
    ).toThrow(/numeric "correctAnswer"/)
    expect(
      parse({ interactionType: 'numeric_input', choices: undefined, correctAnswer: 2 })
        .correctAnswer,
    ).toBe(2)
  })

  it('requires an array answer for ordering', () => {
    expect(() =>
      parse({ interactionType: 'ordering', choices: undefined, correctAnswer: 'a b' }),
    ).toThrow(/array "correctAnswer"/)
  })

  it('omits optional fields rather than storing empty ones', () => {
    const parsed = parse({})
    expect('hint' in parsed).toBe(false)
    expect('explanation' in parsed).toBe(false)
    expect(() => parse({ hint: '  ' })).toThrow(/hint/)
  })
})

describe('content file validation', () => {
  it('accepts a file with a challenges array', () => {
    expect(parseChallengeFile({ challenges: [valid] }, 'f.json')).toHaveLength(1)
  })

  it('rejects a file with no challenges array', () => {
    expect(() => parseChallengeFile({}, 'f.json')).toThrow(/"challenges" array/)
    expect(() => parseChallengeFile([valid], 'f.json')).toThrow(/"challenges" array/)
    expect(() => parseChallengeFile(null, 'f.json')).toThrow(/must be an object/)
  })
})
