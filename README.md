# Dungeonauts

A child-friendly educational dungeon crawler for roughly 6–11 year-olds, in
Spanish and English. Players explore, meet monsters, unlock doors and open
chests — and the way they *do* those things is by solving maths and language
challenges. Adventure first, educational software second.

## Status

**Task 1 of the vertical slice: technical base.** Runnable, no gameplay yet.

What exists: pixel-perfect Phaser rendering, the asset registry with temporary
placeholders, a static test room on the 32×32 grid, and the DOM overlay where
the HUD and challenge panel will live.

What does not exist yet: movement, interactables, combat, the educational
system, content, progression.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm test` | Vitest suite, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |

Press **G** in the running game to toggle the debug grid.

## Architecture

The hard boundary in this project is between the game and the educational
content. Gameplay asks for a challenge and is told whether the answer was
correct; it never sees question text, and it alone decides the in-world
consequence.

```text
challenges.request({ locale, subject, skill?, difficulty }) -> Challenge
challenges.check(challenge, answer)  -> { correct, hint?, explanation? }
                                     -> game decides: door.unlock() / chest.open() / ...
```

```text
src/
├── engine/      Phaser bootstrap, pixel-perfect scaling, asset registry
├── game/        scenes, world model, room data parsing
├── education/   challenge model and content repository (task 2)
├── ui/          DOM overlay: HUD, challenge panel, accessibility
├── i18n/        locales and strings
└── theme/       the approved colour palette as shared tokens
content/         educational content, versioned JSON, per locale
data/rooms/      room definitions
assets/          approved production artwork (added externally)
docs/            source-of-truth design documents
```

The world is rendered by Phaser on a canvas. The HUD and the educational panel
are ordinary DOM on top of it — that is what gives the challenge text real font
scaling, focus handling, large hit targets and screen-reader support, which
matters more for this audience than retro purity.

## Art

Production art is generated externally and committed by the project owner.
Nothing in `assets/` is authored by the coding assistant.

Any asset that is missing renders as a magenta checkerboard placeholder at its
exact production dimensions. Dropping an approved PNG at the path given in
`docs/art/ASSET_MANIFEST.md` replaces it — no code change.

## Playable build

<https://munitisdev.github.io/dungeonauts/> — redeployed on every push to `main`.

One-time setup by a repository admin, without which the deploy workflow fails:
**Settings → Pages → Build and deployment → Source: "GitHub Actions"**. The
workflow cannot switch that on for itself.

## How this repository is worked on

Single branch: **`main`**. Everything is committed straight to it, and every push
to `main` redeploys the playable build.

Adding artwork is a file drop, not a code change:

1. put the PNG at the exact path in `docs/art/ASSET_MANIFEST.md`;
2. commit it;
3. the placeholder disappears on the next load.

If the file does not appear, check it against `docs/art/SPRITE_SPEC.md` first —
a wrong frame size or row order is the usual cause.

## Documentation

These documents are the source of truth and take precedence over the code:

- `docs/PROJECT_BRIEF.md` — audience, subjects, goals
- `docs/game/GAME_DESIGN.md` — core loop, rooms, feedback
- `docs/game/EDUCATIONAL_SYSTEM.md` — challenge model, skills, locales
- `docs/art/ART_DIRECTION.md` — palette, tone, visual rules
- `docs/art/SPRITE_SPEC.md` — dimensions, anchors, spritesheet layout
- `docs/art/ASSET_MANIFEST.md` — asset ids, paths, statuses

The test suite reads several of them directly and fails if the code drifts from
what they say.
