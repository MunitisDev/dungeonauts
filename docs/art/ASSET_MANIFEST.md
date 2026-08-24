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

- world tile: 16×16 px
- nearest-neighbor rendering
- smoothing off
- no anti-aliasing on pixel art
- transparent PNG for isolated sprites
- world entities use bottom-center anchoring unless specified otherwise

---

## Superseded — pre-tileset hero commission

These five sheets were specified when the world tile was 32×32. The world is
16×16 now and the playable character comes from the packed tileset, so nothing
here is loaded at boot. The rows stay at their original dimensions because they
are what the committed files are checked against; a fresh character commission
follows `SPRITE_SPEC.md` § 5 instead, at 32×32 frames.

| ID | Target | Frame | Layout | Sheet | Status |
|---|---|---:|---|---:|---|
| `hero_adventurer_idle` | `assets/characters/hero/hero_adventurer_idle.png` | 32×40 | 2 frames × 4 dirs | 64×160 | missing |
| `hero_adventurer_walk` | `assets/characters/hero/hero_adventurer_walk.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |
| `hero_adventurer_attack` | `assets/characters/hero/hero_adventurer_attack.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |
| `hero_adventurer_think` | `assets/characters/hero/hero_adventurer_think.png` | 32×40 | 2 frames × 4 dirs | 64×160 | missing |
| `hero_adventurer_victory` | `assets/characters/hero/hero_adventurer_victory.png` | 32×40 | 4 frames × 4 dirs | 128×160 | missing |

Direction rows: down, left, right, up.

---

## Superseded — uploaded playable character

The protagonist until the packed tileset arrived; the knight from the pack has
the role now. Same 32×40 frame and row order as the hero sheets above, in its
own directory because it is a different character rather than another animation
of the same one. Still `replace` rather than `retired`: if this character is
brought back, the defects below are what has to be fixed first.

| ID | Target | Frame | Layout | Sheet | Status |
|---|---|---:|---|---:|---|
| `hero_warrior_boy_idle` | `assets/characters/warrior_boy/hero_warrior_boy_idle.png` | 32×40 | 2 frames × 4 dirs | 64×160 | approved |
| `hero_warrior_boy_walk` | `assets/characters/warrior_boy/hero_warrior_boy_walk.png` | 32×40 | 4 frames × 4 dirs | 128×160 | replace |

Direction rows: down, left, right, up.

Verified on integration of the idle sheet: 64×160 exact, zero semi-transparent
pixels, and every one of the eight frames has its lowest opaque pixel on the
frame's bottom edge, which is what bottom-center anchoring needs.

### Known defects in `hero_warrior_boy_idle`

Detached blobs of near-black pixels, disconnected from the character and
floating above its head. Frame coordinates, origin at each frame's top-left:

| Frame | Direction | Detached pixels |
|---|---|---|
| 2 | left (col 0) | 11 px at x 9–14, y 1–2 · 10 px at x 18–23, y 1–2 |
| 3 | left (col 1) | 11 px at x 9–14, y 1–2 · 11 px at x 18–23, y 1–2 |
| 4 | right (col 0) | 1 px at x 17, y 39 |

In whole-sheet coordinates that is y 41–42 for the left pair, and (17, 119) for
the single right-hand pixel. Frames 0, 1, 5, 6 and 7 are clean.

### Known defects in `hero_warrior_boy_walk`

The corrected 128×160 sheet is structurally sound: exact size, zero
semi-transparent pixels, no frame touching a side or top edge, and the hair
clipping in the side frames is fixed. The `left` row is now completely clean —
the detached blobs reported earlier are gone.

Two defects remain, both confined to the **`right` row (frames 8–11)**.

**1. The character floats.** Its lowest connected pixel is at y 32–33, leaving a
6–7 px gap to the frame's bottom edge. Since the world anchors sprites
bottom-center, a hero walking right hovers roughly a fifth of a tile above the
floor while every other direction stands on it.

| Frame | Body ends at y | Gap to floor |
|---|---:|---:|
| 8 | 32 | 7 px |
| 9 | 33 | 6 px |
| 10 | 33 | 6 px |
| 11 | 32 | 7 px |

