# education/

The educational system: challenge model, authored content, filtering and answer
checking.

## The boundary

**This module must never import from `game/`, `ui/` or Phaser.**
`tests/educationBoundary.test.ts` enforces all three, and the reverse direction
too: other modules may only reach this one through `education/index.ts`.

The entire contract is two calls:

```ts
repository.request({ locale, subject, skill?, difficulty }) // -> Challenge | null
checkAnswer(challenge, answer)                              // -> { correct, hint?, explanation? }
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
| `ChallengeRepository.ts` | Filtering and selection |
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
