import { isNoteName } from './notes'

/**
 * A tracker-style pattern notation.
 *
 * One token per step, so rhythm is visible in the source: the columns line up
 * and a missing beat is something you can see, not only hear.
 *
 *   `.`  rest
 *   `_`  hold the previous note for another step
 *   `|`  barline, ignored — purely for reading
 *
 * Anything else must be a note name, e.g. `D4`, `Bb3`, `F#5`.
 */
export interface NoteEvent {
  /** `null` for a rest. */
  readonly pitch: string | null
  /** Length in steps. */
  readonly steps: number
  /** Step index where it begins. */
  readonly at: number
}

export function parsePattern(pattern: string): NoteEvent[] {
  const tokens = pattern.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean)
  const events: NoteEvent[] = []
  let step = 0

  for (const token of tokens) {
    if (token === '_') {
      const previous = events.at(-1)
      if (!previous) throw new Error('Pattern starts with a hold, which extends nothing')
      events[events.length - 1] = { ...previous, steps: previous.steps + 1 }
      step += 1
      continue
    }
    if (token === '.') {
      events.push({ pitch: null, steps: 1, at: step })
      step += 1
      continue
    }
    if (!isNoteName(token)) throw new Error(`Unknown token "${token}" in pattern`)
    events.push({ pitch: token, steps: 1, at: step })
    step += 1
  }
  return events
}

/** Total length of a pattern, in steps. */
export function patternSteps(pattern: string): number {
  return pattern.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean).length
}
