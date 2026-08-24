/**
 * Typed mirror of `docs/art/ASSET_MANIFEST.md`, sliced according to
 * `docs/art/SPRITE_SPEC.md`.
 *
 * The documents remain the source of truth: `tests/assetManifest.test.ts`
 * parses the markdown and fails when this file drifts from it. Game code should
 * only ever refer to assets by their manifest `id` — never by a raw path.
 */

/** Row order for directional character sheets — SPRITE_SPEC.md § 5. */
export const DIRECTION_ROWS = ['down', 'left', 'right', 'up'] as const
export type Direction = (typeof DIRECTION_ROWS)[number]

export type AssetCategory = 'hero' | 'enemy' | 'tile' | 'prop' | 'ui' | 'portrait'

/**
 * When an asset is needed.
 *
 * `slice` assets are loaded at boot. `post-slice` assets are tracked here —
 * verified, dimension-checked, ready — but not loaded until the feature that
 * uses them exists, so the vertical slice does not pay for them.
 */
export type AssetStage = 'slice' | 'post-slice'

/**
 * `bottom-center` for world entities, `top-left` for grid tiles, `center` for UI
 * icons (SPRITE_SPEC.md § 2, § 11).
 */
export type AssetAnchor = 'bottom-center' | 'top-left' | 'center'

export interface AssetSpec {
  readonly id: string
  /** Repository-relative path, verbatim from the manifest. */
  readonly path: string
  readonly category: AssetCategory
  readonly stage: AssetStage
  readonly frameWidth: number
  readonly frameHeight: number
  /** Frames per row (animation frames read left-to-right). */
  readonly columns: number
  /** Number of rows (directional rows read top-to-bottom). */
  readonly rows: number
  readonly anchor: AssetAnchor
  /** Present when rows encode facing directions. */
  readonly directions?: readonly Direction[]
  /** Suggested playback rate from SPRITE_SPEC.md; undefined for static art. */
  readonly frameRate?: number
  readonly loop?: boolean
}

const hero = (
  id: string,
  file: string,
  columns: number,
  frameRate: number,
  loop: boolean,
): AssetSpec => ({
  id,
  path: `assets/characters/hero/${file}`,
  category: 'hero',
  stage: 'slice',
  frameWidth: 32,
  frameHeight: 40,
  columns,
  rows: 4,
  anchor: 'bottom-center',
  directions: DIRECTION_ROWS,
  frameRate,
  loop,
})

const tile = (id: string): AssetSpec => ({
  id,
  path: `assets/dungeon/tiles/${id}.png`,
  category: 'tile',
  stage: 'slice',
  frameWidth: 16,
  frameHeight: 16,
  columns: 1,
  rows: 1,
  anchor: 'top-left',
})

const uiIcon = (id: string, file: string): AssetSpec => ({
  id,
  path: `assets/ui/icons/${file}`,
  category: 'ui',
  stage: 'slice',
  frameWidth: 16,
  frameHeight: 16,
  columns: 1,
  rows: 1,
  anchor: 'center',
})

/**
 * Character-select portrait. UI art at 128x128, centre-anchored: the world's
 * bottom-center convention does not apply, and these must never be used for
 * movement, idle or combat.
 */
const portrait = (character: string): AssetSpec => ({
  id: `portrait_${character}`,
  path: `assets/characters/portraits/portrait_${character}.png`,
  category: 'portrait',
  stage: 'post-slice',
  frameWidth: 128,
  frameHeight: 128,
  columns: 1,
  rows: 1,
  anchor: 'center',
})

