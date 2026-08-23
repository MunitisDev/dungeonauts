# content/

Version-controlled educational content, one file tree per locale.

```text
content/
├── es/{math,language}/
└── en/{math,language}/
```

Empty for now — authoring starts with task 2 (educational core).

Rules, from `docs/game/EDUCATIONAL_SYSTEM.md`:

- content is data, never code, and never imported by gameplay directly;
- gameplay asks for a challenge by `{ locale, subject, skill?, difficulty }` and
  never knows individual question text;
- every file is validated against the `Challenge` schema by the test suite, so a
  malformed question breaks CI rather than a child's session.
