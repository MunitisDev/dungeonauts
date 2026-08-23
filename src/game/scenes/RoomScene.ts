import Phaser from 'phaser'
import type { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { getAssetSpec } from '../../engine/assets/assetManifest'
import { TILE_SIZE } from '../../engine/constants'
import { DEFAULT_LOCALE } from '../../i18n/locales'
import { hexToInt, PALETTE } from '../../theme/palette'
import { MovementInput } from '../input/MovementInput'
import { GridMover } from '../movement/GridMover'
import { neighbour } from '../movement/directions'
import { loadDungeon, type Dungeon } from '../world/dungeon'
import { ANCHOR_ORIGIN, tileToWorldTopLeft, type TileCoord } from '../world/grid'
import { findPath } from '../world/pathfinding'
import { exitAt, isBlocked, TERRAIN_TEXTURE, type RoomDefinition } from '../world/room'
import { REGISTRY_KEY_ASSETS, SCENE_KEYS } from '../keys'

const HERO_ASSET = 'hero_adventurer_idle'
/** Depth band keeps the hero above terrain but below the debug grid. */
const DEPTH = { terrain: 0, exit: 5, hero: 10, grid: 1000 } as const

/**
 * Exploration: a hero walking a tiled room, and doorways between rooms.
 *
 * The scene is presentation and wiring only. Where the hero can walk, how a
 * route is found and how a step interpolates all live in pure modules under
 * `game/world` and `game/movement`, which is what makes them testable without
 * a renderer.
 */
export class RoomScene extends Phaser.Scene {
  private dungeon!: Dungeon
  private room!: RoomDefinition
  private assets!: AssetRegistry
  private movement!: MovementInput
  private mover!: GridMover
  private hero!: Phaser.GameObjects.Sprite

  private terrainLayer!: Phaser.GameObjects.Group
  private exitMarkers!: Phaser.GameObjects.Group
  private gridOverlay?: Phaser.GameObjects.Graphics
  /** Set while a room change is animating, so input cannot start a second one. */
  private transitioning = false

  constructor() {
    super(SCENE_KEYS.room)
  }

  create(): void {
    this.dungeon = loadDungeon()
    this.assets = this.registry.get(REGISTRY_KEY_ASSETS) as AssetRegistry
    this.cameras.main.setBackgroundColor(hexToInt(PALETTE.dungeonNavy))

    this.terrainLayer = this.add.group()
    this.exitMarkers = this.add.group()
    this.movement = new MovementInput(this)

    const start = this.dungeon.room(this.dungeon.startRoomId)
    this.mover = new GridMover(start.spawn)

    const spec = getAssetSpec(HERO_ASSET)
    this.hero = this.add
      .sprite(0, 0, HERO_ASSET, 0)
      .setOrigin(ANCHOR_ORIGIN[spec.anchor].x, ANCHOR_ORIGIN[spec.anchor].y)
      .setDepth(DEPTH.hero)

    this.enterRoom(start)

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.movement.destroy())
    this.input.keyboard?.on('keydown-G', () => {
      if (this.gridOverlay) this.gridOverlay.visible = !this.gridOverlay.visible
    })
  }

  override update(_time: number, deltaMs: number): void {
    if (this.transitioning) return

    const intent = this.movement.read()

    if (intent.held) {
      // A held key steers one tile at a time; it must not queue a long route.
      if (!this.mover.isMoving) {
        const target = neighbour(this.mover.tile, intent.held)
        if (this.canEnter(target)) this.mover.setPath([target])
        else this.mover.face(intent.held)
      }
    } else if (intent.tapped) {
      this.walkTo(intent.tapped)
    }

    this.mover.update(deltaMs / 1000)

    const { x, y } = this.mover.snappedPosition()
    this.hero.setPosition(x, y)

    const standingOn = this.mover.tile
    if (!this.mover.isMoving) {
      const exit = exitAt(this.room, standingOn)
      if (exit) void this.leaveThrough(exit.to, exit.entry)
    }
  }

  /** Routes to a tapped tile, ignoring taps that lead nowhere. */
  private walkTo(target: TileCoord): void {
    const from = this.mover.isMoving ? this.mover.destination : this.mover.tile
    const path = findPath(from, target, (coord) => this.canEnter(coord))
    if (path && path.length > 0) this.mover.setPath(path)
  }

  private canEnter(coord: TileCoord): boolean {
    return !isBlocked(this.room, coord)
  }

  private enterRoom(room: RoomDefinition, entry?: string): void {
    this.room = room

    this.terrainLayer.clear(true, true)
    this.exitMarkers.clear(true, true)
    this.gridOverlay?.destroy()

    this.drawTerrain()
    this.drawExitMarkers()
    this.drawGridOverlay()

    // Bounds keep the view inside the room. Rooms that exactly fill the base
    // resolution simply sit still; a larger room scrolls with the hero instead
    // of needing a second camera mode.
    const camera = this.cameras.main
    camera.setBounds(0, 0, room.width * TILE_SIZE, room.height * TILE_SIZE)
    camera.startFollow(this.hero, true)

    if (entry) {
      const arrival = room.entries[entry]
      if (!arrival) throw new Error(`Room "${room.id}" has no entry "${entry}"`)
      this.mover.placeAt(arrival)
    }

    const { x, y } = this.mover.snappedPosition()
    this.hero.setPosition(x, y)

    this.game.events.emit('dungeonauts:room-ready', {
      roomId: room.id,
      roomName: room.name[DEFAULT_LOCALE],
      placeholders: this.assets.placeholderIds(),
      approved: this.assets.approvedIds(),
    })
  }

  /**
   * Fades out, swaps rooms, fades back in.
   *
   * A cut would be disorienting for a young player; a short fade makes it
   * obvious that somewhere new has been entered.
   */
  private leaveThrough(roomId: string, entry: string): void {
    this.transitioning = true
    this.mover.stop()

    this.cameras.main.fadeOut(180, 7, 26, 43)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.enterRoom(this.dungeon.room(roomId), entry)
      this.cameras.main.fadeIn(180, 7, 26, 43)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false
      })
    })
  }

  private drawTerrain(): void {
    for (let ty = 0; ty < this.room.height; ty++) {
      for (let tx = 0; tx < this.room.width; tx++) {
        const kind = this.room.terrain[ty]?.[tx]
        if (!kind) continue
        const { x, y } = tileToWorldTopLeft({ tx, ty })
        const tile = this.add
          .image(x, y, TERRAIN_TEXTURE[kind])
          .setOrigin(0, 0)
          .setDepth(DEPTH.terrain)
        this.terrainLayer.add(tile)
      }
    }
  }

  /**
   * Marks doorways with a warm outlined pulse.
   *
   * `docs/art/ART_DIRECTION.md` reserves warm gold for interactables, and
   * `GAME_DESIGN.md` requires a child to see where they can go without being
   * told. A faint tint is not enough — it disappears against a busy floor — so
   * the marker carries a solid stroke and only the fill pulses.
   */
  private drawExitMarkers(): void {
    const gold = hexToInt(PALETTE.adventureGold)
    for (const exit of this.room.exits) {
      const { x, y } = tileToWorldTopLeft(exit.at)

      const fill = this.add
        .rectangle(x, y, TILE_SIZE, TILE_SIZE, gold, 0.3)
        .setOrigin(0, 0)
        .setDepth(DEPTH.exit)
      const outline = this.add
        .rectangle(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        .setOrigin(0, 0)
        .setStrokeStyle(2, gold, 0.95)
        .setDepth(DEPTH.exit)

      this.exitMarkers.add(fill)
      this.exitMarkers.add(outline)
      this.tweens.add({
        targets: fill,
        alpha: { from: 0.2, to: 0.55 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      })
    }
  }

  private drawGridOverlay(): void {
    const graphics = this.add.graphics()
    graphics.lineStyle(1, hexToInt(PALETTE.stoneMint), 0.18)
    for (let tx = 0; tx <= this.room.width; tx++) {
      graphics.lineBetween(tx * TILE_SIZE, 0, tx * TILE_SIZE, this.room.height * TILE_SIZE)
    }
    for (let ty = 0; ty <= this.room.height; ty++) {
      graphics.lineBetween(0, ty * TILE_SIZE, this.room.width * TILE_SIZE, ty * TILE_SIZE)
    }
    graphics.setDepth(DEPTH.grid).setVisible(this.gridOverlay?.visible ?? true)
    this.gridOverlay = graphics
  }
}
