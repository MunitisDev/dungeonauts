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

  award(reward: { stars?: number; coins?: number }): void {
    this.starCount += Math.max(0, reward.stars ?? 0)
    this.coinCount += Math.max(0, reward.coins ?? 0)
  }

  /**
   * A wrong answer costs nothing.
   *
   * `GAME_DESIGN.md` is explicit that failure must be gentle and that there
   * should be no long punishment loops, so hearts exist for the HUD and for
   * later hazards, not as a penalty for thinking.
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

  snapshot(): GameStateSnapshot {
    return {
      ...this.totals(),
      resolved: [...this.resolvedIds].sort(),
      slimeProgress: Object.fromEntries([...this.slimeHits.entries()].sort()),
    }
  }
}
