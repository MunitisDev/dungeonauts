import { parseProfile, type Profile } from './Profile'

const STORAGE_KEY = 'dungeonauts.save.v1'

/**
 * A run in progress, as plain data.
 *
 * The dungeon itself is never stored — only the seed that built it. Generation
 * is deterministic, so a seed is a complete description of the map in eight
 * bytes, and a save can never disagree with the generator.
 */
export interface SavedRun {
  readonly seed: number
  /** Room the hero was standing in. */
  readonly roomId: string
  /** Entity ids already dealt with. */
  readonly resolved: readonly string[]
  /** Correct answers landed on each slime so far. */
  readonly slimeProgress: Readonly<Record<string, number>>
  readonly hearts: number
  readonly keys: number
  readonly stars: number
  readonly coins: number
  readonly visitedRooms: readonly string[]
}

export interface SaveData {
  readonly profile: Profile
  readonly run?: SavedRun
}

/**
 * Who is playing and where they got to, persisted per browser.
 *
 * Deliberately small and deliberately forgiving: every read is validated and a
 * corrupt or half-written save is treated as no save at all. A child losing
 * their progress is bad; a child unable to start the game because of a stale
 * key is worse.
 */
export class SaveStore {
  private data: SaveData | undefined

  constructor(initial?: SaveData) {
    this.data = initial ?? readStored()
  }

  get profile(): Profile | undefined {
    return this.data?.profile
  }

  get run(): SavedRun | undefined {
    return this.data?.run
  }

  /** True when there is a run worth offering to continue. */
  get hasRun(): boolean {
    return this.data?.run !== undefined
  }

  setProfile(profile: Profile): void {
    this.data = { profile }
    this.persist()
  }

  saveRun(run: SavedRun): void {
    const profile = this.data?.profile
    if (!profile) return
    this.data = { profile, run }
    this.persist()
  }

  /** Forgets the run but keeps who is playing, so a new game skips onboarding. */
  clearRun(): void {
    if (!this.data) return
    this.data = { profile: this.data.profile }
    this.persist()
  }

  private persist(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      // Private windows and blocked site data must not stop the game.
    }
  }
}

/** Validates anything claiming to be a save, or returns undefined. */
export function parseSave(input: unknown): SaveData | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const raw = input as Record<string, unknown>
  const profile = parseProfile(raw['profile'])
  if (!profile) return undefined
  const run = parseRun(raw['run'])
  return run ? { profile, run } : { profile }
}

function parseRun(input: unknown): SavedRun | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const raw = input as Record<string, unknown>
  if (typeof raw['seed'] !== 'number' || !Number.isFinite(raw['seed'])) return undefined
  if (typeof raw['roomId'] !== 'string' || raw['roomId'] === '') return undefined

  const progress: Record<string, number> = {}
  const rawProgress = raw['slimeProgress']
  if (typeof rawProgress === 'object' && rawProgress !== null) {
    for (const [id, hits] of Object.entries(rawProgress as Record<string, unknown>)) {
      if (typeof hits === 'number' && Number.isFinite(hits)) progress[id] = Math.max(0, hits | 0)
    }
  }

  return {
    seed: raw['seed'],
    roomId: raw['roomId'],
    resolved: stringList(raw['resolved']),
    slimeProgress: progress,
    hearts: count(raw['hearts'], 3),
    keys: count(raw['keys'], 0),
    stars: count(raw['stars'], 0),
    coins: count(raw['coins'], 0),
    visitedRooms: stringList(raw['visitedRooms']),
  }
}

function stringList(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((v): v is string => typeof v === 'string') : []
}

function count(input: unknown, fallback: number): number {
  return typeof input === 'number' && Number.isFinite(input) ? Math.max(0, Math.round(input)) : fallback
}

function readStored(): SaveData | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return undefined
    return parseSave(JSON.parse(raw))
  } catch {
    return undefined
  }
}
