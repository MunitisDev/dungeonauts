# Dungeonauts — Educational System v1

## Purpose
Educational challenges must be:
- authored independently from game code
- filtered by subject
- filtered by skill
- filtered by difficulty
- localized
- reusable across different game interactions

## Initial subjects
- `math`
- `language`

## Initial locales
- `es`
- `en`

Do not assume UI language and learning language must always be identical in future versions.

## Conceptual challenge model

```ts
type Challenge = {
  id: string
  locale: "es" | "en"
  subject: "math" | "language"
  skill: string
  difficulty: number
  prompt: string
  interactionType:
    | "multiple_choice"
    | "numeric_input"
    | "text_input"
    | "ordering"
  choices?: string[]
  correctAnswer: string | number | string[]
  explanation?: string
  hint?: string
  metadata?: {
    ageBand?: string
    tags?: string[]
  }
}
```

## Challenge request concept

```ts
type ChallengeRequest = {
  locale: "es" | "en"
  subject: "math" | "language"
  skill?: string
  difficulty: number
  age?: number
}
```

Gameplay requests a suitable challenge; gameplay should not know individual question text.

## Difficulty and age
Simple MVP scale:
- 1 introductory
- 2 easy
- 3 developing
- 4 intermediate
- 5 advanced for target age

Difficulty should not be permanently tied to dungeon level.

The one exception is depth. A run's floors go down without end, and the
difficulty rises one step every second floor to the top of the scale — the
child who is on floor seven has been answering for a while, and the questions
should have noticed. The age band still decides what a question *is*; the floor
only nudges which end of the band it is drawn from.

**Age is the stronger signal, and is preferred when it is known.** This project
spans roughly five to twelve, which is the distance between counting stars and
finding a percentage; one 1-5 scale cannot express that. Each generated question
type declares the inclusive age band it was written for, and scales *within* that
band — the same "add within 20" gives a seven-year-old smaller numbers than it
gives a nine-year-old. Difficulty remains as a label on the question, used to
pick between authored files when no age is supplied.

Every age from five to twelve has at least ten distinct kinds of maths question
and ten of language available to it, in each locale. That floor is a test, not
an aspiration.

## Generated content
Two sources sit behind one request, and the caller cannot tell them apart:

- **Authored questions** — JSON under `content/`, hand-written, fixed.
- **Generators** — one per *kind* of question, each producing an endless supply
  from a locale, an age and a seeded random source.

A generator is pure: same locale, same age, same seed, same question. That is
what lets a saved run replay identically, and what keeps the tests honest.

Generated questions are always multiple choice with four options laid out two by
two. Even the ones that are conceptually orderings — put these numbers in order,
put these words into a sentence — offer four candidate orderings to tap rather
than a drag. A six-year-old can tap.

Generated ids are `<generator>#<serial>`, so "do not repeat" can mean "do not
ask the same *kind* again" rather than the useless "do not repeat this exact
random instance".

### A different stream every run
The repository is built with the world, long before anyone presses play, so its
question stream is reseeded when a run starts — from the run's own seed, and
again on each floor. Without that, every game drew from the same stream and a
child met the same first question every afternoon. A resumed save skips ahead by
what it has already answered, so continuing a run does not replay its questions.

### Exact answers
`checkAnswer` forgives capitals, surrounding whitespace and vowel accents,
because a six-year-old typing "arbol" has understood the word. That forgiveness
makes one class of question ungradeable: a question asking *which spelling
carries the accent* cannot be marked if both spellings count. Such questions —
and only those — set `strict: true`, which compares the answer exactly.

## Initial math skill IDs
- `counting`
- `addition`
- `subtraction`
- `multiplication`
- `division`
- `number_comparison`
- `number_sequence`
- `basic_geometry`
- `word_problem`

## Initial language skill IDs
- `vocabulary`
- `spelling`
- `word_recognition`
- `sentence_completion`
- `sentence_ordering`
- `synonyms`
- `antonyms`
- `basic_grammar`
- `reading_comprehension`

## Interaction types

### Multiple choice
Best default for vertical slice.
- large buttons
- 3–4 answers when appropriate
- no trick questions
- plausible distractors

### Numeric input
Useful for math.

### Text input
Use carefully for younger children.
Define case/accent tolerance explicitly.

### Ordering
Useful later for sequences and sentence order.

## Separation of educational and game outcomes

Example:

```text
challenge success
→ CombatSystem.playerAttack()

challenge success
→ Door.unlock()

challenge success
→ Chest.open()
```

The challenge system returns correctness; gameplay decides the fantasy consequence.

## Incorrect answers
Recommended:
1. neutral feedback;
2. optional hint;
3. retry;
4. after repeated mistakes, optionally scaffold or reduce difficulty.

Avoid mocking, aggressive sounds, lockouts, or shame.

## Content storage
Prefer simple version-controlled data first:

```text
content/
├── es/
│   ├── math/
│   └── language/
└── en/
    ├── math/
    └── language/
```

No CMS until there is a real authoring need.

Generator word banks are typed modules under `src/education/generators/data/`
rather than JSON. A bank is not a list of questions but the raw material several
generators recombine, and a wrong syllable count or a missing plural surfaces as
a nonsense question in front of a child rather than as a parse error. The
compiler catching a malformed entry is worth more there than the file being
editable without a build. `tests/contentBank.test.ts` checks the banks as data —
no word listed twice, no two pairs sharing an answer, no family whose intruder is
one of its own members — because those mistakes reach a child as an unanswerable
question rather than as a failing build. A mass noun (milk, arroz) carries
`mass: true` and is left out of anything that counts it or changes its number.

## MVP educational scope

### Math
- addition
- subtraction

### Language
- vocabulary
- sentence completion

### Interaction
- multiple choice

This is enough to validate the core loop.
