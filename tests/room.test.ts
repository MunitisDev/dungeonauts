import { describe, expect, it } from 'vitest'
import roomDocument from '../data/rooms/room_01.json'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'
import { WALLS } from '../src/engine/assets/tileset'
import {
  isBlocked,
  objectiveMet,
  parseRoom,
  TERRAIN_LEGEND,
  terrainArt,
  terrainLayers,
  terrainAt,
  TERRAIN_KINDS,
} from '../src/game/world/room'

const room = () => parseRoom(roomDocument)

describe('room parsing', () => {
  it('reads the shipped test room', () => {
    const parsed = room()
    expect(parsed.id).toBe('room_01')
    expect(parsed.width).toBe(15)
    expect(parsed.height).toBe(10)
    expect(parsed.terrain).toHaveLength(10)
    expect(parsed.terrain[0]).toHaveLength(15)
  })

  it('requires a name in every supported locale', () => {
    const parsed = room()
    for (const locale of SUPPORTED_LOCALES) {
      expect(parsed.name[locale], locale).toBeTruthy()
    }
    expect(() => parseRoom({ id: 'r', name: { es: 'Sala' }, tiles: ['#'] })).toThrow(
      /missing "name.en"/,
    )
  })

  it('rejects ragged grids instead of rendering a broken room', () => {
    expect(() =>
      parseRoom({ id: 'r', name: { es: 'a', en: 'b' }, tiles: ['###', '##'] }),
    ).toThrow(/row 1 has width 2, expected 3/)
  })

  it('rejects unknown terrain characters and names the coordinate', () => {
    expect(() =>
      parseRoom({ id: 'r', name: { es: 'a', en: 'b' }, tiles: ['#.#', '#?#'] }),
    ).toThrow(/unknown terrain character "\?" at \(1, 1\)/)
  })

  it('rejects structurally invalid documents', () => {
    expect(() => parseRoom(null)).toThrow(/must be an object/)
    expect(() => parseRoom({ name: { es: 'a', en: 'b' }, tiles: ['#'] })).toThrow(/"id"/)
    expect(() => parseRoom({ id: 'r', name: { es: 'a', en: 'b' }, tiles: [] })).toThrow(/non-empty/)
  })
})

describe('room terrain', () => {
  it('reads terrain by tile coordinate', () => {
    const parsed = room()
    expect(terrainAt(parsed, { tx: 0, ty: 0 })).toBe('wall_corner')
    expect(terrainAt(parsed, { tx: 1, ty: 0 })).toBe('wall')
    expect(terrainAt(parsed, { tx: 1, ty: 1 })).toBe('floor')
    expect(terrainAt(parsed, { tx: 5, ty: 2 })).toBe('floor_alt')
  })

  it('returns undefined outside the grid', () => {
    const parsed = room()
    expect(terrainAt(parsed, { tx: -1, ty: 0 })).toBeUndefined()
    expect(terrainAt(parsed, { tx: 0, ty: 99 })).toBeUndefined()
  })

  it('blocks walls and everything beyond the room bounds', () => {
    const parsed = room()
    expect(isBlocked(parsed, { tx: 0, ty: 0 })).toBe(true) // corner
    expect(isBlocked(parsed, { tx: 7, ty: 0 })).toBe(true) // wall
    expect(isBlocked(parsed, { tx: 7, ty: 5 })).toBe(false) // floor
    expect(isBlocked(parsed, { tx: 5, ty: 2 })).toBe(false) // decorative floor variant
    expect(isBlocked(parsed, { tx: -1, ty: 5 })).toBe(true) // outside
    expect(isBlocked(parsed, { tx: 99, ty: 99 })).toBe(true) // outside
  })

  /**
   * The perimeter is solid apart from doorways. A gap that is not a doorway
   * would let the hero walk out of the room and off the grid.
   */
  it('encloses the room except at its doorways', () => {
    const parsed = room()
    const openings = parsed.exits.map((exit) => `${exit.at.tx},${exit.at.ty}`)
    expect(openings.length, 'room_01 should have a way out').toBeGreaterThan(0)

    const perimeterMustBlock = (tx: number, ty: number, label: string) => {
      if (openings.includes(`${tx},${ty}`)) return
      expect(isBlocked(parsed, { tx, ty }), label).toBe(true)
    }
    for (let tx = 0; tx < parsed.width; tx++) {
      perimeterMustBlock(tx, 0, `top ${tx}`)
      perimeterMustBlock(tx, parsed.height - 1, `bottom ${tx}`)
    }
    for (let ty = 0; ty < parsed.height; ty++) {
      perimeterMustBlock(0, ty, `left ${ty}`)
      perimeterMustBlock(parsed.width - 1, ty, `right ${ty}`)
    }
  })
})

