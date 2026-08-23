# Visual references

Direction-setting images only.

These are **not** production assets. Do not crop, scale, or extract sprites from
them, do not load them from Phaser, and do not treat any detail in them as a
specification — `SPRITE_SPEC.md` and `ASSET_MANIFEST.md` are the technical
source of truth. Production PNGs arrive separately, with transparency and exact
dimensions.

## Current references

| File | What it fixes |
|---|---|
| `character_roster_reference_01.png` | Identity of the six playable characters: `archer_boy`, `warrior_boy`, `mage_boy`, `archer_girl`, `warrior_girl`, `mage_girl` |
| `class_select_reference_01.png` | Mock of a class-selection screen ("Elige tu Dungeonaut") |

### Reading these two

Both are drawn at portrait scale, far above the 32×40 hero frame the game
actually renders. A production sprite keeps the **silhouette, palette and
personality** of the reference and drops nearly all of its detail: at 32×40,
with 2–3 tones per material, there is no room for embroidery, individual
arrow fletchings or facial shading. Treat the references as "who this character
is", not "how many pixels they get".

The class-selection screen is a mock of a **post-slice** feature. Character
classes are explicitly deferred in `CLAUDE.md` until the vertical slice works.
