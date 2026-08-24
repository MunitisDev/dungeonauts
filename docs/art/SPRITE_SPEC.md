# Dungeonauts — Sprite Specification v1

This document is the technical source of truth for production pixel-art slicing, dimensions, anchors, and animation layout.

It complements `ART_DIRECTION.md` and `ASSET_MANIFEST.md`.

---

## 1. World grid

- Logical world tile: **16×16 px**

- Pixel rendering: **nearest-neighbor**
- Image smoothing: **OFF**
- Pixel-art anti-aliasing: **OFF**
- Prefer integer display scaling
- Production sprites use transparent PNG where appropriate

A sprite may be taller than one tile. The world grid defines positioning/collision, not the maximum sprite height.

---

## 2. World-sprite anchor convention

Characters, enemies, doors, chests, and other world objects use:

**anchor/origin: bottom-center**

Conceptually:

```text
originX = 0.5
originY = 1.0
```

The entity's world position represents the center of its feet/base on the tile.

This allows a 32×32 hero to extend upward beyond a 16×16 logical tile without breaking alignment.

UI icons are not subject to this world anchor convention.

---

## 3. Spritesheet convention

Unless an asset explicitly says otherwise:

- frames have **no padding**
- frames have **no margin**
- frames are packed in a rectangular grid
- frame size is exact and constant across the sheet
- transparent pixels are allowed within a frame
- animation frames are read left-to-right
- directional rows are read top-to-bottom

Direction row order for character sheets is in § 5.

---

## 4. Sizes at a glance

Every world sprite is a whole number of 16×16 cells. Nothing is 32×32 by
default: a sprite is only bigger than one cell when the drawing needs the room,
and then it is bigger by whole cells.

| Family | Frame | Cells | Anchor |
|---|---:|---|---|
| Playable characters | 32×32 | 2 × 2 | bottom-center |
| Enemies | 16×16 | 1 × 1 | bottom-center |
| Torch | 16×16 | 1 × 1 | bottom-center |
| Door, any wall | 16×16 | 1 × 1 | bottom-center |
| Chest, key, lever, props | 16×16 | 1 × 1 | bottom-center |
| Dungeon tiles | 16×16 | 1 × 1 | top-left |
| UI icons | 16×16 | — | center |

Much of this already exists. The packed dungeon set in
`assets/packs/dungeon-tiles.dpk` supplies the tiles, walls, doors, chests,
torches, coins, three enemies and one animated knight; its inventory, with the
cell coordinates of every piece, is `docs/art/TILESET_CATALOGUE.md`. **That
catalogue is the source of truth for artwork that is already in the game.** The
sections below specify the frames the pack does *not* contain, and the layout
any replacement must follow.

---

## 5. Playable characters

### Frame size

**32×32 px exact** — two cells wide, two cells tall.

World anchor:

**bottom-center**

The character's feet sit on the bottom edge of the frame, so a character
standing on tile `(tx, ty)` is drawn from `ty - 1` upward. The collision
footprint is one tile and is handled in code, not in the art.

### Direction rows

The packed knight has a left view and a right view and no front or back view,
so the game keeps the last horizontal heading when the child walks up or down.
That is the artwork's decision, not the engine's, and a fuller sheet is welcome:

```text
row 0 = down
row 1 = left
row 2 = right
row 3 = up
```

A sheet that supplies only `left` and `right` rows must say so in
`ASSET_MANIFEST.md`. Do **not** horizontally flip one direction to synthesize
another.

The two `hero_warrior_boy_*` sheets already in the repository are 32×40, drawn
when the world tile was 32×32. They are superseded, not loaded, and kept at
their original dimensions so the committed files still check; a new character
sheet is 32×32.

### Animations

| ID | Frames per direction | Loop | Playback |
|---|---:|---|---|
| `idle` | 4 | yes | 4–6 fps |
| `walk` | 4 | yes | 8–10 fps |
| `think` | 2 | short loop or hold | 2–3 fps |
| `victory` | 4 | no | 6–8 fps |

Sheet size is `4 × 32` wide by `rows × 32` tall — 128×128 for a four-row sheet
of four-frame animations.

There is no `attack`: the game resolves encounters with questions, not blows.

---

## 6. Enemies

### Frame size

**16×16 px exact**

World anchor:

**bottom-center**

Enemies do not need directional rows.

| ID | Frames | Loop | Playback |
|---|---:|---|---|
| `<enemy>_idle` | 4–6 | yes | 4–6 fps |
| `<enemy>_defeated` | 3–4 | no | 7–9 fps |

Sheet layout is one animation per row, frames left to right, so a sheet of six
animations is 6 × 16 = 96 px wide by 6 × 16 = 96 px tall at most.