`down`, `left` and `up` all end at y 39, flush with the floor line.

**2. Detached fragments sit where the feet should be.** Small dark-red clusters,
disconnected from the body, at the bottom of each right frame. They are the only
thing reaching y 39, which is why a naive bounding-box check reports the frames
as correctly aligned.

| Frame | Detached pixels |
|---|---|
| 8 | 4 px at x 17–18, y 38–39 · 3 px at x 13–14, y 38–39 |
| 9 | 3 px at x 13–14, y 38–39 · 2 px at x 17, y 38–39 |
| 10 | 5 px at x 14–16, y 38–39 · 1 px at x 18, y 39 |
| 11 | 4 px at x 14–16, y 38–39 · 1 px at x 19, y 39 |

**3. The right-facing character is smaller.** Body width 23–25 px against 27–30
for `left`, and 367–390 opaque pixels against 527–562. Turning from left to
right visibly shrinks the hero.

Status stays `replace` until the right row is redrawn: feet on y 39, no detached
fragments, and the same body size as the other directions.

Still missing for this character: `attack`, `think`, `victory`.

---

## Vertical Slice — Enemy

| ID | Target | Frame | Layout | Sheet | Status |
|---|---|---:|---|---:|---|
| `slime_green_idle` | `assets/enemies/slime/slime_green_idle.png` | 16×16 | 4×1 | 64×16 | missing |
| `slime_green_hit` | `assets/enemies/slime/slime_green_hit.png` | 16×16 | 2×1 | 32×16 | missing |
| `slime_green_defeat` | `assets/enemies/slime/slime_green_defeat.png` | 16×16 | 4×1 | 64×16 | missing |

---

## Vertical Slice — Dungeon Tiles

| ID | Target | Size | Status |
|---|---|---:|---|
| `tile_floor_stone_01` | `assets/dungeon/tiles/tile_floor_stone_01.png` | 16×16 | missing |
| `tile_floor_stone_02` | `assets/dungeon/tiles/tile_floor_stone_02.png` | 16×16 | missing |
| `tile_wall_stone` | `assets/dungeon/tiles/tile_wall_stone.png` | 16×16 | missing |
| `tile_wall_corner` | `assets/dungeon/tiles/tile_wall_corner.png` | 16×16 | missing |
| `tile_arch` | `assets/dungeon/tiles/tile_arch.png` | 16×16 | missing |
| `tile_stairs` | `assets/dungeon/tiles/tile_stairs.png` | 16×16 | missing |

---

## Tileset empaquetado (16×16)

Un pack de mazmorra de 16×16 con muros, suelos, puertas, cofres, pociones, monedas,
antorchas, trampas, tres enemigos y un caballero animado. **No aparece en las tablas
de esta página**: sus PNG no están en el repositorio, viven cifrados en
`assets/packs/dungeon-tiles.dpk`.

- Inventario completo: `docs/art/TILESET_CATALOGUE.md`
- Datos legibles por máquina: `docs/art/tileset-catalogue.json`
- Reempaquetar: `node tools/pack-tiles.mjs <carpeta-origen>`

Es de 16×16, y desde `d5c45d1` el juego entero trabaja a 16×16 sobre él: muros,
suelos, puertas, cofres, palancas, antorchas, monedas, los tres enemigos y el
caballero que hace de protagonista. El mapeo de cada pieza a su celda está en
`src/engine/assets/tileset.ts`.

Lo que no cubre: la estrella del HUD; el corazón sólo por sustitución (un frasco
rojo); y tres de las cuatro puertas, que son nuestras — ver abajo.

---

## Arte propio — `Dungeonauts-doors.png`

Las **únicas** ilustraciones de este proyecto que no son del artista. Tres
celdas de 16×16 dentro del mismo `.dpk`, en un fichero aparte para que nadie las
confunda con las suyas:

| Celda | Uso |
|---:|---|
| 0 | puerta en el muro izquierdo |
| 1 | puerta en el muro derecho |
| 2 | puerta en el muro inferior |

