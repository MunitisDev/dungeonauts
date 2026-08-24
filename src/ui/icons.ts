import { sheetUrl, type TilePack } from '../engine/assets/tilepack'

/**
 * HUD icons cut out of the packed tileset.
 *
 * The HUD is DOM, not canvas, so it cannot reach into a Phaser texture. Each
 * icon is cropped onto a small canvas and handed over as a data URI, which the
 * stylesheet then uses as a background image.
 *
 * Only the icons the tileset actually contains. It has a gold coin and a gold
 * key. It has no heart: the red potion stands in for one, which is the same
 * bargain every dungeon game makes and is the artist's own drawing rather than
 * an invented one. It has nothing star-shaped at all, so stars keep their
 * lettered placeholder — `docs/art/ASSET_MANIFEST.md` lists `ui_heart` and
 * `ui_star` as the icons still worth commissioning.
 */
export interface IconCut {
  /** HUD counter this belongs to. */
  readonly counter: string
  readonly file: string
  readonly x: number
  readonly y: number
}

export const ICONS: readonly IconCut[] = [
  { counter: 'hearts', file: 'Flasks.png', x: 7 * 16, y: 1 * 16 },
  { counter: 'coins', file: 'GoldCoin.png', x: 0, y: 0 },
  { counter: 'keys', file: 'Tileset.png', x: 7 * 16, y: 30 * 16 },
]

const SIZE = 16

/**
 * The opaque bounds of a drawing inside its cell.
 *
 * A sprite sits in its 16x16 cell with whatever margin the artist left, and a
 * coin drawn ten pixels across would otherwise arrive in the HUD as a dot
 * floating in an empty box. Trimming to the drawing lets every icon fill its
 * slot, whatever the artwork's own padding.
 */
function opaqueBounds(pixels: Uint8ClampedArray, size: number): Bounds | undefined {
  let minX = size, minY = size, maxX = -1, maxY = -1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((pixels[(y * size + x) * 4 + 3] as number) === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return undefined
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

interface Bounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Crops one cell out of a packed sheet, trimmed. Resolves to a data URI. */
async function cut(pack: TilePack, icon: IconCut): Promise<string | undefined> {
  const sheet = pack.sheets.get(icon.file)
  if (!sheet) return undefined
  const url = sheetUrl(sheet)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error(`Could not decode ${icon.file}`))
      element.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const context = canvas.getContext('2d')
    if (!context) return undefined
    // The icon is drawn at 1:1 and scaled by CSS, so keep it crisp.
    context.imageSmoothingEnabled = false
    context.drawImage(image, icon.x, icon.y, SIZE, SIZE, 0, 0, SIZE, SIZE)

    const bounds = opaqueBounds(context.getImageData(0, 0, SIZE, SIZE).data, SIZE)
    if (!bounds || (bounds.width === SIZE && bounds.height === SIZE)) return canvas.toDataURL('image/png')

    const trimmed = document.createElement('canvas')
    trimmed.width = bounds.width
    trimmed.height = bounds.height
    const trimmedContext = trimmed.getContext('2d')
    if (!trimmedContext) return canvas.toDataURL('image/png')
    trimmedContext.imageSmoothingEnabled = false
    trimmedContext.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
    return trimmed.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Publishes each icon as a custom property on the root element.
 *
 * A CSS variable rather than an `<img>` per counter: the HUD rebuilds itself on
 * every language change, and a stylesheet rule survives that without the icons
 * having to be re-cut each time.
 *
 * The counters that succeeded are also listed in `data-hud-icons`, because a
 * variable that was never set cannot be tested from CSS: without the list, a
 * run that failed to load the pack would hide the lettered placeholders and
 * leave three empty boxes in their place.
 */
export async function publishHudIcons(pack: TilePack, root: HTMLElement): Promise<string[]> {
  const done: string[] = []
  for (const icon of ICONS) {
    try {
      const uri = await cut(pack, icon)
      if (!uri) continue
      root.style.setProperty(`--icon-${icon.counter}`, `url("${uri}")`)
      done.push(icon.counter)
    } catch {
      // A missing icon is a lettered placeholder, not a broken HUD.
    }
  }
  root.dataset['hudIcons'] = done.join(' ')
  return done
}
