/**
 * Seeded pseudo-random numbers.
 *
 * Deterministic on purpose. A generated dungeon has to be reproducible from its
 * seed alone — that is what lets a saved game store four bytes instead of a
 * whole map — and tests must not be flaky.
 */

/** Mulberry32: small, fast, and good enough for laying out a dungeon. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) throw new Error('Cannot pick from an empty list')
  return items[Math.floor(random() * items.length)] as T
}

/** Whole number in [low, high], inclusive. */
export function pickInt(low: number, high: number, random: () => number): number {
  return low + Math.floor(random() * (high - low + 1))
}

/** Fisher-Yates, on a copy. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}
