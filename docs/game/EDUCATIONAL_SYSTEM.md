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
}
```

Gameplay requests a suitable challenge; gameplay should not know individual question text.

## Difficulty
Simple MVP scale:
- 1 introductory
- 2 easy
- 3 developing
- 4 intermediate
- 5 advanced for target age

Difficulty should not be permanently tied to dungeon level.

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
