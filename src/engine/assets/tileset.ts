import { fetchTilePack, sheetUrl, type TilePack } from './tilepack'

/**
 * The packed dungeon tileset, as the game refers to it.
 *
 * The pack ships one file per source sheet; this module gives each sheet a
 * short key and each piece of art a name, so nothing outside here has to know
 * that "the closed chest" means cell (0,1) of `Chests.png`.
 *
 * Everything is 16x16 except the knight, which is 32x32. That is the artwork's
 * own geometry and `docs/art/TILESET_CATALOGUE.md` records it; it is not a
 * decision this module gets to make.
 */

/** Where the pack lives, relative to the deployment root. */
export const TILE_PACK_PATH = 'assets/packs/dungeon-tiles.dpk'

export interface SheetSpec {
  /** Texture key inside Phaser. */
  readonly key: string
  /** File name inside the pack. */
  readonly file: string
  readonly frameWidth: number
  readonly frameHeight: number
}

export const SHEETS: readonly SheetSpec[] = [
  { key: 'sheet_tiles', file: 'Tileset.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_walls', file: 'Walls-export.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_floor', file: 'Floor-export.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_doors', file: 'Doors.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_chests', file: 'Chests.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_flasks', file: 'Flasks.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_enemies', file: 'Enemy.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_torch', file: 'Torchlight.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_lever', file: 'Lever.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_coin_gold', file: 'GoldCoin.png', frameWidth: 16, frameHeight: 16 },
  { key: 'sheet_knight', file: 'Animation Character.png', frameWidth: 32, frameHeight: 32 },
  // Ours, not the artist's: three doors the set does not draw. See
  // `tools/make-door-tiles.mjs`.
  { key: 'sheet_doors_ours', file: 'Dungeonauts-doors.png', frameWidth: 16, frameHeight: 16 },
]

/**
 * A drawable: a Phaser texture key plus the cell index inside it.
 *
 * Always a cell, never a hand-cut rectangle. There used to be a mechanism for
 * carving off-grid artwork out by name, for the arched door that is 32x16 and
 * starts halfway across a cell; every door is one cell now and the mechanism
 * went with them. If off-grid art ever comes back, bring it back knowingly.
 */
export interface Art {
  readonly key: string
  readonly frame: number
}

/** Cells per row, needed to turn (col,row) into a frame index. */
const COLUMNS: Readonly<Record<string, number>> = {
  sheet_tiles: 17,
  sheet_walls: 16,
  sheet_floor: 6,
  sheet_doors: 9,
  sheet_chests: 6,
  sheet_flasks: 8,
  sheet_enemies: 6,
  sheet_torch: 4,
  sheet_lever: 2,
  sheet_coin_gold: 1,
  sheet_knight: 4,
  sheet_doors_ours: 3,
}

export function at(key: string, col: number, row: number): Art {
  const columns = COLUMNS[key]
  if (columns === undefined) throw new Error(`Unknown sheet "${key}"`)
  return { key, frame: row * columns + col }
}

/** Consecutive frames along a row, for an animation. */
export function row(key: string, col: number, rowIndex: number, count: number): Art[] {
  return Array.from({ length: count }, (_, i) => at(key, col + i, rowIndex))
}

/**
 * The blue-stone wall set, taken from the tidy example room the artist shipped.
 *
 * A wall cell cannot be one texture: the brick face, the thin side edges and
 * the bottom lip are different drawings, and which one a cell needs depends on
 * where the floor is. `wallArt` in `game/world/room.ts` picks between them.
 */
export const WALLS = {
  topLeft: at('sheet_walls', 8, 9),
  top: at('sheet_walls', 10, 9),
  topRivet: at('sheet_walls', 13, 9),
  topRight: at('sheet_walls', 15, 9),
  left: at('sheet_walls', 8, 10),
  right: at('sheet_walls', 15, 10),
  bottomLeft: at('sheet_walls', 8, 11),
  bottom: at('sheet_walls', 10, 11),
  bottomRight: at('sheet_walls', 15, 11),
} as const

export const FLOORS = {
  plain: [at('sheet_floor', 0, 0), at('sheet_floor', 1, 0), at('sheet_floor', 2, 0)],
  worn: [at('sheet_floor', 0, 1), at('sheet_floor', 2, 1), at('sheet_floor', 4, 1)],
  hole: at('sheet_floor', 0, 3),
  ladder: at('sheet_floor', 2, 3),
} as const

