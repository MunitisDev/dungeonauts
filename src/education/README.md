# education/

The educational system: challenge model, authored content, filtering and answer
checking.

## The boundary

**This module must never import from `game/`, `ui/` or Phaser.**
`tests/educationBoundary.test.ts` enforces all three, and the reverse direction
too: other modules may only reach this one through `education/index.ts`.

The entire contract is two calls:

```ts
repository.request({ locale, subject, skill?, difficulty, age? }) // -> Challenge | null
checkAnswer(challenge, answer)                                    // -> { correct, hint?, explanation? }
```

The educational side reports correctness. The game side decides the fantasy
consequence — `door.unlock()`, `chest.open()`, `combat.playerAttack()`. Neither
knows how the other works.

## Files

| File | Responsibility |
|---|---|
| `types.ts` | `Challenge`, `ChallengeRequest`, `CheckResult`, subjects, difficulties |
| `skills.ts` | Skill ids per subject, and the subset authored for the slice |
| `validation.ts` | Runtime validation of authored JSON, with locating errors |
| `content.ts` | Globs and validates every file under `content/` |
| `ChallengeRepository.ts` | Filtering, selection, and building generated questions |
| `generators/` | One generator per *kind* of question, with its own age band |
| `generators/data/` | Per-locale word, sentence and phrase banks |
| `selection.ts` | Seeded RNG, so selection is reproducible |
| `checkAnswer.ts` | Correctness, with explicit case and accent tolerance |
| `index.ts` | The public surface |

## Behaviour worth knowing

**A request never throws.** If nothing matches, difficulty widens outward
(3 → 2 → 4 → 1 → 5), then the skill constraint is dropped, and only then does it
return `null`. Gameplay must handle `null` gracefully: a door that cannot find a
question should open, not end a child's session with an error.

**Selection is seeded.** Reproducible by design — tests must not be flaky, and a
replayed session should ask the same questions.

**Accent tolerance is deliberate but narrow.** `arbol` is accepted for `árbol`;
`ano` is *not* accepted for `año`, because ñ is a distinct letter rather than an
accented n.

## Adding content

Drop a JSON file under `content/<locale>/<subject>/<skill>.json`:

```json
{ "challenges": [ { "id": "es.math.addition.009", "locale": "es", ... } ] }
```

No code change is needed — the loader globs the directory. The test suite
validates every file, so a malformed question fails CI rather than a child's
session.

## Two sources, one call

`request()` answers from generators when it is given an `age`, and from the
authored JSON in `content/` when it is not. The caller cannot tell which it got,
and should not need to.

A generator is a *kind* of question — "add within 20", "which word rhymes with
this" — that builds an endless supply from a locale, an age and a seeded random
source. It is pure: same inputs, same question. That is what lets a saved run
replay identically and what keeps the tests deterministic.

**Age, not difficulty, is the primary key.** A generator declares the inclusive
age band it was written for and scales inside it. Every age from five to twelve
has at least ten kinds of maths and ten of language, in each locale;
`tests/generators.test.ts` fails if that ever stops being true.

Ids are `<generator>#<serial>`. `challengeFamily(id)` recovers the generator, so
"do not repeat" means "do not ask the same kind again" rather than the useless
"do not repeat this exact random instance".

Every generated question goes through `parseChallenge` before it is returned —
the same validator the authored files face. A generator that produced a question
whose answer was missing from its own options would otherwise reach a child as
an unanswerable screen.

## Adding a kind of question

1. Add a generator to `generators/math.ts` or `generators/language.ts`, with its
   age band and the skill it practises.
2. Add whatever it needs to **both** locale banks.
3. Run the tests. Coverage, answerability, determinism, variety, where the
   answer sits and — for arithmetic — whether the sum is actually right are all
   checked automatically for every generator, in both locales, at every age it
   claims to serve.

## Exact answers

`checkAnswer` forgives capitals, whitespace and vowel accents by default. A
question whose options differ *only* by an accent, a capital or a full stop
cannot be graded under that rule, so those set `strict: true` and are compared
exactly. Nothing else should.
