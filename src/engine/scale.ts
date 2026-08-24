import { MAX_PIXEL_RATIO, MAX_ZOOM } from './constants'

export interface ViewportPlan {
  /** Scale from logical pixels to CSS pixels. May be fractional; see below. */
  readonly zoom: number
  /** Whole device pixels per logical pixel. Always an integer of at least 1. */
  readonly devicePixels: number
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
  /** Device pixels per CSS pixel, i.e. `window.devicePixelRatio`. */
  readonly pixelRatio?: number
  readonly maxZoom?: number
}

/**
 * Works out how large to draw the room so that all of it is on screen.
 *
 * The whole room, always, in either orientation: a child should be able to see
 * where they are and where they can go without the camera deciding for them.
 * Whatever space is left over becomes margin around the canvas.
 *
 * The scale is a whole number of **device** pixels per texel, not of CSS
 * pixels, and that distinction is the entire trick. `ART_DIRECTION.md` rules
 * out fractional scaling because it gives neighbouring texels different sizes —
 * but that is a statement about the pixels the screen actually has. On a phone
 * reporting three device pixels per CSS pixel, a CSS scale of 1.667 is exactly
 * five device pixels per texel: uniform, sharp, and half again as large as the
 * whole-CSS-number alternative. Insisting on whole CSS pixels there would throw
 * away a third of the screen for nothing. Where the ratio is 1, as on most
 * desktops, this reduces to the integer zoom it always was.
 */
export function computeViewport(request: ViewportRequest): ViewportPlan {
  const { availableWidth, availableHeight, roomWidth, roomHeight, maxZoom = MAX_ZOOM } = request

  if (roomWidth <= 0 || roomHeight <= 0) throw new Error('Room dimensions must be positive')
  const availW = Math.max(1, Math.floor(availableWidth))
  const availH = Math.max(1, Math.floor(availableHeight))
  const ratio = clamp(request.pixelRatio ?? 1, 1, MAX_PIXEL_RATIO)

  const fit = Math.min((availW * ratio) / roomWidth, (availH * ratio) / roomHeight)
  const devicePixels = clamp(Math.floor(fit), 1, Math.max(1, Math.floor(maxZoom * ratio)))
  const zoom = devicePixels / ratio

  // One device pixel per texel and the room still does not fit — a viewport
  // narrower than the room itself. Nothing left but to show part of it.
  const width = Math.max(1, Math.min(roomWidth, Math.floor(availW / zoom)))
  const height = Math.max(1, Math.min(roomHeight, Math.floor(availH / zoom)))

  return {
    zoom,
    devicePixels,
    width,
    height,
    showsWholeRoom: width >= roomWidth && height >= roomHeight,
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
