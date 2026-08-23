# audio/

Music and sound effects, synthesised at runtime. There are no audio files in
this project and there should not be.

## Why synthesis

- **Size.** The whole soundtrack is about 4 KB of note data, against megabytes
  of audio for the same material.
- **Authentic, not imitated.** Square leads, a triangle bass and noise
  percussion *are* chiptune, rather than a recording of one.
- **Reviewable.** A melody lives in `tracks.ts` as note names in a diff, not as
  an opaque binary somebody has to open a DAW to inspect.
- **No pipeline.** Nothing to export, compress, licence or keep in sync.

## The notation

Patterns are tracker-style: one token per eighth note, eight to a bar, `|` for
barlines so the phrasing is readable. `.` is a rest and `_` holds the previous
note for another step. Because rhythm is visible in the source, a missing beat
is something you can see.

```text
A4 _  D5 _  F5 _  E5 _ | D5 _  _  .  A4 _  C5 _ |
```

`tests/music.test.ts` checks that every part of a track is the same length and
a whole number of bars. That catches the bug this design is most prone to — a
bar with seven tokens instead of eight, which makes one part drift a step
further behind on every loop and is very hard to diagnose by ear.

## The music

| Track | Where | Notes |
|---|---|---|
| `title` | Title screen | D natural minor, 108 bpm. A rising heroic phrase answered by a falling one over Dm–Bb–F–C. The A major in the last bar pulls the loop back round instead of letting it stop. |
| `dungeon` | In game | D dorian, 86 bpm. The natural B keeps it curious rather than sad. Sparse, no percussion — it plays under a child thinking, so it is built to be ignorable. |
| `victory` | Completion | Short rising fanfare, plays once. |

## Sound effects

Tone rules come from `docs/game/GAME_DESIGN.md`: success is immediate and
satisfying, a wrong answer gets a *neutral* sound. `wrong` is two soft falling
notes on a mellow voice — never a buzzer, never anything that reads as a
telling-off. `defeat` is a comic bounce, not a death sound.

## Browser gesture

Browsers refuse to create an audio context without a real user interaction, so
`AudioEngine.unlock()` must be called from a genuine event. `main.ts` hooks the
first pointer, key or touch event anywhere on the page — not just the Play
button, since unlocking there would mean the title theme started and was
replaced in the same instant.
