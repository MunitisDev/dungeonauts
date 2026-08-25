/**
 * The shape of a locale's content bank.
 *
 * Typed modules rather than JSON, unlike the authored questions in `content/`.
 * A bank is not a list of questions — it is the raw material several generators
 * recombine, and a wrong `syllables` count or a missing plural would surface as
 * a nonsense question in front of a child rather than as a parse error. The
 * compiler catching a malformed entry is worth more here than the file being
 * editable without a build.
 *
 * Wording lives in the bank too, in the `phrases` records. All the Spanish in
 * one file and all the English in another is easier to proofread than the same
 * sentences scattered through the generators.
 */

export const CATEGORIES = [
  'animal',
  'food',
  'colour',
  'body',
  'home',
  'nature',
  'clothes',
  'school',
  'transport',
] as const
export type CategoryId = (typeof CATEGORIES)[number]

export interface BankWord {
  readonly text: string
  readonly category: CategoryId
  readonly syllables: number
  readonly plural: string
  /** "el"/"la" in Spanish, "a"/"an" in English. */
  readonly article: string
  /** Words sharing a key rhyme; a group needs at least two members to be used. */
  readonly rhyme: string
  /**
   * Set on a mass noun: milk, rice, leche, arroz.
   *
   * They read like any other word in a question about letters or syllables, and
   * fall apart in one about plurals or counting — "26 leches", "the plural of
   * rice". Generators that count things or change number leave them out.
   */
  readonly mass?: true
}

export interface WordPair {
  readonly word: string
  readonly match: string
}

export interface SentenceGap {
  readonly before: string
  readonly after: string
  readonly answer: string
  readonly distractors: readonly string[]
}

export interface SpellingItem {
  readonly correct: string
  readonly wrong: readonly string[]
}

export interface VerbForms {
  readonly infinitive: string
  readonly past: string
  readonly present: string
  readonly future: string
}

export type WordClass = 'noun' | 'verb' | 'adjective'

export interface ClassifiedWord {
  readonly word: string
  readonly wordClass: WordClass
}

export interface WordFamily {
  readonly root: string
  readonly members: readonly string[]
  /** Plausible outsider: looks related, is not. */
  readonly intruder: string
}

export interface PassageQuestion {
  readonly question: string
  readonly answer: string
  readonly distractors: readonly string[]
}

export interface Passage {
  readonly text: string
  readonly questions: readonly PassageQuestion[]
}

export interface Shape {
  readonly name: string
  readonly sides: number
}

export interface Countable {
  readonly symbol: string
  readonly plural: string
  /** Gender of the plural, for "¿Cuántos?" against "¿Cuántas?". English states
   * one and ignores it, the same way the story phrases do. */
  readonly gender: Gender
}

/** Every phrase a maths generator needs. Numbers stay numbers; words come here. */
/** Grammatical gender of the thing being counted; English ignores it. */
export type Gender = 'm' | 'f'

export interface MathPhrases {
  readonly missingNumber: (sequence: string) => string
  readonly numberAfter: (n: number) => string
  readonly numberBefore: (n: number) => string
  readonly howMany: (plural: string, gender: Gender) => string
  readonly whichHasMore: string
  readonly whichIsBigger: string
  readonly whichIsSmaller: string
  readonly whichIsEven: string
  readonly whichIsOdd: string
  readonly doubleOf: (n: number) => string
  readonly halfOf: (n: number) => string
  readonly fractionOf: (part: number, whole: number) => string
  readonly orderAscending: string
  readonly sidesOf: (shape: string) => string
  readonly whichShapeHasSides: (sides: number) => string
  readonly perimeter: (long: number, wide: number) => string
  readonly area: (long: number, wide: number) => string
  readonly round: (n: number) => string
  readonly addStory: (name: string, first: number, more: number, things: string, gender: Gender) => string
  readonly subStory: (name: string, first: number, gone: number, things: string, gender: Gender) => string
  readonly multStory: (name: string, groups: number, each: number, things: string, gender: Gender) => string
  readonly shareStory: (name: string, total: number, people: number, things: string, gender: Gender) => string
  readonly change: (price: number, paid: number) => string
  readonly clockLater: (hour: number, hours: number) => string
  readonly remainder: (total: number, groups: number) => string
  readonly percent: (percent: number, of: number) => string
  readonly whichFractionBigger: string
  readonly whichNumberIsWord: (word: string) => string
  readonly howIsWritten: (n: number) => string
  readonly crossOut: (gone: number, plural: string, gender: Gender) => string
  readonly whichIsNth: (ordinal: string, row: string) => string
  readonly whichSumIsBigger: string
  readonly howManyTens: (n: number) => string
  readonly howManyUnits: (n: number) => string
  readonly moneyTotal: (countA: number, valueA: number, countB: number, valueB: number) => string
  readonly measuredIn: (thing: string) => string
  readonly averageOf: (values: string) => string
  readonly twoStepStory: (
    name: string,
    start: number,
    gained: number,
    lost: number,
    things: string,
    gender: Gender,
  ) => string
  readonly minutesInHours: (hours: number) => string
  readonly dayLater: (day: string, days: number) => string
  readonly equivalentFraction: (top: number, bottom: number) => string
  readonly nextInPattern: (run: string) => string
  /** Units for perimeter and area answers, e.g. "cm". */
  readonly unit: string
  readonly currency: string
}

