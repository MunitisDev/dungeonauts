import { TILE_SIZE } from '../../engine/constants'
import { tileToWorldAnchor, type TileCoord, type WorldPoint } from '../world/grid'
import { directionBetween, sameTile, type Direction } from './directions'

/**
 * Tile-to-tile movement with smooth interpolation between tiles.
 *
 * Grid-locked rather than free-roaming, which suits the audience: the hero
 * cannot wedge on a corner, cannot half-overlap a doorway, and always ends up
 * somewhere the game can reason about. `docs/game/GAME_DESIGN.md` rules out
 * precision movement, and this is the shape that follows from that.
 *
 * Pure logic — no Phaser. The scene reads `position()` each frame and draws.
 */
export class GridMover {
  private current: TileCoord
  private target: TileCoord
  /** Progress from `current` to `target`, 0..1. */
  private progress = 0
  private queue: TileCoord[] = []
  private facingDirection: Direction

  constructor(
    start: TileCoord,
    /** Walking speed. Four tiles a second reads as brisk but followable. */
    private readonly tilesPerSecond = 4,
    facing: Direction = 'down',
  ) {
    this.current = start
    this.target = start
    this.facingDirection = facing
  }

  /** The tile the hero logically occupies — the one they most recently left. */
  get tile(): TileCoord {
    return this.current
  }

  /** The tile being walked into, equal to `tile` when standing still. */
  get destination(): TileCoord {
    return this.target
  }

  get facing(): Direction {
    return this.facingDirection
  }

  get isMoving(): boolean {
    return !sameTile(this.current, this.target) || this.queue.length > 0
  }

  /** Tiles still to walk, for tests and debug rendering. */
  get remaining(): readonly TileCoord[] {
    return this.queue
  }

  /**
   * Replaces the walk queue.
   *
   * Replacing rather than appending is what makes tap-to-move feel responsive:
   * a second tap redirects immediately instead of finishing the old route
   * first. The step in progress still completes, so the hero never stops
   * between two tiles.
   */
  setPath(path: readonly TileCoord[]): void {
    this.queue = [...path]
  }

  /** Abandons the queued route, letting the current step finish. */
  stop(): void {
    this.queue = []
  }

  /** Turns on the spot without moving. */
  face(direction: Direction): void {
    if (!this.isMoving) this.facingDirection = direction
  }

  /** Teleports, for room transitions. Cancels any route. */
  placeAt(tile: TileCoord, facing?: Direction): void {
    this.current = tile
    this.target = tile
    this.progress = 0
    this.queue = []
    if (facing) this.facingDirection = facing
  }

  /**
   * Advances by `deltaSeconds`.
   *
   * Leftover time carries into the next tile, so a long frame does not make the
   * hero stutter, and a step is never silently skipped.
   */
  update(deltaSeconds: number): void {
    let remainingTime = Math.max(0, deltaSeconds)

    while (remainingTime > 0) {
      if (sameTile(this.current, this.target)) {
        const next = this.queue.shift()
        if (!next) return
        const direction = directionBetween(this.current, next)
        // A non-adjacent hop would mean a bad path; refuse rather than warp.
        if (!direction) {
          this.queue = []
          return
        }
        this.target = next
        this.facingDirection = direction
        this.progress = 0
      }

      const timeToArrive = (1 - this.progress) / this.tilesPerSecond
      if (remainingTime < timeToArrive) {
        this.progress += remainingTime * this.tilesPerSecond
        return
      }

      remainingTime -= timeToArrive
      this.current = this.target
      this.progress = 0
    }
  }

  /** Interpolated bottom-center anchor position, in world pixels. */
  position(): WorldPoint {
    const from = tileToWorldAnchor(this.current)
    if (sameTile(this.current, this.target)) return from
    const to = tileToWorldAnchor(this.target)
    return {
      x: from.x + (to.x - from.x) * this.progress,
      y: from.y + (to.y - from.y) * this.progress,
    }
  }

  /**
   * Position snapped to whole pixels.
   *
   * Pixel art on a fractional coordinate shimmers as it moves, which
   * `docs/art/ART_DIRECTION.md` rules out. Phaser's `roundPixels` covers the
   * render, but snapping here keeps the value the game reasons about honest too.
   */
  snappedPosition(): WorldPoint {
    const { x, y } = this.position()
    return { x: Math.round(x), y: Math.round(y) }
  }

  /** How far along the current step, in pixels. Used by tests. */
  get stepOffset(): number {
    return this.progress * TILE_SIZE
  }
}
