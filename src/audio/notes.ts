/**
 * Note names to frequencies, equal temperament, A4 = 440 Hz.
 *
 * Music in this project is written as note names rather than numbers, because
 * a melody you can read is a melody you can fix.
 */
const SEMITONES: Readonly<Record<string, number>> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

const A4_FREQUENCY = 440
/** MIDI-style index of A4, used as the reference point. */
const A4_INDEX = 4 * 12 + SEMITONES['A']!

const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/

/** `"F#4"` -> 369.99. Throws on anything that is not a note. */
export function noteFrequency(name: string): number {
  const match = NOTE_PATTERN.exec(name)
  if (!match) throw new Error(`Not a note name: "${name}"`)
  const [, letter, accidental, octave] = match
  const semitone = SEMITONES[`${letter}${accidental}`]
  if (semitone === undefined) throw new Error(`Unknown pitch: "${name}"`)
  const index = Number(octave) * 12 + semitone
  return A4_FREQUENCY * 2 ** ((index - A4_INDEX) / 12)
}

export function isNoteName(value: string): boolean {
  return NOTE_PATTERN.test(value)
}
