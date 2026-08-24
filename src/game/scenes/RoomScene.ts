import Phaser from 'phaser'
import type { AssetRegistry } from '../../engine/assets/AssetRegistry'
import { ANIMS, WALLS } from '../../engine/assets/tileset'
import { answerSeconds, DEFAULT_AGE, startingDifficulty, type Profile } from '../state/Profile'
import { TILE_SIZE } from '../../engine/constants'
import { createChallengeRepository, type ChallengeRepository } from '../../education'
import type { Locale } from '../../i18n/locales'
import { t } from '../../i18n/strings'
import { hexToInt, PALETTE } from '../../theme/palette'
import type { GameServices } from '../services'
import {
  blocksMovement,
  doorArt,
  entityAnimation,
  entityArt,
  entityDrop,
  type Entity,
} from '../entities/entity'
import { MovementInput } from '../input/MovementInput'
import { GridMover } from '../movement/GridMover'
import { neighbour } from '../movement/directions'
import { applyCorrectAnswer, planInteraction } from '../interaction/interactions'
import { GameState, type RunTotals } from '../state/GameState'
import type { XpReason } from '../state/Progression'
import {
  EVENT_ROOM_READY,
  EVENT_RUN_SAVED,
  EVENT_START_RUN,
  EVENT_WORLD_READY,
  type RunRequest,
} from '../run'
import { Dungeon } from '../world/dungeon'
import { floorDifficulty, floorSeed, generateDungeon } from '../world/generateDungeon'
import { tileToWorldAnchor, tileToWorldTopLeft, type TileCoord } from '../world/grid'
import { findPath } from '../world/pathfinding'
import {
  entityAt,
  exitAt,
  isBlocked,
  objectiveMet,
  terrainLayers,
  type RoomDefinition,
  wallAt,
} from '../world/room'
import { REGISTRY_KEY_ASSETS, REGISTRY_KEY_SERVICES, SCENE_KEYS } from '../keys'

/**
 * The knight has a left and a right, and nothing else.
 *
 * The tileset draws him in three-quarter view facing one way or the other;
 * there is no front or back. Walking up or down therefore keeps whichever way
 * he was already facing, which reads better than picking one arbitrarily.
 */
type Facing = 'left' | 'right'
/** Depth band keeps the hero above terrain but below the debug grid. */
const DEPTH = { terrain: 0, decor: 3, exit: 5, entity: 8, hero: 10, grid: 1000 } as const

