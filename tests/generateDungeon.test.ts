import { describe, expect, it } from 'vitest'
import { generateDungeon } from '../src/game/world/generateDungeon'
import { Dungeon } from '../src/game/world/dungeon'
import { entityAt, exitAt, isBlocked, type RoomDefinition } from '../src/game/world/room'
import { findPath } from '../src/game/world/pathfinding'
import { blocksMovement, CREATURES, DOOR_ORIENTATIONS } from '../src/game/entities/entity'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'

const SEEDS = [1, 2, 7, 42, 99, 123, 2024, 31337, 555, 8080]
const plans = SEEDS.map((seed) => generateDungeon({ seed, difficulty: 2 }))

describe('generated dungeons', () => {
  it('produces between ten and twelve rooms', () => {
    for (const plan of plans) {
      expect(plan.rooms.length, `seed ${plan.seed}`).toBeGreaterThanOrEqual(10)
      expect(plan.rooms.length, `seed ${plan.seed}`).toBeLessThanOrEqual(12)
    }
  })

  it('is reproducible from its seed alone', () => {
    // What lets a saved game store a number instead of a map.
    const a = generateDungeon({ seed: 4242, difficulty: 3 })
    const b = generateDungeon({ seed: 4242, difficulty: 3 })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('produces different dungeons for different seeds', () => {
    const shapes = new Set(plans.map((p) => JSON.stringify(p.rooms.map((r) => r.exits.length))))
    expect(shapes.size).toBeGreaterThan(1)
  })

  it('passes the same validation as a hand-authored room', () => {
    // generateDungeon builds through parseRoom, so this is really asserting the
    // generator cannot emit anything the game would reject at load.
    for (const plan of plans) expect(() => new Dungeon(plan.rooms)).not.toThrow()
  })

  it('names every room in both locales', () => {
    for (const room of plans[0]!.rooms) {
      for (const locale of SUPPORTED_LOCALES) expect(room.name[locale]).toBeTruthy()
    }
  })

  it('connects every room to the start', () => {
    for (const plan of plans) {
      const dungeon = new Dungeon(plan.rooms)
      const seen = new Set([plan.startRoomId])
      const queue = [plan.startRoomId]
      while (queue.length) {
        const room = dungeon.room(queue.shift() as string)
        for (const exit of room.exits) {
          if (seen.has(exit.to)) continue
          seen.add(exit.to)
          queue.push(exit.to)
        }
      }
      expect(seen.size, `seed ${plan.seed}`).toBe(plan.rooms.length)
    }
  })

  it('links every doorway in both directions', () => {
    for (const plan of plans) {
      const dungeon = new Dungeon(plan.rooms)
      for (const room of plan.rooms) {
        for (const exit of room.exits) {
          const back = dungeon.room(exit.to).exits.find((e) => e.to === room.id)
          expect(back, `${room.id} -> ${exit.to} has no way back`).toBeDefined()
        }
      }
    }
  })

  it('never puts an arrival point on a doorway', () => {
    for (const plan of plans) {
      for (const room of plan.rooms) {
        for (const [name, coord] of Object.entries(room.entries)) {
          expect(exitAt(room, coord), `${room.id} entry ${name}`).toBeUndefined()
        }
        expect(exitAt(room, room.spawn), `${room.id} spawn`).toBeUndefined()
      }
    }
  })

  it('leaves every walkable tile reachable within each room', () => {
    const walkable = (room: RoomDefinition) => (coord: { tx: number; ty: number }) => {
      if (isBlocked(room, coord)) return false
      const entity = entityAt(room, coord)
      return !entity || !blocksMovement(entity, false)
    }
    for (const plan of plans) {
      for (const room of plan.rooms) {
        const canEnter = walkable(room)
        const from = canEnter(room.spawn) ? room.spawn : undefined
        expect(from, `${plan.seed}/${room.id}: spawn is blocked`).toBeDefined()
        for (let ty = 0; ty < room.height; ty++) {
          for (let tx = 0; tx < room.width; tx++) {
            if (!canEnter({ tx, ty })) continue
            expect(
              findPath(room.spawn, { tx, ty }, canEnter),
              `seed ${plan.seed} ${room.id}: (${tx},${ty}) unreachable`,
            ).not.toBeNull()
          }
        }
      }
    }
  })
})

describe('generated dungeons can actually be finished', () => {
  /**
   * Walks the dungeon the way a player would, collecting keys and spending them
   * on locked doors, and asserts the goal is reachable.
   *
   * This is the invariant that matters most: a dungeon a child cannot complete
   * is worse than a boring one, and a layout bug that strands them would be
   * invisible until someone played all the way through.
   */
  const solve = (plan: ReturnType<typeof generateDungeon>) => {
    const dungeon = new Dungeon(plan.rooms)
    const open = new Set([plan.startRoomId])
    const resolved = new Set<string>()
    let keys = 0
    let progress = true

    while (progress) {
      progress = false
      for (const roomId of [...open]) {
        const room = dungeon.room(roomId)

        for (const entity of room.entities) {
          if (resolved.has(entity.id)) continue
          if (entity.type === 'slime') {
            resolved.add(entity.id)
            progress = true
          }
          if (entity.type === 'chest') {
            // A locked chest costs a key, exactly as it does in the game.
            if (entity.requiresKey && keys <= 0) continue
            if (entity.requiresKey) keys -= 1
            resolved.add(entity.id)
            progress = true
          }
          if (entity.type === 'mechanism') {
            resolved.add(entity.id)
            progress = true
          }
          if (entity.type === 'key') {
            if (entity.guardedBy && !resolved.has(entity.guardedBy)) continue
            resolved.add(entity.id)
            keys += 1
            progress = true
          }
          if (entity.type === 'door' && (!entity.requiresKey || keys > 0)) {
            if (entity.requiresKey) keys -= 1
            resolved.add(entity.id)
            progress = true
          }
        }

        // Every room asks for something before its doorways open.
        if (!room.objective.every((id) => resolved.has(id))) continue

        for (const exit of room.exits) {
          // A door standing on the doorway blocks passage until it is dealt with.
          const guard = entityAt(room, exit.at)
          if (guard && guard.type === 'door' && !resolved.has(guard.id)) continue
          if (open.has(exit.to)) continue
          open.add(exit.to)
          progress = true
        }
      }
    }
    return { reached: open, resolved, keys }
  }

  it('lets the player reach the goal room on every seed', () => {
    for (const plan of plans) {
      const { reached } = solve(plan)
      expect(reached.has(plan.exitRoomId), `seed ${plan.seed}: goal room unreachable`).toBe(true)
    }
  })

  it('lets the player open the goal chest on every seed', () => {
    for (const plan of plans) {
      const { resolved } = solve(plan)
      expect(resolved.has('chest_goal'), `seed ${plan.seed}: goal chest unopenable`).toBe(true)
    }
  })

  it('never demands more keys than the dungeon hands out', () => {
    for (const plan of plans) {
      const entities = plan.rooms.flatMap((r) => r.entities)
      const locks = entities.filter(
        (e) => (e.type === 'door' || e.type === 'chest') && e.requiresKey,
      )
      const keys = entities.filter((e) => e.type === 'key')
      // Strictly more, not merely enough: a child who has to spend every key
      // perfectly has been set a puzzle nobody asked for.
      expect(keys.length, `seed ${plan.seed}`).toBeGreaterThan(locks.length)
    }
  })

  // Asked for explicitly: keys come from enemies or chests, and are what open
  // treasure rooms and the way out.
  it('hands out keys from both slimes and chests', () => {
    for (const plan of plans) {
      const entities = plan.rooms.flatMap((r) => r.entities)
      const byId = new Map(entities.map((e) => [e.id, e]))
      const guards = entities
        .filter((e) => e.type === 'key' && e.guardedBy)
        .map((e) => byId.get((e as { guardedBy?: string }).guardedBy as string)?.type)
      expect(guards, `seed ${plan.seed}`).toContain('slime')
      expect(guards, `seed ${plan.seed}`).toContain('chest')
    }
  })

  it('locks the way out behind a key', () => {
    for (const plan of plans) {
      const goal = plan.rooms
        .flatMap((r) => r.entities)
        .find((e) => e.type === 'chest' && e.goal === true)
      expect(goal, `seed ${plan.seed}`).toBeDefined()
      expect((goal as { requiresKey: boolean }).requiresKey, `seed ${plan.seed}`).toBe(true)
    }
  })

  // The one arrangement that could deadlock: a key sealed inside the chest that
  // needs that key to open.
  it('never hides a key inside a locked chest', () => {
    for (const plan of plans) {
      const entities = plan.rooms.flatMap((r) => r.entities)
      const byId = new Map(entities.map((e) => [e.id, e]))
      for (const key of entities.filter((e) => e.type === 'key')) {
        const guard = byId.get((key as { guardedBy?: string }).guardedBy ?? '')
        if (guard?.type !== 'chest') continue
        expect(guard.requiresKey, `seed ${plan.seed}: ${key.id}`).toBe(false)
      }
    }
  })

  /*
   * A door stands on the doorway of the room you are *leaving*, not inside the
   * room it protects: the transition fires on that tile, so a door placed on
   * the far side locks the child in rather than out.
   */
  it('only ever seals the way into a dead-end room', () => {
    for (const plan of plans) {
      const dungeon = new Dungeon(plan.rooms)
      for (const room of plan.rooms) {
        for (const door of room.entities.filter((e) => e.type === 'door')) {
          const exit = exitAt(room, door.at)
          expect(exit, `seed ${plan.seed}: ${door.id} is not on a doorway`).toBeDefined()
          const sealed = dungeon.room((exit as { to: string }).to)
          expect(sealed.exits.length, `seed ${plan.seed}: ${door.id} seals a through-room`).toBe(1)
        }
      }
    }
  })

  it('puts a slime and a key in the dungeon on every seed', () => {
    for (const plan of plans) {
      const all = plan.rooms.flatMap((r) => r.entities)
      expect(all.some((e) => e.type === 'slime'), `seed ${plan.seed}`).toBe(true)
      expect(all.some((e) => e.type === 'key'), `seed ${plan.seed}`).toBe(true)
    }
  })

  // The point of the objective: no room is scenery a child walks through.
  it('asks for something in every single room', () => {
    for (const plan of plans) {
      for (const room of plan.rooms) {
        expect(room.objective.length, `seed ${plan.seed}: ${room.id} has nothing to do`)
          .toBeGreaterThan(0)
      }
    }
  })

  it('never makes a room demand something that needs a key', () => {
    for (const plan of plans) {
      for (const room of plan.rooms.filter((r) => r.id !== plan.exitRoomId)) {
        for (const id of room.objective) {
          const entity = room.entities.find((e) => e.id === id)
          const locked = entity?.type === 'chest' && entity.requiresKey
          expect(locked, `seed ${plan.seed}: ${room.id} demands locked ${id}`).toBe(false)
        }
      }
    }
  })

  it('asks for a fight in some rooms and a puzzle in others', () => {
    for (const plan of plans) {
      const kinds = new Set(
        plan.rooms.flatMap((room) =>
          room.objective.map((id) => room.entities.find((e) => e.id === id)?.type),
        ),
      )
      expect(kinds.size, `seed ${plan.seed}: every room asks the same thing`).toBeGreaterThan(1)
    }
  })

  it('never puts more than two creatures in one room', () => {
    for (const plan of plans) {
      for (const room of plan.rooms) {
        const slimes = room.entities.filter((e) => e.type === 'slime')
        expect(slimes.length, `seed ${plan.seed}: ${room.id}`).toBeLessThanOrEqual(2)
      }
    }
  })

  // Coins on everything, hearts occasionally: a heart has to be rare enough
  // to be a rescue, and coins common enough that a room always pays something.
  it('pays coins for every objective in the dungeon', () => {
    for (const plan of plans) {
      for (const room of plan.rooms) {
        for (const id of room.objective) {
          const entity = room.entities.find((e) => e.id === id)
          const payout =
            entity?.type === 'slime' ? entity.drop
            : entity?.type === 'chest' || entity?.type === 'mechanism' ? entity.reward
            : undefined
          expect(payout?.coins, `seed ${plan.seed}: ${id} pays nothing`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('hides a heart somewhere in most dungeons', () => {
    const withHearts = plans.filter((plan) =>
      plan.rooms.some((room) =>
        room.entities.some(
          (e) =>
            (e.type === 'chest' && e.reward.hearts > 0) ||
            (e.type === 'slime' && e.drop.hearts > 0) ||
            (e.type === 'mechanism' && e.reward.hearts > 0),
        ),
      ),
    )
    expect(withHearts.length).toBe(plans.length)
  })

  it('leaves the first room safe, so a child is not ambushed on arrival', () => {
    for (const plan of plans) {
      const start = plan.rooms.find((r) => r.id === plan.startRoomId)!
      expect(start.entities.filter((e) => e.type === 'slime'), `seed ${plan.seed}`).toHaveLength(0)
    }
  })

  // Three creatures are drawn and all three should turn up: a dungeon of
  // nothing but snakes wastes two thirds of the artwork, and a child notices.
  it('uses every creature the tileset draws', () => {
    const seen = new Set<string>()
    for (const plan of plans) {
      for (const room of plan.rooms) {
        for (const entity of room.entities) {
          if (entity.type === 'slime') seen.add(entity.creature)
        }
      }
    }
    expect([...seen].sort()).toEqual([...CREATURES].sort())
  })

  // A door has to know which wall it is standing in, because the three walls
  // are drawn three different ways. Over ten seeds all three should appear.
  it('stands its doors in every kind of wall', () => {
    const seen = new Set<string>()
    for (const plan of plans) {
      for (const room of plan.rooms) {
        for (const entity of room.entities) {
          if (entity.type === 'door') seen.add(entity.orientation)
        }
      }
    }
    expect([...seen].sort()).toEqual([...DOOR_ORIENTATIONS].sort())
  })
})
