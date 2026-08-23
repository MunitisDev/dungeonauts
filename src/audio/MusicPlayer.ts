import type { AudioEngine } from './AudioEngine'
import { parsePattern } from './sequence'
import { TRACKS, trackSeconds, type Track, type TrackName } from './tracks'

/**
 * Plays a track, and keeps it looping.
 *
 * The whole loop is scheduled at once against the audio clock, then a timer
 * queues the next pass shortly before the current one ends. Scheduling ahead is
 * what keeps the music in time: the main thread stutters whenever the game does
 * something expensive, and note timing must not stutter with it.
 */
export class MusicPlayer {
  private currentTrack: TrackName | undefined
  private nextPass: number | undefined

  constructor(private readonly engine: AudioEngine) {}

  get playing(): TrackName | undefined {
    return this.currentTrack
  }

  /** Starts a track, or does nothing if it is already the one playing. */
  play(name: TrackName): void {
    if (this.currentTrack === name) return
    this.stop()
    this.currentTrack = name
    this.schedulePass(name, this.engine.now + 0.08)
  }

  stop(): void {
    if (this.nextPass !== undefined) window.clearTimeout(this.nextPass)
    this.nextPass = undefined
    this.currentTrack = undefined
    // Notes already scheduled ring out rather than being cut off mid-phrase,
    // which sounds like a fault rather than an ending.
  }

  private schedulePass(name: TrackName, startAt: number): void {
    const track = TRACKS[name]
    this.scheduleTrack(track, startAt)

    if (!track.loop) {
      this.currentTrack = undefined
      return
    }

    const duration = trackSeconds(track)
    // Queue the next pass a little early, so the loop joins seamlessly even if
    // the timer fires late.
    const leadTime = 0.25
    const delayMs = Math.max(50, (startAt + duration - this.engine.now - leadTime) * 1000)
    this.nextPass = window.setTimeout(() => {
      if (this.currentTrack !== name) return
      this.schedulePass(name, startAt + duration)
    }, delayMs)
  }

  private scheduleTrack(track: Track, startAt: number): void {
    const secondsPerStep = (track.stepBeats * 60) / track.bpm
    for (const part of track.parts) {
      for (const event of parsePattern(part.pattern)) {
        if (!event.pitch) continue
        this.engine.play(
          part.voice,
          event.pitch,
          startAt + event.at * secondsPerStep,
          // Shortened slightly so consecutive notes articulate instead of slurring.
          event.steps * secondsPerStep * 0.92,
          this.engine.music,
          part.gain ?? 1,
        )
      }
    }
  }
}