/** How far apart torches sit along a wall, in tiles. */
const TORCH_SPACING = 5

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
  /** The doors standing in the room's doorways while it is shut. */
  private doorwayDoors!: Phaser.GameObjects.Group
  private entityLayer!: Phaser.GameObjects.Group
  /** Which floor of the dungeon the run is on. The first is 1. */
  private floor = 1
  /** Where the hero was last told the way down is shut, so it is said once. */
  private naggedTrapdoorAt: TileCoord | undefined
  private readonly entitySprites = new Map<string, Phaser.GameObjects.Sprite>()
  /** What defeated creatures left on the floor, one per creature. */
  private readonly dropSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private gridOverlay?: Phaser.GameObjects.Graphics

  private state!: GameState
  private challenges!: ChallengeRepository
  private services!: GameServices
  /** Who is playing, once the shell has asked. */
  private profile: Profile | undefined
  /** Seed the current dungeon was generated from, so the save can rebuild it. */
  private seed = 0
  /** Last horizontal heading; kept while walking straight up or down. */
  private facing: Facing = 'right'
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
  /**
   * Set once the goal chest is open.
   *
   * The world keeps ticking for the beat before the summary appears, and
   * anything it does in that beat must not write a run back to storage — a
   * finished dungeon offered as "Continue" drops the child into an empty map
   * with nothing left to complete.
   */
  private runFinished = false
  /** Obstacle a tap routed towards, to be bumped once the hero arrives. */
  private pendingBump: TileCoord | undefined
  /** Doorway the hero is standing in while the room is still shut. */
  private blockedAt: TileCoord | undefined

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
    this.doorwayDoors = this.add.group()
    this.entityLayer = this.add.group()
    this.movement = new MovementInput(this)
    this.mover = new GridMover({ tx: 1, ty: 1 })

    // The knight is 32x32 on a 16px grid: two tiles tall and two wide, anchored
    // on the floor line of his tile so he stands in it rather than on it.
    const stand = ANIMS.knightIdleRight[0] as { key: string; frame: number }
    this.hero = this.add
      .sprite(0, 0, stand.key, stand.frame)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.hero)
      .setVisible(false)

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
    if (!exit) {
      this.blockedAt = undefined
      return
    }
    if (this.roomIsOpen()) {
      this.leaveThrough(exit.to, exit.entry)
      return
    }
    // Said once per arrival, not once per frame: a toast that never stops is
    // noise, and a child standing in a doorway would never see anything else.
    if (this.blockedAt?.tx === standingOn.tx && this.blockedAt.ty === standingOn.ty) return
    this.blockedAt = standingOn
    this.services.sfx.play('refused')
    this.services.feedback.show(t(this.uiLocale, 'prompt.roomLocked'))
  }

  /**
   * True when the way down is usable.
   *
   * Two conditions, both of them rules the game already has: the lever has been
   * thrown somewhere else in the maze, and this room's own demand has been met.
   * The second is the same rule that keeps every doorway shut, which is why the
   * treasure of the last room cannot simply be walked past.
   */
  private trapdoorIsOpen(entity: Entity): boolean {
    if (entity.type !== 'trapdoor') return false
    return this.state.isResolved(entity.openedBy) && this.roomIsOpen()
  }

  /**
   * How an entity should be *drawn*, which is not always whether it is done.
   *
   * A trapdoor is the exception: it is drawn open when its lever has been
   * thrown, and it is only ever "resolved" once the hero has gone down it.
   */
  private looksResolved(entity: Entity): boolean {
    if (entity.type === 'trapdoor') return this.trapdoorIsOpen(entity)
    return this.state.isResolved(entity.id)
  }

  /** True when the room's demand has been met and its doorways are open. */
  private roomIsOpen(): boolean {
    return objectiveMet(this.room, (id) => this.state.isResolved(id))
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

  /**
   * Keeps the hero's animation in step with what he is doing.
   *
   * Only the horizontal heading changes which way he faces: walking straight up
   * or down keeps whichever way he was already facing, because the artwork has
   * no front or back view to switch to.
   */
  private playHeroAnimation(): void {
    const heading = this.mover.facing
    if (heading === 'left' || heading === 'right') this.facing = heading
    const key = `knight_${this.mover.isMoving ? 'walk' : 'idle'}_${this.facing}`
    if (this.hero.anims.currentAnim?.key === key || !this.anims.exists(key)) return
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

    this.floor = Math.max(1, request.floor ?? request.restore?.floor ?? 1)
    const plan = generateDungeon({
      seed: floorSeed(request.seed, this.floor),
      difficulty: floorDifficulty(startingDifficulty(request.profile.age), this.floor),
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
      : request.carry
        // A new floor, carrying what the child walked down the ladder with.
        ? GameState.restore({ ...request.carry, resolved: [], slimeProgress: {} })
        : new GameState()

    this.askedChallengeIds.length = 0
    this.visitedRooms.clear()
    this.pendingGameOver = false
    this.runFinished = false
    for (const id of restore?.visitedRooms ?? []) this.visitedRooms.add(id)

    // A finished dungeon is not something to continue into: everything in it
    // is already dealt with, so the child would land in an empty map with no
    // way to complete it. Belt and braces — the run is cleared on completion.
    let resuming = restore !== undefined
    if (resuming && this.isDungeonComplete()) {
      this.state = new GameState()
      this.visitedRooms.clear()
      this.services.save.clearRun()
      resuming = false
    }

    // A save from an older seed, or a room that no longer exists, must never
    // strand the child: fall back to the entrance rather than refusing to load.
    const roomId =
      resuming && restore && this.dungeon.has(restore.roomId)
        ? restore.roomId
        : this.dungeon.startRoomId
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
    if (!this.started || !this.profile || this.runFinished) return
    const snapshot = this.state.snapshot()
    this.services.save.saveRun({
      seed: this.seed,
      floor: this.floor,
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
    if (entity?.type !== 'trapdoor') this.naggedTrapdoorAt = undefined
    if (!entity) return
    if (entity.type === 'trapdoor') {
      this.tryDescend(entity)
      return
    }
    const plan = planInteraction(entity, this.state)
    if (plan.kind !== 'collect') return

    this.state.collectKey(entity.id)
    this.services.hud.update(this.state.totals())
    this.saveProgress()
    this.services.sfx.play('key')
    this.services.feedback.show(t(this.uiLocale, 'event.keyTaken'))
    this.refreshEntitySprite(entity)
  }

  /**
   * Standing on the way down.
   *
   * Said once per arrival, like the shut doorway is: a child standing on a
   * closed trapdoor would otherwise be told the same thing every frame.
   */
  private tryDescend(entity: Entity): void {
    if (this.runFinished || entity.type !== 'trapdoor') return
    if (this.trapdoorIsOpen(entity)) {
      this.state.resolve(entity.id)
      this.refreshEntitySprite(entity)
      this.finishFloor()
      return
    }
    // Its own marker, not the doorway's: the doorway check clears that one on
    // every frame the hero is not in a doorway, which is every frame here.
    if (this.naggedTrapdoorAt?.tx === entity.at.tx && this.naggedTrapdoorAt.ty === entity.at.ty) {
      return
    }
    this.naggedTrapdoorAt = entity.at
    this.services.sfx.play('refused')
    this.services.feedback.show(
      t(this.uiLocale, this.roomIsOpen() ? 'prompt.trapdoorShut' : 'prompt.roomLocked'),
    )
  }

  /** Repaints the way down, e.g. the moment its lever is thrown. */
  private refreshTrapdoors(): void {
    for (const entity of this.room.entities) {
      if (entity.type !== 'trapdoor') continue
      this.refreshEntitySprite(entity)
      const sprite = this.entitySprites.get(entity.id)
      if (sprite && this.trapdoorIsOpen(entity) && this.tweens.getTweensOf(sprite).length === 0) {
        this.pulse(sprite)
      }
    }
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
    if (entity.type === 'key' || entity.type === 'trapdoor') return
    const gate = entity.challenge

    // The age goes with the request, not just the difficulty: it is what lets
    // the educational side pick a question written for a six-year-old rather
    // than a nine-year-old's question turned down a notch.
    const challenge = this.challenges.request({
      locale: this.contentLocale,
      subject: gate.subject,
      ...(gate.skill ? { skill: gate.skill } : {}),
      difficulty: gate.difficulty as 1 | 2 | 3 | 4 | 5,
      age: this.profile?.age ?? DEFAULT_AGE,
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
      // Not unfrozen when the run has just ended: the summary is on its way.
      this.busy = this.runFinished
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
        this.services.feedback.show(
          `${t(this.uiLocale, 'event.slimeDefeated')}${spoils(outcome.gained)}`,
        )
        this.revealGuarded(entity.id)
        this.fadeOutDefeated(entity)
        break
      case 'door_unlocked':
        this.services.sfx.play('door')
        this.services.feedback.show(t(this.uiLocale, 'event.doorUnlocked'))
        break
      case 'chest_opened':
        this.services.sfx.play('chest')
        this.services.feedback.show(
          `${t(this.uiLocale, 'event.chestOpened')}${spoils(outcome.gained)}`,
        )
        break
      case 'mechanism_activated':
        this.services.sfx.play('door')
        this.services.feedback.show(
          `${t(this.uiLocale, 'event.mechanismOn')}${spoils(outcome.gained)}`,
        )
        break
    }

    if ('gained' in outcome && outcome.gained.heartsGained > 0) {
      this.services.sfx.play('key')
      this.services.feedback.show(t(this.uiLocale, 'event.heartFound'))
    }

    this.gainXp(outcome.kind)
    // Doorways stay shut until the room's demand is met, so meeting it has to
    // repaint them: the change is the reward for doing the thing. The way down
    // obeys the same rule, so it repaints on the same beat.
    this.refreshDoorways()
    this.refreshTrapdoors()
    this.saveProgress()
    if (this.isDungeonComplete()) this.finishFloor()
  }

  /**
   * Awards experience and announces a new level.
   *
   * The level does nothing yet, which is exactly why it must be visible and
   * correct now: whatever gets hung off it later inherits this number.
   */
  private gainXp(reason: XpReason): void {
    const result = this.services.progression.award(reason)
    this.services.save.setXp(this.services.progression.xp)
    if (result.levelledUpTo === undefined) return
    this.services.sfx.play('chest')
    this.services.feedback.show(
      `${t(this.uiLocale, 'event.levelUp')} ${result.levelledUpTo}!`,
    )
  }

  private isDungeonComplete(): boolean {
    const goals = this.dungeon.goals()
    return goals.length > 0 && goals.every((goal) => this.state.isResolved(goal.id))
  }

  /**
   * Down the ladder: the floor is behind you, and there is another below.
   *
   * Shown after a beat so the trapdoor opening is seen first rather than being
   * buried by the panel appearing on top of it. There is no last floor: a
   * dungeon that ends is a dungeon a child finishes once, and the questions go
   * on getting a little harder as long as they keep going down.
   */
  private finishFloor(): void {
    this.busy = true
    this.runFinished = true
    this.gainXp('dungeon_complete')
    /*
     * The save moves down with the child, rather than being cleared.
     *
     * This floor is behind them and there is nothing left in it to continue
     * into, but the next one has not been built yet: the room id is left blank
     * on purpose, and `startRun` falls back to the entrance for a room it does
     * not recognise. Closing the tab on the summary therefore resumes on the
     * floor below, with what they were carrying, rather than losing the run.
     */
    this.services.save.saveRun({
      seed: this.seed,
      floor: this.floor + 1,
      roomId: '',
      resolved: [],
      slimeProgress: {},
      ...this.state.totals(),
      visitedRooms: [],
    })
    this.services.music.stop()
    this.services.music.play('victory')
    const finished = this.floor
    const carry = this.state.totals()
    this.time.delayedCall(1200, () => {
      this.services.completionPanel.show(
        {
          ...carry,
          roomsExplored: this.visitedRooms.size,
          level: this.services.progression.level,
          floor: finished,
        },
        this.uiLocale,
        () => this.descend(finished + 1, carry),
      )
    })
  }

  /** Builds the next floor down, keeping what the child is carrying. */
  private descend(floor: number, carry: RunTotals): void {
    const profile = this.profile
    if (!profile) return
    this.runFinished = false
    this.services.music.play('dungeon')
    this.startRun({ profile, seed: this.seed, floor, carry })
  }

  /** Starts the same dungeon over from its entrance, with full hearts. */
  private restart(): void {
    this.services.music.play('dungeon')
    this.state = new GameState()
    this.askedChallengeIds.length = 0
    this.visitedRooms.clear()
    this.pendingGameOver = false
    this.runFinished = false
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
    this.dropSprites.clear()
    for (const entity of this.room.entities) {
      const resolved = this.looksResolved(entity)
      const anchorPoint = tileToWorldAnchor(entity.at)
      const art = entityArt(entity, resolved)
      const sprite = this.add
        .sprite(anchorPoint.x, anchorPoint.y, art.key, art.frame)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.entity)
      this.entityLayer.add(sprite)
      this.entitySprites.set(entity.id, sprite)
      this.playEntityAnimation(entity, sprite, resolved)
      this.applyEntityVisibility(entity, sprite)
      if (entity.type === 'slime' && resolved) this.revealDrop(entity, true)
      if (entity.type === 'trapdoor' && resolved) this.pulse(sprite)
    }
  }

  /**
   * The slow breath an open way-down gets, and nothing else does.
   *
   * The same cue an open doorway gets, for the same reason: it is the one thing
   * in the room a child is meant to walk to next, and the difference between
   * the shut ladder and the lit one is a shade of brown otherwise.
   */
  private pulse(sprite: Phaser.GameObjects.Sprite): void {
    this.tweens.add({
      targets: sprite,
      alpha: { from: 0.75, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })
  }

  /**
   * Shows what a creature left behind, once it has faded.
   *
   * Kept beside the creature's own sprite rather than replacing it: the fade
   * has to cross from one to the other, and on the way back into a room the
   * creature is simply never shown while its trophy is.
   */
  private revealDrop(entity: Entity, immediate: boolean): void {
    const drop = entityDrop(entity)
    if (!drop) return
    let sprite = this.dropSprites.get(entity.id)
    if (!sprite) {
      const at = tileToWorldAnchor(entity.at)
      sprite = this.add
        .sprite(at.x, at.y, drop.art.key, drop.art.frame)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.entity - 1)
      this.entityLayer.add(sprite)
      this.dropSprites.set(entity.id, sprite)
      if (drop.anim && this.anims.exists(drop.anim)) sprite.play(drop.anim, true)
    }
    sprite.setVisible(true)
    if (immediate) {
      sprite.setAlpha(1)
      return
    }
    sprite.setAlpha(0)
    this.tweens.add({ targets: sprite, alpha: 1, duration: 260, delay: 300 })
  }

  /**
   * Blinks a beaten creature out, and leaves its trophy behind.
   *
   * It used to linger at half opacity for good, which read as a creature that
   * had not quite gone. Two blinks say "that worked", the fade says "it is
   * over", and the coin or the potion on the floor says what it was worth.
   */
  private fadeOutDefeated(entity: Entity): void {
    const sprite = this.entitySprites.get(entity.id)
    if (!sprite) return
    this.tweens.add({
      targets: sprite,
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: 260,
          onComplete: () => sprite.setVisible(false),
        })
      },
    })
    this.revealDrop(entity, false)
  }

  private refreshEntitySprite(entity: Entity): void {
    const sprite = this.entitySprites.get(entity.id)
    if (!sprite) return
    const resolved = this.looksResolved(entity)
    const art = entityArt(entity, resolved)
    sprite.setTexture(art.key, art.frame)
    this.playEntityAnimation(entity, sprite, resolved)
    this.applyEntityVisibility(entity, sprite)
  }

  /** Creatures breathe; furniture does not. */
  private playEntityAnimation(
    entity: Entity,
    sprite: Phaser.GameObjects.Sprite,
    resolved: boolean,
  ): void {
    const key = entityAnimation(entity, resolved)
    if (key === undefined || !this.anims.exists(key)) return
    sprite.play(key, true)
  }

  private applyEntityVisibility(entity: Entity, sprite: Phaser.GameObjects.Sprite): void {
    if (entity.type === 'door') {
      // There is no open-door drawing, and there does not need to be: a doorway
      // you can walk through is one you can see through.
      sprite.setVisible(!this.state.isResolved(entity.id))
      return
    }
    if (entity.type === 'key') {
      const hidden =
        this.state.isResolved(entity.id) ||
        (entity.guardedBy !== undefined && !this.state.isResolved(entity.guardedBy))
      sprite.setVisible(!hidden)
      return
    }
    // A beaten creature is gone; what it left behind is the record of it.
    if (entity.type === 'slime' && this.state.isResolved(entity.id)) {
      sprite.setVisible(false)
      return
    }
    sprite.setVisible(true)
    sprite.setAlpha(1)
  }

  private enterRoom(room: RoomDefinition, entry?: string): void {
    this.room = room
    this.visitedRooms.add(room.id)

    this.terrainLayer.clear(true, true)
    this.doorwayDoors.clear(true, true)
    this.entityLayer.clear(true, true)
    this.gridOverlay?.destroy()
    this.pendingBump = undefined

    this.blockedAt = undefined
    this.naggedTrapdoorAt = undefined
    this.drawTerrain()
    this.drawTorches()
    this.drawEntities()
    this.drawDoorways()
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
      tileset: this.textures.exists('sheet_walls'),
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
        terrainLayers(this.room, { tx, ty }).forEach((art, layer) => {
          const tile = this.add
            .image(x, y, art.key, art.frame)
            .setOrigin(0, 0)
            .setDepth(DEPTH.terrain + layer)
          this.terrainLayer.add(tile)
        })
      }
    }
  }

  /**
   * Hangs lit torches along the top wall.
   *
   * Decoration, but not only: `ART_DIRECTION.md` reserves warm light for the
   * places a child should look, and a room of unbroken masonry gives the eye
   * nothing. They go on the wall face, never on a doorway.
   */
  private drawTorches(): void {
    if (!this.textures.exists('sheet_torch')) return
    for (let tx = 3; tx < this.room.width - 2; tx += TORCH_SPACING) {
      const at = { tx, ty: 0 }
      if (exitAt(this.room, at) || entityAt(this.room, at)) continue
      // Only on a brick face — a torch on the thin side edge or the bottom lip
      // would hang in mid-air. The rivet variant is still a brick face.
      const piece = terrainLayers(this.room, at).at(-1)
      if (piece !== WALLS.top && piece !== WALLS.topRivet) continue
      const { x, y } = tileToWorldAnchor(at)
      const torch = this.add
        .sprite(x, y, ANIMS.torch[0]?.key ?? '', ANIMS.torch[0]?.frame ?? 0)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.decor)
      if (this.anims.exists('torch')) torch.play('torch', true)
      this.terrainLayer.add(torch)
    }
  }

  /**
   * Puts a door in every doorway that cannot be walked through.
   *
   * There used to be a translucent square here instead, tinted gold when the
   * way was open and mint when it was not. It did the job, but it was a
   * gameplay marker painted over the art rather than part of it: a child saw a
   * coloured box, not a dungeon. Now the room simply has doors, one drawn for
   * each wall, and when the room's demand is met they are gone and the gaps
   * are the way out.
   *
   * A doorway that has a door *entity* — one with a lock and a question — is
   * that entity's business from beginning to end, so nothing is drawn over it.
   */
  private drawDoorways(): void {
    if (this.roomIsOpen()) return
    for (const exit of this.room.exits) {
      if (entityAt(this.room, exit.at)?.type === 'door') continue
      const wall = wallAt(this.room, exit.at)
      if (!wall) continue
      const art = doorArt(wall)
      const at = tileToWorldAnchor(exit.at)
      this.doorwayDoors.add(
        this.add.image(at.x, at.y, art.key, art.frame).setOrigin(0.5, 1).setDepth(DEPTH.exit),
      )
    }
  }

  /** Repaints the doorways, e.g. the moment the room's demand is met. */
  private refreshDoorways(): void {
    this.doorwayDoors.clear(true, true)
    this.drawDoorways()
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
    // Off by default now that the room is real artwork: the grid was there to
    // make a floor of identical magenta squares legible. G still brings it back.
    graphics.setDepth(DEPTH.grid).setVisible(this.gridOverlay?.visible ?? false)
    this.gridOverlay = graphics
  }
}

/** " +5 monedas  +1 estrella" — only the parts that actually happened. */
function spoils(gained: { coins: number; stars: number }): string {
  const parts: string[] = []
  if (gained.coins > 0) parts.push(`+${gained.coins}\u00a4`)
  if (gained.stars > 0) parts.push(`+${gained.stars}\u2605`)
  return parts.length ? `  ${parts.join('  ')}` : ''
}
