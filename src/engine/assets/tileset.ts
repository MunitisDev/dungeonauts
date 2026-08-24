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
]

/**
 * A drawable: a Phaser texture key plus the frame inside it.
 *
 * The frame is usually a cell index. It is a name when the artwork does not sit
 * on the 16x16 grid — an arched door is 32x16 and starts halfway across a cell —
 * in which case `CUSTOM_FRAMES` cuts it out by hand after the sheet loads.
 */
export interface Art {
  readonly key: string
  readonly frame: number | string
}

/**
 * Artwork that the cell grid cannot address.
 *
 * Phaser's spritesheet loader only understands a regular grid, so anything
 * wider, taller or off-grid gets carved out afterwards with `Texture.add`.
 */
export interface CustomFrame {
  readonly key: string
  readonly name: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export const CUSTOM_FRAMES: readonly CustomFrame[] = [
  // Arched doors: two tiles wide, one tall, and not on a 32px boundary.
  { key: 'sheet_doors', name: 'arch_gold', x: 112, y: 32, width: 32, height: 16 },
  { key: 'sheet_doors', name: 'arch_blue', x: 112, y: 0, width: 32, height: 16 },
  // Barred posts: one tile wide, two tall, offset eight pixels into the cell.
  { key: 'sheet_doors', name: 'post_gold', x: 88, y: 64, width: 16, height: 32 },
  { key: 'sheet_doors', name: 'post_blue', x: 128, y: 64, width: 16, height: 32 },
]

/** Cuts the off-grid artwork out of the sheets Phaser has already loaded. */
export function registerCustomFrames(textures: Phaser.Textures.TextureManager): void {
  for (const cut of CUSTOM_FRAMES) {
    const texture = textures.get(cut.key)
    if (!texture || texture.has(cut.name)) continue
    texture.add(cut.name, 0, cut.x, cut.y, cut.width, cut.height)
  }
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
   * Doors come in two shapes because doorways do.
   *
   * A gap you walk north or south through wants the arch: two tiles wide,
   * face-on, its jambs overlapping the wall either side of the one-tile gap.
   * That holds for the bottom wall as well as the top — you are looking at the
   * near wall from behind, but a door drawn face-on is what a child reads as a
   * door, and it is what the wall's own end caps frame. A gap you walk east or
   * west through is seen edge-on, so it gets the upright barred post. Using the
   * arch for both drew half an arch: the door is 32 wide and the cell is 16.
   */
  doorHorizontal: { key: 'sheet_doors', frame: 'arch_gold' } as Art,
  doorVertical: { key: 'sheet_doors', frame: 'post_gold' } as Art,
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
  torch: row('sheet_torch', 0, 0, 4),
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
  registerCustomFrames(loader.scene.textures)
  for (const url of urls) URL.revokeObjectURL(url)
  return pack
}
