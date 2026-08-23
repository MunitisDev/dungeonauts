import { pickInt, shuffle } from '../../core/random'

/**
 * Shared machinery for building a multiple-choice question.
 *
 * The distractors are where a generated question is won or lost. Four random
 * numbers make the answer obvious; four numbers that are all plausible make the
 * child actually do the sum. Everything here exists to keep that bar met
 * without each generator reinventing it.
 */

/** Four options: the answer plus three distinct wrong ones, shuffled. */
export function choicesFrom(
  correct: string,
  candidates: readonly string[],
  random: () => number,
  filler: () => string,
): string[] {
  const taken = new Set([correct])
  const wrong: string[] = []
  for (const candidate of shuffle(candidates, random)) {
    if (wrong.length === 3) break
    if (taken.has(candidate) || candidate.trim() === '') continue
    taken.add(candidate)
    wrong.push(candidate)
  }
  // A short distractor list must never produce a two-option question: the
  // answer would be a coin flip.
  let guard = 0
  while (wrong.length < 3 && guard++ < 200) {
    const extra = filler()
    if (taken.has(extra) || extra.trim() === '') continue
    taken.add(extra)
    wrong.push(extra)
  }
  if (wrong.length < 3) throw new Error(`Could not build four options around "${correct}"`)
  return shuffle([correct, ...wrong], random)
}

/**
 * Four numeric options around the answer.
 *
 * Near misses first — off by one, off by two, the common carry mistake — so a
 * child who is nearly right sees their own answer on the screen and has to
 * choose. Never negative: below zero is not a number the youngest players have
 * met, and a negative option gives the answer away.
 */
export function numberChoices(
  correct: number,
  random: () => number,
  options: { readonly spread?: number; readonly extra?: readonly number[]; readonly min?: number } = {},
): string[] {
  const spread = options.spread ?? Math.max(2, Math.round(Math.abs(correct) * 0.2))
  const floor = options.min ?? 0
  const near = [correct + 1, correct - 1, correct + 2, correct - 2, correct + spread, correct - spread]
  // A place-value slip is a real mistake worth offering — but only where the
  // answer is big enough for it to be one. Offering 15 against "how many
  // letters in nube" is not a distractor, it is noise.
  if (correct >= 10) near.push(correct + 10, correct - 10)

  const candidates = [...(options.extra ?? []), ...near]
    .filter((value) => value >= floor && value !== correct && Number.isFinite(value))
    .map((value) => String(value))

  let offset = 3
  return choicesFrom(String(correct), candidates, random, () => {
    const value = correct + (offset % 2 === 0 ? offset : -offset) + pickInt(0, 2, random)
    offset += 1
    return value >= floor && value !== correct ? String(value) : String(correct + offset + 3)
  })
}

/** Options drawn from a list of words, padded from a wider pool if needed. */
export function wordChoices(
  correct: string,
  candidates: readonly string[],
  pool: readonly string[],
  random: () => number,
): string[] {
  let index = 0
  const shuffledPool = shuffle(pool, random)
  return choicesFrom(correct, candidates, random, () => shuffledPool[index++ % shuffledPool.length] ?? '')
}

/** Sentence case: capital first letter, rest untouched. */
export function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]?.toUpperCase() + text.slice(1)
}

/** "★ ★ ★" — a countable row a child can point at. */
export function repeatSymbol(symbol: string, count: number): string {
  return Array.from({ length: count }, () => symbol).join(' ')
}

/** Picks `count` distinct items. Throws rather than silently returning fewer. */
export function pickMany<T>(items: readonly T[], count: number, random: () => number): T[] {
  if (items.length < count) throw new Error(`Need ${count} items, have ${items.length}`)
  return shuffle(items, random).slice(0, count)
}

export { pickInt, shuffle }
export { pick } from '../../core/random'
