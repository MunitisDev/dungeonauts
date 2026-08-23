# education/

The educational system: challenge model, content repository, filtering and
answer checking.

**This module must never import from `game/`.** The only contract between the
two is:

```text
challenges.request({ locale, subject, skill?, difficulty }) -> Challenge
challenges.check(challenge, answer)                         -> { correct, hint?, explanation? }
```

The educational side reports correctness. The game side decides the fantasy
consequence (`door.unlock()`, `chest.open()`, `combat.playerAttack()`).

Empty until task 2.
