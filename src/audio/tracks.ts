import { patternSteps } from './sequence'
import type { VoiceName } from './voices'

/**
 * The music, written as data.
 *
 * Every pattern is one token per eighth note, eight tokens to a bar, with `|`
 * marking barlines so the phrasing is legible. `tests/music.test.ts` checks
 * that every part of a track is the same length and that every note parses,
 * which catches a mistyped bar that would otherwise only show up as a track
 * slowly drifting out of time.
 */
export interface Part {
  readonly voice: VoiceName
  readonly pattern: string
  /** Multiplier on the voice's own level, for balancing within a track. */
  readonly gain?: number
}

export interface Track {
  readonly id: string
  readonly bpm: number
  /** Beats per step. 0.5 means each token is an eighth note. */
  readonly stepBeats: number
  readonly loop: boolean
  readonly parts: readonly Part[]
}

/**
 * "Dungeonauts" — the title theme.
 *
 * D natural minor at a walking pace: a rising heroic phrase answered by a
 * gentler falling one, over Dm–Bb–F–C. The A major in the last bar is the one
 * borrowed chord, and it is there to pull the loop back round to the start
 * rather than let it just stop and restart.
 */
export const TITLE_THEME: Track = {
  id: 'title',
  bpm: 108,
  stepBeats: 0.5,
  loop: true,
  parts: [
    {
      voice: 'lead',
      pattern: `
        A4 _  D5 _  F5 _  E5 _ | D5 _  _  .  A4 _  C5 _ |
        D5 _  E5 _  F5 _  G5 _ | A5 _  _  _  _  .  .  . |
        G5 _  F5 _  E5 _  D5 _ | C5 _  _  .  E5 _  G5 _ |
        F5 _  E5 _  D5 _  C5 _ | D5 _  _  _  _  .  .  . `,
    },
    {
      voice: 'harmony',
      pattern: `
        D4 F4 A4 F4 D4 F4 A4 F4 | Bb3 D4 F4 D4 Bb3 D4 F4 D4 |
        F3 A3 C4 A3 F3 A3 C4 A3 | C4  E4 G4 E4 C4  E4 G4 E4 |
        D4 F4 A4 F4 D4 F4 A4 F4 | Bb3 D4 F4 D4 Bb3 D4 F4 D4 |
        G3 Bb3 D4 Bb3 G3 Bb3 D4 Bb3 | A3 C#4 E4 C#4 A3 C#4 E4 C#4 `,
    },
    {
      voice: 'bass',
      pattern: `
        D3 _ D3 _ A2 _ D3 _ | Bb2 _ Bb2 _ F2 _ Bb2 _ |
        F2 _ F2 _ C3 _ F2 _ | C3  _ C3  _ G2 _ C3  _ |
        D3 _ D3 _ A2 _ D3 _ | Bb2 _ Bb2 _ F2 _ Bb2 _ |
        G2 _ G2 _ D3 _ G2 _ | A2  _ A2  _ E3 _ A2  _ `,
    },
    {
      voice: 'kick',
      pattern: `
        C2 . . . C2 . . . | C2 . . . C2 . . . |
        C2 . . . C2 . . . | C2 . . . C2 . . . |
        C2 . . . C2 . . . | C2 . . . C2 . . . |
        C2 . . . C2 . . . | C2 . . . C2 . C2 . `,
    },
    {
      voice: 'hat',
      pattern: `
        . A6 . A6 . A6 . A6 | . A6 . A6 . A6 . A6 |
        . A6 . A6 . A6 . A6 | . A6 . A6 . A6 . A6 |
        . A6 . A6 . A6 . A6 | . A6 . A6 . A6 . A6 |
        . A6 . A6 . A6 . A6 | . A6 . A6 . A6 . A6 `,
    },
  ],
}

/**
 * "Stone Dungeon" — the exploration loop.
 *
 * D dorian rather than natural minor: the natural B keeps it curious instead of
 * sad. Slower, sparse, no percussion. This one plays for a long time while a
 * child thinks, so it is built to be ignorable — long notes, plenty of silence,
 * and no hook insistent enough to grate on the twentieth pass.
 */
export const DUNGEON_THEME: Track = {
  id: 'dungeon',
  bpm: 86,
  stepBeats: 0.5,
  loop: true,
  parts: [
    {
      voice: 'lead',
      gain: 0.75,
      pattern: `
        D4 _ _ _ .  .  A4 _ | F4 _ E4 _ D4 _ _  . |
        G4 _ _ _ .  .  E4 _ | D4 _ _  _ _  _ .  . |
        F4 _ _ _ .  .  A4 _ | B4 _ A4 _ G4 _ _  . |
        E4 _ _ _ .  .  G4 _ | D4 _ _  _ _  _ .  . `,
    },
    {
      voice: 'pad',
      pattern: `
        A3 . . . .  . . . | F3 . . . C4 . . . |
        B3 . . . .  . . . | A3 . . . .  . . . |
        C4 . . . .  . . . | B3 . . . A3 . . . |
        C4 . . . .  . . . | A3 . . . .  . . . `,
    },
    {
      voice: 'bass',
      gain: 0.8,
      pattern: `
        D2 _ _ _ _  _ _ _ | D2 _ _ _ A2 _ _ _ |
        G2 _ _ _ _  _ _ _ | D2 _ _ _ _  _ _ _ |
        F2 _ _ _ _  _ _ _ | G2 _ _ _ D2 _ _ _ |
        A2 _ _ _ _  _ _ _ | D2 _ _ _ _  _ _ _ `,
    },
  ],
}

/** A short rising fanfare for finishing the dungeon. Plays once. */
export const VICTORY_FANFARE: Track = {
  id: 'victory',
  bpm: 120,
  stepBeats: 0.5,
  loop: false,
  parts: [
    { voice: 'lead', pattern: `D5 _ F5 _ A5 _ _ _ | D6 _ _ _ _ _ _ _` },
    { voice: 'harmony', pattern: `D4 F4 A4 D5 F5 A5 D6 _ | D5 F5 A5 D6 _ _ _ _` },
    { voice: 'bass', pattern: `D3 _ _ _ D3 _ _ _ | D3 _ _ _ _ _ _ _` },
    { voice: 'kick', pattern: `C2 . . . C2 . . . | C2 . . C2 . . . .` },
  ],
}

export const TRACKS = { title: TITLE_THEME, dungeon: DUNGEON_THEME, victory: VICTORY_FANFARE } as const
export type TrackName = keyof typeof TRACKS

/** Length of a track in steps, taken from its longest part. */
export function trackSteps(track: Track): number {
  return Math.max(...track.parts.map((part) => patternSteps(part.pattern)))
}

export function trackSeconds(track: Track): number {
  return (trackSteps(track) * track.stepBeats * 60) / track.bpm
}