export const ASSET_MANIFEST: readonly AssetSpec[] = [
  // --- Superseded: the pre-tileset hero commission ---
  // 32x40 frames, drawn to a 32x32 world grid that no longer exists. The world
  // is 16x16 now and the playable character comes from the packed tileset, so
  // nothing here is loaded; the rows stay because the two sheets the user
  // uploaded are real files that these dimensions still check.
  hero('hero_adventurer_idle', 'hero_adventurer_idle.png', 2, 3, true),
  hero('hero_adventurer_walk', 'hero_adventurer_walk.png', 4, 8, true),
  hero('hero_adventurer_attack', 'hero_adventurer_attack.png', 4, 9, false),
  hero('hero_adventurer_think', 'hero_adventurer_think.png', 2, 3, true),
  hero('hero_adventurer_victory', 'hero_adventurer_victory.png', 4, 7, false),

  // Same 32x40 frame and row order as the hero sheets above, in its own
  // directory because it is a different character rather than another
  // animation of the same one. Also superseded — see SPRITE_SPEC.md § 5.
  {
    id: 'hero_warrior_boy_walk',
    path: 'assets/characters/warrior_boy/hero_warrior_boy_walk.png',
    category: 'hero',
    stage: 'slice',
    frameWidth: 32,
    frameHeight: 40,
    columns: 4,
    rows: 4,
    anchor: 'bottom-center',
    directions: DIRECTION_ROWS,
    frameRate: 8,
    loop: true,
  },
  {
    id: 'hero_warrior_boy_idle',
    path: 'assets/characters/warrior_boy/hero_warrior_boy_idle.png',
    category: 'hero',
    stage: 'slice',
    frameWidth: 32,
    frameHeight: 40,
    columns: 2,
    rows: 4,
    anchor: 'bottom-center',
    directions: DIRECTION_ROWS,
    frameRate: 3,
    loop: true,
  },

  // --- Enemy: non-directional 16x16 strips (SPRITE_SPEC.md § 6) ---
  {
    id: 'slime_green_idle',
    path: 'assets/enemies/slime/slime_green_idle.png',
    category: 'enemy',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 1,
    anchor: 'bottom-center',
    frameRate: 5,
    loop: true,
  },
  {
    id: 'slime_green_hit',
    path: 'assets/enemies/slime/slime_green_hit.png',
    category: 'enemy',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 2,
    rows: 1,
    anchor: 'bottom-center',
    frameRate: 9,
    loop: false,
  },
  {
    id: 'slime_green_defeat',
    path: 'assets/enemies/slime/slime_green_defeat.png',
    category: 'enemy',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 1,
    anchor: 'bottom-center',
    frameRate: 8,
    loop: false,
  },

  // --- Dungeon tiles: all 16x16 static (SPRITE_SPEC.md § 10) ---
  tile('tile_floor_stone_01'),
  tile('tile_floor_stone_02'),
  tile('tile_wall_stone'),
  tile('tile_wall_corner'),
  tile('tile_arch'),
  tile('tile_stairs'),

  // --- Props (SPRITE_SPEC.md § 7-9) ---
  {
    id: 'door_wood_closed',
    path: 'assets/dungeon/doors/door_wood_closed.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 32,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    id: 'door_wood_open',
    path: 'assets/dungeon/doors/door_wood_open.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 32,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    // Every world prop is bottom-center anchored, and the idle bob is produced
    // in code rather than baked into a sheet (SPRITE_SPEC.md § 9).
    id: 'key_gold',
    path: 'assets/dungeon/props/key_gold.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    id: 'chest_closed',
    path: 'assets/dungeon/props/chest_closed.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    id: 'chest_open',
    path: 'assets/dungeon/props/chest_open.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    id: 'torch_wall',
    path: 'assets/dungeon/props/torch_wall.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 1,
    anchor: 'bottom-center',
    frameRate: 7,
    loop: true,
  },
  {
    id: 'pedestal_rune',
    path: 'assets/dungeon/props/pedestal_rune.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    // The way down to the next floor, in its two states. Two PNGs for the same
    // reason the pedestal has two: shut and open must differ at a glance.
    id: 'trapdoor_shut',
    path: 'assets/dungeon/props/trapdoor_shut.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    id: 'trapdoor_open',
    path: 'assets/dungeon/props/trapdoor_open.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },
  {
    // The lit state of the same pedestal. Two PNGs rather than a tint, for the
    // same reason doors and chests have two: the change must read at a glance
    // on a small screen, and a colour shift alone does not.
    id: 'pedestal_rune_lit',
    path: 'assets/dungeon/props/pedestal_rune_lit.png',
    category: 'prop',
    stage: 'slice',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    anchor: 'bottom-center',
  },

  // --- Character portraits: UI art, NOT gameplay sprites ---
  // 128x128 selection-screen art, drawn by the DOM as plain <img>. They stay
  // `post-slice` because nothing in the world loads them: the pixel pipeline
  // would be wrong for an illustration. The gameplay sheets are separate assets
  // and still to be produced for five of the six characters.
  portrait('archer_boy'),
  portrait('archer_girl'),
  portrait('warrior_boy'),
  portrait('warrior_girl'),
  portrait('mage_boy'),
  portrait('mage_girl'),

  // --- UI icons: 16x16 production canvas (SPRITE_SPEC.md § 11) ---
  uiIcon('ui_heart', 'heart.png'),
  uiIcon('ui_coin', 'coin.png'),
  uiIcon('ui_key', 'key.png'),
  uiIcon('ui_star', 'star.png'),
  uiIcon('ui_math', 'math.png'),
  uiIcon('ui_language', 'language.png'),
]

const BY_ID = new Map(ASSET_MANIFEST.map((spec) => [spec.id, spec]))

/** Assets belonging to one loading stage. */
export function assetsForStage(stage: AssetStage): AssetSpec[] {
  return ASSET_MANIFEST.filter((spec) => spec.stage === stage)
}

/** The six playable characters, in the order the roster reference presents them. */
export const CHARACTER_IDS = [
  'archer_boy',
  'archer_girl',
  'warrior_boy',
  'warrior_girl',
  'mage_boy',
  'mage_girl',
] as const
export type CharacterId = (typeof CHARACTER_IDS)[number]

/** Manifest id of a character's selection-screen portrait. */
export function portraitId(character: CharacterId): string {
  return `portrait_${character}`
}

export function getAssetSpec(id: string): AssetSpec {
  const spec = BY_ID.get(id)
  if (!spec) throw new Error(`Unknown asset id "${id}" — add it to ASSET_MANIFEST first`)
  return spec
}

export function frameCount(spec: AssetSpec): number {
  return spec.columns * spec.rows
}

export function sheetWidth(spec: AssetSpec): number {
  return spec.frameWidth * spec.columns
}

export function sheetHeight(spec: AssetSpec): number {
  return spec.frameHeight * spec.rows
}

/** True when the asset is a single static frame rather than a spritesheet. */
export function isStatic(spec: AssetSpec): boolean {
  return frameCount(spec) === 1
}

/** Frame indices for one directional row, left-to-right. */
export function rowFrames(spec: AssetSpec, direction: Direction): number[] {
  if (!spec.directions) throw new Error(`Asset "${spec.id}" has no directional rows`)
  const row = spec.directions.indexOf(direction)
  if (row < 0) throw new Error(`Asset "${spec.id}" has no "${direction}" row`)
  const first = row * spec.columns
  return Array.from({ length: spec.columns }, (_, i) => first + i)
}

/**
 * Assets supplied inline, for builds with no server to fetch them from.
 *
 * A single-file build — a shareable preview, or a copy handed to a classroom
 * with no network — has nowhere to serve `/assets/` from. Such a build declares
 * this global, keyed by the same manifest path, and the loader uses it instead.
 */
declare global {
  // eslint-disable-next-line no-var
  var __DUNGEONAUTS_INLINE_ASSETS__: Record<string, string> | undefined
}

/**
 * Browser URL for an asset.
 *
 * Manifest paths are repository-root relative, but the app is not always served
 * from the root of a domain (GitHub Pages puts it under `/<repo>/`), so the
 * deployment base is prefixed here rather than hard-coding a leading slash.
 */
export function assetUrl(spec: AssetSpec, base: string = deploymentBase()): string {
  const inlined = globalThis.__DUNGEONAUTS_INLINE_ASSETS__?.[spec.path]
  if (inlined) return inlined
  return `${base.endsWith('/') ? base : `${base}/`}${spec.path}`
}

function deploymentBase(): string {
  // `import.meta.env` is absent when this module is consumed outside a bundler.
  return import.meta.env?.BASE_URL ?? '/'
}
