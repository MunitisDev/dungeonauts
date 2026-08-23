import Phaser from 'phaser'
import roomDocument from '../../../data/rooms/room_01.json'
import type { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { getAssetSpec } from '../../engine/assets/assetManifest'
import { TILE_SIZE } from '../../engine/constants'
import { DEFAULT_LOCALE } from '../../i18n/locales'
import { hexToInt, PALETTE } from '../../theme/palette'
import { ANCHOR_ORIGIN, tileToWorldAnchor, tileToWorldTopLeft } from '../world/grid'
import { parseRoom, TERRAIN_TEXTURE, type RoomDefinition } from '../world/room'
import { REGISTRY_KEY_ASSETS, SCENE_KEYS } from '../keys'

/**
 * Visual proving ground for the technical base: a static room drawn on the
 * 32x32 grid, plus two anchor demonstrations.
 *
 * There is no gameplay here on purpose — movement is task 3 and interactables
 * are task 4. What this scene has to prove is that tiles align, that
 * bottom-center anchoring lets a 32x40 hero and a 32x48 door overhang their
 * tile correctly, and that placeholders slot in wherever art is missing.
 */
export class RoomScene extends Phaser.Scene {
  private room!: RoomDefinition
  private gridOverlay?: Phaser.GameObjects.Graphics

  constructor() {
    super(SCENE_KEYS.room)
  }

  create(): void {
    this.room = parseRoom(roomDocument)
    this.cameras.main.setBackgroundColor(hexToInt(PALETTE.dungeonNavy))

    this.drawTerrain()
    this.drawAnchorDemonstration()
    this.drawGridOverlay()

    // Dev-only affordance; the debug grid is not part of the game UI.
    this.input.keyboard?.on('keydown-G', () => {
      if (this.gridOverlay) this.gridOverlay.visible = !this.gridOverlay.visible
    })

    const assets = this.registry.get(REGISTRY_KEY_ASSETS) as AssetRegistry
    this.game.events.emit('dungeonauts:room-ready', {
      roomId: this.room.id,
      roomName: this.room.name[DEFAULT_LOCALE],
      placeholders: assets.placeholderIds(),
      approved: assets.approvedIds(),
    })
  }

  private drawTerrain(): void {
    for (let ty = 0; ty < this.room.height; ty++) {
      for (let tx = 0; tx < this.room.width; tx++) {
        const kind = this.room.terrain[ty]?.[tx]
        if (!kind) continue
        const { x, y } = tileToWorldTopLeft({ tx, ty })
        this.add.image(x, y, TERRAIN_TEXTURE[kind]).setOrigin(0, 0)
      }
    }
  }

  /**
   * Two sprites taller than one tile, placed with `tileToWorldAnchor`. Their
   * bases must sit exactly on the tile floor line while the art overhangs
   * upward. Delete this once real entities exist.
   */
  private drawAnchorDemonstration(): void {
    const hero = getAssetSpec('hero_adventurer_idle')
    const heroAt = tileToWorldAnchor({ tx: 6, ty: 5 })
    this.add
      .sprite(heroAt.x, heroAt.y, hero.id, 0)
      .setOrigin(ANCHOR_ORIGIN[hero.anchor].x, ANCHOR_ORIGIN[hero.anchor].y)

    const door = getAssetSpec('door_wood_closed')
    const doorAt = tileToWorldAnchor({ tx: 7, ty: 1 })
    this.add
      .image(doorAt.x, doorAt.y, door.id)
      .setOrigin(ANCHOR_ORIGIN[door.anchor].x, ANCHOR_ORIGIN[door.anchor].y)
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
    graphics.setDepth(1000)
    this.gridOverlay = graphics
  }
}
