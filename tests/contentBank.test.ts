import { describe, expect, it } from 'vitest'
import { bankFor } from '../src/education/generators/data'
import type { LocaleBank, SentenceGap, SpellingItem, WordPair } from '../src/education/generators/data'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'

/*
 * The banks, checked as data.
 *
 * A generator can only be as good as what it recombines, and the mistakes that
 * matter here are the quiet ones: the same word twice in a list, so a question
 * offers it as two options; two synonym pairs sharing an answer, so a
 * distractor is also right; a family whose intruder is one of its own members,
 * so the question has no answer at all. None of that fails a build or looks
 * wrong in the file — it reaches a child as a question that cannot be answered.
 *
 * `generators.test.ts` samples forty seeds per generator, which catches this
 * only when the unlucky draw happens to come up. Checking the bank itself
 * catches it every time.
 */

const BANKS = SUPPORTED_LOCALES.map((locale) => [locale, bankFor(locale)] as const)

const duplicates = (values: readonly string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index)

const pairLists = (bank: LocaleBank): ReadonlyArray<readonly [string, readonly WordPair[]]> => [
  ['synonyms', bank.synonyms],
  ['antonyms', bank.antonyms],
  ['definitions', bank.definitions],
  ['transforms', bank.transforms],
  ['idioms', bank.idioms],
  ['prefixes', bank.prefixes],
  ['measures', bank.measures],
]

const gapLists = (bank: LocaleBank): ReadonlyArray<readonly [string, readonly SentenceGap[]]> => [
  ['sentenceGaps', bank.sentenceGaps],
  ['pronouns', bank.pronouns],
  ['connectors', bank.connectors],
]

const spellingLists = (bank: LocaleBank): ReadonlyArray<readonly [string, readonly SpellingItem[]]> => [
  ['spelling', bank.spelling],
  ['tricky', bank.tricky],
]

describe.each(BANKS)('the %s bank', (locale, bank) => {
  it('spells every word once, with a plural and a believable syllable count', () => {
    expect(duplicates(bank.words.map((word) => word.text)), 'the same word twice').toEqual([])
    for (const word of bank.words) {
      expect(word.text.trim(), 'blank word').not.toBe('')
      expect(word.plural.trim(), `${word.text}: no plural`).not.toBe('')
      expect(word.rhyme.trim(), `${word.text}: no rhyme key`).not.toBe('')
      expect(word.syllables, `${word.text}: ${word.syllables} syllables`).toBeGreaterThanOrEqual(1)
      expect(word.syllables, `${word.text}: ${word.syllables} syllables`).toBeLessThanOrEqual(5)
      expect(
        locale === 'es' ? ['el', 'la'] : ['a', 'an'],
        `${word.text}: article "${word.article}"`,
      ).toContain(word.article)
    }
  })

  // Both sides, because `lang.synonym` asks the pair in either direction: a
  // second pair sharing this one's answer would sit in the options as a
  // distractor that is also correct.
  it.each(pairLists(bank))('gives %s one answer each', (name, pairs) => {
    expect(pairs.length, `${name} is too thin to build four options`).toBeGreaterThanOrEqual(4)
    expect(duplicates(pairs.map((pair) => pair.word)), `${name}: asked twice`).toEqual([])
    expect(duplicates(pairs.map((pair) => pair.match)), `${name}: two ways to be right`).toEqual([])
    for (const pair of pairs) {
      expect(pair.word.trim(), `${name}: blank`).not.toBe('')
      expect(pair.match.trim(), `${name}: blank`).not.toBe('')
      expect(pair.match, `${name}: "${pair.word}" answers itself`).not.toBe(pair.word)
    }
  })

  it.each(gapLists(bank))('gives %s three distinct wrong words', (name, gaps) => {
    for (const gap of gaps) {
      const where = `${name}: "${gap.before}___${gap.after}"`
      expect(`${gap.before}${gap.after}`.trim(), `${where}: empty sentence`).not.toBe('')
      expect(gap.answer.trim(), `${where}: no answer`).not.toBe('')
      expect(gap.distractors.length, `${where}: needs three wrong options`).toBeGreaterThanOrEqual(3)
      expect(gap.distractors, `${where}: the answer is also a distractor`).not.toContain(gap.answer)
      expect(new Set(gap.distractors).size, `${where}: repeated distractor`).toBe(gap.distractors.length)
    }
  })

  it.each(spellingLists(bank))('misspells %s three ways, all of them wrong', (name, items) => {
    for (const item of items) {
      expect(item.wrong.length, `${name}: "${item.correct}" needs three`).toBeGreaterThanOrEqual(3)
      expect(item.wrong, `${name}: "${item.correct}" is offered as wrong`).not.toContain(item.correct)
      expect(new Set(item.wrong).size, `${name}: "${item.correct}" repeats a spelling`).toBe(item.wrong.length)
    }
  })

  it('keeps the intruder out of every word family', () => {
    for (const family of bank.families) {
      expect(family.members.length, `${family.root}: needs three members`).toBeGreaterThanOrEqual(3)
      expect(family.members, `${family.root}: the intruder is a member`).not.toContain(family.intruder)
      expect(new Set(family.members).size, `${family.root}: repeated member`).toBe(family.members.length)
    }
  })

  it('asks something answerable about every passage', () => {
    for (const passage of bank.passages) {
      expect(passage.text.trim(), 'empty passage').not.toBe('')
      expect(passage.questions.length, `"${passage.text.slice(0, 20)}…"`).toBeGreaterThanOrEqual(1)
      for (const question of passage.questions) {
        expect(question.distractors.length, question.question).toBeGreaterThanOrEqual(3)
        expect(question.distractors, question.question).not.toContain(question.answer)
      }
    }
  })

  it('counts, orders and names the days', () => {
    // Indexed by the number itself, which is the only reason `numberWords[7]`
    // can be trusted to be seven.
    expect(bank.numberWords.length).toBe(21)
    expect(new Set(bank.numberWords).size, 'a number word twice').toBe(bank.numberWords.length)
    expect(bank.ordinals.length).toBeGreaterThanOrEqual(5)
    expect(bank.weekdays.length).toBe(7)
    expect(new Set(bank.weekdays).size, 'a day twice').toBe(7)
    expect(new Set(bank.countables.map((item) => item.symbol)).size).toBe(bank.countables.length)
    expect(new Set(bank.classified.map((item) => item.word)).size).toBe(bank.classified.length)
    for (const list of bank.orderable) expect(list.length, list.join(' ')).toBeGreaterThanOrEqual(3)
    for (const verb of bank.verbs) {
      expect(new Set([verb.past, verb.present, verb.future]).size, verb.infinitive).toBe(3)
    }
  })

  it('never counts something you cannot count', () => {
    // "26 leches", "the plural of rice is rices". A mass noun is fine in a
    // question about letters and nonsense in one about number.
    for (const word of bank.words.filter((candidate) => candidate.mass === true)) {
      expect(word.category, `${word.text} is marked mass`).toBe('food')
    }
  })
})
