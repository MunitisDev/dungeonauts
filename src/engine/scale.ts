import { MAX_ZOOM, MIN_VISIBLE_TILES, MIN_TOUCH_TILE_PX, TILE_SIZE } from './constants'

export interface ViewportPlan {
  /** Whole-number scale factor from logical pixels to CSS pixels. */
  readonly zoom: number
  /** Logical pixels visible across. */
  readonly width: number
  /** Logical pixels visible down. */
  readonly height: number
  /** True when the whole room fits, so the camera can sit still. */
  readonly showsWholeRoom: boolean
}

export interface ViewportRequest {
  /** Space the canvas may occupy, in CSS pixels. */
  readonly availableWidth: number
  readonly availableHeight: number
  /** Room size in logical pixels. */
  readonly roomWidth: number
  readonly roomHeight: number
  /**
   * Whether the primary input is a finger. On touch the tile is the button, so
   * the view zooms in far enough to tap even if that means scrolling the room.
   */
  readonly coarsePointer: boolean
  readonly maxZoom?: number
}

/**
 * Works out how much of the room to show, and at what scale.
 *
 * Two rules pull against each other. Showing the whole room at once is best —
 * a child can see where they can go. But on a phone the whole room means tiles
 * about 26 CSS pixels across, which is far too small to tap reliably.
 *
 * So: fit the whole room when it can be done at a usable size, and otherwise
 * zoom in to keep tiles tappable and let the camera follow the hero. The scale
 * is always a whole number, because fractional scaling of pixel art gives
 * neighbouring texels different sizes, which `ART_DIRECTION.md` rules out.
 */
export function computeViewport(request: ViewportRequest): ViewportPlan {
  const {
    availableWidth,
    availableHeight,
    roomWidth,
    roomHeight,
    coarsePointer,
    maxZoom = MAX_ZOOM,
  } = request

  if (roomWidth <= 0 || roomHeight <= 0) throw new Error('Room dimensions must be positive')
  const availW = Math.max(1, Math.floor(availableWidth))
  const availH = Math.max(1, Math.floor(availableHeight))

  const minZoom = coarsePointer ? Math.ceil(MIN_TOUCH_TILE_PX / TILE_SIZE) : 1
  const fitZoom = Math.floor(Math.min(availW / roomWidth, availH / roomHeight))

  let zoom = clamp(fitZoom, Math.min(minZoom, maxZoom), maxZoom)

  // Zooming in for tappability is pointless if it leaves too little of the room
  // in view to navigate by, so back off until enough tiles fit — but never
  // below the tappable minimum. Where the two genuinely conflict, on a short
  // landscape phone, a tile you cannot hit is worse than a tighter view.
  const minVisible = MIN_VISIBLE_TILES * TILE_SIZE
  const floorZoom = Math.min(minZoom, maxZoom)
  while (
    zoom > floorZoom &&
    (Math.floor(availW / zoom) < Math.min(minVisible, roomWidth) ||
      Math.floor(availH / zoom) < Math.min(minVisible, roomHeight))
  ) {
    zoom -= 1
  }

  // Never render wider than the room: empty canvas beyond the walls is dead
  // space, and CSS centres the smaller canvas for us.
  const width = Math.max(1, Math.min(roomWidth, Math.floor(availW / zoom)))
  const height = Math.max(1, Math.min(roomHeight, Math.floor(availH / zoom)))

  return { zoom, width, height, showsWholeRoom: width >= roomWidth && height >= roomHeight }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/**
 * Largest whole-number zoom at which a fixed base resolution fits.
 * Kept for the places that still reason about a fixed canvas.
 */
export function computeIntegerZoom(
  viewportWidth: number,
  viewportHeight: number,
  baseWidth: number,
  baseHeight: number,
  maxZoom: number = MAX_ZOOM,
): number {
  if (baseWidth <= 0 || baseHeight <= 0) throw new Error('Base dimensions must be positive')
  const fit = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight)
  return Math.max(1, Math.min(maxZoom, Math.floor(fit)))
}
