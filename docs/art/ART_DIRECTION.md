# Dungeonauts — Art Direction v1

## Direction name
**Friendly Retro Pixel Dungeon**

A modern child-friendly pixel-art look inspired by classic 8-bit and 16-bit dungeon games without old hardware restrictions.

## Visual goal
Combine:
- retro pixel-art language
- simple cartoon characters
- limited colors
- clean silhouettes
- top-down dungeon rooms
- minimal visual noise
- warm interactive highlights
- modern readability

Target balance:
**~70% classic pixel-art feeling + ~30% modern readability/UI clarity**

## Emotional tone
Should feel:
- adventurous
- playful
- charming
- mysterious
- warm
- safe

Avoid:
- horror
- realistic darkness
- gore
- realistic weapons
- oppressive environments
- overly detailed fantasy illustration

## Core palette

| Name | Hex | Use |
|---|---|---|
| Dungeon Navy | `#071A2B` | deepest backgrounds, outlines, shadows |
| Deep Teal | `#163A46` | walls, stone structures |
| Stone Mint | `#78A99A` | stone highlights, math/UI accents |
| Dungeon Purple | `#514B69` | floors, secondary shadows |
| Adventure Gold | `#F1B83B` | keys, coins, rewards, interactables |
| Hero Green | `#83B74E` | initial hero, positive states |
| Friendly Coral | `#ED665A` | hearts, damage/warnings |
| Warm Cream | `#F4E1B9` | educational panels, readable text areas |
| Arcane Violet | `#8C62AE` | language, magic, runes |

Do not add saturated colors casually.

## Pixel-art technical standard
- logical tile: **16×16 px**

  Es la medida del tileset de mazmorra (`docs/art/TILESET_CATALOGUE.md`), y por
  eso es la del juego: doblar el arte a 32 habría dejado la mazmorra el doble de
  tosca que su héroe. Un sprite puede ser más grande que su casilla — el
  caballero es de 32×32, dos casillas — porque la rejilla mide un paso, no un
  dibujo.

- nearest-neighbor
- no image smoothing
- no anti-aliasing on pixel assets
- integer scaling — counted in **device** pixels, not CSS ones

  Un texel nunca puede quedar a caballo de un píxel de pantalla, que es lo que
  esta regla protege. Pero eso se mide en los píxeles que la pantalla tiene de
  verdad: en un móvil que declara tres píxeles de dispositivo por cada píxel
  CSS, una escala CSS de 1,667 son exactamente cinco píxeles por texel. Exigir
  números enteros de píxel CSS ahí tiraría un tercio de la pantalla a la basura.
  Donde la proporción es 1, como en casi todos los escritorios, esto es
  literalmente el escalado entero de siempre.
- max recommended 2–3 tones per material
- no photographic gradients

## Camera
Top-down / slightly front-facing retro RPG view.
Gameplay readability is more important than realistic perspective.

## Initial environment
### Stone Dungeon
Core elements:
- stone floor
- walls
- corners
- arches
- wooden doors
- stairs
- columns
- torches
- cracks
- moss
- small stones
- runes
- pedestals

Keep decoration modest, roughly 10–15% visual density.

## Hero
Initial direction: **small green adventurer**
- around 32×32 logical px, es decir dos casillas de alto y dos de ancho
- large head
- short limbs
- strong silhouette
- dark navy outline
- green cap/hood and tunic
- belt
- dark trousers
- brown boots
- optional backpack

Do not imitate an existing copyrighted character.

## Enemy
Initial enemy: **Green Slime**
- rounded blob
- lime/green body
- two simple eyes
- expressive face
- elastic motion
- dark outline

Possible reactions:
- happy
- surprised
- dizzy
- mildly angry
- sleeping

Defeat:
- bounce
- stars
- puff
- retreat
- dissolve

No gore.

## Doors
Central symbol:
- stone arch
- wooden door
- oversized gold lock

States:
- closed
- challenge available
- unlocking
- open

## Keys
Use `Adventure Gold #F1B83B`.
Oversize slightly for readability.

## Chests
Classic silhouette:
- reddish warm wood
- gold trim
- gold/yellow lock

## Educational panel
- Warm Cream body
- Dungeon Navy border
- Stone Mint math header/accent
- Arcane Violet language header/accent
- large question text
- large answer buttons
- minimal decoration

Do not make it look like a web form.
Readability beats retro purity.

## HUD
Keep minimal:
- hearts
- coins
- keys
- optional level/progress

Use production icons, not emoji.

## Visual hierarchy
1. hero
2. objective/route
3. enemy/interactable
4. educational challenge
5. decoration

## Asset formats
- PNG for sprites and tiles
- transparent PNG for isolated sprites
- JSON/data for sprite metadata if needed
- SVG only for non-pixel branding/marketing when useful

Reference images are not automatically production assets.

## AI production rule
Before using generated art as production art, verify:
- exact dimensions
- transparency
- pixel consistency
- palette
- tileability where required
- silhouette
- animation frame alignment

Do not cut arbitrary sprites from concept screenshots and assume production readiness.

## Master visual prompt
> Children's educational dungeon crawler videogame, friendly modern retro pixel art, clean 16-bit-inspired visual language with subtle 8-bit influence, top-down dungeon room, limited color palette, dark navy and teal stone environment, muted purple floor, warm gold interactive objects, cute small adventurer, friendly cartoon monsters, crisp pixel shapes, very limited shading, simple readable silhouettes, uncluttered environment, playful educational fantasy atmosphere, clear game UI, large accessible educational challenge panel, polished indie game screenshot, consistent pixel scale, no realism, no complex textures, no horror.

## Non-negotiables
- limited palette
- clean pixel scale
- child-friendly silhouettes
- simple rooms
- clear interactables
- friendly monsters
- dark cool environment + warm rewards
- highly readable educational UI
- no horror
- no visual clutter
- adventure first, educational software second
