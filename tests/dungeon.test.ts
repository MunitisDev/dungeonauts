import { describe, expect, it } from 'vitest'
import { Dungeon, loadDungeon } from '../src/game/world/dungeon'
import { exitAt, isBlocked, parseRoom } from '../src/game/world/room'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'

const room = (id: string, overrides: Record<string, unknown> = {}) =>
  parseRoom({
    id,
    name: { es: id, en: id },
    tiles: ['###', '#.#', '###'],
    spawn: { tx: 1, ty: 1 },
    ...overrides,
  })

describe('Dungeon', () => {
  it('rejects an empty dungeon', () => {
    expect(() => new Dungeon([])).toThrow(/at least one room/)
  })

  it('rejects duplicate room ids', () => {
    expect(() => new Dungeon([room('a'), room('a')])).toThrow(/Duplicate room id "a"/)
  })

  // A doorway to nowhere would strand a child mid-dungeon, so it fails on load.
  it('rejects an exit to a room that does not exist', () => {
    expect(() =>
      new Dungeon([
        room('a', { exits: [{ at: { tx: 1, ty: 1 }, to: 'ghost', entry: 'north' }] }),
      ]),
    ).toThrow(/exits to unknown room "ghost"/)
  })

  it('rejects an exit to an entry the destination does not declare', () => {
    expect(() =>
      new Dungeon([
        room('a', { exits: [{ at: { tx: 1, ty: 1 }, to: 'b', entry: 'nowhere' }] }),
        room('b'),
      ]),
    ).toThrow(/entry "nowhere", which is not declared/)
  })

  it('looks rooms up by id and fails loudly on an unknown one', () => {
    const dungeon = new Dungeon([room('a')])
    expect(dungeon.room('a').id).toBe('a')
    expect(dungeon.has('a')).toBe(true)
    expect(dungeon.has('b')).toBe(false)
    expect(() => dungeon.room('b')).toThrow(/Unknown room "b"/)
  })
})

describe('the shipped dungeon', () => {
  const dungeon = loadDungeon()

  it('loads the three slice rooms', () => {
    expect(dungeon.size).toBe(3)
    expect(dungeon.roomIds).toEqual(['room_01', 'room_02', 'room_03'])
    expect(dungeon.startRoomId).toBe('room_01')
  })

  it('names every room in both locales', () => {
    for (const id of dungeon.roomIds) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(dungeon.room(id).name[locale], `${id}/${locale}`).toBeTruthy()
      }
    }
  })

  it('encloses every room, so nothing can walk off the grid', () => {
    for (const id of dungeon.roomIds) {
      const room = dungeon.room(id)
      for (let tx = 0; tx < room.width; tx++) {
        for (const ty of [0, room.height - 1]) {
          const isDoorway = exitAt(room, { tx, ty }) !== undefined
          if (isDoorway) continue
          expect(isBlocked(room, { tx, ty }), `${id} (${tx},${ty})`).toBe(true)
        }
      }
      for (let ty = 0; ty < room.height; ty++) {
        for (const tx of [0, room.width - 1]) {
          expect(isBlocked(room, { tx, ty }), `${id} (${tx},${ty})`).toBe(true)
        }
      }
    }
  })

  /**
   * Arriving on top of an exit would send the hero straight back, so the two
   * rooms would ping-pong forever. Entry points must sit beside a doorway,
   * never on one.
   */
  it('never places an arrival point on an exit tile', () => {
    for (const id of dungeon.roomIds) {
      const room = dungeon.room(id)
      for (const [name, coord] of Object.entries(room.entries)) {
        expect(exitAt(room, coord), `${id} entry "${name}" sits on an exit`).toBeUndefined()
      }
      expect(exitAt(room, room.spawn), `${id} spawn sits on an exit`).toBeUndefined()
    }
  })

  it('makes every connection walkable in both directions', () => {
    for (const id of dungeon.roomIds) {
      const room = dungeon.room(id)
      for (const exit of room.exits) {
        const destination = dungeon.room(exit.to)
        const arrival = destination.entries[exit.entry]
        expect(arrival, `${id} -> ${exit.to}/${exit.entry}`).toBeDefined()
        expect(isBlocked(destination, arrival!), 'arrival must be walkable').toBe(false)

        const back = destination.exits.find((candidate) => candidate.to === id)
        expect(back, `${exit.to} has no way back to ${id}`).toBeDefined()
      }
    }
  })

  it('connects all three rooms into one reachable dungeon', () => {
    const seen = new Set([dungeon.startRoomId])
    const queue = [dungeon.startRoomId]
    while (queue.length > 0) {
      const current = dungeon.room(queue.shift() as string)
      for (const exit of current.exits) {
        if (seen.has(exit.to)) continue
        seen.add(exit.to)
        queue.push(exit.to)
      }
    }
    expect([...seen].sort()).toEqual(dungeon.roomIds.sort())
  })
})
