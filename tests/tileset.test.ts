import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readTilePack } from '../src/engine/assets/tilepack'
import { ANIMS, FLOORS, PROPS, SHEETS, WALLS, at, type Art } from '../src/engine/assets/tileset'
import { entityArt, ENTITY_TYPES, parseEntity, type Entity } from '../src/game/entities/entity'

/*
 * Every drawing the game asks for is a sheet key and a frame number, and a
 * wrong number is invisible until someone looks at the room: it renders a
 * different, perfectly valid tile. These tests read the pack and check the
 * arithmetic instead.
 */
const PACK = resolve(import.meta.dirname, '../assets/packs/dungeon-tiles.dpk')
const archive = () => {
  const bytes = readFileSync(PACK)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** Frames each sheet actually holds, from the packed PNG's own dimensions. */
async function frameCounts(): Promise<Map<string, number>> {
  const pack = await readTilePack(archive())
  const counts = new Map<string, number>()
  for (const spec of SHEETS) {
    const sheet = pack.sheets.get(spec.file)
    if (!sheet) throw new Error(`Pack has no ${spec.file}`)
    const cols = Math.floor(sheet.width / spec.frameWidth)
    const rows = Math.floor(sheet.height / spec.frameHeight)
    counts.set(spec.key, cols * rows)
  }
  return counts
}

const named: Record<string, Art | readonly Art[]> = { ...WALLS, ...FLOORS, ...PROPS, ...ANIMS }

describe('every tile reference points at a frame that exists', () => {
  it('for the named walls, floors, props and animations', async () => {
    const counts = await frameCounts()
    for (const [name, value] of Object.entries(named)) {
      for (const art of Array.isArray(value) ? value : [value as Art]) {
        const total = counts.get(art.key)
        expect(total, `${name} names an unknown sheet "${art.key}"`).toBeDefined()
        expect(art.frame, `${name} -> ${art.key}#${String(art.frame)}`).toBeGreaterThanOrEqual(0)
        expect(art.frame, `${name} -> ${art.key}#${String(art.frame)}`).toBeLessThan(total as number)
      }
    }
  })

  it('for every entity, in both of its states', async () => {
    const counts = await frameCounts()
    const sample = (type: string): Entity =>
      parseEntity(
        {
          type,
          id: `x_${type}`,
          at: { tx: 1, ty: 1 },
          ...(type === 'slime' ? { hits: 2 } : {}),
          ...(type === 'door' ? { requiresKey: true } : {}),
          ...(type === 'key' ? {} : { challenge: { subject: 'math', difficulty: 1 } }),
        },
        'r',
        0,
      )
    for (const type of ENTITY_TYPES) {
      for (const resolved of [false, true]) {
        const art = entityArt(sample(type), resolved)
        const total = counts.get(art.key)
        expect(total, `${type} names an unknown sheet "${art.key}"`).toBeDefined()
        expect(art.frame, `${type}/${String(resolved)}`).toBeLessThan(total as number)
      }
    }
  })

  // The knight is the one 32x32 sprite: reading him on a 16x16 grid would
  // quarter every frame and nobody would notice until the game was running.
  it('reads the knight on his own 32x32 grid', async () => {
    const pack = await readTilePack(archive())
    const sheet = pack.sheets.get('Animation Character.png')
    expect(sheet?.width).toBe(128)
    expect(sheet?.height).toBe(288)
    expect(at('sheet_knight', 0, 0).frame).toBe(0)
    // Four 32x32 frames per row, so row 2 — the armed idle — starts at 8.
    expect(at('sheet_knight', 0, 2).frame).toBe(8)
    expect(ANIMS.knightWalkRight.map((a) => a.frame)).toEqual([24, 25, 26, 27])
  })

  it('gives the knight a left and a right, and nothing else', () => {
    expect(ANIMS.knightIdleLeft).not.toEqual(ANIMS.knightIdleRight)
    expect(ANIMS.knightWalkLeft).not.toEqual(ANIMS.knightWalkRight)
    for (const anim of [
      ANIMS.knightIdleLeft,
      ANIMS.knightIdleRight,
      ANIMS.knightWalkLeft,
      ANIMS.knightWalkRight,
    ]) {
      expect(anim).toHaveLength(4)
    }
  })
})
