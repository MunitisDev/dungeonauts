import { bankFor } from './data'
import {
  choicesFrom,
  numberChoices,
  pick,
  pickInt,
  pickMany,
  repeatSymbol,
  shuffle,
  wordChoices,
} from './helpers'
import type { ChallengeGenerator, GeneratedQuestion, GeneratorContext } from './types'

/**
 * Maths question generators.
 *
 * Each one is a *kind* of question with its own age band, and each scales
 * inside that band: `add_within_20` gives a seven-year-old smaller numbers than
 * it gives a nine-year-old. That is why the age is passed in rather than a
 * difficulty — a single 1-5 scale cannot say "this child is six".
 *
 * Every generator is pure: same locale, same age, same seed, same question.
 */

/** The bank stores "el"/"la"; the story phrases need the gender behind it. */
function genderOf(article: string): 'm' | 'f' {
  return article === 'la' || article === 'las' ? 'f' : 'm'
}

/** Numbers grow inside a generator's own band, so the band stays useful. */
function scale(age: number, from: number, to: number, low: number, high: number): number {
  if (to <= from) return high
  const t = Math.min(1, Math.max(0, (age - from) / (to - from)))
  return Math.round(low + t * (high - low))
}

const g = (
  spec: Omit<ChallengeGenerator, 'subject' | 'generate'> & {
    generate: (c: GeneratorContext) => GeneratedQuestion
  },
): ChallengeGenerator => ({ ...spec, subject: 'math' })

