import Phaser from 'phaser'
import type { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { DIRECTION_ROWS, getAssetSpec } from '../../engine/assets/assetManifest'
import { answerSeconds, DEFAULT_AGE, startingDifficulty, type Profile } from '../state/Profile'
import { TILE_SIZE } from '../../engine/constants'
import { createChallengeRepository, type ChallengeRepository } from '../../education'
import type { Locale } from '../../i18n/locales'
import { t } from '../../i18n/strings'
import { hexToInt, PALETTE } from '../../theme/palette'
import type { GameServices } from '../services'
import { blocksMovement, entityTexture, type Entity } from '../entities/entity'
import { MovementInput } from '../input/MovementInput'
import { GridMover } from '../movement/GridMover'
import { neighbour } from '../movement/directions'
import { applyCorrectAnswer, planInteraction } from '../interaction/interactions'
import { GameState } from '../state/GameState'
import {
  EVENT_ROOM_READY,
  EVENT_RUN_SAVED,
  EVENT_START_RUN,
  EVENT_WORLD_READY,
  type RunRequest,
} from '../run'
import { heroSheets, type HeroSheets } from '../entities/characters'
import { Dungeon } from '../world/dungeon'
import { generateDungeon } from '../world/generateDungeon'
import { ANCHOR_ORIGIN, tileToWorldAnchor, tileToWorldTopLeft, type TileCoord } from '../world/grid'
import { findPath } from '../world/pathfinding'
import {
  entityAt,
  exitAt,
  isBlocked,
  TERRAIN_TEXTURE,
  type RoomDefinition,
} from '../world/room'
import { REGISTRY_KEY_ASSETS, REGISTRY_KEY_SERVICES, SCENE_KEYS } from '../keys'

/** Sheets used before a character has been chosen, e.g. on the title screen. */
const DEFAULT_SHEETS = heroSheets('warrior_boy')
/** Depth band keeps the hero above terrain but below the debug grid. */
const DEPTH = { terrain: 0, exit: 5, entity: 8, hero: 10, grid: 1000 } as const

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
  /** False until the shell has asked for a run; the world is empty before that. */
  private started = false
  private assets!: AssetRegistry
  private movement!: MovementInput
  private mover!: GridMover
  private hero!: Phaser.GameObjects.Sprite

  private terrainLayer!: Phaser.GameObjects.Group
  private exitMarkers!: Phaser.GameObjects.Group
  private entityLayer!: Phaser.GameObjects.Group
  private readonly entitySprites = new Map<string, Phaser.GameObjects.Image>()
  private gridOverlay?: Phaser.GameObjects.Graphics

  private state!: GameState
  private challenges!: ChallengeRepository
  private services!: GameServices
  /** Who is playing, once the shell has asked. */
  private profile: Profile | undefined
  /** Seed the current dungeon was generated from, so the save can rebuild it. */
  private seed = 0
  private sheets: HeroSheets = DEFAULT_SHEETS
  /** Rooms visited this run, for the completion summary. */
  private readonly visitedRooms = new Set<string>()
  /** Ids already asked this session, so the same question is not repeated. */
  private readonly askedChallengeIds: string[] = []

  /** Set while a room change is animating, so input cannot start a second one. */
  private transitioning = false
  /** Set while the challenge panel is open, so the world does not move under it. */
  private busy = false
  /** Raised mid-challenge; acted on once the panel has closed. */
  private pendingGameOver = false
  /** Obstacle a tap routed towards, to be bumped once the hero arrives. */
  private pendingBump: TileCoord | undefined

  constructor() {
    super(SCENE_KEYS.room)
  }

  /** Language of menus and messages. */
  private get uiLocale(): Locale {
    return this.services.settings.ui
  }

  /** Language the questions are drawn from. */
  private get contentLocale(): Locale {
    return this.services.settings.content
  }

  create(): void {
    this.assets = this.registry.get(REGISTRY_KEY_ASSETS) as AssetRegistry
    this.services = this.registry.get(REGISTRY_KEY_SERVICES) as GameServices
    this.state = new GameState()
    this.challenges = createChallengeRepository()
    this.cameras.main.setBackgroundColor(hexToInt(PALETTE.dungeonNavy))

    this.terrainLayer = this.add.group()
    this.exitMarkers = this.add.group()
    this.entityLayer = this.add.group()
    this.movement = new MovementInput(this)
    this.mover = new GridMover({ tx: 1, ty: 1 })

    const spec = getAssetSpec(DEFAULT_SHEETS.idle)
    this.hero = this.add
      .sprite(0, 0, DEFAULT_SHEETS.idle, 0)
      .setOrigin(ANCHOR_ORIGIN[spec.anchor].x, ANCHOR_ORIGIN[spec.anchor].y)
      .setDepth(DEPTH.hero)
      .setVisible(false)

    // Registered from the manifest's own frame counts and rates, so the day the
    // approved sheets arrive the animations are already correct.
    // Both sheets, not just the one currently in use: the placeholder carries
    // the manifest's frame layout, so the walk animation is valid and ready the
    // moment approved art appears at its path.
    for (const sheet of [DEFAULT_SHEETS.idle, DEFAULT_SHEETS.walk]) {
      for (const direction of DIRECTION_ROWS) {
        this.assets.registerDirectionalAnimation(this.anims, sheet, direction)
      }
    }

    // Nothing is generated until the shell knows who is playing: the dungeon
    // depends on the profile's age for its difficulty, and on the save for its
    // seed. Until then the canvas is an empty room-coloured backdrop behind the
    // title screen.
    const onStartRun = (request: RunRequest) => this.startRun(request)
    this.game.events.on(EVENT_START_RUN, onStartRun)

    // A language change must repaint what is already on screen, not wait for
    // the next room.
    const stopWatchingSettings = this.services.settings.onChange(() => {
      if (this.started) this.emitRoomReady()
    })

    // Rotating a phone changes how much of the room fits, which changes whether
    // the camera should follow at all.
    const onViewport = () => {
      if (this.started) this.applyCamera()
    }
    this.game.events.on('dungeonauts:viewport', onViewport)

    this.exposeDebugHooks()

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.movement.destroy()
      stopWatchingSettings()
      this.game.events.off('dungeonauts:viewport', onViewport)
      this.game.events.off(EVENT_START_RUN, onStartRun)
    })
    this.input.keyboard?.on('keydown-G', () => {
      if (this.gridOverlay) this.gridOverlay.visible = !this.gridOverlay.visible
    })

    // Announced rather than assumed: assets can take seconds to arrive, and a
    // child who presses Play before the world exists must not lose the press.
    this.game.events.emit(EVENT_WORLD_READY)
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.started || this.transitioning || this.busy) return

    const intent = this.movement.read()

    if (intent.held) {
      // A held key steers one tile at a time; it must not queue a long route.
      if (!this.mover.isMoving) {
        const target = neighbour(this.mover.tile, intent.held)
        if (this.canEnter(target)) this.mover.setPath([target])
        else {
          this.mover.face(intent.held)
          // Walking into something IS the interaction. No action button to
          // discover, which matters for the youngest players.
          this.bump(target)
        }
      }
    } else if (intent.tapped) {
      this.walkTo(intent.tapped)
    }

    this.mover.update(deltaMs / 1000)

    const { x, y } = this.mover.snappedPosition()
    this.hero.setPosition(x, y)
    this.playHeroAnimation()

    if (this.mover.isMoving) return

    const standingOn = this.mover.tile
    this.collectAnythingUnderfoot(standingOn)

    // A queued tap that ends beside an obstacle should still interact with it.
    if (this.pendingBump && !this.mover.isMoving) {
      const target = this.pendingBump
      this.pendingBump = undefined
      this.bump(target)
      return
    }

    const exit = exitAt(this.room, standingOn)
    if (exit) this.leaveThrough(exit.to, exit.entry)
  }

  /**
   * Sheet used while walking.
   *
   * When the character has no approved walk sheet, keep animating the idle rows
   * instead of cutting to a placeholder every time the player takes a step.
   * A still character reads as unfinished; a magenta checkerboard reads as
   * broken, and makes the real art impossible to judge.
   */
  private get walkSheet(): string {
    return this.assets.isPlaceholder(this.sheets.walk) ? this.sheets.idle : this.sheets.walk
  }

  /**
   * Development-only hook for browser tests.
   *
   * Automated play needs to turn a tile coordinate into a screen point, which
   * needs the camera scroll. Browser testing has caught most of the real bugs
   * in this project — pointer handling, layout, audio — so it is worth making
   * reliable. Stripped from production builds.
   */
  private exposeDebugHooks(): void {
    if (!import.meta.env.DEV) return
    Object.defineProperty(window, '__dungeonauts', {
      configurable: true,
      value: {
        /** Tile centre as a CSS-pixel offset within the canvas element. */
        tileToScreen: (tx: number, ty: number) => {
          const camera = this.cameras.main
          // The scale manager's zoom, not the camera's: the canvas is displayed
          // larger than its backing store, while the camera itself stays at 1.
          const scale = this.game.scale.zoom
          return {
            x: (tx * TILE_SIZE + TILE_SIZE / 2 - camera.scrollX) * scale,
            y: (ty * TILE_SIZE + TILE_SIZE / 2 - camera.scrollY) * scale,
          }
        },
        state: () => ({
          room: this.started ? this.room.id : undefined,
          hero: this.mover.tile,
          totals: this.state.totals(),
          exits: this.started ? this.room.exits.map((e) => ({ at: e.at, to: e.to })) : [],
          entities: this.started
            ? this.room.entities.map((e) => ({
                id: e.id,
                type: e.type,
                at: e.at,
                resolved: this.state.isResolved(e.id),
              }))
            : [],
        }),
      },
    })
  }

  /** Keeps the hero's sheet and row in step with what it is doing. */
  private playHeroAnimation(): void {
    const sheet = this.mover.isMoving ? this.walkSheet : this.sheets.idle
    const key = `${sheet}:${this.mover.facing}`
    if (this.hero.anims.currentAnim?.key === key) return
    this.hero.play(key, true)
  }

  /**
   * Begins a run: builds the dungeon, places the hero, restores any progress.
   *
   * The map is generated rather than authored, from the seed the save holds.
   * Same seed, same dungeon — which is what lets a save be a handful of numbers
   * instead of a copy of the world.
   */
  private startRun(request: RunRequest): void {
    this.profile = request.profile
    this.seed = request.seed
    this.sheets = heroSheets(request.profile.character)

    const plan = generateDungeon({
      seed: request.seed,
      difficulty: startingDifficulty(request.profile.age),
    })
    this.dungeon = new Dungeon(plan.rooms)

    const restore = request.restore
    this.state = restore
      ? GameState.restore({
          hearts: restore.hearts,
          keys: restore.keys,
          stars: restore.stars,
          coins: restore.coins,
          resolved: restore.resolved,
          slimeProgress: restore.slimeProgress,
        })
      : new GameState()

    this.askedChallengeIds.length = 0
    this.visitedRooms.clear()
    for (const id of restore?.visitedRooms ?? []) this.visitedRooms.add(id)

    // A save from an older seed, or a room that no longer exists, must never
    // strand the child: fall back to the entrance rather than refusing to load.
    const roomId =
      restore && this.dungeon.has(restore.roomId) ? restore.roomId : this.dungeon.startRoomId
    const room = this.dungeon.room(roomId)

    this.mover.placeAt(room.spawn, 'down')
    this.hero.setVisible(true)
    this.started = true
    this.services.hud.update(this.state.totals())
    this.transitioning = false
    this.busy = false
    this.enterRoom(room)
    this.saveProgress()
  }

  /**
   * Writes the run to storage.
   *
   * Called at every point the child would be upset to lose: a new room, a
   * defeated slime, an opened chest. Cheap enough to do eagerly, and eager is
   * the only honest option when the tab can close at any moment.
   */
  private saveProgress(): void {
    if (!this.started || !this.profile) return
    const snapshot = this.state.snapshot()
    this.services.save.saveRun({
      seed: this.seed,
      roomId: this.room.id,
      resolved: snapshot.resolved,
      slimeProgress: snapshot.slimeProgress,
      hearts: snapshot.hearts,
      keys: snapshot.keys,
      stars: snapshot.stars,
      coins: snapshot.coins,
      visitedRooms: [...this.visitedRooms],
    })
    this.game.events.emit(EVENT_RUN_SAVED)
  }

  /** Steps on a key and takes it, with no question asked. */
  private collectAnythingUnderfoot(tile: TileCoord): void {
    const entity = entityAt(this.room, tile)
    if (!entity) return
    const plan = planInteraction(entity, this.state)
    if (plan.kind !== 'collect') return

    this.state.collectKey(entity.id)
    this.services.hud.update(this.state.totals())
    this.saveProgress()
    this.services.sfx.play('key')
    this.services.feedback.show(t(this.uiLocale, 'event.keyTaken'))
    this.refreshEntitySprite(entity)
  }

  /** Handles walking into a tile occupied by something. */
  private bump(target: TileCoord): void {
    const entity = entityAt(this.room, target)
    if (!entity) return
    const plan = planInteraction(entity, this.state)

    if (plan.kind === 'refused') {
      this.services.sfx.play('refused')
      this.services.feedback.show(t(this.uiLocale, 'prompt.needsKey'))
      return
    }
    if (plan.kind === 'challenge') void this.runChallenge(entity)
  }

  /**
   * Routes to a tapped tile, ignoring taps that lead nowhere.
   *
   * Tapping an obstacle is not a mistake — it is how a child says "deal with
   * that". So a tap on a slime or a door walks to the nearest tile beside it
   * and then bumps into it.
   */
  private walkTo(target: TileCoord): void {
    const from = this.mover.isMoving ? this.mover.destination : this.mover.tile
    this.pendingBump = undefined

    if (this.canEnter(target)) {
      const path = findPath(from, target, (coord) => this.canEnter(coord))
      if (path && path.length > 0) this.mover.setPath(path)
      return
    }

    const entity = entityAt(this.room, target)
    if (!entity || planInteraction(entity, this.state).kind === 'none') return

    const approach = this.bestApproach(from, target)
    if (!approach) return
    if (approach.path.length > 0) this.mover.setPath(approach.path)
    this.pendingBump = target
  }

  /** Shortest route to any tile orthogonally adjacent to `target`. */
  private bestApproach(
    from: TileCoord,
    target: TileCoord,
  ): { path: TileCoord[] } | undefined {
    let best: TileCoord[] | undefined
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      const beside = neighbour(target, direction)
      if (!this.canEnter(beside)) continue
      const path = findPath(from, beside, (coord) => this.canEnter(coord))
      if (path && (best === undefined || path.length < best.length)) best = path
    }
    return best ? { path: best } : undefined
  }

  /** A tile is walkable when the terrain allows it and nothing blocks it. */
  private canEnter(coord: TileCoord): boolean {
    if (isBlocked(this.room, coord)) return false
    const entity = entityAt(this.room, coord)
    if (!entity) return true
    return !blocksMovement(entity, this.state.isResolved(entity.id))
  }

  /**
   * The core loop, in one place.
   *
   * The entity says what shape of question it wants; the challenge system picks
   * one and reports only whether the answer was right; the game decides what
   * that means in the world. Nothing here knows a question's text, and nothing
   * in `education/` knows a door exists.
   */
  private async runChallenge(entity: Entity): Promise<void> {
    if (entity.type === 'key') return
    const gate = entity.challenge

    const challenge = this.challenges.request({
      locale: this.contentLocale,
      subject: gate.subject,
      ...(gate.skill ? { skill: gate.skill } : {}),
      difficulty: gate.difficulty as 1 | 2 | 3 | 4 | 5,
      exclude: this.askedChallengeIds,
    })

    // No suitable question must never be a dead end: the obstacle simply gives
    // way rather than stranding a child in front of it.
    if (!challenge) {
      this.applyOutcome(entity)
      return
    }

    this.busy = true
    this.mover.stop()
    try {
      const resolution = await this.services.challengePanel.ask(challenge, {
        locale: this.uiLocale,
        seconds: answerSeconds(this.profile?.age ?? DEFAULT_AGE),
        onPenalty: () => this.losePenaltyHeart(),
      })
      this.rememberAsked(challenge.id)
      // Only a solved challenge changes the world. A timeout leaves the
      // obstacle standing, so the child can walk back into it and try again.
      if (resolution.outcome === 'solved') this.applyOutcome(entity)
      else this.services.feedback.show(t(this.uiLocale, 'feedback.timeout'))
    } finally {
      this.busy = false
    }

    // Acted on only once the panel has closed, so the run does not restart out
    // from under a child still reading the explanation.
    if (this.pendingGameOver) this.showGameOver()
  }

  /**
   * Costs a heart for a wrong answer or a timeout.
   *
   * Running out is not a failure state so much as a restart: the run begins
   * again with full hearts, which `GAME_DESIGN.md` asks for over any long
   * punishment loop.
   */
  private losePenaltyHeart(): void {
    this.state.loseHeart()
    this.services.hud.update(this.state.totals())
    if (this.state.hearts <= 0) this.pendingGameOver = true
  }

  /**
   * Out of hearts.
   *
   * Not a defeat screen: no score, no blame, one large button that puts the
   * child back at the entrance of the same dungeon with full hearts. The seed
   * is kept deliberately — the map they were learning stays the map they know,
   * which `GAME_DESIGN.md` prefers to a fresh punishment.
   */
  private showGameOver(): void {
    this.pendingGameOver = false
    this.busy = true
    this.services.sfx.play('refused')
    this.services.completionPanel.showGameOver(this.uiLocale, () => this.restart())
  }

  /** Keeps a short memory of asked questions, so answers stay fresh. */
  private rememberAsked(challengeId: string): void {
    this.askedChallengeIds.push(challengeId)
    if (this.askedChallengeIds.length > 12) this.askedChallengeIds.shift()
  }

  /** Turns a correct answer into something happening in the room. */
  private applyOutcome(entity: Entity): void {
    const outcome = applyCorrectAnswer(entity, this.state)
    this.services.hud.update(this.state.totals())
    this.refreshEntitySprite(entity)

    switch (outcome.kind) {
      case 'slime_hit':
        this.services.sfx.play('hit')
        this.services.feedback.show(t(this.uiLocale, 'event.slimeHit'))
        this.nudgeSprite(entity.id)
        break
      case 'slime_defeated':
        this.services.sfx.play('defeat')
        this.services.feedback.show(t(this.uiLocale, 'event.slimeDefeated'))
        this.revealGuarded(entity.id)
        break
      case 'door_unlocked':
        this.services.sfx.play('door')
        this.services.feedback.show(t(this.uiLocale, 'event.doorUnlocked'))
        break
      case 'chest_opened':
        this.services.sfx.play('chest')
        this.services.feedback.show(
          `${t(this.uiLocale, 'event.chestOpened')} +${outcome.stars} \u2605  +${outcome.coins}`,
        )
        break
    }

    this.saveProgress()
    if (this.isDungeonComplete()) this.completeRun()
  }

  private isDungeonComplete(): boolean {
    const goals = this.dungeon.goals()
    return goals.length > 0 && goals.every((goal) => this.state.isResolved(goal.id))
  }

  /**
   * Shows the end-of-dungeon summary, after a beat so the chest reward is seen
   * first rather than being buried by the panel appearing on top of it.
   */
  private completeRun(): void {
    this.busy = true
    // The run is over, so there is nothing left to continue into.
    this.services.save.clearRun()
    this.services.music.stop()
    this.services.music.play('victory')
    this.time.delayedCall(1200, () => {
      this.services.completionPanel.show(
        { ...this.state.totals(), roomsExplored: this.visitedRooms.size },
        this.uiLocale,
        () => this.restart(),
      )
    })
  }

  /** Starts the same dungeon over from its entrance, with full hearts. */
  private restart(): void {
    this.services.music.play('dungeon')
    this.state = new GameState()
    this.askedChallengeIds.length = 0
    this.visitedRooms.clear()
    this.pendingGameOver = false
    this.services.hud.update(this.state.totals())

    const start = this.dungeon.room(this.dungeon.startRoomId)
    this.mover.placeAt(start.spawn, 'down')
    this.enterRoom(start)
    this.saveProgress()
    this.busy = false
  }

  /** Shows anything that was waiting on an entity being dealt with. */
  private revealGuarded(guardId: string): void {
    for (const entity of this.room.entities) {
      if (entity.type === 'key' && entity.guardedBy === guardId) this.refreshEntitySprite(entity)
    }
  }

  private nudgeSprite(entityId: string): void {
    const sprite = this.entitySprites.get(entityId)
    if (!sprite) return
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 6,
      duration: 110,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.Out',
    })
  }

  /**
   * Draws the entities in the room.
   *
   * A guarded key is not rendered until its guard is gone, so the room reads as
   * one problem at a time, which `GAME_DESIGN.md` asks for.
   */
  private drawEntities(): void {
    this.entitySprites.clear()
    for (const entity of this.room.entities) {
      const resolved = this.state.isResolved(entity.id)
      const anchorPoint = tileToWorldAnchor(entity.at)
      const sprite = this.add
        .image(anchorPoint.x, anchorPoint.y, entityTexture(entity, resolved))
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.entity)
      this.entityLayer.add(sprite)
      this.entitySprites.set(entity.id, sprite)
      this.applyEntityVisibility(entity, sprite)
    }
  }

  private refreshEntitySprite(entity: Entity): void {
    const sprite = this.entitySprites.get(entity.id)
    if (!sprite) return
    sprite.setTexture(entityTexture(entity, this.state.isResolved(entity.id)))
    this.applyEntityVisibility(entity, sprite)
  }

  private applyEntityVisibility(entity: Entity, sprite: Phaser.GameObjects.Image): void {
    if (entity.type === 'key') {
      const hidden =
        this.state.isResolved(entity.id) ||
        (entity.guardedBy !== undefined && !this.state.isResolved(entity.guardedBy))
      sprite.setVisible(!hidden)
      return
    }
    sprite.setVisible(true)
    // A defeated slime lingers faintly rather than vanishing, so a child can
    // see what they achieved instead of the room silently changing.
    if (entity.type === 'slime' && this.state.isResolved(entity.id)) sprite.setAlpha(0.45)
  }

  private enterRoom(room: RoomDefinition, entry?: string): void {
    this.room = room
    this.visitedRooms.add(room.id)

    this.terrainLayer.clear(true, true)
    this.exitMarkers.clear(true, true)
    this.entityLayer.clear(true, true)
    this.gridOverlay?.destroy()
    this.pendingBump = undefined

    this.drawTerrain()
    this.drawEntities()
    this.drawExitMarkers()
    this.drawGridOverlay()

    this.applyCamera()

    if (entry) {
      const arrival = room.entries[entry]
      if (!arrival) throw new Error(`Room "${room.id}" has no entry "${entry}"`)
      this.mover.placeAt(arrival)
    }

    const { x, y } = this.mover.snappedPosition()
    this.hero.setPosition(x, y)

    this.emitRoomReady()
    if (entry) this.saveProgress()
  }

  private emitRoomReady(): void {
    this.game.events.emit(EVENT_ROOM_READY, {
      roomId: this.room.id,
      roomName: this.room.name[this.uiLocale],
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

    this.services.sfx.play('room')
    this.cameras.main.fadeOut(180, 7, 26, 43)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.enterRoom(this.dungeon.room(roomId), entry)
      this.cameras.main.fadeIn(180, 7, 26, 43)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false
      })
    })
  }

  /**
   * Points the camera at the room.
   *
   * On a large screen the canvas is exactly the room, so there is nothing to
   * scroll and the camera sits still. On a phone the canvas is smaller than the
   * room — because tiles are kept big enough to tap — so the camera follows the
   * hero instead. Re-run whenever the viewport changes, which on a phone means
   * every rotation.
   */
  private applyCamera(): void {
    const camera = this.cameras.main
    const width = this.room.width * TILE_SIZE
    const height = this.room.height * TILE_SIZE
    camera.setBounds(0, 0, width, height)
    camera.setRoundPixels(true)

    if (camera.width >= width && camera.height >= height) {
      camera.stopFollow()
      camera.centerOn(width / 2, height / 2)
      return
    }
    camera.startFollow(this.hero, true)
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
