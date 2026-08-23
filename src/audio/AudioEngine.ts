import { noteFrequency } from './notes'
import { VOICES, type Voice, type VoiceName } from './voices'

const MUSIC_LEVEL = 0.55
const SFX_LEVEL = 0.85

/**
 * Everything audible, built from oscillators rather than sound files.
 *
 * Synthesis over samples on purpose: a few kilobytes of note data instead of
 * megabytes of audio, no asset pipeline to feed, and the result is genuinely
 * chiptune rather than an imitation of one.
 *
 * Browsers refuse to start audio without a gesture, so nothing sounds until
 * `unlock()` is called from a real click — which is what the title screen's
 * play button is for.
 */
export class AudioEngine {
  private context?: AudioContext
  private master?: GainNode
  private musicBus?: GainNode
  private sfxBus?: GainNode
  private noiseBuffer?: AudioBuffer
  private enabled = true

  get isUnlocked(): boolean {
    return this.context !== undefined
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /** Creates the audio context. Must be called from a user gesture. */
  unlock(): void {
    if (this.context) {
      void this.context.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return

    const context = new Ctor()
    const master = context.createGain()
    master.gain.value = this.enabled ? 1 : 0
    master.connect(context.destination)

    const musicBus = context.createGain()
    musicBus.gain.value = MUSIC_LEVEL
    musicBus.connect(master)

    const sfxBus = context.createGain()
    sfxBus.gain.value = SFX_LEVEL
    sfxBus.connect(master)

    this.context = context
    this.master = master
    this.musicBus = musicBus
    this.sfxBus = sfxBus
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!this.master || !this.context) return
    // A short ramp, because an instant cut is itself an unpleasant noise.
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.02)
  }

  get now(): number {
    return this.context?.currentTime ?? 0
  }

  get music(): GainNode | undefined {
    return this.musicBus
  }

  get sfx(): GainNode | undefined {
    return this.sfxBus
  }

  /**
   * Plays one note.
   *
   * `at` is an absolute context time, so a whole phrase can be scheduled ahead
   * and stay in time regardless of what the main thread is doing.
   */
  play(
    voiceName: VoiceName,
    pitch: string | null,
    at: number,
    duration: number,
    destination: GainNode | undefined = this.sfxBus,
    gainScale = 1,
  ): void {
    const context = this.context
    if (!context || !destination || duration <= 0) return
    const voice = VOICES[voiceName] as Voice

    const amp = context.createGain()
    const peak = voice.gain * gainScale
    // Explicit envelope: an un-ramped oscillator clicks on start and stop.
    amp.gain.setValueAtTime(0.0001, at)
    amp.gain.linearRampToValueAtTime(peak, at + voice.attack)
    amp.gain.linearRampToValueAtTime(
      Math.max(0.0001, peak * voice.sustain),
      at + voice.attack + voice.decay,
    )
    amp.gain.setTargetAtTime(0.0001, at + duration, Math.max(0.01, voice.release / 3))

    let tail: AudioNode = amp
    if (voice.cutoff !== undefined) {
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = voice.cutoff
      amp.connect(filter)
      tail = filter
    }
    tail.connect(destination)

    const stopAt = at + duration + voice.release + 0.05

    if (voice.noise) {
      const source = context.createBufferSource()
      source.buffer = this.noise(context)
      source.loop = true
      const highpass = context.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 6000
      source.connect(highpass).connect(amp)
      source.start(at)
      source.stop(stopAt)
      return
    }

    const oscillator = context.createOscillator()
    oscillator.type = voice.wave
    const frequency = pitch ? noteFrequency(pitch) : 220
    oscillator.frequency.setValueAtTime(frequency, at)
    if (voice.pitchDrop !== undefined) {
      // Percussive pitch sweep: what turns a sine into a kick drum.
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, frequency * (1 - voice.pitchDrop)),
        at + Math.max(0.05, duration * 0.8),
      )
    }
    oscillator.connect(amp)
    oscillator.start(at)
    oscillator.stop(stopAt)
  }

  /** One second of white noise, reused by every percussive hit. */
  private noise(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer
    return buffer
  }
}