export const MATH_GENERATORS: readonly ChallengeGenerator[] = [
  g({
    id: 'math.count_objects',
    skill: 'counting',
    minAge: 5,
    maxAge: 7,
    difficulty: 1,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.countables, random)
      const count = pickInt(3, scale(age, 5, 7, 6, 10), random)
      return {
        prompt: `${repeatSymbol(item.symbol, count)}\n\n${bank.math.howMany(item.plural, item.gender)}`,
        choices: numberChoices(count, random, { spread: 3 }),
        correctAnswer: String(count),
        hint: locale === 'es' ? 'Señálalas con el dedo y cuenta en voz alta.' : 'Point at them and count out loud.',
        explanation: locale === 'es' ? `Hay ${count}.` : `There are ${count}.`,
      }
    },
  }),

  g({
    id: 'math.biggest_group',
    skill: 'number_comparison',
    minAge: 5,
    maxAge: 7,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.countables, random)
      const counts = shuffle([2, 4, 6, 8], random)
      const rows = counts.map((n) => repeatSymbol(item.symbol, n))
      const most = repeatSymbol(item.symbol, Math.max(...counts))
      return {
        prompt: bank.math.whichHasMore,
        choices: rows,
        correctAnswer: most,
        hint: locale === 'es' ? 'Cuenta cada fila una por una.' : 'Count each row one by one.',
        explanation: locale === 'es' ? `La fila más larga tiene ${Math.max(...counts)}.` : `The longest row has ${Math.max(...counts)}.`,
      }
    },
  }),

  g({
    id: 'math.number_after',
    skill: 'number_sequence',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const n = pickInt(1, scale(age, 5, 8, 9, 99), random)
      return {
        prompt: bank.math.numberAfter(n),
        choices: numberChoices(n + 1, random, { spread: 2 }),
        correctAnswer: String(n + 1),
        hint: locale === 'es' ? 'Es uno más.' : 'It is one more.',
        explanation: `${n} → ${n + 1}`,
      }
    },
  }),

  g({
    id: 'math.number_before',
    skill: 'number_sequence',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const n = pickInt(2, scale(age, 5, 8, 10, 100), random)
      return {
        prompt: bank.math.numberBefore(n),
        choices: numberChoices(n - 1, random, { spread: 2 }),
        correctAnswer: String(n - 1),
        hint: locale === 'es' ? 'Es uno menos.' : 'It is one less.',
        explanation: `${n - 1} → ${n}`,
      }
    },
  }),

  g({
    id: 'math.missing_in_sequence',
    skill: 'number_sequence',
    minAge: 5,
    maxAge: 9,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const descending = random() < 0.4
      const start = pickInt(descending ? 5 : 1, scale(age, 5, 9, 8, 40), random)
      const step = descending ? -1 : 1
      const run = [0, 1, 2, 3].map((i) => start + i * step)
      const hidden = pickInt(1, 2, random)
      const answer = run[hidden] as number
      const shown = run.map((value, index) => (index === hidden ? '?' : String(value))).join(', ')
      return {
        prompt: bank.math.missingNumber(shown),
        choices: numberChoices(answer, random, { spread: 2 }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Mira si los números suben o bajan de uno en uno.' : 'Check whether the numbers go up or down by one.',
        explanation: run.join(', '),
      }
    },
  }),

  g({
    id: 'math.compare_numbers',
    skill: 'number_comparison',
    minAge: 5,
    maxAge: 10,
    difficulty: 1,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = scale(age, 5, 10, 10, 999)
      const numbers = new Set<number>()
      while (numbers.size < 4) numbers.add(pickInt(1, top, random))
      const values = [...numbers]
      const bigger = random() < 0.5
      const answer = bigger ? Math.max(...values) : Math.min(...values)
      return {
        prompt: bigger ? bank.math.whichIsBigger : bank.math.whichIsSmaller,
        choices: shuffle(values.map(String), random),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Cuenta las cifras: el que tiene más cifras es mayor.' : 'Count the digits: more digits means bigger.',
        explanation: `${[...values].sort((a, b) => a - b).join(' < ')}`,
      }
    },
  }),

  g({
    id: 'math.add_within_5',
    skill: 'addition',
    minAge: 5,
    maxAge: 6,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const a = pickInt(1, 4, random)
      const b = pickInt(1, 5 - a, random)
      return {
        prompt: `${a} + ${b} = ?`,
        choices: numberChoices(a + b, random, { spread: 2 }),
        correctAnswer: String(a + b),
        hint: locale === 'es' ? `Levanta ${a} dedos y luego ${b} más.` : `Hold up ${a} fingers and then ${b} more.`,
        explanation: `${a} + ${b} = ${a + b}`,
      }
    },
  }),

  g({
    id: 'math.add_within_10',
    skill: 'addition',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const a = pickInt(1, 8, random)
      const b = pickInt(1, 10 - a, random)
      return {
        prompt: `${a} + ${b} = ?`,
        choices: numberChoices(a + b, random, { spread: 3 }),
        correctAnswer: String(a + b),
        hint: locale === 'es' ? `Empieza en el ${a} y cuenta ${b} más.` : `Start at ${a} and count on ${b}.`,
        explanation: `${a} + ${b} = ${a + b}`,
      }
    },
  }),

  g({
    id: 'math.sub_within_5',
    skill: 'subtraction',
    minAge: 5,
    maxAge: 6,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const a = pickInt(2, 5, random)
      const b = pickInt(1, a, random)
      return {
        prompt: `${a} − ${b} = ?`,
        choices: numberChoices(a - b, random, { spread: 2 }),
        correctAnswer: String(a - b),
        hint: locale === 'es' ? `Levanta ${a} dedos y baja ${b}.` : `Hold up ${a} fingers and put ${b} down.`,
        explanation: `${a} − ${b} = ${a - b}`,
      }
    },
  }),

  g({
    id: 'math.sub_within_10',
    skill: 'subtraction',
    minAge: 5,
    maxAge: 8,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const a = pickInt(3, 10, random)
      const b = pickInt(1, a, random)
      return {
        prompt: `${a} − ${b} = ?`,
        choices: numberChoices(a - b, random, { spread: 3 }),
        correctAnswer: String(a - b),
        hint: locale === 'es' ? `Cuenta hacia atrás desde el ${a}.` : `Count back from ${a}.`,
        explanation: `${a} − ${b} = ${a - b}`,
      }
    },
  }),

  g({
    id: 'math.shape_recognition',
    skill: 'basic_geometry',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const withSides = bank.shapes.filter((shape) => shape.sides > 0)
      const target = pick(withSides, random)
      const others = withSides.filter((shape) => shape.sides !== target.sides)
      return {
        prompt: bank.math.whichShapeHasSides(target.sides),
        choices: shuffle([target.name, ...pickMany(others, 3, random).map((s) => s.name)], random),
        correctAnswer: target.name,
        hint: locale === 'es' ? 'Dibújala en el aire y cuenta los lados.' : 'Draw it in the air and count the sides.',
        explanation: `${target.name}: ${target.sides}`,
      }
    },
  }),

  g({
    id: 'math.shape_sides',
    skill: 'basic_geometry',
    minAge: 5,
    maxAge: 9,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const shape = pick(bank.shapes.filter((s) => s.sides > 0), random)
      return {
        prompt: bank.math.sidesOf(shape.name),
        choices: numberChoices(shape.sides, random, { spread: 2, min: 3, extra: [3, 4, 5, 6, 8] }),
        correctAnswer: String(shape.sides),
        hint: locale === 'es' ? 'Cuenta las líneas rectas del borde.' : 'Count the straight lines around the edge.',
        explanation: `${shape.name}: ${shape.sides}`,
      }
    },
  }),

  g({
    id: 'math.add_within_20',
    skill: 'addition',
    minAge: 6,
    maxAge: 9,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const a = pickInt(4, 15, random)
      const b = pickInt(2, 20 - a, random)
      return {
        prompt: `${a} + ${b} = ?`,
        choices: numberChoices(a + b, random, { spread: 4 }),
        correctAnswer: String(a + b),
        hint: locale === 'es' ? 'Llega primero al 10 y suma lo que quede.' : 'Get to 10 first, then add what is left.',
        explanation: `${a} + ${b} = ${a + b}`,
      }
    },
  }),

  g({
    id: 'math.sub_within_20',
    skill: 'subtraction',
    minAge: 6,
    maxAge: 9,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const a = pickInt(8, 20, random)
      const b = pickInt(2, a - 1, random)
      return {
        prompt: `${a} − ${b} = ?`,
        choices: numberChoices(a - b, random, { spread: 4 }),
        correctAnswer: String(a - b),
        hint: locale === 'es' ? 'Baja primero hasta el 10.' : 'Go down to 10 first.',
        explanation: `${a} − ${b} = ${a - b}`,
      }
    },
  }),

  g({
    id: 'math.skip_counting',
    skill: 'number_sequence',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const step = pick(age <= 7 ? [2, 5, 10] : [2, 3, 4, 5, 10], random)
      const start = step * pickInt(1, 4, random)
      const run = [0, 1, 2, 3].map((i) => start + i * step)
      const answer = run[3] as number
      return {
        prompt: bank.math.missingNumber(`${run[0]}, ${run[1]}, ${run[2]}, ?`),
        choices: numberChoices(answer, random, { spread: step }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? `Van de ${step} en ${step}.` : `They go up in ${step}s.`,
        explanation: run.join(', '),
      }
    },
  }),

  g({
    id: 'math.even_odd',
    skill: 'number_comparison',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = scale(age, 6, 10, 20, 99)
      const wantEven = random() < 0.5
      const answer = (() => {
        let n = pickInt(1, top, random)
        if (n % 2 === (wantEven ? 1 : 0)) n += 1
        return n
      })()
      const others: string[] = []
      let guard = 0
      while (others.length < 3 && guard++ < 100) {
        let n = pickInt(1, top, random)
        if (n % 2 === (wantEven ? 0 : 1)) n += 1
        if (n !== answer && !others.includes(String(n))) others.push(String(n))
      }
      return {
        prompt: wantEven ? bank.math.whichIsEven : bank.math.whichIsOdd,
        choices: shuffle([String(answer), ...others], random),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Mírale la última cifra: 0, 2, 4, 6 y 8 son pares.' : 'Look at the last digit: 0, 2, 4, 6 and 8 are even.',
        explanation: `${answer}`,
      }
    },
  }),

  g({
    id: 'math.doubles',
    skill: 'multiplication',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const half = random() < 0.5
      const n = pickInt(2, scale(age, 6, 10, 10, 50), random)
      const value = half ? n * 2 : n
      return half
        ? {
            prompt: bank.math.halfOf(value),
            choices: numberChoices(n, random, { spread: 3 }),
            correctAnswer: String(n),
            hint: locale === 'es' ? 'Repártelo en dos partes iguales.' : 'Split it into two equal parts.',
            explanation: `${value} : 2 = ${n}`,
          }
        : {
            prompt: bank.math.doubleOf(n),
            choices: numberChoices(n * 2, random, { spread: 3 }),
            correctAnswer: String(n * 2),
            hint: locale === 'es' ? 'El doble es sumarlo consigo mismo.' : 'Double means add it to itself.',
            explanation: `${n} + ${n} = ${n * 2}`,
          }
    },
  }),

  g({
    id: 'math.order_numbers',
    skill: 'number_sequence',
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = scale(age, 6, 12, 20, 999)
      const set = new Set<number>()
      while (set.size < 4) set.add(pickInt(1, top, random))
      const values = [...set]
      const sorted = [...values].sort((a, b) => a - b)
      const correct = sorted.join(', ')
      const wrong = new Set<string>()
      let guard = 0
      while (wrong.size < 3 && guard++ < 60) {
        const candidate = shuffle(values, random).join(', ')
        if (candidate !== correct) wrong.add(candidate)
      }
      return {
        prompt: bank.math.orderAscending,
        choices: shuffle([correct, ...wrong], random),
        correctAnswer: correct,
        hint: locale === 'es' ? 'Busca primero el más pequeño de todos.' : 'Find the smallest one first.',
        explanation: correct,
      }
    },
  }),

  g({
    id: 'math.word_problem_add',
    skill: 'word_problem',
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = scale(age, 6, 12, 9, 60)
      const first = pickInt(2, top, random)
      const more = pickInt(2, top, random)
      const thing = pick(bank.words.filter((w) => w.category === 'food' && !w.mass), random)
      const name = pick(bank.names, random)
      return {
        prompt: bank.math.addStory(name, first, more, thing.plural, genderOf(thing.article)),
        choices: numberChoices(first + more, random, { spread: 4, min: 1 }),
        correctAnswer: String(first + more),
        hint: locale === 'es' ? '"Encuentra más" quiere decir sumar.' : '“Finds more” means add.',
        explanation: `${first} + ${more} = ${first + more}`,
      }
    },
  }),

  g({
    id: 'math.word_problem_sub',
    skill: 'word_problem',
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = scale(age, 6, 12, 12, 80)
      const first = pickInt(5, top, random)
      const gone = pickInt(1, first - 1, random)
      const thing = pick(bank.words.filter((w) => w.category === 'school'), random)
      const name = pick(bank.names, random)
      return {
        prompt: bank.math.subStory(name, first, gone, thing.plural, genderOf(thing.article)),
        choices: numberChoices(first - gone, random, { spread: 4, min: 1 }),
        correctAnswer: String(first - gone),
        hint: locale === 'es' ? '"Ha regalado" quiere decir restar.' : '“Gave away” means take away.',
        explanation: `${first} − ${gone} = ${first - gone}`,
      }
    },
  }),

  g({
    id: 'math.missing_addend',
    skill: 'addition',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const total = pickInt(8, scale(age, 7, 12, 20, 100), random)
      const known = pickInt(1, total - 1, random)
      return {
        prompt: `${known} + ? = ${total}`,
        choices: numberChoices(total - known, random, { spread: 4 }),
        correctAnswer: String(total - known),
        hint: locale === 'es' ? 'Puedes restar: el total menos lo que ya tienes.' : 'You can subtract: the total minus what you already have.',
        explanation: `${total} − ${known} = ${total - known}`,
      }
    },
  }),

  g({
    id: 'math.times_table',
    skill: 'multiplication',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const top = scale(age, 7, 12, 5, 10)
      const a = pickInt(2, top, random)
      const b = pickInt(2, 10, random)
      return {
        prompt: `${a} × ${b} = ?`,
        choices: numberChoices(a * b, random, { spread: a, min: 1, extra: [a * (b + 1), a * (b - 1), a + b] }),
        correctAnswer: String(a * b),
        hint: locale === 'es' ? `Es ${a} sumado ${b} veces.` : `It is ${a} added ${b} times.`,
        explanation: `${a} × ${b} = ${a * b}`,
      }
    },
  }),

  g({
    id: 'math.sum_three',
    skill: 'addition',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const top = scale(age, 7, 12, 9, 40)
      const [a, b, c] = [pickInt(2, top, random), pickInt(2, top, random), pickInt(2, top, random)]
      const total = (a as number) + (b as number) + (c as number)
      return {
        prompt: `${a} + ${b} + ${c} = ?`,
        choices: numberChoices(total, random, { spread: 5 }),
        correctAnswer: String(total),
        hint: locale === 'es' ? 'Suma los dos primeros y luego añade el tercero.' : 'Add the first two, then add the third.',
        explanation: `${a} + ${b} = ${(a as number) + (b as number)}, + ${c} = ${total}`,
      }
    },
  }),

  g({
    id: 'math.money_change',
    skill: 'word_problem',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const paid = pick(age <= 8 ? [5, 10] : [10, 20, 50], random)
      const price = pickInt(1, paid - 1, random)
      return {
        prompt: bank.math.change(price, paid),
        choices: numberChoices(paid - price, random, { spread: 3 }),
        correctAnswer: String(paid - price),
        hint: locale === 'es' ? 'Resta el precio de lo que has dado.' : 'Take the price away from what you paid.',
        explanation: `${paid} − ${price} = ${paid - price} ${bank.math.currency}`,
      }
    },
  }),

  g({
    id: 'math.clock_hours',
    skill: 'word_problem',
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const hour = pickInt(1, 12, random)
      const plus = pickInt(2, 6, random)
      const answer = ((hour + plus - 1) % 12) + 1
      return {
        prompt: bank.math.clockLater(hour, plus),
        choices: numberChoices(answer, random, { spread: 2, extra: [hour + plus, hour, plus] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Después del 12 se vuelve a empezar por el 1.' : 'After 12 the clock starts again at 1.',
        explanation: `${hour} + ${plus} → ${answer}`,
      }
    },
  }),

  g({
    id: 'math.add_two_digit',
    skill: 'addition',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const top = scale(age, 8, 12, 60, 500)
      const a = pickInt(11, top, random)
      const b = pickInt(11, top, random)
      return {
        prompt: `${a} + ${b} = ?`,
        choices: numberChoices(a + b, random, { spread: 10, extra: [a + b + 10, a + b - 10, a + b + 100] }),
        correctAnswer: String(a + b),
        hint: locale === 'es' ? 'Suma primero las unidades y no olvides lo que te llevas.' : 'Add the units first and remember the carry.',
        explanation: `${a} + ${b} = ${a + b}`,
      }
    },
  }),

  g({
    id: 'math.sub_two_digit',
    skill: 'subtraction',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const top = scale(age, 8, 12, 80, 600)
      const a = pickInt(30, top, random)
      const b = pickInt(11, a - 1, random)
      return {
        prompt: `${a} − ${b} = ?`,
        choices: numberChoices(a - b, random, { spread: 10, extra: [a - b + 10, a - b - 10] }),
        correctAnswer: String(a - b),
        hint: locale === 'es' ? 'Si no puedes restar las unidades, pide prestado a las decenas.' : 'If the units will not subtract, borrow from the tens.',
        explanation: `${a} − ${b} = ${a - b}`,
      }
    },
  }),

  g({
    id: 'math.division_simple',
    skill: 'division',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const divisor = pickInt(2, scale(age, 8, 12, 6, 10), random)
      // Worth doing: "4 ÷ 2" is not a division question for an eight-year-old.
      const quotient = Math.max(pickInt(2, 10, random), Math.ceil(12 / divisor))
      const total = divisor * quotient
      return {
        prompt: `${total} ÷ ${divisor} = ?`,
        choices: numberChoices(quotient, random, { spread: 2, min: 1, extra: [divisor, total - divisor] }),
        correctAnswer: String(quotient),
        hint: locale === 'es' ? `Pregúntate: ¿${divisor} por cuánto es ${total}?` : `Ask yourself: ${divisor} times what makes ${total}?`,
        explanation: `${divisor} × ${quotient} = ${total}`,
      }
    },
  }),

  g({
    id: 'math.fraction_of_number',
    skill: 'division',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const part = pick([2, 3, 4, 5], random)
      const answer = pickInt(2, 12, random)
      const whole = part * answer
      return {
        prompt: bank.math.fractionOf(part, whole),
        choices: numberChoices(answer, random, { spread: 2, min: 1, extra: [whole - answer, part] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? `Reparte ${whole} en ${part} partes iguales.` : `Split ${whole} into ${part} equal parts.`,
        explanation: `${whole} ÷ ${part} = ${answer}`,
      }
    },
  }),

  g({
    id: 'math.word_problem_share',
    skill: 'word_problem',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const people = pickInt(2, 6, random)
      const each = pickInt(2, 12, random)
      const total = people * each
      const thing = pick(bank.words.filter((w) => w.category === 'food' && !w.mass), random)
      const name = pick(bank.names, random)
      return {
        prompt: bank.math.shareStory(name, total, people, thing.plural, genderOf(thing.article)),
        choices: numberChoices(each, random, { spread: 2, min: 1, extra: [total - people, people] }),
        correctAnswer: String(each),
        hint: locale === 'es' ? 'Repartir por igual es dividir.' : 'Sharing equally means dividing.',
        explanation: `${total} ÷ ${people} = ${each}`,
      }
    },
  }),

  g({
    id: 'math.word_problem_mult',
    skill: 'word_problem',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const groups = pickInt(2, 9, random)
      const each = pickInt(3, 12, random)
      const thing = pick(bank.words.filter((w) => w.category === 'school'), random)
      const name = pick(bank.names, random)
      return {
        prompt: bank.math.multStory(name, groups, each, thing.plural, genderOf(thing.article)),
        choices: numberChoices(groups * each, random, { spread: each, min: 1, extra: [groups + each, groups * each + each] }),
        correctAnswer: String(groups * each),
        hint: locale === 'es' ? 'Grupos iguales se multiplican.' : 'Equal groups means multiply.',
        explanation: `${groups} × ${each} = ${groups * each}`,
      }
    },
  }),

  g({
    id: 'math.perimeter_rectangle',
    skill: 'basic_geometry',
    minAge: 9,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const long = pickInt(3, 20, random)
      const wide = pickInt(2, long, random)
      const answer = 2 * (long + wide)
      return {
        prompt: bank.math.perimeter(long, wide),
        choices: numberChoices(answer, random, { spread: 4, extra: [long * wide, long + wide] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Da la vuelta entera: los cuatro lados.' : 'Go all the way round: all four sides.',
        explanation: `2 × (${long} + ${wide}) = ${answer} ${bank.math.unit}`,
      }
    },
  }),

  g({
    id: 'math.rounding',
    skill: 'number_comparison',
    minAge: 9,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const n = pickInt(11, 499, random)
      const answer = Math.round(n / 10) * 10
      // Every option has to be a plausible *rounding*: another ten, or the
      // number left alone. Offering 499 against 500 tests nothing.
      const tens = [answer - 10, answer + 10, answer - 20, answer + 20]
        .filter((value) => value > 0)
        .map(String)
      return {
        prompt: bank.math.round(n),
        choices: choicesFrom(String(answer), [String(n), ...tens], random, () => String(answer + 30)),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Mira la última cifra: de 5 para arriba, sube.' : 'Look at the last digit: 5 or more rounds up.',
        explanation: `${n} → ${answer}`,
      }
    },
  }),

  g({
    id: 'math.area_rectangle',
    skill: 'basic_geometry',
    minAge: 10,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const long = pickInt(3, 15, random)
      const wide = pickInt(2, 12, random)
      const answer = long * wide
      return {
        prompt: bank.math.area(long, wide),
        choices: numberChoices(answer, random, { spread: long, extra: [2 * (long + wide), long + wide] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'El área es largo por ancho.' : 'Area is length times width.',
        explanation: `${long} × ${wide} = ${answer}`,
      }
    },
  }),

  g({
    id: 'math.mult_two_digit',
    skill: 'multiplication',
    minAge: 10,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, random }) => {
      const a = pickInt(12, 99, random)
      const b = pickInt(3, 9, random)
      return {
        prompt: `${a} × ${b} = ?`,
        choices: numberChoices(a * b, random, { spread: b * 10, extra: [a * b + 10, a * b - b] }),
        correctAnswer: String(a * b),
        hint: locale === 'es' ? 'Multiplica las decenas y las unidades por separado.' : 'Multiply the tens and the units separately.',
        explanation: `${a} × ${b} = ${a * b}`,
      }
    },
  }),

  g({
    id: 'math.division_remainder',
    skill: 'division',
    minAge: 10,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const groups = pickInt(3, 9, random)
      const remainder = pickInt(1, groups - 1, random)
      const total = groups * pickInt(3, 12, random) + remainder
      return {
        prompt: bank.math.remainder(total, groups),
        choices: numberChoices(remainder, random, { spread: 2, extra: [groups, Math.floor(total / groups)] }),
        correctAnswer: String(remainder),
        hint: locale === 'es' ? 'Reparte todo lo que puedas y mira qué queda suelto.' : 'Share out as much as you can and see what is left over.',
        explanation: `${total} ÷ ${groups} = ${Math.floor(total / groups)}, ${remainder}`,
      }
    },
  }),

  g({
    id: 'math.fraction_compare',
    skill: 'number_comparison',
    minAge: 10,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const denominators = pickMany([2, 3, 4, 5, 6, 8, 10], 4, random)
      const answer = `1/${Math.min(...denominators)}`
      return {
        prompt: bank.math.whichFractionBigger,
        choices: shuffle(denominators.map((d) => `1/${d}`), random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Cuantas más partes, más pequeña es cada una.' : 'The more parts there are, the smaller each one is.',
        explanation: answer,
      }
    },
  }),

  g({
    id: 'math.percentage',
    skill: 'word_problem',
    minAge: 11,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const percent = pick([10, 20, 25, 50], random)
      const of = pickInt(2, 20, random) * 20
      const answer = (of * percent) / 100
      return {
        prompt: bank.math.percent(percent, of),
        choices: numberChoices(answer, random, { spread: Math.max(2, Math.round(answer / 4)) }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'El 10 % es dividir entre 10.' : '10 % means dividing by 10.',
        explanation: `${of} × ${percent} / 100 = ${answer}`,
      }
    },
  }),

  g({
    id: 'math.add_pictures',
    skill: 'addition',
    minAge: 5,
    maxAge: 7,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.countables, random)
      const a = pickInt(1, 5, random)
      const b = pickInt(1, 4, random)
      // The sum drawn rather than written: a five-year-old who cannot yet read
      // "3 + 2" can still count two groups of things and say how many.
      return {
        prompt: `${repeatSymbol(item.symbol, a)}   +   ${repeatSymbol(item.symbol, b)}\n\n${bank.math.howMany(item.plural, item.gender)}`,
        choices: numberChoices(a + b, random, { spread: 2, min: 1 }),
        correctAnswer: String(a + b),
        hint: locale === 'es' ? 'Cuenta el primer grupo y sigue contando con el segundo.' : 'Count the first group and keep counting into the second.',
        explanation: `${a} + ${b} = ${a + b}`,
      }
    },
  }),

  g({
    id: 'math.take_away_pictures',
    skill: 'subtraction',
    minAge: 5,
    maxAge: 7,
    difficulty: 1,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.countables, random)
      const total = pickInt(3, 9, random)
      const gone = pickInt(1, total - 1, random)
      return {
        prompt: `${repeatSymbol(item.symbol, total)}\n\n${bank.math.crossOut(gone, item.plural, item.gender)}`,
        choices: numberChoices(total - gone, random, { spread: 2, min: 0 }),
        correctAnswer: String(total - gone),
        hint: locale === 'es' ? 'Tapa con el dedo las que se van y cuenta el resto.' : 'Cover the ones that go with your finger and count the rest.',
        explanation: `${total} − ${gone} = ${total - gone}`,
      }
    },
  }),

  g({
    id: 'math.number_word',
    skill: 'counting',
    minAge: 5,
    maxAge: 8,
    difficulty: 1,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const top = Math.min(bank.numberWords.length - 1, scale(age, 5, 8, 10, 20))
      const n = pickInt(0, top, random)
      const word = bank.numberWords[n] as string
      // Both directions, because reading "siete" and writing 7 are two
      // different pieces of knowing the same number.
      if (random() < 0.5) {
        return {
          prompt: bank.math.whichNumberIsWord(word),
          choices: numberChoices(n, random, { spread: 2 }),
          correctAnswer: String(n),
          hint: locale === 'es' ? 'Dilo en voz alta y cuenta con los dedos.' : 'Say it out loud and count on your fingers.',
          explanation: `${word} = ${n}`,
        }
      }
      const pool = bank.numberWords.filter((other) => other !== word)
      return {
        prompt: bank.math.howIsWritten(n),
        choices: wordChoices(word, pool, pool, random),
        correctAnswer: word,
        hint: locale === 'es' ? 'Cuenta desde el uno hasta llegar a él.' : 'Count up from one until you reach it.',
        explanation: `${n} = ${word}`,
      }
    },
  }),

  g({
    id: 'math.ordinal_position',
    skill: 'number_sequence',
    minAge: 5,
    maxAge: 8,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const row = pickMany(bank.alphabet, 5, random)
      const index = pickInt(0, 4, random)
      const answer = row[index] as string
      const others = row.filter((letter) => letter !== answer)
      return {
        prompt: bank.math.whichIsNth(bank.ordinals[index] as string, row.join('   ')),
        choices: shuffle([answer, ...others.slice(0, 3)], random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Cuenta desde el principio de la fila, sin saltarte ninguna.' : 'Count from the start of the row, without skipping any.',
        explanation: `${index + 1} → ${answer}`,
      }
    },
  }),

  g({
    id: 'math.number_bonds_ten',
    skill: 'addition',
    minAge: 5,
    maxAge: 9,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const known = pickInt(1, 9, random)
      return {
        prompt: `${known} + ? = 10`,
        choices: numberChoices(10 - known, random, { spread: 3, min: 0 }),
        correctAnswer: String(10 - known),
        hint: locale === 'es' ? 'Cuenta con los dedos los que te faltan para diez.' : 'Count on your fingers how many more make ten.',
        explanation: `${known} + ${10 - known} = 10`,
      }
    },
  }),

  g({
    id: 'math.money_total',
    skill: 'word_problem',
    minAge: 6,
    maxAge: 10,
    difficulty: 2,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const [valueA, valueB] = pickMany([1, 2, 5, 10], 2, random) as [number, number]
      const countA = pickInt(1, 4, random)
      const countB = pickInt(1, 4, random)
      const total = countA * valueA + countB * valueB
      return {
        prompt: bank.math.moneyTotal(countA, valueA, countB, valueB),
        choices: numberChoices(total, random, { spread: 3, min: 1, extra: [countA + countB, valueA + valueB] }),
        correctAnswer: String(total),
        hint: locale === 'es' ? 'Cuenta primero un montón y luego el otro.' : 'Count one pile first, then the other.',
        explanation: `${countA} × ${valueA} + ${countB} × ${valueB} = ${total} ${bank.math.currency}`,
      }
    },
  }),

  g({
    id: 'math.tens_and_units',
    skill: 'number_comparison',
    minAge: 7,
    maxAge: 10,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const n = pickInt(11, 99, random)
      const tens = Math.floor(n / 10)
      const askTens = random() < 0.5
      const answer = askTens ? tens : n % 10
      return {
        prompt: askTens ? bank.math.howManyTens(n) : bank.math.howManyUnits(n),
        choices: numberChoices(answer, random, { spread: 2, min: 0 }),
        correctAnswer: String(answer),
        hint:
          locale === 'es'
            ? 'La primera cifra son las decenas y la segunda las unidades.'
            : 'The first digit is the tens and the second is the units.',
        explanation: `${n} = ${tens} + ${n % 10}`,
      }
    },
  }),

  g({
    id: 'math.compare_sums',
    skill: 'addition',
    minAge: 7,
    maxAge: 11,
    difficulty: 3,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const base = scale(age, 7, 11, 8, 24)
      // Distinct totals first, then a sum for each: two options worth the same
      // would leave the question with two right answers.
      const totals = pickMany(Array.from({ length: 10 }, (_, i) => base + i * 2), 4, random)
      const options = totals.map((total) => {
        const first = pickInt(2, total - 2, random)
        return { text: `${first} + ${total - first}`, total }
      })
      const best = options.reduce((a, b) => (b.total > a.total ? b : a))
      return {
        prompt: bank.math.whichSumIsBigger,
        choices: shuffle(options.map((option) => option.text), random),
        correctAnswer: best.text,
        hint: locale === 'es' ? 'Haz cada suma por separado y compara los resultados.' : 'Work out each sum on its own, then compare.',
        explanation: `${best.text} = ${best.total}`,
      }
    },
  }),

  g({
    id: 'math.day_of_week',
    skill: 'word_problem',
    minAge: 7,
    maxAge: 11,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const index = pickInt(0, 6, random)
      const days = pickInt(2, 6, random)
      const answer = bank.weekdays[(index + days) % 7] as string
      const others = bank.weekdays.filter((day) => day !== answer)
      return {
        prompt: bank.math.dayLater(bank.weekdays[index] as string, days),
        choices: wordChoices(answer, others, others, random),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Ve contando los días con los dedos, uno a uno.' : 'Count the days on your fingers, one at a time.',
        explanation: `${bank.weekdays[index] as string} + ${days} → ${answer}`,
      }
    },
  }),

  g({
    id: 'math.minutes_in_hours',
    skill: 'multiplication',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const hours = pickInt(2, 9, random)
      const answer = hours * 60
      return {
        prompt: bank.math.minutesInHours(hours),
        choices: numberChoices(answer, random, { spread: 30, min: 1, extra: [hours * 6, hours * 100, hours + 60] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Cada hora tiene 60 minutos.' : 'Each hour has 60 minutes.',
        explanation: `${hours} × 60 = ${answer}`,
      }
    },
  }),

  g({
    id: 'math.measure_units',
    skill: 'word_problem',
    minAge: 8,
    maxAge: 12,
    difficulty: 3,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const item = pick(bank.measures, random)
      const others = bank.measures.map((measure) => measure.match).filter((unit) => unit !== item.match)
      return {
        prompt: bank.math.measuredIn(item.word),
        choices: wordChoices(item.match, others, others, random),
        correctAnswer: item.match,
        hint: locale === 'es' ? 'Piensa si es algo largo, algo pesado o algo que dura.' : 'Think whether it is something long, something heavy or something that lasts.',
        explanation: `${item.word}: ${item.match}`,
      }
    },
  }),

  g({
    id: 'math.multiplication_missing',
    skill: 'multiplication',
    minAge: 8,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, age, random }) => {
      const known = pickInt(2, 9, random)
      const answer = pickInt(2, scale(age, 8, 12, 9, 12), random)
      const total = known * answer
      return {
        prompt: `${known} × ? = ${total}`,
        choices: numberChoices(answer, random, { spread: 2, min: 1, extra: [total - known, known + answer] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? `Recita la tabla del ${known} hasta llegar a ${total}.` : `Say the ${known} times table until you reach ${total}.`,
        explanation: `${known} × ${answer} = ${total}`,
      }
    },
  }),

  g({
    id: 'math.sequence_rule',
    skill: 'number_sequence',
    minAge: 9,
    maxAge: 12,
    difficulty: 4,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const rule = pick(['add', 'subtract', 'double', 'triple'] as const, random)
      const run = ((): number[] => {
        if (rule === 'double') {
          const start = pickInt(1, 6, random)
          return [0, 1, 2, 3, 4].map((i) => start * 2 ** i)
        }
        if (rule === 'triple') {
          const start = pickInt(1, 4, random)
          return [0, 1, 2, 3, 4].map((i) => start * 3 ** i)
        }
        const step = pickInt(3, 12, random)
        if (rule === 'subtract') {
          const start = step * 5 + pickInt(0, 20, random)
          return [0, 1, 2, 3, 4].map((i) => start - i * step)
        }
        const start = pickInt(2, 30, random)
        return [0, 1, 2, 3, 4].map((i) => start + i * step)
      })()
      const answer = run[4] as number
      const gap = Math.abs((run[1] as number) - (run[0] as number))
      return {
        prompt: bank.math.nextInPattern(`${run.slice(0, 4).join(', ')}, ?`),
        choices: numberChoices(answer, random, { spread: Math.max(2, gap), min: 0 }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Mira qué le pasa a un número para llegar al siguiente.' : 'Look at what happens to one number to get the next.',
        explanation: run.join(', '),
      }
    },
  }),

  g({
    id: 'math.word_problem_two_step',
    skill: 'word_problem',
    minAge: 9,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, age, random }) => {
      const bank = bankFor(locale)
      const start = pickInt(10, scale(age, 9, 12, 40, 90), random)
      const gained = pickInt(3, 25, random)
      const lost = pickInt(2, Math.min(20, start), random)
      const answer = start + gained - lost
      const thing = pick(bank.words.filter((word) => word.category === 'food' && !word.mass), random)
      const name = pick(bank.names, random)
      return {
        prompt: bank.math.twoStepStory(name, start, gained, lost, thing.plural, genderOf(thing.article)),
        choices: numberChoices(answer, random, { spread: 4, min: 0, extra: [start + gained + lost, start - lost, start + gained] }),
        correctAnswer: String(answer),
        hint: locale === 'es' ? 'Hazlo en dos pasos: primero suma y después resta.' : 'Do it in two steps: add first, then take away.',
        explanation: `${start} + ${gained} − ${lost} = ${answer}`,
      }
    },
  }),

  g({
    id: 'math.average',
    skill: 'division',
    minAge: 10,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const middle = pickInt(8, 20, random)
      const first = pickInt(1, 4, random)
      const second = pickInt(1, 4, random)
      // Built around its own mean, so the answer is always a whole number: a
      // ten-year-old meeting 7.33 has met a different lesson.
      const values =
        random() < 0.5
          ? [middle - first, middle, middle + first]
          : [middle - first, middle - second, middle + first, middle + second]
      const total = values.reduce((sum, value) => sum + value, 0)
      return {
        prompt: bank.math.averageOf(shuffle(values, random).join(', ')),
        choices: numberChoices(middle, random, { spread: 3, min: 1, extra: [total, Math.max(...values)] }),
        correctAnswer: String(middle),
        hint: locale === 'es' ? 'Súmalos todos y divide entre cuántos son.' : 'Add them all up and divide by how many there are.',
        explanation: `${total} ÷ ${values.length} = ${middle}`,
      }
    },
  }),

  g({
    id: 'math.fraction_equivalent',
    skill: 'number_comparison',
    minAge: 10,
    maxAge: 12,
    difficulty: 5,
    generate: ({ locale, random }) => {
      const bank = bankFor(locale)
      const bottom = pick([2, 3, 4, 5], random)
      const times = pickInt(2, 4, random)
      const answer = `${times}/${bottom * times}`
      const target = 1 / bottom
      const sameValue = (fraction: string): boolean => {
        const [top, under] = fraction.split('/').map(Number)
        return Math.abs((top as number) / (under as number) - target) < 1e-9
      }
      const candidates = [
        `${times}/${bottom * times + 1}`,
        `${times + 1}/${bottom * times}`,
        `${bottom}/${times + bottom}`,
        `${times}/${bottom + times}`,
        `${times + 1}/${bottom * times + 1}`,
      ].filter((fraction) => !sameValue(fraction))
      let filler = 5
      return {
        prompt: bank.math.equivalentFraction(1, bottom),
        choices: choicesFrom(answer, candidates, random, () => {
          filler += 1
          return `${filler}/${bottom * filler + 1}`
        }),
        correctAnswer: answer,
        hint: locale === 'es' ? 'Multiplica arriba y abajo por el mismo número.' : 'Multiply the top and the bottom by the same number.',
        explanation: `1/${bottom} = ${answer}`,
      }
    },
  }),
]
