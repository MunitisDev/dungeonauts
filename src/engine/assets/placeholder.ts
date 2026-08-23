import type { AssetSpec } from './assetManifest'
import { ASSET_MANIFEST, sheetHeight, sheetWidth } from './assetManifest'

/**
 * Placeholder art is deliberately drawn OUTSIDE the approved palette.
 *
 * `CLAUDE.md` forbids inventing a competing final style, so a placeholder is a
 * checkerboard inside a loud magenta border — a shape language no production
 * asset will ever use. Within that, the fill hue is derived from the asset id so
 * a wall still reads differently from a floor and the room layout stays legible
 * while the real art is being produced.
 */
const BORDER_COLOR = '#FF3FB4'
const MARKER_COLOR = '#FFFFFF'

const CHECKER_SIZE = 4
/** Column/row index markers, so sheet orientation is verifiable by eye. */
const MARKER_SIZE = 2
const MARKER_GAP = 3

export interface PlaceholderColors {
  readonly dark: string
  readonly light: string
}

/**
 * Golden angle. Walking a hue circle in ~137.5 degree steps keeps consecutive
 * entries far apart and never revisits a hue for any realistic asset count.
 */
const GOLDEN_ANGLE = 137.508

/**
 * Hues are assigned by manifest position rather than by hashing the id.
 *
 * A hash is tempting but collides: two neighbouring terrain tiles landing three
 * degrees apart turn the debug room into one flat wash. Walking the golden angle
 * guarantees separation instead. The trade-off is that inserting an asset
 * recolours the ones after it, which is harmless for a development aid.
 */
const HUE_BY_ID: ReadonlyMap<string, number> = new Map(
  ASSET_MANIFEST.map((spec, index) => [spec.id, Math.round((index * GOLDEN_ANGLE) % 360)]),
)

/** Stable hue in [0, 360) for an asset id. */
export function placeholderHue(id: string): number {
  const hue = HUE_BY_ID.get(id)
  if (hue !== undefined) return hue
  // Unknown ids should not happen, but a debug aid must never throw.
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % 360
}

export function placeholderColors(id: string): PlaceholderColors {
  const hue = placeholderHue(id)
  return {
    dark: `hsl(${hue}, 55%, 20%)`,
    light: `hsl(${hue}, 60%, 45%)`,
  }
}

/**
 * Draws one frame of placeholder art at `(originX, originY)`.
 *
 * The frame carries its own grid coordinates: `column + 1` dots along the top
 * edge and `row + 1` dots down the left edge. When real art lands, that makes it
 * obvious whether a sheet was sliced with the expected columns/rows.
 */
export function drawPlaceholderFrame(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  width: number,
  height: number,
  column: number,
  row: number,
  colors: PlaceholderColors,
): void {
  for (let y = 0; y < height; y += CHECKER_SIZE) {
    for (let x = 0; x < width; x += CHECKER_SIZE) {
      const even = ((x / CHECKER_SIZE) | 0) % 2 === ((y / CHECKER_SIZE) | 0) % 2
      ctx.fillStyle = even ? colors.dark : colors.light
      ctx.fillRect(
        originX + x,
        originY + y,
        Math.min(CHECKER_SIZE, width - x),
        Math.min(CHECKER_SIZE, height - y),
      )
    }
  }

  // 1px frame border — makes frame bounds and any off-by-one slicing visible.
  ctx.fillStyle = BORDER_COLOR
  ctx.fillRect(originX, originY, width, 1)
  ctx.fillRect(originX, originY + height - 1, width, 1)
  ctx.fillRect(originX, originY, 1, height)
  ctx.fillRect(originX + width - 1, originY, 1, height)

  ctx.fillStyle = MARKER_COLOR
  for (let i = 0; i <= column; i++) {
    const x = originX + 2 + i * MARKER_GAP
    if (x + MARKER_SIZE > originX + width - 2) break
    ctx.fillRect(x, originY + 2, MARKER_SIZE, MARKER_SIZE)
  }
  for (let i = 0; i <= row; i++) {
    const y = originY + 2 + MARKER_GAP + i * MARKER_GAP
    if (y + MARKER_SIZE > originY + height - 2) break
    ctx.fillRect(originX + 2, y, MARKER_SIZE, MARKER_SIZE)
  }
}

/** Draws every frame of `spec` onto a full-size sheet context. */
export function drawPlaceholderSheet(ctx: CanvasRenderingContext2D, spec: AssetSpec): void {
  const colors = placeholderColors(spec.id)
  ctx.clearRect(0, 0, sheetWidth(spec), sheetHeight(spec))
  for (let row = 0; row < spec.rows; row++) {
    for (let column = 0; column < spec.columns; column++) {
      drawPlaceholderFrame(
        ctx,
        column * spec.frameWidth,
        row * spec.frameHeight,
        spec.frameWidth,
        spec.frameHeight,
        column,
        row,
        colors,
      )
    }
  }
}

/**
 * Builds a canvas holding the placeholder sheet at the asset's exact production
 * dimensions. SPRITE_SPEC.md § 13 is explicit that placeholders must not change
 * the required dimensions, so the swap to real art is a pure file drop.
 */
export function createPlaceholderCanvas(spec: AssetSpec): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = sheetWidth(spec)
  canvas.height = sheetHeight(spec)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(`Could not get a 2D context for placeholder "${spec.id}"`)
  ctx.imageSmoothingEnabled = false
  drawPlaceholderSheet(ctx, spec)
  return canvas
}
