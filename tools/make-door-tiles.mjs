#!/usr/bin/env node
/**
 * Paints the three door tiles the dungeon set does not contain.
 *
 *   node tools/make-door-tiles.mjs <source-dir> [out.png]
 *
 * The pack draws exactly one door that fits a wall: a single cell of brick face
 * with a wooden door in it, which suits the far wall of a room. It has nothing
 * for the other three. A side wall is a five-pixel strip seen edge-on and the
 * near wall is a four-pixel lip seen from behind, and neither the arch nor the
 * brick-faced door sits in either without floating.
 *
 * So these three are ours, and they are the only artwork in the project that
 * is. They are deliberately derivative: every colour is lifted from the wall
 * and door cells they sit against, and the plank spacing copies the pack's own
 * door, so a hand-painted tile cannot drift away from the set it lives in.
 * `docs/art/ASSET_MANIFEST.md` records them as ours rather than the artist's.
 *
 * Output is a 48x16 sheet — left, right, bottom — written into the source
 * directory so the next `pack-tiles.mjs` run picks it up.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { inflateSync, deflateSync, crc32 } from 'node:zlib'

const TILE = 16
const SHEET_NAME = 'Dungeonauts-doors.png'
/**
 * How far up the cell the near-wall door reaches.
 *
 * The lip it sits in is four pixels, and a four-pixel door is a scratch: at
 * six it carries the same weight as the bar in a side wall, which is what it
 * has to match. Eight starts to read as a chest.
 */
const BOTTOM_DEPTH = 6

/* ---- a minimal 8-bit RGBA PNG codec ------------------------------------ */

