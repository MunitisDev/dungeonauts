import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST,
  assetsForStage,
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

interface DocumentedAsset {
  readonly id: string
  readonly path: string | null
  readonly status: string
}

/** Every table row in the manifest, as trimmed cells. */
function manifestRows(): string[][] {
  return MANIFEST_DOC.split('\n')
    .filter((line) => line.trimStart().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((cells) => /^`[a-z0-9_]+`$/.test(cells[0] ?? ''))
}

function documentedAssets(): DocumentedAsset[] {
  return manifestRows().map((cells) => {
    const pathCell = cells[1] ?? ''
    return {
      id: (cells[0] as string).slice(1, -1),
      // Concept rows carry only an id and a status, no production path yet.
      path: /^`.+`$/.test(pathCell) ? pathCell.slice(1, -1) : null,
      status: cells.at(-1) as string,
    }
  })
}

/**
 * Assets the code is expected to know about.
 *
 * `concept` rows are documentation only — an identity fixed by a reference
 * image, with no agreed dimensions and no production path. Requiring them in
 * code would force us to build for art that has not been specified.
 */
function productionAssets(): Map<string, string> {
  return new Map(
    documentedAssets()
      .filter((asset) => asset.status !== 'concept')
      .map((asset) => [asset.id, asset.path as string]),
  )
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

  /**
   * A single-file build has no server to fetch `/assets/` from, so it supplies
   * the bytes inline instead. Without this, such a build silently falls back to
   * placeholders and the real art cannot be reviewed.
   */
  it('prefers an inlined asset when one is supplied', () => {
    const spec = getAssetSpec('key_gold')
    const dataUri = 'data:image/png;base64,AAAA'
    globalThis.__DUNGEONAUTS_INLINE_ASSETS__ = { [spec.path]: dataUri }
    try {
      expect(assetUrl(spec, '/')).toBe(dataUri)
      // An asset that is not inlined still resolves normally.
      expect(assetUrl(getAssetSpec('chest_closed'), '/')).toBe(
        '/assets/dungeon/props/chest_closed.png',
      )
    } finally {
      globalThis.__DUNGEONAUTS_INLINE_ASSETS__ = undefined
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
  it('covers exactly the production ids listed in ASSET_MANIFEST.md, with the same paths', () => {
    const documented = productionAssets()
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

  it('gives every production row a path, and every concept row none', () => {
    for (const asset of documentedAssets()) {
      if (asset.status === 'concept') {
        expect(asset.path, `${asset.id} is concept and must not claim a path`).toBeNull()
      } else {
        expect(asset.path, `${asset.id} is production and needs a path`).toBeTruthy()
      }
    }
  })

  /**
   * The six-character roster is fixed by a reference image but deferred by
   * CLAUDE.md until the slice works. If one of these appears in code, either
   * the deferral ended (promote the row out of `concept`) or we started
   * building something we agreed not to build yet.
   */
  it('has not started building the deferred character roster', () => {
    const concepts = documentedAssets().filter((asset) => asset.status === 'concept')
    expect(concepts.length, 'expected the roster rows to be documented').toBe(6)

    const inCode = new Set(ASSET_MANIFEST.map((spec) => spec.id))
    for (const concept of concepts) {
      expect(inCode, `"${concept.id}" is still concept but present in code`).not.toContain(
        concept.id,
      )
    }
  })

  /**
   * Every spritesheet must state its full sheet size in the document, and that
   * size must be the one the code slices to. Matched against the whole row
   * rather than a fixed column, because the tables do not all lay the size out
   * the same way (`| 128×32 |` in one, `4× 32×32 → 128×32` in another).
   */
  it('states every sheet size in ASSET_MANIFEST.md, and agrees with it', () => {
    const sheets = ASSET_MANIFEST.filter((spec) => frameCount(spec) > 1)
    expect(sheets.length).toBeGreaterThan(0)

    for (const spec of sheets) {
      const row = manifestRows().find((cells) => cells[0] === `\`${spec.id}\``)
      expect(row, `${spec.id} has no row in ASSET_MANIFEST.md`).toBeDefined()
      const text = (row as string[]).join(' | ')
      expect(text, `${spec.id} must state its ${sheetWidth(spec)}×${sheetHeight(spec)} sheet`).toContain(
        `${sheetWidth(spec)}×${sheetHeight(spec)}`,
      )
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
    expect(heroes.length).toBeGreaterThanOrEqual(5)
    for (const spec of heroes) {
      expect(spec.frameWidth, spec.id).toBe(32)
      expect(spec.frameHeight, spec.id).toBe(40)
      expect(spec.rows, spec.id).toBe(4)
      expect(spec.anchor, spec.id).toBe('bottom-center')
      expect(spec.directions, spec.id).toEqual([...DIRECTION_ROWS])
    }
  })

  it('anchors world entities bottom-center, tiles top-left and UI art centre', () => {
    // SPRITE_SPEC.md § 2: the world anchor convention exempts UI, which is why
    // icons and character portraits are centred instead.
    const expectedAnchor: Record<string, string> = {
      tile: 'top-left',
      ui: 'center',
      portrait: 'center',
    }
    for (const spec of ASSET_MANIFEST) {
      expect(spec.anchor, spec.id).toBe(expectedAnchor[spec.category] ?? 'bottom-center')
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
  it('produces one task per boot-stage entry, keyed by id', () => {
    const plan = buildLoadPlan()
    expect(plan).toHaveLength(assetsForStage('slice').length)
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

  // The whole point of stages: registering post-slice art must not make the
  // slice download it.
  it('leaves post-slice art out of the boot plan', () => {
    const keys = buildLoadPlan().map((task) => task.key)
    for (const spec of assetsForStage('post-slice')) {
      expect(keys, `${spec.id} would load at boot`).not.toContain(spec.id)
    }
    expect(assetsForStage('post-slice').length).toBeGreaterThan(0)
  })

  it('can plan a later stage explicitly', () => {
    const plan = buildLoadPlan(assetsForStage('post-slice'))
    expect(plan.map((task) => task.key)).toContain('portrait_archer_boy')
    expect(plan.every((task) => task.frameConfig === null)).toBe(true)
  })

  it('treats exactly the single-frame assets as static', () => {
    for (const spec of ASSET_MANIFEST) {
      expect(isStatic(spec), spec.id).toBe(frameCount(spec) === 1)
    }
  })
})
