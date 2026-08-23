/**
 * Everything the run remembers.
 *
 * Held outside the scene so it survives room changes: a slime seen off in the
 * entrance hall stays seen off when you come back. Pure data and pure
 * transitions, so the whole progression is testable without a renderer.
 */

export interface RunTotals {
  readonly hearts: number
  readonly keys: number
  readonly stars: number
  readonly coins: number
}

export interface GameStateSnapshot extends RunTotals {
  readonly resolved: readonly string[]
  readonly slimeProgress: Readonly<Record<string, number>>
}

/** Hearts a run starts with. Failure is gentle, so this is generous. */
export const STARTING_HEARTS = 3
/**
 * Ceiling on hearts.
 *
 * A cap is what makes a found heart feel like a rescue rather than a number
 * going up: at full health the child is told they are already full, and the
 * next one matters again as soon as they lose one.
 */
export const MAX_HEARTS = 5

export class GameState {
  /** Entities finished with: slime seen off, door open, chest open, key taken. */
  private readonly resolvedIds = new Set<string>()
  /** Correct answers landed on each slime so far. */
  private readonly slimeHits = new Map<string, number>()

  private heartCount = STARTING_HEARTS
  private keyCount = 0
  private starCount = 0
  private coinCount = 0

  get hearts(): number {
    return this.heartCount
  }
  get keys(): number {
    return this.keyCount
  }
  get stars(): number {
    return this.starCount
  }
  get coins(): number {
    return this.coinCount
  }

  isResolved(entityId: string): boolean {
    return this.resolvedIds.has(entityId)
  }

  resolve(entityId: string): void {
    this.resolvedIds.add(entityId)
  }

  /** Hits landed on a slime so far. */
  hitsOn(slimeId: string): number {
    return this.slimeHits.get(slimeId) ?? 0
  }

  /**
   * Records a correct answer against a slime.
   * Returns true when that was the last hit it needed.
   */
  landHit(slimeId: string, hitsNeeded: number): boolean {
    const hits = this.hitsOn(slimeId) + 1
    this.slimeHits.set(slimeId, hits)
    if (hits >= hitsNeeded) {
      this.resolve(slimeId)
      return true
    }
    return false
  }

  collectKey(entityId: string): void {
    if (this.isResolved(entityId)) return
    this.resolve(entityId)
    this.keyCount += 1
  }

  /** Spends a key, returning false when there is none to spend. */
  spendKey(): boolean {
    if (this.keyCount <= 0) return false
    this.keyCount -= 1
    return true
  }

  /**
   * Pays out a reward.
   *
   * Returns the hearts actually gained, which is not always what was offered:
   * a full player gains none, and the caller needs to know so it does not
   * announce a heart that never arrived.
   */
  award(reward: { stars?: number; coins?: number; hearts?: number }): { heartsGained: number } {
    this.starCount += Math.max(0, reward.stars ?? 0)
    this.coinCount += Math.max(0, reward.coins ?? 0)
    return { heartsGained: this.gainHearts(reward.hearts ?? 0) }
  }

  /** Restores hearts up to the cap, returning how many actually landed. */
  gainHearts(count: number): number {
    const wanted = Math.max(0, Math.round(count))
    const gained = Math.min(wanted, MAX_HEARTS - this.heartCount)
    this.heartCount += gained
    return gained
  }

  /**
   * Spends a heart on a wrong or timed-out answer.
   *
   * `GAME_DESIGN.md` still forbids long punishment loops, and this is what
   * keeps it from being one: hearts come back — from chests and from defeated
   * creatures — and running out restarts the same dungeon with a full row
   * rather than ending anything.
   */
  loseHeart(): void {
    this.heartCount = Math.max(0, this.heartCount - 1)
  }

  totals(): RunTotals {
    return {
      hearts: this.heartCount,
      keys: this.keyCount,
      stars: this.starCount,
      coins: this.coinCount,
    }
  }

  /**
   * Rebuilds a run from a saved snapshot.
   *
   * The reverse of `snapshot()`, and the only way state enters the class from
   * outside: a save is data, not a set of setters to be poked one by one.
   */
  static restore(snapshot: GameStateSnapshot): GameState {
    const state = new GameState()
    state.heartCount = Math.min(MAX_HEARTS, Math.max(0, Math.round(snapshot.hearts)))
    state.keyCount = Math.max(0, Math.round(snapshot.keys))
    state.starCount = Math.max(0, Math.round(snapshot.stars))
    state.coinCount = Math.max(0, Math.round(snapshot.coins))
    for (const id of snapshot.resolved) state.resolvedIds.add(id)
    for (const [id, hits] of Object.entries(snapshot.slimeProgress)) {
      state.slimeHits.set(id, Math.max(0, Math.round(hits)))
    }
    return state
  }

  snapshot(): GameStateSnapshot {
    return {
      ...this.totals(),
      resolved: [...this.resolvedIds].sort(),
      slimeProgress: Object.fromEntries([...this.slimeHits.entries()].sort()),
    }
  }
}
