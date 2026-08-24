# Dungeonauts — Catálogo del tileset

Inventario del pack de mazmorra de 16×16. **Este documento no contiene arte**: sólo
coordenadas, medidas y nombres. Los PNG viven cifrados en `assets/packs/dungeon-tiles.dpk`.

- Celda nativa: **16×16 px**
- Hojas: **15**
- Celdas con dibujo: **749**
- Piezas únicas: **421** (el resto son repeticiones entre hojas)
- Pack: `assets/packs/dungeon-tiles.dpk`, sha256 `410a2a869b52d765…`

## Cómo nombrar una pieza

Dos formas, según lo que quieras decir:

1. **Por celda** — `PREFIJO-NNN`, p. ej. `TIL-042` o `ENE-021`. Numeración por hoja,
   de izquierda a derecha y de arriba abajo, saltando las celdas vacías. Es lo que
   aparece bajo cada casilla en `CATALOGO.png`.
2. **Por objeto** — `GRUPO.nombre`, p. ej. `CHR.walk_a` o `CHE.big`. Un objeto es un
   sprite completo con todos sus fotogramas, al tamaño real. Está en `OBJETOS.png`.

Las imágenes de guía **no están en el repositorio** — llevan el arte dentro. Se
generan con `tools/catalogue-guide.py` y `tools/catalogue-objects.py` a partir de la
carpeta de origen, que tampoco se sube.

## Hojas

| Prefijo | Fichero | Rejilla | Celdas con dibujo | Repetidas | Contenido |
|---|---|---|---:|---:|---|
| `TIL` | `Tileset.png` | 17×33 | 313 | 42 | Hoja maestra: contiene todo lo demás |
| `WAL` | `Walls-export.png` | 16×17 | 96 | 96 | Muros: dos juegos completos (violeta y azul) |
| `FLO` | `Floor-export.png` | 6×8 | 42 | 42 | Suelos: variantes, agujero y escaleras |
| `DOR` | `Doors.png` | 9×6 | 40 | 40 | Puertas de arco y postes con gema |
| `CHE` | `Chests.png` | 6×4 | 15 | 9 | Cofres grandes y pequeños |
| `FLA` | `Flasks.png` | 8×2 | 16 | 3 | Pociones |
| `ENE` | `Enemy.png` | 6×16 | 63 | 9 | Enemigos: murciélago, serpiente, fantasmas |
| `CHR` | `Animation Character.png` | 8×18 | 132 | 65 | Caballero: animaciones de 32×32 |
| `TOR` | `Torchlight.png` | 4×2 | 7 | 1 | Antorcha de pared animada |
| `SPK` | `Spike Trap.png` | 4×2 | 7 | 7 | Trampa de pinchos |
| `LEV` | `Lever.png` | 2×1 | 2 | 2 | Palanca |
| `BTN` | `PlatformButton.png` | 4×1 | 4 | 4 | Botón de suelo |
| `GLD` | `GoldCoin.png` | 1×4 | 4 | 4 | Moneda de oro |
| `SLV` | `SilverCoin.png` | 1×4 | 4 | 3 | Moneda de plata |
| `BRZ` | `BronzeCoin.png` | 1×4 | 4 | 1 | Moneda de bronce |

`Tileset.png` es la hoja maestra: contiene todo lo que hay en `Walls-export.png`,
`Floor-export.png` y `Doors.png`. Las hojas sueltas son recortes suyos, mejor
organizados. Para trabajar conviene usar las sueltas y dejar la maestra como respaldo.

## Objetos