describe('terrain wiring', () => {
  it('maps every legend character to a known terrain kind', () => {
    for (const kind of Object.values(TERRAIN_LEGEND)) {
      expect(TERRAIN_KINDS).toContain(kind)
    }
  })

  it('draws something for every tile of the shipped room', () => {
    const parsed = room()
    for (let ty = 0; ty < parsed.height; ty++) {
      for (let tx = 0; tx < parsed.width; tx++) {
        const art = terrainArt(parsed, { tx, ty })
        expect(art.key, `(${tx},${ty})`).toBeTruthy()
        expect(Number.isInteger(art.frame), `(${tx},${ty})`).toBe(true)
        expect(art.frame, `(${tx},${ty})`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  /*
   * A doorway is floor like any other tile.
   *
   * It was left dark for a while, to stop a slab of paving sticking out past
   * the side walls. That cost more than it saved: at the near wall it put a
   * black square above the door, and a doorway is somewhere you walk, not
   * somewhere you fall.
   */
  it('paves a doorway like the rest of the room', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+#.#+', '....#', '#...#', '+#.#+'],
      spawn: { tx: 1, ty: 1 },
    })
    for (const gap of [{ tx: 2, ty: 0 }, { tx: 2, ty: 3 }, { tx: 0, ty: 1 }]) {
      const layers = terrainLayers(parsed, gap)
      expect(layers, `(${gap.tx},${gap.ty})`).toHaveLength(1)
      expect(layers[0]?.key, `(${gap.tx},${gap.ty})`).toBe('sheet_floor')
    }
  })

  it('gives a wall its piece from where the floor is', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
    })
    // The wall piece is the topmost layer: a thin edge is drawn over floor, so
    // the base layer of a corner is the same ground as everywhere else.
    const art = (tx: number, ty: number) => terrainLayers(parsed, { tx, ty }).at(-1) as {
      key: string
      frame: number
    }
    // Top and bottom walls are not the same tile, nor are left and right.
    expect(art(2, 0)).not.toEqual(art(2, 3))
    expect(art(0, 1)).not.toEqual(art(4, 1))
    // The four corners are all different from each other.
    const corners = [art(0, 0), art(4, 0), art(0, 3), art(4, 3)]
      .map((a) => `${a.key}#${String(a.frame)}`)
    expect(new Set(corners).size).toBe(4)
  })

  it('puts floor behind the bottom lip only', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
    })
    // Top wall: a full brick face, nothing behind it.
    expect(terrainLayers(parsed, { tx: 2, ty: 0 })).toHaveLength(1)
    // The lip is a strip along the bottom of its cell, so the room's floor has
    // to run up to it.
    expect(terrainLayers(parsed, { tx: 2, ty: 3 })).toHaveLength(2)
    // A side edge is a strip too, but at the *inner* edge of its cell: floor
    // behind it would be paving outside the room.
    for (const coord of [{ tx: 0, ty: 1 }, { tx: 4, ty: 1 }]) {
      expect(terrainLayers(parsed, coord), `(${coord.tx},${coord.ty})`).toHaveLength(1)
    }
  })

  /*
   * A doorway cut into a side wall leaves the cell above it with floor
   * underneath, which looks exactly like the top of a room. Taking the brick
   * face there puts a slab of masonry halfway down the side of the dungeon.
   */
  it('keeps a side wall looking like a side wall above a doorway', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '....#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
    })
    const piece = (tx: number, ty: number) => terrainLayers(parsed, { tx, ty }).at(-1)
    // (0,2) is the doorway; (0,1) sits directly above it.
    expect(piece(0, 1)).toEqual(piece(0, 3))
    expect(piece(0, 1)).not.toEqual(piece(2, 0))
  })

  it('keeps a top wall looking like a top wall beside a doorway', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+#.#+', '#...#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
    })
    const piece = (tx: number, ty: number) => terrainLayers(parsed, { tx, ty }).at(-1)
    // (2,0) is the doorway; (1,0) and (3,0) flank it and stay brick faces.
    expect(piece(1, 0)).not.toEqual(piece(0, 1))
    expect(terrainLayers(parsed, { tx: 1, ty: 0 })).toHaveLength(1)
  })

  /*
   * The lip runs straight past a doorway.
   *
   * It used to gain a jamb on each side of the gap. That framed the opening,
   * but it stood two posts up out of a wall four pixels tall — a little
   * corridor either side of the door. The door is what marks the way.
   */
  it('runs the bottom lip straight past a doorway', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '#...#', '+#.#+'],
      spawn: { tx: 1, ty: 1 },
    })
    // The floor behind the lip varies per tile on purpose, so compare the
    // wall piece rather than the whole stack.
    for (const tx of [1, 3]) {
      const layers = terrainLayers(parsed, { tx, ty: 3 })
      expect(layers, `(${tx},3)`).toHaveLength(2)
      expect(layers.at(-1), `(${tx},3)`).toEqual(WALLS.bottom)
    }
    // And the gap itself is plain floor, like the rest of the room.
    expect(terrainLayers(parsed, { tx: 2, ty: 3 })).toHaveLength(1)
  })

  /*
   * The corners are strips too, and a strip with floor behind it puts paving
   * outside the room — a purple ledge sticking out past the bottom corners.
   */
  it('leaves nothing behind a corner', () => {
    const parsed = parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
    })
    for (const coord of [{ tx: 0, ty: 0 }, { tx: 4, ty: 0 }, { tx: 0, ty: 3 }, { tx: 4, ty: 3 }]) {
      expect(terrainLayers(parsed, coord), `(${coord.tx},${coord.ty})`).toHaveLength(1)
    }
  })

  it('keeps a floor tile looking the same every time you walk back in', () => {
    const parsed = room()
    expect(terrainArt(parsed, { tx: 3, ty: 3 })).toEqual(terrainArt(parsed, { tx: 3, ty: 3 }))
  })
})

