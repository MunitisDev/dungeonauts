/**
 * Deterministic pseudo-random selection.
 *
 * Seeded on purpose: a test that asserts "this request returns a question"
 * must not be flaky, and a future replay or classroom-shared session needs the
 * same sequence twice. `Math.random` would give us neither.
 */

/** Mulberry32 — small, fast, good enough for picking a question. */
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
