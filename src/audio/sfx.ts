import type { AudioEngine } from './AudioEngine'

/**
 * Short sounds for things that happen.
 *
 * Composed rather than sampled, like the music. The tone rules come from
 * `GAME_DESIGN.md`: success is immediate and satisfying, a wrong answer gets a
 * neutral sound — never a buzzer, never anything that reads as a telling-off.
 */
export type SoundName =
  | 'correct'
  | 'wrong'
  | 'key'
  | 'door'
  | 'chest'
  | 'hit'
  | 'defeat'
  | 'refused'
  | 'ui'
  | 'room'

export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  play(name: SoundName): void {
    const t = this.engine.now
    const out = this.engine.sfx
    if (!out) return
    const note = (voice: Parameters<AudioEngine['play']>[0], pitch: string, offset: number, length: number, gain = 1) =>
      this.engine.play(voice, pitch, t + offset, length, out, gain)

    switch (name) {
      // Rising major arpeggio: unambiguous success without being a jingle.
      case 'correct':
        note('bell', 'D5', 0, 0.1)
        note('bell', 'F#5', 0.07, 0.1)
        note('bell', 'A5', 0.14, 0.22)
        break

      // Two soft falling notes. Gentle and neutral — it says "not that one",
      // not "wrong".
      case 'wrong':
        note('pad', 'F4', 0, 0.14, 0.8)
        note('pad', 'D4', 0.11, 0.2, 0.8)
        break

      case 'key':
        note('bell', 'A5', 0, 0.09)
        note('bell', 'D6', 0.08, 0.24)
        break

      case 'door':
        note('kick', 'F2', 0, 0.18)
        note('bass', 'D3', 0.06, 0.22, 0.8)
        note('bell', 'A4', 0.18, 0.14, 0.7)
        note('bell', 'D5', 0.28, 0.3, 0.7)
        break

      // The biggest reward in the slice gets the longest flourish.
      case 'chest':
        note('bell', 'D5', 0, 0.1)
        note('bell', 'A5', 0.08, 0.1)
        note('bell', 'D6', 0.16, 0.1)
        note('bell', 'F#6', 0.24, 0.34)
        note('harmony', 'D4', 0, 0.5, 1.2)
        break

      case 'hit':
        note('lead', 'A4', 0, 0.07)
        note('lead', 'D5', 0.05, 0.09)
        break

      // Comic, bouncing away — never a death sound.
      case 'defeat':
        note('lead', 'D5', 0, 0.08)
        note('lead', 'A4', 0.08, 0.08)
        note('lead', 'F4', 0.16, 0.08)
        note('lead', 'D4', 0.24, 0.2)
        break

      // "Not yet" rather than "no".
      case 'refused':
        note('pad', 'A3', 0, 0.18, 0.7)
        break

      case 'ui':
        note('bell', 'A5', 0, 0.06, 0.6)
        break

      case 'room':
        note('pad', 'D4', 0, 0.3, 0.6)
        note('pad', 'A4', 0.05, 0.34, 0.5)
        break
    }
  }
}