Preferred defeat language: squash, bounce, stars, puff, retreat, dissolve. The
reaction is comic, never graphic. No gore.

---

## 7. Torch

- frame size: **16×16**
- frames: 4
- sheet grid: 4 × 1
- sheet size: **64×16 px**
- loop: yes
- recommended playback: 6–8 fps

The flame stays small and readable, without large transparent glow textures.
Any halo is produced in code.

---

## 8. Doors

A doorway is a gap in a wall, and the four walls are drawn four different ways,
so a door needs four frames — one per wall. All four are **16×16, exactly one
cell**, and all four are `closed` art: the game hides the sprite when the door
opens and lets the child see the gap.

| ID | Wall | What it is |
|---|---|---|
| `door_top` | far wall | a cell of brick face with planks set into it |
| `door_bottom` | near wall | planks standing behind the wall's own lip |
| `door_left` | left wall | the wall's five-pixel strip, in wood |
| `door_right` | right wall | the same, mirrored |

A door is never wider than its doorway. An earlier version used the pack's
two-cell arch for the top and bottom walls: it overhung the wall on both sides
and read as decoration rather than as something in the way.

`door_top` comes from the packed set. The other three are the only artwork in
this project we drew ourselves — `tools/make-door-tiles.mjs` composes them from
the pack's own wall and door pixels, so they cannot drift from the set. See
`ASSET_MANIFEST.md`.

### The doorway itself

A gap needs a jamb or it reads as a missing tile rather than a way out. The top
wall gets this for free — the brick face simply stops — but the bottom of a
room is a thin lip, so the wall set's bottom corner pieces are drawn over the
lip on each side of the gap, jamb facing inward. That is a wall-set requirement,
not a door one: see § 10.

### Challenge available, and unlocking

Both are code-driven states over the closed art — a gold pulse and a lock
highlight for the first, a flash, a short shake and a switch to open for the
second. No extra production PNGs are required.

---

## 9. Chest, key and props

All are **16×16 px exact**, one frame, anchor bottom-center.

| ID | States |
|---|---|
| `chest` | closed, open |
| `chest_goal` | closed, open — the run's final chest, visibly richer |
| `key_gold` | one frame; the bob is produced in code |
| `lever` / `pedestal_rune` | off, on |
| `trapdoor` | shut, open — the way down to the next floor |

A prop's two states must differ at a glance from across the room: a child
decides what to walk towards from the silhouette and the colour, not from
detail. The trapdoor is the sharpest case — it is the way out of the floor, and
its two states are the difference between "not yet" and "go".

Any sparkle or reward burst is rendered separately or produced in code.

---

## 10. Dungeon tiles

All base dungeon tiles are:

**16×16 px exact**

Including floors, floor variants, wall faces, wall corners, wall edges, the
bottom lip, arches and stairs.

Tiles must align perfectly to the logical grid. Avoid anti-aliased edges and
fractional-pixel borders.

A wall cell is not one drawing: the brick face, the two side edges, the bottom
lip and the four corners are separate frames, and `wallArt` in
`src/game/world/room.ts` chooses between them from where the floor is. A
replacement wall set must supply all nine.

Each corner's jamb faces *into* the room, which is what lets the two bottom
corners double as the ends of the lip either side of a doorway. A wall set whose
corners face outward would leave every bottom doorway unframed.

Only the bottom lip is drawn over the floor. The side edges and the corners are
strips at the *inner* edge of their cell, so ground behind them would be paving
outside the room.

---

## 11. UI icons

UI icon production canvas:

**16×16 px**

Initial icons:

- `ui_heart`
- `ui_coin`
- `ui_key`
- `ui_star`
- `ui_math`
- `ui_language`

The HUD cuts `ui_coin` and `ui_key` straight out of the packed tileset, and
stands the pack's red potion in for `ui_heart`. Nothing in the pack is
star-shaped, so `ui_star` is the one counter still drawn as a lettered box.
Both are listed as outstanding art in `ASSET_MANIFEST.md`.

Icons are drawn at integer multiples of 16 and are exempt from the world anchor
convention in § 2.

The educational challenge panel itself is code/DOM-driven for readability,
never a fixed image.

---

## 12. Production asset rule

AI-generated concept art is not automatically production-ready.

For every final asset verify:

1. exact canvas dimensions
2. exact frame dimensions
3. correct frame count
4. correct row/column order
5. transparent background
6. no unintended anti-aliasing
7. consistent palette
8. consistent sprite scale
9. no clipped pixels
10. correct bottom-center alignment where applicable

---

## 13. Implementation rule

If production art is not yet available:

- use an obvious placeholder
- keep the expected frame metadata defined
- do not invent a replacement art style
- do not change these dimensions solely to fit a placeholder

The production assets will be generated externally by ChatGPT and uploaded by the user.
