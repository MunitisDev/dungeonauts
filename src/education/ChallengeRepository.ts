import { generatorsFor, GENERATED_INTERACTION, type ChallengeGenerator } from './generators'
import { createRandom, pick } from './selection'
import type { Challenge, ChallengeRequest, Difficulty, Subject } from './types'
import { parseChallenge } from './validation'

/**
 * The kind of question an id came from.
 *
 * Generated ids are `<generator>#<serial>`, so every question is unique but
 * still traceable to its family. That is what lets "do not repeat" mean "do not
 * ask the same *kind* again" rather than the useless "do not repeat this exact
 * random instance", which would never match twice anyway.
 */
export function challengeFamily(id: string): string {
  const cut = id.indexOf('#')
  return cut === -1 ? id : id.slice(0, cut)
}

/**
 * The read side of the educational system.
 *
 * Holds validated challenges and answers requests for a *shape* of question.
 * It never returns question text to a caller that did not ask for a challenge,
 * and it has no idea what the game will do with the answer.
 */
export class ChallengeRepository {
  private readonly challenges: readonly Challenge[]
  private random: () => number
  /** Serial for generated ids, so two questions of a kind never collide. */
  private serial = 0

  constructor(challenges: readonly Challenge[], seed = 1) {
    const ids = new Set<string>()
    for (const challenge of challenges) {
      if (ids.has(challenge.id)) throw new Error(`Duplicate challenge id "${challenge.id}"`)
      ids.add(challenge.id)
    }
    this.challenges = challenges
    this.random = createRandom(seed)
  }

  /**
   * Starts the question stream again from a new seed.
   *
   * The repository is built once, when the world is, and a run begins later —
   * so without this every game drew from the same stream and a child met the
   * same first question every time they pressed play. The run's own seed goes
   * in here, which also gives each floor of a run its own stream.
   */
  reseed(seed: number): void {
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
    const generated = this.generate(request)
    if (generated) return generated

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

  /**
   * A freshly built question for the request, or `null` when no generator
   * covers it.
   *
   * Recently asked *kinds* are skipped while alternatives remain, which is what
   * stops a child meeting four additions in a row. The result goes through the
   * same validator as authored content: a generator that produced a question
   * with the answer missing from its own options would otherwise be
   * unanswerable, and a child would meet it before a test did.
   */
  private generate(request: ChallengeRequest): Challenge | null {
    if (request.age === undefined) return null
    const candidates = generatorsFor({
      locale: request.locale,
      subject: request.subject,
      age: request.age,
      ...(request.skill !== undefined ? { skill: request.skill } : {}),
    })
    // Dropping the skill is better than dropping the age: a maths door asking a
    // different kind of maths is fine, one asking a nine-year-old's question of
    // a six-year-old is not.
    const pool =
      candidates.length > 0
        ? candidates
        : generatorsFor({ locale: request.locale, subject: request.subject, age: request.age })
    if (pool.length === 0) return null

    const recent = new Set((request.exclude ?? []).map(challengeFamily))
    const fresh = pool.filter((generator) => !recent.has(generator.id))
    return this.build(pick(fresh.length > 0 ? fresh : pool, this.random), request.locale, request.age)
  }

  private build(generator: ChallengeGenerator, locale: Challenge['locale'], age: number): Challenge {
    const question = generator.generate({ locale, age, random: this.random })
    this.serial += 1
    const validated = parseChallenge(
      {
        id: `${generator.id}#${this.serial}`,
        locale,
        subject: generator.subject,
        skill: generator.skill,
        difficulty: generator.difficulty,
        prompt: question.prompt,
        interactionType: GENERATED_INTERACTION,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        ...(question.strict ? { strict: true } : {}),
        ...(question.hint ? { hint: question.hint } : {}),
        ...(question.explanation ? { explanation: question.explanation } : {}),
      },
      generator.id,
      this.serial,
    )
    return {
      ...validated,
      metadata: { ageBand: `${generator.minAge}-${generator.maxAge}`, tags: ['generated'] },
    }
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
