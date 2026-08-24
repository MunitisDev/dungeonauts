import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readTilePack, sheetUrl } from '../src/engine/assets/tilepack'

/*
 * The pack is the one asset in the repository that is not readable by looking
 * at it, so it is the one that most needs a test: a silently corrupt archive
 * would show up as a dungeon with no art and no error worth reading.
 */
const PACK = resolve(import.meta.dirname, '../assets/packs/dungeon-tiles.dpk')
const archive = () => {
  const bytes = readFileSync(PACK)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe('the packed tileset', () => {
  it('is committed', () => {
    expect(existsSync(PACK), `${PACK} is missing — rebuild it with tools/pack-tiles.mjs`).toBe(true)
  })

  // The whole point: someone who clones the repository gets no image files.
  it('gives nothing away at rest', () => {
    const bytes = readFileSync(PACK)
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('DGPK')
    for (let i = 0; i < bytes.length - 8; i++) {
      const looksLikePng = PNG_MAGIC.every((byte, k) => bytes[i + k] === byte)
      expect(looksLikePng, `a PNG header is sitting in the clear at byte ${String(i)}`).toBe(false)
    }
    expect(bytes.includes(Buffer.from('IHDR'))).toBe(false)
    expect(bytes.includes(Buffer.from('.png'))).toBe(false)
  })

  it('unpacks into the sheets the catalogue names', async () => {
    const pack = await readTilePack(archive())
    expect(pack.tile).toBe(16)
    expect([...pack.sheets.keys()].sort()).toEqual([
      'Animation Character.png',
      'BronzeCoin.png',
      'Chests.png',
      'Doors.png',
      'Enemy.png',
      'Flasks.png',
      'Floor-export.png',
      'GoldCoin.png',
      'Lever.png',
      'PlatformButton.png',
      'SilverCoin.png',
      'Spike Trap.png',
      'Tileset.png',
      'Torchlight.png',
      'Walls-export.png',
    ])
  })

  it('returns real PNGs whose dimensions match the index', async () => {
    const pack = await readTilePack(archive())
    for (const sheet of pack.sheets.values()) {
      expect(
        PNG_MAGIC.every((byte, i) => sheet.bytes[i] === byte),
        `${sheet.name} is not a PNG`,
      ).toBe(true)
      const view = new DataView(sheet.bytes.buffer, sheet.bytes.byteOffset)
      expect(view.getUint32(16), `${sheet.name} width`).toBe(sheet.width)
      expect(view.getUint32(20), `${sheet.name} height`).toBe(sheet.height)
    }
  })

  // Every sheet divides cleanly into cells, or the catalogue's coordinates lie.
  it('holds sheets that are whole numbers of 16x16 cells', async () => {
    const pack = await readTilePack(archive())
    for (const sheet of pack.sheets.values()) {
      expect(sheet.width % pack.tile, `${sheet.name} width`).toBe(0)
      expect(sheet.height % pack.tile, `${sheet.name} height`).toBe(0)
    }
  })

  it('refuses anything that is not a pack, with a message worth reading', async () => {
    await expect(
      readTilePack(new TextEncoder().encode('hello there, this is definitely not a pack').buffer as ArrayBuffer),
    ).rejects.toThrow(/Not a tile pack/)
    await expect(readTilePack(new Uint8Array(3).buffer as ArrayBuffer)).rejects.toThrow(/truncated/)
    const bad = new Uint8Array(readFileSync(PACK))
    bad[4] = 99
    await expect(readTilePack(bad.buffer as ArrayBuffer)).rejects.toThrow(/version 99/)
  })

  it('refuses a pack whose body has been tampered with', async () => {
    const bad = new Uint8Array(readFileSync(PACK))
    const at = bad.length - 40
    bad[at] = (bad[at] as number) ^ 0xff
    await expect(readTilePack(bad.buffer as ArrayBuffer)).rejects.toThrow(/damaged|checksum/)
  })
})

describe('sheetUrl', () => {
  it('hands a texture loader something it can fetch', async () => {
    const pack = await readTilePack(archive())
    const sheet = pack.sheets.get('Tileset.png')
    if (!sheet) throw new Error('Tileset.png is missing from the pack')
    const url = sheetUrl(sheet)
    expect(url).toMatch(/^blob:/)
    URL.revokeObjectURL(url)
  })
})
