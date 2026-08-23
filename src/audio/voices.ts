/**
 * The instrument palette.
 *
 * Deliberately small and chiptune-shaped: square leads, a triangle bass, noise
 * percussion. `ART_DIRECTION.md` asks for a friendly 8/16-bit language, and
 * this is its audible equivalent — nothing here tries to sound orchestral.
 */
export interface Voice {
  readonly wave: OscillatorType
  /** Seconds to reach full level. */
  readonly attack: number
  /** Seconds to fall to the sustain level. */
  readonly decay: number
  /** Level held while the note lasts, 0..1. */
  readonly sustain: number
  /** Seconds to fade out after the note ends. */
  readonly release: number
  readonly gain: number
  /** Optional low-pass, to take the edge off for young ears. */
  readonly cutoff?: number
  /** Percussive voices sweep their pitch down instead of holding it. */
  readonly pitchDrop?: number
  /** Noise-based voices ignore pitch. */
  readonly noise?: boolean
}

export const VOICES = {
  lead: { wave: 'square', attack: 0.008, decay: 0.06, sustain: 0.55, release: 0.09, gain: 0.16, cutoff: 4200 },
  harmony: { wave: 'square', attack: 0.006, decay: 0.05, sustain: 0.3, release: 0.07, gain: 0.055, cutoff: 3200 },
  bass: { wave: 'triangle', attack: 0.01, decay: 0.09, sustain: 0.7, release: 0.1, gain: 0.28 },
  pad: { wave: 'triangle', attack: 0.14, decay: 0.3, sustain: 0.5, release: 0.4, gain: 0.1, cutoff: 2400 },
  bell: { wave: 'sine', attack: 0.004, decay: 0.22, sustain: 0.12, release: 0.25, gain: 0.22 },
  kick: { wave: 'sine', attack: 0.002, decay: 0.11, sustain: 0, release: 0.05, gain: 0.5, pitchDrop: 0.75 },
  hat: { wave: 'square', attack: 0.001, decay: 0.035, sustain: 0, release: 0.02, gain: 0.06, noise: true },
} as const satisfies Record<string, Voice>

export type VoiceName = keyof typeof VOICES
