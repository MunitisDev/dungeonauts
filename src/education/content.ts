import { parseChallengeFile } from './validation'
import type { Challenge } from './types'

/**
 * Loads every authored content file.
 *
 * Globbed rather than listed by hand: adding a question file must not require
 * touching code, or the content stops being data. Every file is validated on
 * load, so a malformed question fails immediately and visibly.
 */
const modules = import.meta.glob<{ default: unknown }>('/content/**/*.json', { eager: true })

let cached: readonly Challenge[] | undefined

export function loadAuthoredChallenges(): readonly Challenge[] {
  if (cached) return cached
  cached = Object.entries(modules)
    // Stable order regardless of how the bundler enumerates the glob, so a
    // seeded pick is reproducible across environments.
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([file, module]) => parseChallengeFile(module.default, file))
  return cached
}

/** Paths of the files that were globbed, for coverage reporting in tests. */
export function authoredContentFiles(): string[] {
  return Object.keys(modules).sort()
}
