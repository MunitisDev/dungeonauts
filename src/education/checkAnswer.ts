import type { AnswerValue, Challenge, CheckResult } from './types'

/**
 * Answer checking.
 *
 * Tolerance is defined explicitly here rather than left to each interaction,
 * because `docs/game/EDUCATIONAL_SYSTEM.md` calls for it and because a six-year
 * old typing "arbol" for "árbol" has understood the word. We forgive
 * capitalisation, surrounding whitespace and accents; we do not forgive a
 * different word.
 */

/**
 * Letters that NFD would decompose but that are letters in their own right,
 * not accented vowels. Stripping their mark changes the word: "ano" is not a
 * spelling slip for "año".
 */
const PROTECTED_LETTERS: ReadonlyArray<readonly [string, string]> = [
  ['\u00f1', '\u0001'], // n-tilde
  ['\u00e7', '\u0002'], // c-cedilla
]

/**
 * Lowercases, trims, collapses inner whitespace and strips vowel accents,
 * leaving letters that merely look accented intact.
 */
export function normaliseText(value: string): string {
  let text = value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  for (const [letter, sentinel] of PROTECTED_LETTERS) {
    text = text.replaceAll(letter, sentinel)
  }
  text = text
    .normalize('NFD')
    // Combining marks, i.e. the accents separated out by NFD.
    .replace(/[̀-ͯ]/g, '')
  for (const [letter, sentinel] of PROTECTED_LETTERS) {
    text = text.replaceAll(sentinel, letter)
  }
  return text
}

function answersMatch(expected: AnswerValue, given: AnswerValue): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(given) || given.length !== expected.length) return false
    return expected.every((item, index) => normaliseText(item) === normaliseText(given[index] as string))
  }
  if (Array.isArray(given)) return false

  if (typeof expected === 'number') {
    // Accept "7" for 7: a numeric field hands back a string.
    const asNumber = typeof given === 'number' ? given : Number(String(given).trim().replace(',', '.'))
    return Number.isFinite(asNumber) && asNumber === expected
  }

  return normaliseText(String(expected)) === normaliseText(String(given))
}

/**
 * The only thing gameplay learns about an answer.
 *
 * Returns correctness plus the teaching material. It does not know or care
 * whether this unlocks a door or lands an attack.
 */
export function checkAnswer(challenge: Challenge, given: AnswerValue): CheckResult {
  const correct = answersMatch(challenge.correctAnswer, given)
  return {
    correct,
    // A hint is only useful while the player can still try again.
    ...(!correct && challenge.hint ? { hint: challenge.hint } : {}),
    ...(challenge.explanation ? { explanation: challenge.explanation } : {}),
  }
}