El pack sólo trae una puerta que encaje en un muro: la celda de ladrillo con
tablones, que sirve para el muro del fondo. Los otros tres muros son tiras —
cinco píxeles de canto a los lados, cuatro de cornisa abajo — y ni el arco ni la
puerta de ladrillo se apoyan en ellas sin quedarse flotando.

Se generan, no se dibujan a mano en un editor:

```
node tools/make-door-tiles.mjs <carpeta-origen>
node tools/pack-tiles.mjs <carpeta-origen>
```

Cada color sale de las celdas contra las que se van a ver, y el ritmo de los
tablones copia el de la puerta del pack, de modo que no pueden separarse del
estilo del conjunto. Si algún día llega una puerta lateral y otra inferior
dibujadas de verdad, sustituyen a estas y el script se borra.

---

## Vertical Slice — Props

| ID | Target | Size / layout | Status |
|---|---|---|---|
| `door_wood_closed` | `assets/dungeon/doors/door_wood_closed.png` | 16×16 static | missing |
| `door_wood_open` | `assets/dungeon/doors/door_wood_open.png` | 16×16 static | missing |
| `key_gold` | `assets/dungeon/props/key_gold.png` | 16×16 static | missing |
| `chest_closed` | `assets/dungeon/props/chest_closed.png` | 16×16 static | missing |
| `chest_open` | `assets/dungeon/props/chest_open.png` | 16×16 static | missing |
| `torch_wall` | `assets/dungeon/props/torch_wall.png` | 4× 16×16 → 64×16 | missing |
| `pedestal_rune` | `assets/dungeon/props/pedestal_rune.png` | 16×16 static | missing |
| `pedestal_rune_lit` | `assets/dungeon/props/pedestal_rune_lit.png` | 16×16 static | missing |
| `trapdoor_shut` | `assets/dungeon/props/trapdoor_shut.png` | 16×16 static | missing |
| `trapdoor_open` | `assets/dungeon/props/trapdoor_open.png` | 16×16 static | missing |

Door `challenge available` and `unlocking` are code-driven states; no extra PNGs required for MVP.

`trapdoor_shut` / `trapdoor_open` are the way down to the next floor: a hole in the
floor with a ladder, in shadow when shut and lit when open. The packed tileset
already draws both (`Floor-export.png`, row 3), so these rows are only what a
bespoke set would have to supply.

`pedestal_rune` / `pedestal_rune_lit` are the two states of a room **mechanism**: the
puzzle alternative to a fight. Every generated room asks the child for one of three
things — see off one or two creatures, open a chest, or light a pedestal — so the pair
needs the same unmistakable off/on difference that `chest_closed` / `chest_open` has.
Dark rune on cold stone when off; warm gold rune with a soft glow when lit.

---

## Vertical Slice — UI

| ID | Target | Size | Status |
|---|---|---:|---|
| `ui_heart` | `assets/ui/icons/heart.png` | 16×16 | missing |
| `ui_coin` | `assets/ui/icons/coin.png` | 16×16 | missing |
| `ui_key` | `assets/ui/icons/key.png` | 16×16 | missing |
| `ui_star` | `assets/ui/icons/star.png` | 16×16 | missing |
| `ui_math` | `assets/ui/icons/math.png` | 16×16 | missing |
| `ui_language` | `assets/ui/icons/language.png` | 16×16 | missing |

The HUD cuts what it can straight out of the packed tileset at 16×16
(`src/ui/icons.ts`): the gold coin for `coins`, the gold key for `keys`, and the
red potion in place of a heart for `hearts` — the pack has no heart, and a
potion is the artist's own drawing rather than an invented one.

**`ui_star` is the one icon the HUD needs and cannot get anywhere: nothing in
the pack is star-shaped**, so that counter still falls back to a lettered box.
`ui_heart` is the next one worth commissioning, to replace the stand-in.

The challenge panel is **DOM/code-driven**, not a fixed production PNG for MVP.

---

## Post-slice — Character portraits

UI art for character selection. **Not gameplay sprites**: never use these for
movement, idle or combat. The gameplay sheets are separate assets.

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
character. When a character is promoted to production, its animation
sheets get their own rows here, following `SPRITE_SPEC.md` § 5
(32×32 frames — two cells by two — and the row order `down, left, right, up`).

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
