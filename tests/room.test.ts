import { describe, expect, it } from 'vitest'
import roomDocument from '../data/rooms/room_01.json'
import { SUPPORTED_LOCALES } from '../src/i18n/locales'
import {
  isBlocked,
  parseRoom,
  TERRAIN_LEGEND,
  TERRAIN_TEXTURE,
  terrainAt,
  TERRAIN_KINDS,
} from '../src/game/world/room'
import { ASSET_MANIFEST } from '../src/engine/assets/assetManifest'

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

  it('encloses the test room, so nothing can walk off the grid', () => {
    const parsed = room()
    for (let tx = 0; tx < parsed.width; tx++) {
      expect(isBlocked(parsed, { tx, ty: 0 }), `top ${tx}`).toBe(true)
      expect(isBlocked(parsed, { tx, ty: parsed.height - 1 }), `bottom ${tx}`).toBe(true)
    }
    for (let ty = 0; ty < parsed.height; ty++) {
      expect(isBlocked(parsed, { tx: 0, ty }), `left ${ty}`).toBe(true)
      expect(isBlocked(parsed, { tx: parsed.width - 1, ty }), `right ${ty}`).toBe(true)
    }
  })
})

describe('terrain wiring', () => {
  it('maps every legend character to a known terrain kind', () => {
    for (const kind of Object.values(TERRAIN_LEGEND)) {
      expect(TERRAIN_KINDS).toContain(kind)
    }
  })

  it('points every terrain kind at a real manifest asset', () => {
    const ids = new Set(ASSET_MANIFEST.map((spec) => spec.id))
    for (const kind of TERRAIN_KINDS) {
      const textureId = TERRAIN_TEXTURE[kind]
      expect(textureId, kind).toBeTruthy()
      expect(ids, `${kind} -> ${textureId}`).toContain(textureId)
    }
  })
})