| Id | Qué es | Hoja | Dónde | Fotograma | Fotogramas |
|---|---|---|---|---:|---:|
| `CHR.idle_a` | Caballero · reposo, frente | `Animation Character.png` | fila 0, col 0–3 | 32×32 | 4 |
| `CHR.idle_b` | Caballero · reposo, espalda | `Animation Character.png` | fila 1, col 0–3 | 32×32 | 4 |
| `CHR.guard_a` | Caballero · con escudo, frente | `Animation Character.png` | fila 2, col 0–3 | 32×32 | 4 |
| `CHR.guard_b` | Caballero · con escudo, espalda | `Animation Character.png` | fila 3, col 0–3 | 32×32 | 4 |
| `CHR.attack_a` | Caballero · ataque, frente | `Animation Character.png` | fila 4, col 0–3 | 32×32 | 4 |
| `CHR.attack_b` | Caballero · ataque, espalda | `Animation Character.png` | fila 5, col 0–3 | 32×32 | 4 |
| `CHR.walk_a` | Caballero · andar, frente | `Animation Character.png` | fila 6, col 0–3 | 32×32 | 4 |
| `CHR.walk_b` | Caballero · andar, espalda | `Animation Character.png` | fila 7, col 0–3 | 32×32 | 4 |
| `CHR.extra` | Caballero · fila extra | `Animation Character.png` | fila 8, col 0–1 | 32×32 | 2 |
| `ENE.bat_1` | Murciélago · aleteo A | `Enemy.png` | fila 0, col 0–3 | 16×16 | 4 |
| `ENE.bat_2` | Murciélago · aleteo B | `Enemy.png` | fila 1, col 0–3 | 16×16 | 4 |
| `ENE.bat_3` | Murciélago · aleteo C + desaparecer | `Enemy.png` | fila 2, col 0–5 | 16×16 | 6 |
| `ENE.bat_4` | Murciélago · aleteo D + desaparecer | `Enemy.png` | fila 3, col 0–5 | 16×16 | 5 |
| `ENE.snake_1` | Serpiente · erguida A | `Enemy.png` | fila 4, col 0–1 | 16×16 | 2 |
| `ENE.snake_2` | Serpiente · erguida B | `Enemy.png` | fila 5, col 0–1 | 16×16 | 2 |
| `ENE.snake_3` | Serpiente · reptar A | `Enemy.png` | fila 6, col 0–5 | 16×16 | 6 |
| `ENE.snake_4` | Serpiente · reptar B | `Enemy.png` | fila 7, col 0–5 | 16×16 | 6 |
| `ENE.snake_5` | Serpiente · agachada A | `Enemy.png` | fila 8, col 0–3 | 16×16 | 4 |
| `ENE.snake_6` | Serpiente · agachada B | `Enemy.png` | fila 9, col 0–3 | 16×16 | 4 |
| `ENE.ghost_w1` | Fantasma blanco · flotar A | `Enemy.png` | fila 10, col 0–3 | 16×16 | 4 |
| `ENE.ghost_w2` | Fantasma blanco · flotar B | `Enemy.png` | fila 11, col 0–3 | 16×16 | 4 |
| `ENE.ghost_w3` | Fantasma blanco · girar A | `Enemy.png` | fila 12, col 0–1 | 16×16 | 2 |
| `ENE.ghost_w4` | Fantasma blanco · girar B | `Enemy.png` | fila 13, col 0–1 | 16×16 | 2 |
| `ENE.ghost_d1` | Fantasma oscuro · A | `Enemy.png` | fila 14, col 0–3 | 16×16 | 4 |
| `ENE.ghost_d2` | Fantasma oscuro · B | `Enemy.png` | fila 15, col 0–3 | 16×16 | 4 |
| `TOR.wall` | Antorcha de pared (animada) | `Torchlight.png` | fila 0, col 0–3 | 16×16 | 4 |
| `TOR.stand` | Antorcha de pie (animada) | `Torchlight.png` | fila 1, col 0–2 | 16×16 | 3 |
| `SPK.clean` | Pinchos · limpios | `Spike Trap.png` | fila 0, col 0–3 | 16×16 | 4 |
| `SPK.blood` | Pinchos · con sangre | `Spike Trap.png` | fila 1, col 0–2 | 16×16 | 3 |
| `LEV.lever` | Palanca · apagada / encendida | `Lever.png` | fila 0, col 0–1 | 16×16 | 2 |
| `BTN.button` | Botón de suelo | `PlatformButton.png` | fila 0, col 0–3 | 16×16 | 4 |
| `FLA.row1` | Pociones · fila 1 | `Flasks.png` | fila 0, col 0–7 | 16×16 | 8 |
| `FLA.row2` | Pociones · fila 2 | `Flasks.png` | fila 1, col 0–7 | 16×16 | 8 |
| `CHE.big` | Cofre grande · cerrado / con oro / vacío | `Chests.png` | fila 0, col 0–2 | 32×16 | 3 |
| `CHE.small_1` | Cofre pequeño · madera clara | `Chests.png` | fila 1, col 0–2 | 16×16 | 3 |
| `CHE.small_2` | Cofre pequeño · madera oscura | `Chests.png` | fila 2, col 0–2 | 16×16 | 3 |
| `CHE.small_3` | Cofre pequeño · dorado | `Chests.png` | fila 3, col 0–2 | 16×16 | 3 |
| `FLO.slate_1` | Suelo pizarra · lisos | `Floor-export.png` | fila 0, col 0–5 | 16×16 | 6 |
| `FLO.slate_2` | Suelo pizarra · con grava | `Floor-export.png` | fila 1, col 0–5 | 16×16 | 6 |
| `FLO.slate_3` | Suelo pizarra · muy gastados | `Floor-export.png` | fila 2, col 0–5 | 16×16 | 6 |
| `FLO.slate_4` | Pizarra · agujero y escaleras | `Floor-export.png` | fila 3, col 0–2 | 16×16 | 3 |
| `FLO.wood_1` | Suelo madera · lisos | `Floor-export.png` | fila 4, col 0–5 | 16×16 | 6 |
| `FLO.wood_2` | Suelo madera · con grava | `Floor-export.png` | fila 5, col 0–5 | 16×16 | 6 |
| `FLO.wood_3` | Suelo madera · muy gastados | `Floor-export.png` | fila 6, col 0–5 | 16×16 | 6 |
| `FLO.wood_4` | Madera · agujero y escaleras | `Floor-export.png` | fila 7, col 0–2 | 16×16 | 3 |
| `DOR.door_blue` | Puerta de arco · gema azul | `Doors.png` | fila 0, col 7 | 32×16 | 1 |
| `DOR.door_ring` | Puerta de arco · aro | `Doors.png` | fila 1, col 5 | 32×16 | 1 |
| `DOR.door_green` | Puerta de arco · gema verde | `Doors.png` | fila 1, col 7 | 32×16 | 1 |
| `DOR.door_red` | Puerta de arco · gema roja | `Doors.png` | fila 2, col 5 | 32×16 | 1 |
| `DOR.door_gold` | Puerta de arco · gema dorada | `Doors.png` | fila 2, col 7 | 32×16 | 1 |
| `DOR.pillars` | Pilares de madera (16×64) | `Doors.png` | fila 0, col 0–3 | 16×64 | 4 |
| `DOR.posts` | Postes con gema (16×32) | `Doors.png` | fila 4, col 5–8 | 16×32 | 4 |
| `GLD.coin` | Moneda de oro · giro (en columna) | `GoldCoin.png` | fila 0, col 0–3 | 16×16 | 4 |
| `SLV.coin` | Moneda de plata · giro (en columna) | `SilverCoin.png` | fila 0, col 0–3 | 16×16 | 4 |
| `BRZ.coin` | Moneda de bronce · giro (en columna) | `BronzeCoin.png` | fila 0, col 0–3 | 16×16 | 4 |

