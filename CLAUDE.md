# CLAUDE.md — Dungeonauts

## Project role
You are the primary implementation assistant for **Dungeonauts**, a child-friendly educational dungeon crawler.

Before meaningful gameplay, educational, UI, or visual changes, read:
- `docs/PROJECT_BRIEF.md`
- `docs/game/GAME_DESIGN.md`
- `docs/game/EDUCATIONAL_SYSTEM.md`
- `docs/art/ART_DIRECTION.md`
- `docs/art/SPRITE_SPEC.md`
- `docs/art/ASSET_MANIFEST.md`

Treat them as source of truth unless the user explicitly overrides them.

## Core principles
1. Game first, education embedded.
2. Primary audience: approximately 6–11 years old.
3. Educational challenges cause in-world actions.
4. Spanish and English from the start.
5. Incorrect answers get gentle feedback, not harsh punishment.
6. Visual consistency over improvisation.

## Visual rules
- Logical tile size: **16×16 px** while the packed dungeon tileset is being
  trialled — it is 16×16 art and the build runs at 16 so it is used unscaled.
  `docs/art/ART_DIRECTION.md` and `SPRITE_SPEC.md` still describe 32×32 and
  carry a note saying so; whichever way the trial ends, they get reconciled.
- Pixel-art rendering: **nearest-neighbor**
- Image smoothing: **OFF**
- Anti-aliasing on pixel assets: **OFF**
- Prefer integer scaling
- Do not introduce gradients into production pixel art
- Do not use emoji/Unicode as final graphics
- Use approved assets from `assets/`
- Reference images are not production sprites

If an asset is missing:
1. Use an obvious temporary placeholder.
2. Add/update it in `docs/art/ASSET_MANIFEST.md`.
3. Keep gameplay independent from the placeholder.
4. Do not create a competing final design.

## Asset workflow
Production artwork is generated outside Claude Code by ChatGPT and uploaded to the repo by the user.

When a new asset appears:
1. Read its manifest entry.
2. Verify path and dimensions.
3. Integrate it without redesigning it.
4. Apply nearest-neighbor rendering.
5. Preserve transparency.
6. Adapt code to the approved asset rather than silently altering the art.

## Educational-system rules
Educational content must be data-driven and separate from scene/component code.

Conceptual model:

```ts
type Challenge = {
  id: string
  locale: "es" | "en"
  subject: "math" | "language"
  skill: string
  difficulty: number
  prompt: string
  interactionType: "multiple_choice" | "numeric_input" | "text_input" | "ordering"
  choices?: string[]
  correctAnswer: string | number | string[]
  explanation?: string
  hint?: string
}
```

Separate:
- gameplay
- educational content
- presentation
- localization

## UI / UX
- Large readable text
- Large touch/click targets
- Minimal permanent HUD
- Strong contrast for interactables
- Educational prompts prioritize readability over retro styling
- Avoid overcrowding
- Prefer one obvious primary objective per room

A child should usually understand quickly:
- where they are
- where they can go
- what they can interact with
- what they need to do
- what they earned

## Coding behavior
- Inspect existing code before broad architectural changes.
- Prefer incremental changes.
- Preserve working functionality unless change is required.
- Keep systems modular and testable.
- Keep content/config separate from game logic.
- Avoid unnecessary dependencies.
- Do not silently change project-wide conventions.
- Call out material conflicts between code and docs.

## MVP priority
Build a polished vertical slice first:
- 1 player character
- 2–3 simple dungeon rooms
- 1 green slime
- 1 locked door
- 1 key
- 1 chest
- simple HUD
- math challenge
- language challenge
- correct/incorrect feedback
- room progression
- Spanish/English-ready content model

Do not overbuild inventory, economy, procedural generation, classes, or skill trees before the vertical slice works.
