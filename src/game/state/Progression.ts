/**
 * Experience and levels, kept across runs.
 *
 * Separate from `GameState` on purpose: hearts and keys belong to the dungeon
 * you are in and reset when it does, while a level belongs to the child and
 * must survive a game over, a new dungeon and closing the tab. Mixing the two
 * is how "you lost your level because you ran out of hearts" happens.
 *
 * A level does nothing yet beyond being visible. That is deliberate: the number
 * has to exist and be trustworthy before anything can be hung off it.
 */

/** Levels stop here for now; there is nothing to spend them on yet. */
export const MAX_LEVEL = 10

/**
 * Experience for one level, at the level you are leaving.
 *
 * A gentle curve: the first level takes about three rooms, the tenth about
 * seven. Steeper than that and a young player stops seeing the bar move.
 */
export function xpForLevel(level: number): number {
  return 40 + 20 * (Math.max(1, level) - 1)
}

/** Total experience needed to have reached a level. */
export function xpToReach(level: number): number {
  let total = 0
  for (let n = 1; n < Math.max(1, level); n++) total += xpForLevel(n)
  return total
}

export interface LevelProgress {
  readonly level: number
  /** Experience earned inside the current level. */
  readonly into: number
  /** Experience the current level needs in total; 0 at the cap. */
  readonly needed: number
  /** 0-1, for the bar. Full at the cap. */
  readonly fraction: number
}

export function progressFor(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  let spent = 0
  while (level < MAX_LEVEL && total - spent >= xpForLevel(level)) {
    spent += xpForLevel(level)
    level += 1
  }
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, into: 0, needed: 0, fraction: 1 }
  const needed = xpForLevel(level)
  const into = total - spent
  return { level, into, needed, fraction: needed === 0 ? 1 : into / needed }
}

/** What each kind of success is worth. */
export const XP_AWARDS = {
  slime_hit: 3,
  slime_defeated: 12,
  chest_opened: 15,
  mechanism_activated: 10,
  door_unlocked: 6,
  dungeon_complete: 40,
} as const
export type XpReason = keyof typeof XP_AWARDS

export class Progression {
  private total: number
  private readonly listeners = new Set<(progress: LevelProgress) => void>()

  constructor(xp = 0) {
    this.total = Math.max(0, Math.floor(xp))
  }

  get xp(): number {
    return this.total
  }

  get level(): number {
    return progressFor(this.total).level
  }

  get progress(): LevelProgress {
    return progressFor(this.total)
  }

  /** Awards experience, reporting the new level when one was reached. */
  award(reason: XpReason): { gained: number; levelledUpTo?: number } {
    const before = this.level
    const gained = XP_AWARDS[reason]
    this.total += gained
    const after = this.level
    for (const listener of this.listeners) listener(this.progress)
    return after > before ? { gained, levelledUpTo: after } : { gained }
  }

  onChange(listener: (progress: LevelProgress) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
