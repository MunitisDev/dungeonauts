import { bankFor, type BankWord } from './data'
import { capitalise, numberChoices, pick, pickInt, pickMany, shuffle, wordChoices } from './helpers'
import type { ChallengeGenerator, GeneratedQuestion, GeneratorContext } from './types'

/**
 * Language question generators.
 *
 * Built from a per-locale bank rather than translated, because the things
 * language questions test do not survive translation: "gato" has two syllables
 * and "cat" has one, and a Spanish accent choice has no English twin. Where a
 * question has no counterpart the *bank* differs rather than the generator —
 * `tricky_spelling` asks about accents in Spanish and homophones in English —
 * which is what keeps both locales at the same coverage.
 */

const g = (
  spec: Omit<ChallengeGenerator, 'subject' | 'generate'> & {
    generate: (c: GeneratorContext) => GeneratedQuestion
  },
): ChallengeGenerator => ({ ...spec, subject: 'language' })

/**
 * Words with at least one *differently spelled* word sharing their rhyme.
 *
 * Counted by distinct text, not by entry: two bank entries for the same word
 * would otherwise look like a rhyming pair and leave the generator with no
 * partner to offer.
 */
function rhymable(words: readonly BankWord[]): BankWord[] {
  const partners = new Map<string, Set<string>>()
  for (const word of words) {
    const group = partners.get(word.rhyme) ?? new Set<string>()
    group.add(word.text)
    partners.set(word.rhyme, group)
  }
  return words.filter((word) => (partners.get(word.rhyme)?.size ?? 0) > 1)
}