export const PROPS = {
  chestClosed: at('sheet_chests', 0, 1),
  chestOpen: at('sheet_chests', 1, 1),
  chestGoalClosed: at('sheet_chests', 0, 3),
  chestGoalOpen: at('sheet_chests', 1, 3),
  keyGold: at('sheet_tiles', 7, 30),
  /**
   * A door for each of the four walls, all of them one cell.
   *
   * The walls are drawn four different ways — a brick face at the top, a
   * five-pixel strip down each side, a four-pixel lip along the bottom — so one
   * drawing cannot serve them all. The far wall gets the pack's own door, a
   * cell of brickwork with planks in it. The other three are ours, painted from
   * the same pixels by `tools/make-door-tiles.mjs`, because the set has nothing
   * that sits in a strip or a lip without floating over the floor.
   *
   * The two-tile arch the pack draws is not used: it is wider than a doorway,
   * so it overhung the wall either side and could not be told apart from a
   * decoration.
   */
  doorTop: at('sheet_walls', 9, 13),
  doorLeft: at('sheet_doors_ours', 0, 0),
  doorRight: at('sheet_doors_ours', 1, 0),
  doorBottom: at('sheet_doors_ours', 2, 0),
  /**
   * What a defeated creature leaves behind.
   *
   * The pack has no heart, so the red potion stands in — the same substitution
   * the HUD makes for the same reason, and `ui/icons.ts` explains it.
   */
  dropHeart: at('sheet_flasks', 7, 1),
  dropCoin: at('sheet_coin_gold', 0, 0),
  /**
   * The way down to the next floor.
   *
   * Two drawings of the same hole: shut is the ladder in shadow, open is the
   * ladder lit. A child can see where the way out is from the moment they walk
   * in, and can see that it is not ready yet — which is what sends them looking
   * for the lever rather than wandering.
   */
  trapdoorShut: at('sheet_floor', 2, 3),
  trapdoorOpen: at('sheet_floor', 1, 3),
  leverOff: at('sheet_lever', 0, 0),
  leverOn: at('sheet_lever', 1, 0),
} as const

/** Animations, as frame lists. */
export const ANIMS = {
  snakeIdle: row('sheet_enemies', 0, 6, 6),
  snakeDefeated: row('sheet_enemies', 0, 9, 4),
  batIdle: row('sheet_enemies', 0, 0, 4),
  batDefeated: row('sheet_enemies', 0, 3, 3),
  ghostIdle: row('sheet_enemies', 0, 10, 4),
  ghostDefeated: row('sheet_enemies', 0, 14, 4),
  /*
   * Row 1, not row 0. The sheet's first row is a torch sliced down the middle —
   * five pixels wide, the half that sticks out of a wall seen edge-on — and its
   * frames are not aligned with each other, so it flickered *and* bobbed. Row 1
   * is the whole sconce, seen face-on, in three frames.
   */
  torch: row('sheet_torch', 0, 1, 3),
  coin: [at('sheet_coin_gold', 0, 0), at('sheet_coin_gold', 0, 1), at('sheet_coin_gold', 0, 2), at('sheet_coin_gold', 0, 3)],
  /** The knight only has a left and a right; there is no front or back view. */
  knightIdleRight: row('sheet_knight', 0, 2, 4),
  knightIdleLeft: row('sheet_knight', 0, 3, 4),
  knightWalkRight: row('sheet_knight', 0, 6, 4),
  knightWalkLeft: row('sheet_knight', 0, 7, 4),
} as const

/**
 * Unpacks the archive and hands every sheet to Phaser's loader.
 *
 * Resolves once the textures are in place. The blob URLs are revoked as soon as
 * they are consumed: they would otherwise pin every sheet in memory twice, once
 * as a texture and once as the blob it was decoded from.
 */
export async function loadTileset(
  loader: Phaser.Loader.LoaderPlugin,
  base: string,
): Promise<TilePack> {
  const pack = await fetchTilePack(`${base.endsWith('/') ? base : `${base}/`}${TILE_PACK_PATH}`)
  const urls: string[] = []

  for (const spec of SHEETS) {
    const sheet = pack.sheets.get(spec.file)
    if (!sheet) throw new Error(`Tile pack has no "${spec.file}"`)
    const url = sheetUrl(sheet)
    urls.push(url)
    loader.spritesheet(spec.key, url, {
      frameWidth: spec.frameWidth,
      frameHeight: spec.frameHeight,
    })
  }

  await new Promise<void>((resolve) => {
    loader.once('complete', () => resolve())
    loader.start()
  })
  for (const url of urls) URL.revokeObjectURL(url)
  return pack
}