/** Every phrase a language generator needs. */
export interface LanguagePhrases {
  readonly firstLetter: (word: string) => string
  readonly lastLetter: (word: string) => string
  readonly countLetters: (word: string) => string
  readonly countSyllables: (word: string) => string
  readonly rhymesWith: (word: string) => string
  readonly oddOneOut: string
  readonly categoryOf: (word: string) => string
  readonly whichIsA: (category: string) => string
  readonly longestWord: string
  readonly letterAfter: (letter: string) => string
  readonly countWords: (sentence: string) => string
  readonly pluralOf: (word: string) => string
  readonly singularOf: (word: string) => string
  readonly whichArticle: (word: string) => string
  readonly missingLetter: (masked: string) => string
  readonly correctSpelling: string
  readonly synonymOf: (word: string) => string
  readonly antonymOf: (word: string) => string
  readonly complete: (sentence: string) => string
  readonly orderedSentence: string
  readonly verbInPast: (verb: string) => string
  readonly verbInFuture: (verb: string) => string
  readonly wordClassOf: (word: string) => string
  readonly wordClassNames: Readonly<Record<WordClass, string>>
  readonly definitionOf: (definition: string) => string
  readonly alphabeticalOrder: string
  readonly wellWritten: string
  readonly notInFamily: (root: string) => string
  /** Spanish: the diminutive. English: the comparative. */
  readonly transformPrompt: (word: string) => string
  readonly readingQuestion: (passage: string, question: string) => string
  readonly countVowels: (word: string) => string
  readonly startsWithLetter: (letter: string) => string
  readonly mostSyllables: string
  readonly letterBefore: (letter: string) => string
  readonly unscramble: (letters: string) => string
  readonly meaningOf: (word: string) => string
  readonly needsCapital: string
  readonly idiomMeaning: (idiom: string) => string
  readonly prefixMeaning: (prefix: string) => string
  readonly gap: string
}

export interface LocaleBank {
  readonly words: readonly BankWord[]
  readonly categoryLabels: Readonly<Record<CategoryId, string>>
  /** The same labels with their indefinite article: "una parte del cuerpo". */
  readonly categoryIndefinite: Readonly<Record<CategoryId, string>>
  readonly alphabet: readonly string[]
  readonly names: readonly string[]
  readonly countables: readonly Countable[]
  readonly shapes: readonly Shape[]
  readonly synonyms: readonly WordPair[]
  readonly antonyms: readonly WordPair[]
  readonly definitions: readonly WordPair[]
  readonly sentenceGaps: readonly SentenceGap[]
  readonly orderable: readonly (readonly string[])[]
  readonly spelling: readonly SpellingItem[]
  readonly verbs: readonly VerbForms[]
  readonly classified: readonly ClassifiedWord[]
  readonly families: readonly WordFamily[]
  readonly passages: readonly Passage[]
  /** Spanish: accent choices. English: homophones in context. */
  readonly tricky: readonly SpellingItem[]
  /** Spanish: diminutives. English: comparatives. */
  readonly transforms: readonly WordPair[]
  /** Number names, indexed by the number itself: `numberWords[7]` is "seven". */
  readonly numberWords: readonly string[]
  /** Position names, first at index 0. */
  readonly ordinals: readonly string[]
  readonly weekdays: readonly string[]
  /** What a thing is measured in: `word` is the thing, `match` is the unit. */
  readonly measures: readonly WordPair[]
  readonly pronouns: readonly SentenceGap[]
  readonly connectors: readonly SentenceGap[]
  /** `word` is the expression, `match` is what it actually means. */
  readonly idioms: readonly WordPair[]
  /** `word` is the prefix, `match` is what it adds to a word. */
  readonly prefixes: readonly WordPair[]
  readonly math: MathPhrases
  readonly language: LanguagePhrases
}
