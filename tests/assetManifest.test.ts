import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST,
  DIRECTION_ROWS,
  frameCount,
  getAssetSpec,
  isStatic,
  rowFrames,
  sheetHeight,
  sheetWidth,
  assetUrl,
} from '../src/engine/assets/assetManifest'
import { buildLoadPlan } from '../src/engine/assets/loadPlan'

const docPath = (name: string) => resolve(import.meta.dirname, '../docs/art', name)
const MANIFEST_DOC = readFileSync(docPath('ASSET_MANIFEST.md'), 'utf8')
const SPRITE_SPEC_DOC = readFileSync(docPath('SPRITE_SPEC.md'), 'utf8')

/**
 * Every manifest table row starts `| \`id\` | \`path\` |`, so one expression
 * captures the id/path pairs across all the asset tables.
 */
function documentedAssets(): Map<string, string> {
  const rows = MANIFEST_DOC.matchAll(/^\|\s*`([a-z0-9_]+)`\s*\|\s*`([^`]+)`\s*\|/gm)
  return new Map([...rows].map((row) => [row[1] as string, row[2] as string]))
}

describe('asset manifest', () => {
  it('has unique ids and unique paths', () => {
    const ids = ASSET_MANIFEST.map((spec) => spec.id)
    const paths = ASSET_MANIFEST.map((spec) => spec.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('keeps every asset under the repo-root assets/ directory', () => {
    for (const spec of ASSET_MANIFEST) {
      expect(spec.path, spec.id).toMatch(/^assets\/[a-z0-9/_]+\.png$/)
      expect(assetUrl(spec, '/')).toBe(`/${spec.path}`)
    }
  })

  // GitHub Pages serves the app from `/<repo>/`, not from the domain root.
  it('honours a sub-path deployment base', () => {
    const spec = getAssetSpec('key_gold')
    expect(assetUrl(spec, '/dungeonauts/')).toBe('/dungeonauts/assets/dungeon/props/key_gold.png')
    // A base without its trailing slash must not glue two segments together.
    expect(assetUrl(spec, '/dungeonauts')).toBe('/dungeonauts/assets/dungeon/props/key_gold.png')
  })

  it('declares positive, whole-pixel frame grids', () => {
    for (const spec of ASSET_MANIFEST) {
      expect(spec.frameWidth, spec.id).toBeGreaterThan(0)
      expect(spec.frameHeight, spec.id).toBeGreaterThan(0)
      expect(spec.columns, spec.id).toBeGreaterThan(0)
      expect(spec.rows, spec.id).toBeGreaterThan(0)
      expect(Number.isInteger(spec.frameWidth), spec.id).toBe(true)
      expect(Number.isInteger(spec.frameHeight), spec.id).toBe(true)
    }
  })

  // The documents are the source of truth. Drift in either direction is a bug.
  it('covers exactly the ids listed in ASSET_MANIFEST.md, with the same paths', () => {
    const documented = documentedAssets()
    expect(documented.size).toBeGreaterThan(0)

    const inCode = new Set(ASSET_MANIFEST.map((spec) => spec.id))
    for (const id of documented.keys()) {
      expect(inCode, `"${id}" is documented but missing from ASSET_MANIFEST`).toContain(id)
    }
    for (const spec of ASSET_MANIFEST) {
      expect(documented.has(spec.id), `"${spec.id}" is in code but not documented`).toBe(true)
      expect(documented.get(spec.id), spec.id).toBe(spec.path)
    }
  })

  it('derives the sheet sizes written in ASSET_MANIFEST.md', () => {
    // Hero + slime rows carry an explicit `| 64×160 |`-style sheet column.
    const rows = MANIFEST_DOC.matchAll(
      /^\|\s*`([a-z0-9_]+)`\s*\|[^|]+\|[^|]+\|[^|]+\|\s*(\d+)×(\d+)\s*\|/gm,
    )
    const documented = [...rows]
    expect(documented.length).toBe(8) // 5 hero sheets + 3 slime sheets

    for (const row of documented) {
      const spec = getAssetSpec(row[1] as string)
      expect(sheetWidth(spec), `${spec.id} width`).toBe(Number(row[2]))
      expect(sheetHeight(spec), `${spec.id} height`).toBe(Number(row[3]))
    }
  })

  it('uses the direction row order defined in SPRITE_SPEC.md', () => {
    const rows = [...SPRITE_SPEC_DOC.matchAll(/^row (\d) = (\w+)$/gm)]
    expect(rows).toHaveLength(4)
    const documentedOrder = rows
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((row) => row[2])
    expect([...DIRECTION_ROWS]).toEqual(documentedOrder)
  })

  it('gives every hero sheet four directional rows of 32x40 frames', () => {
    const heroes = ASSET_MANIFEST.filter((spec) => spec.category === 'hero')
    expect(heroes).toHaveLength(5)
    for (const spec of heroes) {
      expect(spec.frameWidth, spec.id).toBe(32)
      expect(spec.frameHeight, spec.id).toBe(40)
      expect(spec.rows, spec.id).toBe(4)
      expect(spec.anchor, spec.id).toBe('bottom-center')
      expect(spec.directions, spec.id).toEqual([...DIRECTION_ROWS])
    }
  })

  it('anchors world entities bottom-center and tiles top-left', () => {
    for (const spec of ASSET_MANIFEST) {
      const expected =
        spec.category === 'tile' ? 'top-left' : spec.category === 'ui' ? 'center' : 'bottom-center'
      expect(spec.anchor, spec.id).toBe(expected)
    }
  })

  it('counts frames row-major, left to right', () => {
    const walk = getAssetSpec('hero_adventurer_walk')
    expect(frameCount(walk)).toBe(16)
    expect(rowFrames(walk, 'down')).toEqual([0, 1, 2, 3])
    expect(rowFrames(walk, 'left')).toEqual([4, 5, 6, 7])
    expect(rowFrames(walk, 'right')).toEqual([8, 9, 10, 11])
    expect(rowFrames(walk, 'up')).toEqual([12, 13, 14, 15])
  })

  it('refuses directional lookups on non-directional art', () => {
    expect(() => rowFrames(getAssetSpec('slime_green_idle'), 'down')).toThrow(
      /no directional rows/,
    )
  })

  it('fails loudly on an unknown id rather than rendering nothing', () => {
    expect(() => getAssetSpec('hero_adventurer_dance')).toThrow(/Unknown asset id/)
  })
})

describe('load plan', () => {
  it('produces one task per manifest entry, keyed by id', () => {
    const plan = buildLoadPlan()
    expect(plan).toHaveLength(ASSET_MANIFEST.length)
    for (const task of plan) {
      expect(task.key).toBe(task.spec.id)
      expect(task.url.endsWith(task.spec.path), task.key).toBe(true)
    }
  })

  it('slices multi-frame art and leaves single frames as plain images', () => {
    const plan = buildLoadPlan()
    const byKey = new Map(plan.map((task) => [task.key, task]))

    expect(byKey.get('hero_adventurer_walk')?.frameConfig).toEqual({
      frameWidth: 32,
      frameHeight: 40,
    })
    expect(byKey.get('slime_green_idle')?.frameConfig).toEqual({
      frameWidth: 32,
      frameHeight: 32,
    })
    expect(byKey.get('chest_closed')?.frameConfig).toBeNull()
    expect(byKey.get('tile_floor_stone_01')?.frameConfig).toBeNull()
  })

  it('treats exactly the single-frame assets as static', () => {
    for (const spec of ASSET_MANIFEST) {
      expect(isStatic(spec), spec.id).toBe(frameCount(spec) === 1)
    }
  })
})
