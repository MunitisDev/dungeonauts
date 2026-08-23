# Dungeonauts — Asset Manifest v2

Technical slicing and animation layout are defined in:

`docs/art/SPRITE_SPEC.md`

Statuses:

- `missing`
- `concept`
- `approved`
- `integrated`
- `replace`

Reference images are not automatically production assets.

---

## Global rules

- world tile: 32×32 px
- nearest-neighbor rendering
- smoothing off
- no anti-aliasing on pixel art
- transparent PNG for isolated sprites
- world entities use bottom-center anchoring unless specified otherwise

---

## Vertical Slice — Hero

| ID | Target | Frame | Layout | Sheet | Status |
|---|---|---:|---|---:|---|
| `hero_adventurer_idle` | `assets/characters/hero/hero_adventurer_idle.png` | 32×40 | 2 frames × 4 dirs | 64×160 | missing |
| `hero_adventurer_walk` | `assets/characters/hero/hero_adventurer_walk.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |
| `hero_adventurer_attack` | `assets/characters/hero/hero_adventurer_attack.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |
| `hero_adventurer_think` | `assets/characters/hero/hero_adventurer_think.png` | 32×40 | 2 frames × 4 dirs | 64×160 | missing |
| `hero_adventurer_victory` | `assets/characters/hero/hero_adventurer_victory.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |

Direction rows: down, left, right, up.

---

## Vertical Slice — Enemy

| ID | Target | Frame | Layout | Sheet | Status |
|---|---|---:|---|---:|---|
| `slime_green_idle` | `assets/enemies/slime/slime_green_idle.png` | 32×32 | 4×1 | 128×32 | missing |
| `slime_green_hit` | `assets/enemies/slime/slime_green_hit.png` | 32×32 | 2×1 | 64×32 | missing |
| `slime_green_defeat` | `assets/enemies/slime/slime_green_defeat.png` | 32×32 | 4×1 | 128×32 | missing |

---

## Vertical Slice — Dungeon Tiles

| ID | Target | Size | Status |
|---|---|---:|---|
| `tile_floor_stone_01` | `assets/dungeon/tiles/tile_floor_stone_01.png` | 32×32 | missing |
| `tile_floor_stone_02` | `assets/dungeon/tiles/tile_floor_stone_02.png` | 32×32 | missing |
| `tile_wall_stone` | `assets/dungeon/tiles/tile_wall_stone.png` | 32×32 | missing |
| `tile_wall_corner` | `assets/dungeon/tiles/tile_wall_corner.png` | 32×32 | missing |
| `tile_arch` | `assets/dungeon/tiles/tile_arch.png` | 32×32 | missing |
| `tile_stairs` | `assets/dungeon/tiles/tile_stairs.png` | 32×32 | missing |

---

## Vertical Slice — Props

| ID | Target | Size / layout | Status |
|---|---|---|---|
| `door_wood_closed` | `assets/dungeon/doors/door_wood_closed.png` | 32×48 static | missing |
| `door_wood_open` | `assets/dungeon/doors/door_wood_open.png` | 32×48 static | missing |
| `key_gold` | `assets/dungeon/props/key_gold.png` | 32×32 static | missing |
| `chest_closed` | `assets/dungeon/props/chest_closed.png` | 32×32 static | missing |
| `chest_open` | `assets/dungeon/props/chest_open.png` | 32×32 static | missing |
| `torch_wall` | `assets/dungeon/props/torch_wall.png` | 4× 32×32 → 128×32 | missing |
| `pedestal_rune` | `assets/dungeon/props/pedestal_rune.png` | 32×32 static | missing |

Door `challenge available` and `unlocking` are code-driven states; no extra PNGs required for MVP.

---

## Vertical Slice — UI

| ID | Target | Size | Status |
|---|---|---:|---|
| `ui_heart` | `assets/ui/icons/heart.png` | 32×32 | missing |
| `ui_coin` | `assets/ui/icons/coin.png` | 32×32 | missing |
| `ui_key` | `assets/ui/icons/key.png` | 32×32 | missing |
| `ui_star` | `assets/ui/icons/star.png` | 32×32 | missing |
| `ui_math` | `assets/ui/icons/math.png` | 32×32 | missing |
| `ui_language` | `assets/ui/icons/language.png` | 32×32 | missing |

The challenge panel is **DOM/code-driven**, not a fixed production PNG for MVP.

---

## Post-slice — Character portraits

UI art for character selection. **Not gameplay sprites**: never use these for
movement, idle or combat. The 32×40 gameplay sheets are separate assets.

Anchor is `center`, not the world's bottom-center — these are UI, and
`SPRITE_SPEC.md` § 2 exempts UI from the world anchor convention.

Registered in code as `post-slice`, so they are tracked and dimension-checked
but never downloaded at boot. The character-select screen itself is deferred.

| ID | Target | Size | Status |
|---|---|---:|---|
| `portrait_archer_boy` | `assets/characters/portraits/portrait_archer_boy.png` | 128×128 | replace |
| `portrait_archer_girl` | `assets/characters/portraits/portrait_archer_girl.png` | 128×128 | replace |
| `portrait_warrior_boy` | `assets/characters/portraits/portrait_warrior_boy.png` | 128×128 | replace |
| `portrait_warrior_girl` | `assets/characters/portraits/portrait_warrior_girl.png` | 128×128 | replace |
| `portrait_mage_boy` | `assets/characters/portraits/portrait_mage_boy.png` | 128×128 | replace |
| `portrait_mage_girl` | `assets/characters/portraits/portrait_mage_girl.png` | 128×128 | replace |

### Why `replace` and not `approved`

The files currently committed reached the repository through a chat upload that
re-encoded them. Measured on the committed PNGs:

- only **1.3–1.6 %** of horizontally adjacent opaque pixels are exactly equal
  (clean pixel art is typically 70–90 %);
- **6,400–8,558 distinct colours** over ~9,000 opaque pixels, i.e. most pixels
  are unique;
- alpha is clean — 0 semi-transparent pixels — because it was cut separately.

That pattern is lossy compression applied over pixel art and re-saved as PNG.
Dimensions and transparency are correct and they are perfectly usable as
working art, but they breach `ART_DIRECTION.md` ("max 2–3 tones per material",
no photographic gradients). Replace with the originals, uploaded without
passing through an image-recompressing pipeline.

---

## Post-slice — Character roster

Identity fixed by `docs/art/references/character_roster_reference_01.png`.

These are `concept`, not production targets. `CLAUDE.md` defers character
classes until the vertical slice works, so the slice ships **one** playable
character. When a character is promoted to production, its five animation
sheets get their own rows here, following the hero layout above
(32×40 frames, 4 directional rows, `down, left, right, up`).

| ID | Status |
|---|---|
| `archer_boy` | concept |
| `warrior_boy` | concept |
| `mage_boy` | concept |
| `archer_girl` | concept |
| `warrior_girl` | concept |
| `mage_girl` | concept |

Rows with status `concept` are documentation only: the code is not expected to
know about them, and the manifest test does not require them to exist.

---

## Recommended production order

### Wave 1 — exploration

- `tile_floor_stone_01`
- `tile_wall_stone`
- `tile_wall_corner`
- `hero_adventurer_idle`
- `hero_adventurer_walk`

### Wave 2 — interaction

- `slime_green_idle`
- `slime_green_hit`
- `door_wood_closed`
- `door_wood_open`
- `key_gold`
- `chest_closed`
- `chest_open`

### Wave 3 — polish

- UI icons
- alternate floor
- arch
- stairs
- torch
- slime defeat
- hero think
- hero attack
- hero victory

---

## Integration policy

Claude Code should not create final production art.

If an asset is missing:

1. use a temporary placeholder;
2. keep implementation swappable;
3. do not alter the required production dimensions to fit the placeholder;
4. do not create a competing final visual style.

When approved art arrives:

1. verify the exact path;
2. verify the dimensions/layout against `SPRITE_SPEC.md`;
3. integrate with nearest-neighbor rendering;
4. preserve transparency;
5. mark as `integrated` if maintaining this manifest.
