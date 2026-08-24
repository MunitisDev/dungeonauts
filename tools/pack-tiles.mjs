#!/usr/bin/env node
/**
 * Packs a folder of sprite sheets into one opaque file.
 *
 * WHY: the artwork is licensed, and this repository is public. Committing the
 * PNGs would put a tidy folder of somebody's tileset on GitHub for anyone to
 * clone. Packing them into a single obfuscated blob means the repository no
 * longer carries usable image files.
 *
 * WHAT THIS IS NOT: protection. The browser has to decode these pixels to draw
 * them, so anyone who loads the deployed game can recover the art from the
 * network tab or the canvas. Nothing shipped to a client can prevent that. This
 * raises the cost of casually lifting the assets out of the repo; it does not
 * make them secret, and it changes nothing about what the licence permits.
 *
 * Usage:
 *   node tools/pack-tiles.mjs <source-dir> [output-file]
 *
 * The source directory is never committed. Re-running with the same input
 * produces a byte-identical output, so the pack does not churn in git.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const MAGIC = 'DGPK'
const VERSION = 1
/** Not a secret — it cannot be. It only makes the payload opaque at rest. */
const KEY = 'dungeonauts/tiles/v1'

/** PNG header: width, height, and a check that this really is a PNG. */
function pngSize(bytes) {
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!isPng) return null
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/**
 * Keystream: SHA-256 in counter mode over the key and salt.
 *
 * Chosen because both Node and every browser can reproduce it with no
 * dependency, and because it is honest about what it is. Real encryption here
 * would be theatre: the key would have to ship alongside the file.
 */
export function keystream(key, salt, length) {
  const out = Buffer.alloc(length)
  let written = 0
  for (let counter = 0; written < length; counter++) {
    const block = createHash('sha256')
      .update(key)
      .update(salt)
      .update(Buffer.from(String(counter)))
      .digest()
    const take = Math.min(block.length, length - written)
    block.copy(out, written, 0, take)
    written += take
  }
  return out
}

function pack(sourceDir, outFile) {
  const names = readdirSync(sourceDir)
    .filter((n) => n.toLowerCase().endsWith('.png'))
    .sort()

  const entries = []
  const blobs = []
  let offset = 0
  for (const name of names) {
    const bytes = readFileSync(join(sourceDir, name))
    const size = pngSize(bytes)
    if (!size) {
      console.warn(`  skipped ${name}: not a PNG`)
      continue
    }
    entries.push({ name: basename(name), offset, length: bytes.length, ...size })
    blobs.push(bytes)
    offset += bytes.length
    console.log(`  ${name.padEnd(26)} ${String(size.width).padStart(5)}x${String(size.height).padEnd(5)} ${bytes.length} bytes`)
  }
  if (entries.length === 0) throw new Error(`No PNGs in ${sourceDir}`)

  const index = Buffer.from(JSON.stringify({ tile: 16, files: entries }), 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(index.length, 0)
  const plain = Buffer.concat([header, index, ...blobs])
  const body = deflateRawSync(plain, { level: 9 })

  // Derived from the content, not random: the same input must pack to the same
  // bytes or every rebuild shows up as a diff.
  const salt = createHash('sha256').update(plain).digest().subarray(0, 16)
  const stream = keystream(KEY, salt, body.length)
  const cipher = Buffer.alloc(body.length)
  for (let i = 0; i < body.length; i++) cipher[i] = body[i] ^ stream[i]

  // A digest of the plaintext, so a corrupted pack fails loudly instead of
  // painting garbage: a bit flipped inside a PNG survives inflate untouched.
  const digest = createHash('sha256').update(plain).digest().subarray(0, 8)

  const out = Buffer.concat([
    Buffer.from(MAGIC, 'ascii'),
    Buffer.from([VERSION]),
    salt,
    digest,
    cipher,
  ])
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, out)
  console.log(`\n${entries.length} sheets -> ${outFile}`)
  console.log(`raw ${plain.length} bytes, packed ${out.length} bytes (${Math.round((100 * out.length) / plain.length)}%)`)
  console.log(`sha256 ${createHash('sha256').update(out).digest('hex').slice(0, 16)}`)
}

const [, , sourceDir, outFile = 'assets/packs/dungeon-tiles.dpk'] = process.argv
if (!sourceDir) {
  console.error('usage: node tools/pack-tiles.mjs <source-dir> [output-file]')
  process.exit(1)
}
pack(resolve(sourceDir), resolve(outFile))