/** Decodes a non-interlaced 8-bit RGBA PNG into {width, height, data}. */
function decodePng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0) !== 0x89504e47) throw new Error('not a PNG')
  let width = 0
  let height = 0
  const idat = []
  let at = 8
  while (at < bytes.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    const body = bytes.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      const [depth, colour, , , interlace] = bytes.subarray(at + 16, at + 21)
      if (depth !== 8 || colour !== 6 || interlace !== 0) {
        throw new Error(`only 8-bit RGBA, non-interlaced PNGs (got depth ${depth}, colour ${colour})`)
      }
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
    at += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? data[y * stride + x - 4] : 0
      const b = y > 0 ? data[(y - 1) * stride + x] : 0
      const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`)
      data[y * stride + x] = value & 0xff
    }
  }
  return { width, height, data }
}

/** Encodes {width, height, data} as an 8-bit RGBA PNG, every scanline unfiltered. */
function encodePng({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(data.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1)
  }

  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12)
    out.writeUInt32BE(body.length, 0)
    out.write(type, 4, 'ascii')
    body.copy(out, 8)
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)) >>> 0, 8 + body.length)
    return out
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---- painting ----------------------------------------------------------- */

/** The palette, every entry read off the cells these tiles sit against. */
const WOOD_LIGHT = [151, 81, 31, 255]
const WOOD_MID = [131, 70, 26, 255]
const WOOD_DARK = [118, 63, 24, 255]
const OUTLINE = [17, 12, 26, 255]
const GOLD = [247, 181, 0, 255]
const CLEAR = [0, 0, 0, 0]

/** Rows where the pack's own door leaves a seam between planks. */
const isSeam = (y) => y % 3 === 1

class Sheet {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height * 4)
  }

  set(x, y, rgba) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.data.set(rgba, (y * this.width + x) * 4)
  }

  get(x, y) {
    const at = (y * this.width + x) * 4
    return [...this.data.subarray(at, at + 4)]
  }
}

/** Copies one cell of a sheet into another, skipping transparent pixels. */
function blit(from, fromCol, fromRow, to, toCol, options = {}) {
  const { rows = [0, TILE - 1], columns = [0, TILE - 1] } = options
  for (let y = rows[0]; y <= rows[1]; y++) {
    for (let x = columns[0]; x <= columns[1]; x++) {
      const at = ((fromRow * TILE + y) * from.width + fromCol * TILE + x) * 4
      const pixel = [...from.data.subarray(at, at + 4)]
      if (pixel[3] === 0) continue
      to.set(toCol * TILE + x, y, pixel)
    }
  }
}

/**
 * A door in a side wall: the wall's own five-pixel strip, in wood.
 *
 * The strip keeps its stone ends so the door reads as set into the wall rather
 * than laid over it, and the planks line up with the masonry above and below.
 * `edge` is the column the wall's outer face sits on.
 */
function paintSideDoor(walls, sheet, column, { from, edge }) {
  const [wallCol, wallRow] = from
  blit(walls, wallCol, wallRow, sheet, column, { rows: [0, 1] })
  blit(walls, wallCol, wallRow, sheet, column, { rows: [14, 15] })

  const inner = edge === 'right' ? [11, 15] : [0, 4]
  for (let y = 2; y <= 13; y++) {
    sheet.set(column * TILE + inner[0], y, OUTLINE)
    sheet.set(column * TILE + inner[1], y, OUTLINE)
    for (let x = inner[0] + 1; x < inner[1]; x++) {
      const shade = isSeam(y) ? WOOD_DARK : x === inner[0] + 2 ? WOOD_LIGHT : WOOD_MID
      sheet.set(column * TILE + x, y, shade)
    }
  }
  // A keyhole, so a shut door is a shut door and not a plank.
  sheet.set(column * TILE + inner[0] + 2, 7, GOLD)
  sheet.set(column * TILE + inner[0] + 2, 8, GOLD)
}

/**
 * A door in the near wall: the wall's own lip, in wood.
 *
 * The same idea as the side doors, turned on its side. The near wall is a
 * four-pixel strip along the bottom of the cell, so the door is that strip in
 * planks, with the stone kept at both ends so it reads as set into the wall.
 * `depth` is how far up the cell the planks reach: the lip is only four pixels
 * and a four-pixel door is a scratch, so it stands a little proud of it.
 */
function paintBottomDoor(walls, sheet, column, { lip, depth }) {
  blit(walls, lip[0], lip[1], sheet, column, { rows: [12, 15], columns: [0, 1] })
  blit(walls, lip[0], lip[1], sheet, column, { rows: [12, 15], columns: [14, 15] })

  const top = 16 - depth
  for (let x = 2; x <= 13; x++) {
    sheet.set(column * TILE + x, top, OUTLINE)
    sheet.set(column * TILE + x, 15, OUTLINE)
    for (let y = top + 1; y < 15; y++) {
      const shade = isSeam(x) ? WOOD_DARK : y === top + 1 ? WOOD_LIGHT : WOOD_MID
      sheet.set(column * TILE + x, y, shade)
    }
  }
  // A keyhole, so a shut door is a shut door and not a plank.
  sheet.set(column * TILE + 7, top + 2, GOLD)
  sheet.set(column * TILE + 8, top + 2, GOLD)
}

/* ---- entry point -------------------------------------------------------- */

const [, , sourceDir, outArg] = process.argv
if (!sourceDir) {
  console.error('usage: node tools/make-door-tiles.mjs <source-dir> [out.png]')
  process.exit(1)
}

const walls = decodePng(readFileSync(join(sourceDir, 'Walls-export.png')))
const sheet = new Sheet(TILE * 3, TILE)

// Column 0: a gap in the left wall. Column 1: the right. Column 2: the near wall.
paintSideDoor(walls, sheet, 0, { from: [8, 10], edge: 'right' })
paintSideDoor(walls, sheet, 1, { from: [15, 10], edge: 'left' })
paintBottomDoor(walls, sheet, 2, { lip: [10, 11], depth: BOTTOM_DEPTH })

const out = outArg ?? join(sourceDir, SHEET_NAME)
writeFileSync(out, encodePng(sheet))
console.log(`${basename(out)}  ${sheet.width}x${sheet.height}  left | right | bottom`)
