import { describe, expect, it } from 'vitest'
import { isNoteName, noteFrequency } from '../src/audio/notes'
import { parsePattern, patternSteps } from '../src/audio/sequence'
import { TRACKS, trackSeconds, trackSteps, type Track } from '../src/audio/tracks'
import { VOICES } from '../src/audio/voices'

describe('note frequencies', () => {
  it('anchors on A4 = 440', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440, 6)
  })

  it('doubles every octave', () => {
    expect(noteFrequency('A5')).toBeCloseTo(880, 6)
    expect(noteFrequency('A3')).toBeCloseTo(220, 6)
  })

  it('places middle C and the rest of the scale correctly', () => {
    expect(noteFrequency('C4')).toBeCloseTo(261.626, 3)
    expect(noteFrequency('D4')).toBeCloseTo(293.665, 3)
    expect(noteFrequency('G4')).toBeCloseTo(391.995, 3)
  })

  it('treats sharps and flats as the same pitch', () => {
    expect(noteFrequency('A#3')).toBeCloseTo(noteFrequency('Bb3'), 6)
    expect(noteFrequency('C#4')).toBeCloseTo(noteFrequency('Db4'), 6)
  })

  it('rejects anything that is not a note', () => {
    expect(() => noteFrequency('H4')).toThrow()
    expect(() => noteFrequency('A')).toThrow()
    expect(() => noteFrequency('.')).toThrow()
    expect(isNoteName('Bb2')).toBe(true)
    expect(isNoteName('_')).toBe(false)
  })
})

describe('pattern notation', () => {
  it('reads one note per step', () => {
    expect(parsePattern('D4 F4 A4')).toEqual([
      { pitch: 'D4', steps: 1, at: 0 },
      { pitch: 'F4', steps: 1, at: 1 },
      { pitch: 'A4', steps: 1, at: 2 },
    ])
  })

  it('extends a note with holds', () => {
    expect(parsePattern('D4 _ _ _')).toEqual([{ pitch: 'D4', steps: 4, at: 0 }])
  })

  it('reads rests', () => {
    expect(parsePattern('. D4')).toEqual([
      { pitch: null, steps: 1, at: 0 },
      { pitch: 'D4', steps: 1, at: 1 },
    ])
  })

  it('ignores barlines and whitespace, which exist only for reading', () => {
    expect(parsePattern('D4 F4 | A4 D5')).toHaveLength(4)
    expect(parsePattern('\n  D4   F4\n')).toHaveLength(2)
    expect(patternSteps('D4 _ | . F4')).toBe(4)
  })

  it('refuses a hold with nothing to extend', () => {
    expect(() => parsePattern('_ D4')).toThrow(/extends nothing/)
  })

  it('refuses an unknown token', () => {
    expect(() => parsePattern('D4 x')).toThrow(/Unknown token "x"/)
  })

  it('keeps step positions aligned across holds and rests', () => {
    const events = parsePattern('D4 _ . F4')
    expect(events.map((e) => e.at)).toEqual([0, 2, 3])
  })
})

describe('the compositions', () => {
  const tracks = Object.values(TRACKS)

  it.each(tracks.map((t) => [t.id, t] as const))('%s: every note is playable', (_id, track) => {
    for (const part of track.parts) {
      for (const event of parsePattern(part.pattern)) {
        if (event.pitch) expect(() => noteFrequency(event.pitch as string)).not.toThrow()
      }
    }
  })

  /**
   * The bug this exists to catch: one bar with seven tokens instead of eight.
   * That part then drifts a step further behind on every loop, which is
   * maddening to diagnose by ear and obvious here.
   */
  it.each(tracks.map((t) => [t.id, t] as const))('%s: all parts are the same length', (id, track) => {
    const lengths = track.parts.map((part) => patternSteps(part.pattern))
    expect(new Set(lengths), `${id} part lengths: ${lengths.join(', ')}`).toHaveProperty('size', 1)
  })

  it.each(tracks.map((t) => [t.id, t] as const))('%s: is a whole number of bars', (id, track) => {
    // Eight eighth-note steps to a 4/4 bar.
    expect(trackSteps(track) % 8, `${id} has a ragged final bar`).toBe(0)
  })

  it.each(tracks.map((t) => [t.id, t] as const))('%s: uses only defined voices', (_id, track) => {
    for (const part of track.parts) expect(VOICES).toHaveProperty(part.voice)
  })

  it('loops the two background themes and plays the fanfare once', () => {
    expect(TRACKS.title.loop).toBe(true)
    expect(TRACKS.dungeon.loop).toBe(true)
    expect(TRACKS.victory.loop).toBe(false)
  })

  it('gives each loop enough length not to feel like a jingle', () => {
    // Under about ten seconds a loop starts to nag; this is a game a child may
    // sit with for a while.
    expect(trackSeconds(TRACKS.title)).toBeGreaterThan(15)
    expect(trackSeconds(TRACKS.dungeon)).toBeGreaterThan(20)
  })

  it('keeps the fanfare short, since it interrupts', () => {
    expect(trackSeconds(TRACKS.victory)).toBeLessThan(6)
  })

  it('keeps the dungeon loop calmer than the title theme', () => {
    // It plays underneath thinking, so it must not compete with it.
    expect(TRACKS.dungeon.bpm).toBeLessThan(TRACKS.title.bpm)
    const percussive = (track: Track) =>
      track.parts.filter((p) => p.voice === 'kick' || p.voice === 'hat').length
    expect(percussive(TRACKS.dungeon)).toBe(0)
    expect(percussive(TRACKS.title)).toBeGreaterThan(0)
  })
})