## Notas de integración

**El pack es de 16×16 y el juego trabaja a 32×32.** `docs/art/ART_DIRECTION.md` fija
la casilla lógica en 32×32 y `SPRITE_SPEC.md` el héroe en 32×40. Hay dos salidas y
ninguna es gratis:

- **Escalar ×2 al integrar.** Escala entera, nearest-neighbour, sin pérdida. El arte
  se ve el doble de tosco que el héroe actual, que está dibujado con el detalle de
  32×40. Rompe la consistencia visual que pide `ART_DIRECTION.md`.
- **Bajar la casilla lógica a 16×16.** El tileset encaja tal cual y se ve como está
  pensado, pero hay que redibujar al héroe y revisar cámara, zoom y HUD.

El caballero de `Animation Character.png` es de 32×32 y no de 16×16 como el resto del
pack, así que en la segunda opción también quedaría al doble de escala que el suelo.

`100008.png` (4160×3840) venía en el RAR y **no está en el pack**: es una imagen de
muestra que enseña una mazmorra montada con estas piezas. Sirve de referencia de cómo
encajan; no es arte de producción y `CLAUDE.md` prohíbe recortar sprites de ella.

## Licencia

El RAR no traía fichero de licencia. Antes de publicar nada conviene confirmar qué
permite la del pack original: el repositorio es público y empaquetar el arte lo hace
menos evidente, no legal.
