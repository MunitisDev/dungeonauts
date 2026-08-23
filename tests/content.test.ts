import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  MVP_SKILLS,
  SUBJECTS,
  authoredContentFiles,
  loadAuthoredChallenges,
} from '../src/education'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'

const challenges = loadAuthoredChallenges()

describe('authored content', () => {
  it('is discovered by the glob and is not empty', () => {
    expect(authoredContentFiles().length).toBeGreaterThan(0)
    expect(challenges.length).toBeGreaterThan(0)
  })

  // Loading validates every entry, so reaching here means all 64 parsed. This
  // asserts the count so a silently empty glob cannot pass as success.
  it('loads every question in every file', () => {
    expect(challenges).toHaveLength(64)
  })

  it('has globally unique ids', () => {
    const ids = challenges.map((challenge) => challenge.id)
    const seen = new Set<string>()
    const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
    expect(duplicates).toEqual([])
  })

  it('names ids after their locale, subject and skill', () => {
    for (const challenge of challenges) {
      expect(challenge.id, challenge.id).toMatch(
        new RegExp(`^${challenge.locale}\\.${challenge.subject}\\.${challenge.skill}\\.\\d{3}$`),
      )
    }
  })

  it('files a challenge under the directory matching its own locale and subject', () => {
    for (const file of authoredContentFiles()) {
      const match = /^\/content\/([a-z]{2})\/([a-z]+)\/([a-z_]+)\.json$/.exec(file)
      expect(match, `unexpected content path: ${file}`).not.toBeNull()
      const [, locale, subject, skill] = match as RegExpExecArray
      const inFile = challenges.filter((challenge) => challenge.id.startsWith(`${locale}.`))
      expect(inFile.length, file).toBeGreaterThan(0)
      expect(SUPPORTED_LOCALES).toContain(locale)
      expect(SUBJECTS).toContain(subject)
      expect(skill).toBeTruthy()
    }
  })

  /**
   * The coverage guarantee gameplay depends on: for anything in the MVP scope,
   * a request will find something. Without this, a door could ask for a skill
   * nobody authored and silently fall back forever.
   */
  it('covers every MVP skill in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const subject of SUBJECTS) {
        for (const skill of MVP_SKILLS[subject]) {
          const matching = challenges.filter(
            (challenge) =>
              challenge.locale === locale &&
              challenge.subject === subject &&
              challenge.skill === skill,
          )
          expect(matching.length, `${locale}/${subject}/${skill}`).toBeGreaterThanOrEqual(4)
        }
      }
    }
  })

  it('spans the full difficulty range in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const found = new Set(
        challenges.filter((c) => c.locale === locale).map((c) => c.difficulty),
      )
      for (const difficulty of DIFFICULTIES) {
        expect(found, `${locale} is missing difficulty ${difficulty}`).toContain(difficulty)
      }
    }
  })

  it('mirrors the Spanish and English catalogues', () => {
    const shape = (locale: string) =>
      challenges
        .filter((challenge) => challenge.locale === locale)
        .map((challenge) => `${challenge.subject}/${challenge.skill}/${challenge.difficulty}`)
        .sort()
    expect(shape('en')).toEqual(shape('es'))
  })

  it('offers a hint and an explanation on every question', () => {
    // Gentle feedback is a product requirement, not a nicety: a wrong answer
    // must always have something helpful to say.
    for (const challenge of challenges) {
      expect(challenge.hint, `${challenge.id} has no hint`).toBeTruthy()
      expect(challenge.explanation, `${challenge.id} has no explanation`).toBeTruthy()
    }
  })

  it('gives multiple-choice questions three or four plausible options', () => {
    for (const challenge of challenges) {
      if (challenge.interactionType !== 'multiple_choice') continue
      expect(challenge.choices?.length, challenge.id).toBeGreaterThanOrEqual(3)
      expect(challenge.choices?.length, challenge.id).toBeLessThanOrEqual(4)
      expect(challenge.choices, challenge.id).toContain(String(challenge.correctAnswer))
    }
  })

  it('uses only multiple choice for the vertical slice', () => {
    for (const challenge of challenges) {
      expect(challenge.interactionType, challenge.id).toBe('multiple_choice')
    }
  })
})
