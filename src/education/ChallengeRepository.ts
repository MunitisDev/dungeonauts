import { createRandom, pick } from './selection'
import type { Challenge, ChallengeRequest, Difficulty, Subject } from './types'

/**
 * The read side of the educational system.
 *
 * Holds validated challenges and answers requests for a *shape* of question.
 * It never returns question text to a caller that did not ask for a challenge,
 * and it has no idea what the game will do with the answer.
 */
export class ChallengeRepository {
  private readonly challenges: readonly Challenge[]
  private readonly random: () => number

  constructor(challenges: readonly Challenge[], seed = 1) {
    const ids = new Set<string>()
    for (const challenge of challenges) {
      if (ids.has(challenge.id)) throw new Error(`Duplicate challenge id "${challenge.id}"`)
      ids.add(challenge.id)
    }
    this.challenges = challenges
    this.random = createRandom(seed)
  }

  get size(): number {
    return this.challenges.length
  }

  all(): readonly Challenge[] {
    return this.challenges
  }

  /** Every challenge matching the request, exact difficulty, in authored order. */
  filter(request: ChallengeRequest): Challenge[] {
    return this.challenges.filter(
      (challenge) =>
        challenge.locale === request.locale &&
        challenge.subject === request.subject &&
        challenge.difficulty === request.difficulty &&
        (request.skill === undefined || challenge.skill === request.skill),
    )
  }

  /**
   * One challenge for the request, or `null` when nothing fits.
   *
   * Returning `null` rather than throwing is deliberate: gameplay must be able
   * to fall back gracefully — a door that cannot find a question should open,
   * not crash a child's session.
   *
   * Difficulty is widened outward (3 -> 2 -> 4 -> 1 -> 5) before giving up, so a
   * gap in authored content degrades into a slightly easier or harder question
   * instead of a dead end. `exclude` is honoured only while alternatives exist;
   * repeating a question beats having none.
   */
  request(request: ChallengeRequest): Challenge | null {
    const excluded = new Set(request.exclude ?? [])

    for (const difficulty of difficultyFallback(request.difficulty)) {
      const candidates = this.filter({ ...request, difficulty })
      if (candidates.length === 0) continue

      const fresh = candidates.filter((challenge) => !excluded.has(challenge.id))
      return pick(fresh.length > 0 ? fresh : candidates, this.random)
    }

    // Last resort: drop the skill constraint but keep subject and locale, so a
    // maths door still asks a maths question.
    if (request.skill !== undefined) {
      const { skill: _skill, ...withoutSkill } = request
      return this.request(withoutSkill)
    }

    return null
  }

  /** Distinct skills with authored content, for coverage reporting. */
  skillsFor(locale: string, subject: Subject): string[] {
    const skills = this.challenges
      .filter((challenge) => challenge.locale === locale && challenge.subject === subject)
      .map((challenge) => challenge.skill)
    return [...new Set(skills)].sort()
  }
}

/** Requested difficulty first, then nearest neighbours, closest first. */
export function difficultyFallback(requested: Difficulty): Difficulty[] {
  const all: Difficulty[] = [1, 2, 3, 4, 5]
  return all
    .slice()
    .sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested) || a - b)
}