/*
 * Every room asks the child for something before it lets them on, so the
 * objective is load-bearing: a typo in it would silently produce a room you
 * walk straight through, or one you can never leave.
 */
describe('room objectives', () => {
  const withEntities = (extra: Record<string, unknown>) =>
    parseRoom({
      id: 'r',
      name: { es: 'Sala', en: 'Room' },
      tiles: ['+###+', '#...#', '#...#', '+###+'],
      spawn: { tx: 1, ty: 1 },
      entities: [
        { type: 'mechanism', id: 'rune', at: { tx: 3, ty: 2 }, challenge: { subject: 'math', difficulty: 1 } },
        { type: 'key', id: 'k', at: { tx: 2, ty: 1 } },
      ],
      ...extra,
    })

  it('defaults to nothing required', () => {
    expect(withEntities({}).objective).toEqual([])
    expect(objectiveMet(withEntities({}), () => false)).toBe(true)
  })

  it('keeps the doorways shut until every listed entity is dealt with', () => {
    const room = withEntities({ objective: ['rune'] })
    expect(objectiveMet(room, () => false)).toBe(false)
    expect(objectiveMet(room, (id) => id === 'rune')).toBe(true)
  })

  it('rejects an objective naming an entity that is not in the room', () => {
    expect(() => withEntities({ objective: ['ghost'] })).toThrow(/not an entity in this room/)
  })

  // A key is taken by walking over it, so a child could satisfy the room
  // without ever seeing what they satisfied.
  it('refuses to gate a doorway on picking up a key', () => {
    expect(() => withEntities({ objective: ['k'] })).toThrow(/collected, not solved/)
  })

  it('rejects an objective that is not a list', () => {
    expect(() => withEntities({ objective: 'rune' })).toThrow(/must be an array/)
  })
})
