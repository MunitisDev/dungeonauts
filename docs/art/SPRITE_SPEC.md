# Dungeonauts — Sprite Specification v1

This document is the technical source of truth for production pixel-art slicing, dimensions, anchors, and animation layout.

It complements `ART_DIRECTION.md` and `ASSET_MANIFEST.md`.

---

## 1. World grid

- Logical world tile: **32×32 px**

> **Prueba en curso — la casilla lógica está en 16×16.**
> El tileset de mazmorra que ha llegado (`docs/art/TILESET_CATALOGUE.md`) es de
> 16×16, y la build actual corre a 16 para usarlo tal cual, sin escalarlo. Lo que
> sigue en esta página describe la especificación de 32×32 y no se ha reescrito:
> si la prueba se queda, hay que rehacerla; si se revierte, esta nota se borra.
> El caballero del pack es de 32×32, es decir dos casillas.

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

This allows a 32×40 hero or 32×48 door to extend upward beyond a 32×32 logical tile without breaking alignment.

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

### Direction row order

For directional hero sheets:

```text
row 0 = down
row 1 = left
row 2 = right
row 3 = up
```

Do **not** horizontally flip one direction to synthesize another in the final production hero.

---

## 4. Hero

### Frame size

**32×40 px exact**

World anchor:

**bottom-center**

Recommended collision footprint is smaller than the visible sprite and should be handled in code.

### `hero_adventurer_idle`

- frame size: 32×40
- directions: 4
- frames per direction: 2
- sheet grid: 2 columns × 4 rows
- sheet size: **64×160 px**
- loop: yes
- recommended playback: 2–3 fps

### `hero_adventurer_walk`

- frame size: 32×40
- directions: 4
- frames per direction: 4
- sheet grid: 4 columns × 4 rows
- sheet size: **128×160 px**
- loop: yes
- recommended playback: 7–9 fps

### `hero_adventurer_attack`

- frame size: 32×40
- directions: 4
- frames per direction: 4
- sheet grid: 4 columns × 4 rows
- sheet size: **128×160 px**
- loop: no
- recommended playback: 8–10 fps

The action must remain playful and non-violent.

### `hero_adventurer_think`

- frame size: 32×40
- directions: 4
- frames per direction: 2
- sheet grid: 2 columns × 4 rows
- sheet size: **64×160 px**
- loop: short loop or hold
- recommended playback: 2–3 fps

### `hero_adventurer_victory`

- frame size: 32×40
- directions: 4
- frames per direction: 4
- sheet grid: 4 columns × 4 rows
- sheet size: **128×160 px**
- loop: no
- recommended playback: 6–8 fps

---

## 5. Green slime

### Frame size

**32×32 px exact**

World anchor:

**bottom-center**

The slime does not require directional rows.

### `slime_green_idle`

- frame size: 32×32
- frames: 4
- sheet grid: 4 × 1
- sheet size: **128×32 px**
- loop: yes
- recommended playback: 4–6 fps

### `slime_green_hit`

- frame size: 32×32
- frames: 2
- sheet grid: 2 × 1
- sheet size: **64×32 px**
- loop: no
- recommended playback: 8–10 fps

Reaction should be bounce/dizzy/comic, never graphic.

### `slime_green_defeat`

- frame size: 32×32
- frames: 4
- sheet grid: 4 × 1
- sheet size: **128×32 px**
- loop: no
- recommended playback: 7–9 fps

Preferred defeat language:

- squash
- bounce
- stars
- puff
- retreat/dissolve

No gore.

---

## 6. Torch

### `torch_wall`

- frame size: 32×32
- frames: 4
- sheet grid: 4 × 1
- sheet size: **128×32 px**
- loop: yes
- recommended playback: 6–8 fps

The flame should remain small and readable, without large transparent glow textures.

Any subtle light halo should preferably be produced in code.

---

## 7. Doors

### `door_wood_closed`

- exact canvas/frame size: **32×48 px**
- frames: 1
- world anchor: bottom-center

### `door_wood_open`

- exact canvas/frame size: **32×48 px**
- frames: 1
- world anchor: bottom-center

The two additional art-direction states are implemented in code:

### Challenge available

Use the closed sprite plus a subtle code-driven visual cue:

- small gold pulse
- lock highlight
- optional tiny bob/glow

### Unlocking

Use the closed sprite plus a short code-driven transition:

- gold flash
- lock pulse
- short shake
- then switch to open sprite

No additional production PNGs are required for these two states in the vertical slice.

---

## 8. Chest

Chest dimensions are now fixed.

### `chest_closed`

- exact size: **32×32 px**
- frames: 1
- anchor: bottom-center

### `chest_open`

- exact size: **32×32 px**
- frames: 1
- anchor: bottom-center

Any sparkle/reward burst should be rendered separately or produced in code.

---

## 9. Key

### `key_gold`

- exact canvas: **32×32 px**
- frames: 1
- recommended visible art footprint: roughly 18–24 px inside the canvas
- anchor: center for pickup rendering, or bottom-center if the engine standardizes all world props

Idle floating/bobbing should be produced in code rather than baked into an animation sheet.

---

## 10. Dungeon tiles

All base dungeon tiles are:

**32×32 px exact**

Including:

- `tile_floor_stone_01`
- `tile_floor_stone_02`
- `tile_wall_stone`
- `tile_wall_corner`
- `tile_arch`
- `tile_stairs`

Tiles must align perfectly to the logical grid.

Avoid anti-aliased edges and fractional-pixel borders.

---

## 11. UI icons

UI icon production canvas:

**32×32 px**

Initial icons:

- `ui_heart`
- `ui_coin`
- `ui_key`
- `ui_star`
- `ui_math`
- `ui_language`

They may be rendered at integer multiples of the source size.

The educational challenge panel itself should be code/DOM-driven for readability rather than a fixed image.

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