export const LANGUAGE_GENERATORS: readonly ChallengeGenerator[] = [
  g({
    id: 'lang.first_letter',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      // An accented first letter has no home in the alphabet the options are
      // drawn from, and "á" against "a" is not a question about first letters.
      const word = pick(bank.words.filter((w) => bank.alphabet.includes(w.text[0] as string)), random)
      const answer = word.text[0] as string
      return {
        prompt: bank.language.firstLetter(word.text),
        choices: wordChoices(answer, bank.alphabet.filter((l) => l !== answer), bank.alphabet, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Di la palabra despacio y escucha el principio.' : 'Say the word slowly and listen to the start.',
        explanation: `${word.text} → ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.last_letter',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(
        bank.words.filter((w) => bank.alphabet.includes(w.text[w.text.length - 1] as string)),
        random,
      )
      const answer = word.text[word.text.length - 1] as string
      return {
        prompt: bank.language.lastLetter(word.text),
        choices: wordChoices(answer, bank.alphabet.filter((l) => l !== answer), bank.alphabet, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Escucha el final del todo.' : 'Listen to the very end.',
        explanation: `${word.text} → ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.count_letters',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(bank.words.filter((w) => w.text.length <= 8), random)
      const answer = word.text.length
      return {
        prompt: bank.language.countLetters(word.text),
        choices: numberChoices(answer, random, { spread: 2, min: 1 }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Ve señalando cada letra con el dedo.' : 'Point at each letter as you count.',
        explanation: `${word.text}: ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.count_syllables',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 9,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(bank.words, random)
      return {
        prompt: bank.language.countSyllables(word.text),
        choices: numberChoices(word.syllables, random, { spread: 2, min: 1, extra: [1, 2, 3, 4] }),
        correctAnswer: String(word.syllables),
        hint: locale === 'es' ? 'Da una palmada por cada golpe de voz.' : 'Clap once for each beat.',
        explanation: `${word.text}: ${word.syllables}`,
      }
    },
  }),

  g({
    id: 'lang.rhyme',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 9,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const candidates = rhymable(bank.words)
      const word = pick(candidates, random)
      const answer = pick(candidates.filter((w) => w.rhyme === word.rhyme && w.text !== word.text), random)
      const others = bank.words.filter((w) => w.rhyme !== word.rhyme).map((w) => w.text)
      return {
        prompt: bank.language.rhymesWith(word.text),
        choices: wordChoices(answer.text, others, others, random),
        correctAnswer: answer.text,
        hint: locale === 'es' ? 'Riman las palabras que acaban igual.' : 'Rhyming words end the same way.',
        explanation: `${word.text} — ${answer.text}`,
      }
    },
  }),

  g({
    id: 'lang.odd_one_out',
    skill: 'vocabulary',
    minAge: 5,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const category = pick([...new Set(bank.words.map((w) => w.category))], random)
      const inside = bank.words.filter((w) => w.category === category)
      const three = pickMany(inside, 3, random).map((w) => w.text)
      // A word that appears in two categories would be both the odd one out and
      // one of the three that belong.
      const outside = bank.words.filter((w) => w.category !== category && !three.includes(w.text))
      const intruder = pick(outside, random)
      return {
        prompt: bank.language.oddOneOut,
        choices: shuffle([...three, intruder.text], random),
        correctAnswer: intruder.text,
        hint: locale === 'es' ? 'Tres son de la misma familia de palabras.' : 'Three of them belong together.',
        explanation: `${three.join(', ')} → ${bank.categoryLabels[category]}`,
      }
    },
  }),

  g({
    id: 'lang.category_of_word',
    skill: 'vocabulary',
    minAge: 5,
    maxAge: 9,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const ambiguous = new Set(
        bank.words
          .filter((w, i, all) => all.some((other, j) => j !== i && other.text === w.text))
          .map((w) => w.text),
      )
      const word = pick(bank.words.filter((w) => !ambiguous.has(w.text)), random)
      const answer = bank.categoryIndefinite[word.category]
      const others = Object.entries(bank.categoryIndefinite)
        .filter(([id]) => id !== word.category)
        .map(([, label]) => label)
      return {
        prompt: bank.language.categoryOf(word.text),
        choices: wordChoices(answer, others, others, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Piensa dónde lo encontrarías.' : 'Think about where you would find it.',
        explanation: `${word.text}: ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.which_is_a',
    skill: 'vocabulary',
    minAge: 5,
    maxAge: 9,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const category = pick([...new Set(bank.words.map((w) => w.category))], random)
      const answer = pick(bank.words.filter((w) => w.category === category), random)
      const others = bank.words.filter((w) => w.category !== category).map((w) => w.text)
      return {
        prompt: bank.language.whichIsA(bank.categoryIndefinite[category]),
        choices: wordChoices(answer.text, others, others, random),
        correctAnswer: answer.text,
        hint: locale === 'es' ? 'Lee las cuatro y descarta las que no encajan.' : 'Read all four and rule out the ones that do not fit.',
        explanation: `${answer.text}: ${bank.categoryLabels[category]}`,
      }
    },
  }),

  g({
    id: 'lang.longest_word',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const four = pickMany(bank.words, 4, random)
      const sorted = [...four].sort((a, b) => b.text.length - a.text.length)
      const longest = sorted[0] as BankWord
      // A tie has no single right answer, so redraw by lengthening the field.
      if ((sorted[1] as BankWord).text.length === longest.text.length) {
        const alternatives = bank.words.filter((w) => w.text.length > longest.text.length)
        if (alternatives.length > 0) {
          const replacement = pick(alternatives, random)
          const field = [replacement, ...sorted.slice(1, 4)]
          return {
            prompt: bank.language.longestWord,
            choices: shuffle(field.map((w) => w.text), random),
            correctAnswer: replacement.text,
            hint: locale === 'es' ? 'Cuenta las letras de cada una.' : 'Count the letters in each one.',
            explanation: `${replacement.text}: ${replacement.text.length}`,
          }
        }
      }
      return {
        prompt: bank.language.longestWord,
        choices: shuffle(four.map((w) => w.text), random),
        correctAnswer: longest.text,
        hint: locale === 'es' ? 'Cuenta las letras de cada una.' : 'Count the letters in each one.',
        explanation: `${longest.text}: ${longest.text.length}`,
      }
    },
  }),

  g({
    id: 'lang.letter_after',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const index = pickInt(0, bank.alphabet.length - 2, random)
      const letter = bank.alphabet[index] as string
      const answer = bank.alphabet[index + 1] as string
      return {
        prompt: bank.language.letterAfter(letter),
        choices: wordChoices(answer, bank.alphabet.filter((l) => l !== answer), bank.alphabet, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Canta el abecedario desde el principio.' : 'Sing the alphabet from the start.',
        explanation: `${letter} → ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.count_words',
    skill: 'word_recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const words = pick(bank.orderable, random)
      const sentence = `${capitalise(words.join(' '))}.`
      return {
        prompt: bank.language.countWords(sentence),
        choices: numberChoices(words.length, random, { spread: 2, min: 1 }),
        correctAnswer: String(words.length),
        hint: locale === 'es' ? 'Cada hueco separa una palabra de la siguiente.' : 'Each space separates one word from the next.',
        explanation: String(words.length),
      }
    },
  }),

  g({
    id: 'lang.plural',
    skill: 'basic_grammar',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(bank.words.filter((w) => w.plural !== w.text), random)
      const others = bank.words.map((w) => w.plural).filter((p) => p !== word.plural)
      const nearMisses = [`${word.text}s`, `${word.text}es`, `${word.text}n`].filter((c) => c !== word.plural)
      return {
        prompt: bank.language.pluralOf(word.text),
        choices: wordChoices(word.plural, [...nearMisses, ...others], others, random),
        correctAnswer: word.plural,
        hint: locale === 'es' ? 'Plural quiere decir más de uno.' : 'Plural means more than one.',
        explanation: `${word.text} → ${word.plural}`,
      }
    },
  }),

  g({
    id: 'lang.singular',
    skill: 'basic_grammar',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(bank.words.filter((w) => w.plural !== w.text), random)
      const others = bank.words.map((w) => w.text).filter((t) => t !== word.text)
      return {
        prompt: bank.language.singularOf(word.plural),
        choices: wordChoices(word.text, others, others, random),
        correctAnswer: word.text,
        hint: locale === 'es' ? 'Singular quiere decir uno solo.' : 'Singular means just one.',
        explanation: `${word.plural} → ${word.text}`,
      }
    },
  }),

  g({
    id: 'lang.article',
    skill: 'basic_grammar',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(bank.words, random)
      const options = locale === 'es' ? ['el', 'la', 'los', 'las'] : ['a', 'an', 'the', 'some']
      return {
        prompt: bank.language.whichArticle(word.text),
        choices: shuffle(options, random),
        correctAnswer: word.article,
        hint:
          locale === 'es'
            ? 'Pruébalo en voz alta: solo uno suena bien.'
            : '“an” goes before a vowel sound.',
        explanation: `${word.article} ${word.text}`,
      }
    },
  }),

  g({
    id: 'lang.missing_letter',
    skill: 'spelling',
    minAge: 6,
    maxAge: 11,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const word = pick(
        bank.words.filter(
          (w) => w.text.length >= 4 && w.text.slice(1, -1).split('').some((l) => bank.alphabet.includes(l)),
        ),
        random,
      )
      const maskable = word.text
        .split('')
        .map((letter, i) => ({ letter, i }))
        .filter(({ letter, i }) => i > 0 && i < word.text.length - 1 && bank.alphabet.includes(letter))
      const { letter: answer, i: index } = pick(maskable, random)
      const masked = `${word.text.slice(0, index)}_${word.text.slice(index + 1)}`
      return {
        prompt: bank.language.missingLetter(masked),
        choices: wordChoices(answer, bank.alphabet.filter((l) => l !== answer), bank.alphabet, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Lee la palabra entera en tu cabeza.' : 'Read the whole word in your head.',
        explanation: word.text,
      }
    },
  }),

  g({
    id: 'lang.antonym',
    skill: 'antonyms',
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const pair = pick(bank.antonyms, random)
      const flip = random() < 0.5
      const [word, answer] = flip ? [pair.match, pair.word] : [pair.word, pair.match]
      const pool = bank.antonyms.flatMap((p) => [p.word, p.match]).filter((w) => w !== word && w !== answer)
      return {
        prompt: bank.language.antonymOf(word),
        choices: wordChoices(answer, pool, pool, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Busca la palabra que significa justo lo contrario.' : 'Look for the word that means the exact opposite.',
        explanation: `${word} ↔ ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.sentence_completion',
    skill: 'sentence_completion',
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const gap = pick(bank.sentenceGaps, random)
      const sentence = `${capitalise(gap.before)} ${bank.language.gap} ${gap.after}`
      return {
        prompt: bank.language.complete(sentence),
        choices: shuffle([gap.answer, ...gap.distractors.slice(0, 3)], random),
        correctAnswer: gap.answer,
        hint: locale === 'es' ? 'Lee la frase entera con cada opción.' : 'Read the whole sentence with each option.',
        explanation: `${capitalise(gap.before)} ${gap.answer} ${gap.after}`,
      }
    },
  }),

  g({
    id: 'lang.definition',
    skill: 'vocabulary',
    minAge: 6,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const entry = pick(bank.definitions, random)
      const others = bank.definitions.map((d) => d.word).filter((w) => w !== entry.word)
      return {
        prompt: bank.language.definitionOf(entry.match),
        choices: wordChoices(entry.word, others, others, random),
        correctAnswer: entry.word,
        hint: locale === 'es' ? 'Fíjate en la palabra más importante de la pista.' : 'Look at the most important word in the clue.',
        explanation: `${entry.word}: ${entry.match}`,
      }
    },
  }),

  g({
    id: 'lang.transform',
    skill: 'basic_grammar',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const pair = pick(bank.transforms, random)
      const others = bank.transforms.map((p) => p.match).filter((m) => m !== pair.match)
      return {
        prompt: bank.language.transformPrompt(pair.word),
        choices: wordChoices(pair.match, others, others, random),
        correctAnswer: pair.match,
        hint: locale === 'es' ? 'Se le añade un final que lo hace más pequeño.' : 'It takes an ending that means “more”.',
        explanation: `${pair.word} → ${pair.match}`,
      }
    },
  }),

  g({
    id: 'lang.synonym',
    skill: 'synonyms',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const pair = pick(bank.synonyms, random)
      const flip = random() < 0.5
      const [word, answer] = flip ? [pair.match, pair.word] : [pair.word, pair.match]
      const pool = bank.synonyms.flatMap((p) => [p.word, p.match]).filter((w) => w !== word && w !== answer)
      return {
        prompt: bank.language.synonymOf(word),
        choices: wordChoices(answer, pool, pool, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Busca otra palabra que puedas poner en su lugar.' : 'Look for a word you could swap it for.',
        explanation: `${word} = ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.correct_spelling',
    skill: 'spelling',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.spelling, random)
      return {
        prompt: bank.language.correctSpelling,
        choices: shuffle([item.correct, ...item.wrong.slice(0, 3)], random),
        correctAnswer: item.correct,
        strict: true,
        hint: locale === 'es' ? 'Léelas todas despacio: solo una se escribe así.' : 'Read them all slowly: only one is right.',
        explanation: item.correct,
      }
    },
  }),

  g({
    id: 'lang.sentence_ordering',
    skill: 'sentence_ordering',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const words = pick(bank.orderable, random)
      const correct = `${capitalise(words.join(' '))}.`
      const wrong = new Set<string>()
      let guard = 0
      while (wrong.size < 3 && guard++ < 60) {
        const candidate = `${capitalise(shuffle(words, random).join(' '))}.`
        if (candidate !== correct) wrong.add(candidate)
      }
      return {
        prompt: bank.language.orderedSentence,
        choices: shuffle([correct, ...wrong], random),
        correctAnswer: correct,
        hint: locale === 'es' ? 'Empieza por quién hace la acción.' : 'Start with who is doing the action.',
        explanation: correct,
      }
    },
  }),

  g({
    id: 'lang.alphabetical_order',
    skill: 'word_recognition',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const words = pickMany(bank.words, 3, random).map((w) => w.text)
      const correct = [...words].sort((a, b) => a.localeCompare(b, locale)).join(', ')
      const wrong = new Set<string>()
      let guard = 0
      while (wrong.size < 3 && guard++ < 60) {
        const candidate = shuffle(words, random).join(', ')
        if (candidate !== correct) wrong.add(candidate)
      }
      return {
        prompt: bank.language.alphabeticalOrder,
        choices: shuffle([correct, ...wrong], random),
        correctAnswer: correct,
        hint: locale === 'es' ? 'Compara la primera letra de cada palabra.' : 'Compare the first letter of each word.',
        explanation: correct,
      }
    },
  }),

  g({
    id: 'lang.punctuation',
    skill: 'basic_grammar',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const words = pick(bank.orderable, random)
      const plain = words.join(' ')
      const correct = `${capitalise(plain)}.`
      return {
        prompt: bank.language.wellWritten,
        choices: shuffle([correct, `${plain}.`, capitalise(plain), plain], random),
        correctAnswer: correct,
        strict: true,
        hint: locale === 'es' ? 'Mayúscula al principio y punto al final.' : 'Capital letter at the start, full stop at the end.',
        explanation: correct,
      }
    },
  }),

  g({
    id: 'lang.tricky_spelling',
    skill: 'spelling',
    minAge: 9,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.tricky, random)
      return {
        prompt: bank.language.wellWritten,
        choices: shuffle([item.correct, ...item.wrong.slice(0, 3)], random),
        correctAnswer: item.correct,
        strict: true,
        hint:
          locale === 'es'
            ? 'Fíjate en la tilde: cambia dónde va la fuerza de la voz.'
            : 'These sound the same but mean different things.',
        explanation: item.correct,
      }
    },
  }),

  g({
    id: 'lang.verb_tense',
    skill: 'basic_grammar',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const verb = pick(bank.verbs, random)
      const past = random() < 0.5
      const answer = past ? verb.past : verb.future
      const pool = bank.verbs.flatMap((v) => [v.past, v.future, v.present]).filter((f) => f !== answer)
      return {
        prompt: past ? bank.language.verbInPast(verb.infinitive) : bank.language.verbInFuture(verb.infinitive),
        choices: wordChoices(answer, [verb.present, ...pool], pool, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'El pasado ya ocurrió; el futuro aún no.' : 'The past already happened; the future has not.',
        explanation: `${verb.infinitive} → ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.word_class',
    skill: 'basic_grammar',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.classified, random)
      const names = bank.language.wordClassNames
      const answer = names[item.wordClass]
      const others = Object.values(names).filter((n) => n !== answer)
      return {
        prompt: bank.language.wordClassOf(item.word),
        choices: shuffle([answer, ...others, locale === 'es' ? 'un adverbio' : 'an adverb'], random),
        correctAnswer: answer,
        hint:
          locale === 'es'
            ? 'Un nombre es una cosa, un verbo es una acción y un adjetivo dice cómo es.'
            : 'A noun is a thing, a verb is an action, an adjective describes.',
        explanation: `${item.word}: ${answer}`,
      }
    },
  }),

  g({
    id: 'lang.word_family',
    skill: 'vocabulary',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const family = pick(bank.families, random)
      return {
        prompt: bank.language.notInFamily(family.root),
        choices: shuffle([...family.members.slice(0, 3), family.intruder], random),
        correctAnswer: family.intruder,
        hint: locale === 'es' ? 'Tres comparten un trozo de palabra y un significado.' : 'Three share a chunk of word and a meaning.',
        explanation: `${family.intruder}`,
      }
    },
  }),

  g({
    id: 'lang.reading_comprehension',
    skill: 'reading_comprehension',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const passage = pick(bank.passages, random)
      const question = pick(passage.questions, random)
      return {
        prompt: bank.language.readingQuestion(passage.text, question.question),
        choices: shuffle([question.answer, ...question.distractors.slice(0, 3)], random),
        correctAnswer: question.answer,
        hint: locale === 'es' ? 'La respuesta está en el texto: vuelve a leerlo.' : 'The answer is in the text: read it again.',
        explanation: question.answer,
      }
    },
  }),
]
