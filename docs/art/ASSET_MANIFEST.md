# Dungeonauts — Asset Manifest

## Status values
- `missing`
- `concept`
- `approved`
- `integrated`
- `replace`

Reference/mockup images are not automatically approved production assets.

## Global rules
- Dungeon tile: 32×32 logical px
- Rendering: nearest-neighbor
- Smoothing: off
- Pixel-art anti-aliasing: off
- Transparent PNG for isolated sprites where appropriate
- Preserve consistent pixel scale

## Vertical Slice — Character

| ID | File target | Logical size | Status |
|---|---|---:|---|
| `hero_adventurer_idle` | `assets/characters/hero/hero_adventurer_idle.png` | ~32×40/frame | missing |
| `hero_adventurer_walk` | `assets/characters/hero/hero_adventurer_walk.png` | ~32×40/frame | missing |
| `hero_adventurer_attack` | `assets/characters/hero/hero_adventurer_attack.png` | ~32×40/frame | missing |
| `hero_adventurer_think` | `assets/characters/hero/hero_adventurer_think.png` | ~32×40/frame | missing |
| `hero_adventurer_victory` | `assets/characters/hero/hero_adventurer_victory.png` | ~32×40/frame | missing |

## Vertical Slice — Enemy

| ID | File target | Logical size | Status |
|---|---|---:|---|
| `slime_green_idle` | `assets/enemies/slime/slime_green_idle.png` | 32×32/frame | missing |
| `slime_green_hit` | `assets/enemies/slime/slime_green_hit.png` | 32×32/frame | missing |
| `slime_green_defeat` | `assets/enemies/slime/slime_green_defeat.png` | 32×32/frame | missing |

## Vertical Slice — Dungeon Tiles

| ID | File target | Logical size | Status |
|---|---|---:|---|
| `tile_floor_stone_01` | `assets/dungeon/tiles/tile_floor_stone_01.png` | 32×32 | missing |
| `tile_floor_stone_02` | `assets/dungeon/tiles/tile_floor_stone_02.png` | 32×32 | missing |
| `tile_wall_stone` | `assets/dungeon/tiles/tile_wall_stone.png` | 32×32 | missing |
| `tile_wall_corner` | `assets/dungeon/tiles/tile_wall_corner.png` | 32×32 | missing |
| `tile_arch` | `assets/dungeon/tiles/tile_arch.png` | 32×32 | missing |
| `tile_stairs` | `assets/dungeon/tiles/tile_stairs.png` | 32×32 | missing |

## Vertical Slice — Props

| ID | File target | Logical size | Status |
|---|---|---:|---|
| `door_wood_closed` | `assets/dungeon/doors/door_wood_closed.png` | ~32×48 | missing |
| `door_wood_open` | `assets/dungeon/doors/door_wood_open.png` | ~32×48 | missing |
| `key_gold` | `assets/dungeon/props/key_gold.png` | 32×32 canvas | missing |
| `chest_closed` | `assets/dungeon/props/chest_closed.png` | 32×32 or 32×40 | missing |
| `chest_open` | `assets/dungeon/props/chest_open.png` | 32×32 or 32×40 | missing |
| `torch_wall` | `assets/dungeon/props/torch_wall.png` | 32×32/frame | missing |
| `pedestal_rune` | `assets/dungeon/props/pedestal_rune.png` | 32×32 | missing |

## Vertical Slice — UI

| ID | File target | Status |
|---|---|---|
| `ui_heart` | `assets/ui/icons/heart.png` | missing |
| `ui_coin` | `assets/ui/icons/coin.png` | missing |
| `ui_key` | `assets/ui/icons/key.png` | missing |
| `ui_star` | `assets/ui/icons/star.png` | missing |
| `ui_math` | `assets/ui/icons/math.png` | missing |
| `ui_language` | `assets/ui/icons/language.png` | missing |
| `ui_challenge_panel` | `assets/ui/challenges/challenge_panel.png` or code-drawn | missing |

## Reference material
Suggested directory:

```text
docs/art/references/
```

Suggested names:
- `style_reference_01.png`
- `gameplay_reference_01.png`
- `combat_reference_01.png`
- `worldmap_reference_01.png`

## Integration policy
Claude Code should not create final production art.

When an asset is missing:
1. use a temporary placeholder;
2. keep code swappable;
3. leave status as `missing` or `replace`;
4. do not create a competing visual style.

When an approved asset is uploaded:
1. verify path;
2. verify rendering settings;
3. integrate it;
4. optionally mark `integrated`.
