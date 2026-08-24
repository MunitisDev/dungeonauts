/**
 * Reads a packed tile archive.
 *
 * The sprite sheets are not committed as PNGs: the artwork is licensed and this
 * repository is public, so a folder of usable image files has no business
 * sitting in it. `tools/pack-tiles.mjs` folds them into one opaque blob and this
 * unfolds it again at runtime.
 *
 * This is obfuscation, not protection, and the difference matters. The browser
 * must decode these pixels to draw them, so anyone who loads the game can
 * recover the art from the network tab or the canvas — no client-side scheme
 * can prevent that. What it does achieve: the repository no longer ships
 * extractable image files, and the pack tells you nothing by looking at it.
 */

const MAGIC = 'DGPK'
const VERSION = 1
const KEY = 'dungeonauts/tiles/v1'
const SALT_BYTES = 16
const DIGEST_BYTES = 8
const HEADER_BYTES = MAGIC.length + 1 + SALT_BYTES + DIGEST_BYTES

export interface PackedSheet {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly bytes: Uint8Array
}

export interface TilePack {
  /** Native cell size of the artwork, in pixels. */
  readonly tile: number
  readonly sheets: ReadonlyMap<string, PackedSheet>
}

/** SHA-256 in counter mode. Must match `tools/pack-tiles.mjs` exactly. */
async function keystream(salt: Uint8Array, length: number): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const key = encoder.encode(KEY)
  const out = new Uint8Array(length)
  let written = 0
  for (let counter = 0; written < length; counter++) {
    const suffix = encoder.encode(String(counter))
    const message = new Uint8Array(key.length + salt.length + suffix.length)
    message.set(key, 0)
    message.set(salt, key.length)
    message.set(suffix, key.length + salt.length)
    const block = new Uint8Array(await crypto.subtle.digest('SHA-256', message))
    const take = Math.min(block.length, length - written)
    out.set(block.subarray(0, take), written)
    written += take
  }
  return out
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Unpacks an archive that has already been fetched. */
export async function readTilePack(archive: ArrayBuffer): Promise<TilePack> {
  const bytes = new Uint8Array(archive)
  if (bytes.length < HEADER_BYTES) throw new Error('Tile pack is truncated')

  const magic = String.fromCharCode(...bytes.subarray(0, MAGIC.length))
  if (magic !== MAGIC) throw new Error(`Not a tile pack: expected "${MAGIC}", got "${magic}"`)
  const version = bytes[MAGIC.length]
  if (version !== VERSION) throw new Error(`Tile pack version ${String(version)} is not supported`)

  const saltAt = MAGIC.length + 1
  const salt = bytes.subarray(saltAt, saltAt + SALT_BYTES)
  const digest = bytes.subarray(saltAt + SALT_BYTES, HEADER_BYTES)
  const cipher = bytes.subarray(HEADER_BYTES)
  const stream = await keystream(salt, cipher.length)
  const body = new Uint8Array(cipher.length)
  for (let i = 0; i < cipher.length; i++) body[i] = (cipher[i] as number) ^ (stream[i] as number)

  const plain = await inflateRaw(body)

  // A bit flipped inside a PNG passes straight through inflate and would show
  // up as garbled art with no error. Check the whole payload instead.
  const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', plain as BufferSource))
  for (let i = 0; i < DIGEST_BYTES; i++) {
    if (actual[i] !== digest[i]) throw new Error('Tile pack is damaged: contents do not match its checksum')
  }

  const indexLength = new DataView(plain.buffer, plain.byteOffset, 4).getUint32(0, true)
  const index = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + indexLength))) as {
    tile: number
    files: { name: string; offset: number; length: number; width: number; height: number }[]
  }

  const base = 4 + indexLength
  const sheets = new Map<string, PackedSheet>()
  for (const file of index.files) {
    sheets.set(file.name, {
      name: file.name,
      width: file.width,
      height: file.height,
      bytes: plain.subarray(base + file.offset, base + file.offset + file.length),
    })
  }
  return { tile: index.tile, sheets }
}

export async function fetchTilePack(url: string): Promise<TilePack> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Tile pack ${url}: HTTP ${String(response.status)}`)
  return readTilePack(await response.arrayBuffer())
}

/**
 * A URL a texture loader can consume.
 *
 * Blob rather than a data URI: a data URI for a 26 KB sheet is a 35 KB string
 * that has to be parsed, and it shows up whole in the DOM. Callers should
 * revoke it once the texture is decoded.
 */
export function sheetUrl(sheet: PackedSheet): string {
  return URL.createObjectURL(new Blob([sheet.bytes as BlobPart], { type: 'image/png' }))
}
