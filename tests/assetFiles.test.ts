import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST,
  CHARACTER_IDS,
  assetsForStage,
  getAssetSpec,
  portraitId,
  rowFrames,
  sheetHeight,
  sheetWidth,
} from '../src/engine/assets/assetManifest'

const REPO = resolve(import.meta.dirname, '..')

/**
 * Reads width and height from a PNG's IHDR chunk.
 *
 * Hand-parsed rather than pulled from a dependency: the header is at a fixed
 * offset and the whole point of this file is to check art without adding an
 * image library to a game that does not need one.
 */
function readPngSize(path: string): { width: number; height: number } {
  const fd = openSync(path, 'r')
  try {
    const header = Buffer.alloc(24)
    readSync(fd, header, 0, 24, 0)
    const signature = header.subarray(0, 8).toString('hex')
    if (signature !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG`)
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
  } finally {
    closeSync(fd)
  }
}

/**
 * The automated half of the art-integration checklist in CLAUDE.md.
 *
 * Whenever approved art lands at a manifest path, this fails immediately if the
 * file is the wrong size — which is the single most common way an externally
 * generated spritesheet goes wrong. Assets that have not been produced yet are
 * skipped, so the suite stays green while the art is still being made.
 */
describe('committed art matches the manifest', () => {
  const present = ASSET_MANIFEST.filter((spec) => existsSync(resolve(REPO, spec.path)))

  it('reports how much art has arrived', () => {
    // Not an assertion about the count — just a visible progress signal.
    expect(present.length).toBeLessThanOrEqual(ASSET_MANIFEST.length)
  })

  it.each(present.map((spec) => [spec.id, spec] as const))(
    '%s is a PNG of exactly the declared size',
    (_id, spec) => {
      const { width, height } = readPngSize(resolve(REPO, spec.path))
      expect(width, `${spec.id} width`).toBe(sheetWidth(spec))
      expect(height, `${spec.id} height`).toBe(sheetHeight(spec))
    },
  )
})

describe('character portraits', () => {
  const portraits = ASSET_MANIFEST.filter((spec) => spec.category === 'portrait')

  it('covers all six playable characters', () => {
    expect(portraits.map((spec) => spec.id).sort()).toEqual(
      CHARACTER_IDS.map(portraitId).sort(),
    )
  })

  it('has all six files committed at 128x128', () => {
    for (const spec of portraits) {
      const path = resolve(REPO, spec.path)
      expect(existsSync(path), `${spec.id} is missing from disk`).toBe(true)
      expect(readPngSize(path)).toEqual({ width: 128, height: 128 })
    }
  })

  /**
   * Portraits are UI art. Anchoring them like a world entity, or letting them
   * be loaded at boot, is exactly the misuse this guard exists to catch.
   */
  it('is UI art: centre-anchored, single frame, never a gameplay sprite', () => {
    for (const spec of portraits) {
      expect(spec.anchor, spec.id).toBe('center')
      expect(spec.columns, spec.id).toBe(1)
      expect(spec.rows, spec.id).toBe(1)
      expect(spec.frameHeight, `${spec.id} must not be a 32x40 gameplay frame`).not.toBe(40)
    }
  })

  it('is deferred, so the vertical slice does not download it', () => {
    for (const spec of portraits) {
      expect(spec.stage, spec.id).toBe('post-slice')
    }
    const sliceIds = assetsForStage('slice').map((spec) => spec.id)
    for (const spec of portraits) {
      expect(sliceIds, `${spec.id} would load at boot`).not.toContain(spec.id)
    }
  })
})

describe('loading stages', () => {
  it('splits the manifest into exactly the two known stages', () => {
    const slice = assetsForStage('slice')
    const post = assetsForStage('post-slice')
    // Every asset belongs to one stage or the other, and post-slice is exactly
    // the deferred portraits. Derived rather than hardcoded, so adding art does
    // not require editing the guard.
    expect(slice.length + post.length).toBe(ASSET_MANIFEST.length)
    expect(post.map((spec) => spec.category)).toEqual(post.map(() => 'portrait'))
    expect(slice.length).toBeGreaterThan(0)
  })

  it('keeps every vertical-slice asset in the boot stage', () => {
    for (const spec of ASSET_MANIFEST) {
      if (spec.category === 'portrait') continue
      expect(spec.stage, spec.id).toBe('slice')
    }
  })
})

/**
 * The first approved production sheet.
 *
 * These assertions are the automated half of the integration checklist in
 * CLAUDE.md, run against the committed file rather than trusted from the
 * delivery note.
 */
describe('hero_warrior_boy_idle', () => {
  const spec = getAssetSpec('hero_warrior_boy_idle')
  const path = resolve(REPO, spec.path)

  it('is committed at the exact path the manifest gives', () => {
    expect(spec.path).toBe('assets/characters/warrior_boy/hero_warrior_boy_idle.png')
    expect(existsSync(path)).toBe(true)
  })

  it('is a 64x160 sheet of 32x40 frames', () => {
    expect(readPngSize(path)).toEqual({ width: 64, height: 160 })
    expect(spec.frameWidth).toBe(32)
    expect(spec.frameHeight).toBe(40)
    expect(spec.columns).toBe(2)
    expect(spec.rows).toBe(4)
  })

  it('is anchored bottom-center, as a world entity must be', () => {
    expect(spec.anchor).toBe('bottom-center')
  })

  // The delivery note numbered the frames explicitly; this checks the code
  // slices them the same way rather than assuming it does.
  it('slices its rows into the promised frame indices', () => {
    expect(rowFrames(spec, 'down')).toEqual([0, 1])
    expect(rowFrames(spec, 'left')).toEqual([2, 3])
    expect(rowFrames(spec, 'right')).toEqual([4, 5])
    expect(rowFrames(spec, 'up')).toEqual([6, 7])
  })

  it('loads at boot, since the player is looking at it immediately', () => {
    expect(spec.stage).toBe('slice')
  })
})
