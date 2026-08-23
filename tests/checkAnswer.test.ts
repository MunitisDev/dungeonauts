import { describe, expect, it } from 'vitest'
import { checkAnswer, normaliseText } from '../src/education'
import type { Challenge } from '../src/education'

const base: Challenge = {
  id: 'test.001',
  locale: 'es',
  subject: 'language',
  skill: 'vocabulary',
  difficulty: 1,
  prompt: '¿Qué animal vuela?',
  interactionType: 'multiple_choice',
  choices: ['Pájaro', 'Pez'],
  correctAnswer: 'Pájaro',
  hint: 'Tiene alas.',
  explanation: 'Los pájaros vuelan.',
}

describe('text normalisation', () => {
  it('ignores case, surrounding space and repeated spaces', () => {
    expect(normaliseText('  El   Pájaro ')).toBe('el pajaro')
  })

  it('strips accents, so "arbol" matches "árbol"', () => {
    expect(normaliseText('árbol')).toBe(normaliseText('arbol'))
    expect(normaliseText('ratón')).toBe('raton')
  })

  it('keeps ñ distinct from n, because they are different letters', () => {
    // Losing this would accept "ano" for "año", which is not a spelling slip.
    expect(normaliseText('año')).not.toBe(normaliseText('ano'))
  })

  it('does not forgive a different word', () => {
    expect(normaliseText('pájaro')).not.toBe(normaliseText('pez'))
  })
})

describe('checkAnswer', () => {
  it('accepts the right answer', () => {
    expect(checkAnswer(base, 'Pájaro').correct).toBe(true)
  })

  it('forgives case and accents on the right answer', () => {
    expect(checkAnswer(base, 'pajaro').correct).toBe(true)
    expect(checkAnswer(base, '  PÁJARO  ').correct).toBe(true)
  })

  it('rejects a wrong answer', () => {
    expect(checkAnswer(base, 'Pez').correct).toBe(false)
  })

  it('offers the hint only when the answer was wrong', () => {
    expect(checkAnswer(base, 'Pez').hint).toBe('Tiene alas.')
    expect(checkAnswer(base, 'Pájaro').hint).toBeUndefined()
  })

  it('always returns the explanation, so a right answer still teaches', () => {
    expect(checkAnswer(base, 'Pájaro').explanation).toBe('Los pájaros vuelan.')
    expect(checkAnswer(base, 'Pez').explanation).toBe('Los pájaros vuelan.')
  })

  it('omits the hint when the question has none', () => {
    const { hint: _hint, ...noHint } = base
    expect(checkAnswer(noHint, 'Pez').hint).toBeUndefined()
  })

  it('says nothing about doors, chests or combat', () => {
    // The whole contract, deliberately: correctness plus teaching material.
    expect(Object.keys(checkAnswer(base, 'Pez')).sort()).toEqual([
      'correct',
      'explanation',
      'hint',
    ])
  })
})

describe('checkAnswer across interaction types', () => {
  const numeric: Challenge = {
    ...base,
    subject: 'math',
    skill: 'addition',
    interactionType: 'numeric_input',
    prompt: '3 + 2 = ?',
    correctAnswer: 5,
  }

  it('accepts a number typed as text', () => {
    expect(checkAnswer(numeric, 5).correct).toBe(true)
    expect(checkAnswer(numeric, '5').correct).toBe(true)
    expect(checkAnswer(numeric, ' 5 ').correct).toBe(true)
  })

  it('rejects a wrong number and non-numeric noise', () => {
    expect(checkAnswer(numeric, 6).correct).toBe(false)
    expect(checkAnswer(numeric, 'cinco').correct).toBe(false)
    expect(checkAnswer(numeric, '').correct).toBe(false)
  })

  const ordering: Challenge = {
    ...base,
    skill: 'sentence_ordering',
    interactionType: 'ordering',
    prompt: 'Ordena las palabras',
    correctAnswer: ['El', 'gato', 'duerme'],
  }

  it('compares ordered answers position by position', () => {
    expect(checkAnswer(ordering, ['El', 'gato', 'duerme']).correct).toBe(true)
    expect(checkAnswer(ordering, ['el', 'GATO', 'duerme']).correct).toBe(true)
    expect(checkAnswer(ordering, ['gato', 'El', 'duerme']).correct).toBe(false)
    expect(checkAnswer(ordering, ['El', 'gato']).correct).toBe(false)
  })

  it('does not confuse a list with a single value', () => {
    expect(checkAnswer(ordering, 'El gato duerme').correct).toBe(false)
    expect(checkAnswer(base, ['Pájaro']).correct).toBe(false)
  })
})
