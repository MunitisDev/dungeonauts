import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Enforces the one architectural rule this project cares most about:
 * `education/` knows nothing about the game.
 *
 * Written as a test rather than a convention because conventions erode. The
 * moment a challenge starts calling `door.unlock()`, the separation the whole
 * content model depends on is gone.
 */
const SRC = resolve(import.meta.dirname, '../src')

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return filesUnder(full)
    return full.endsWith('.ts') ? [full] : []
  })
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] as string,
  )
}

describe('education module boundary', () => {
  const educationFiles = filesUnder(join(SRC, 'education'))

  it('has source files to check', () => {
    expect(educationFiles.length).toBeGreaterThan(4)
  })

  it('never imports from game/', () => {
    for (const file of educationFiles) {
      for (const specifier of importsOf(file)) {
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/(^|\/)game\//)
      }
    }
  })

  it('never imports Phaser', () => {
    // Educational logic must be testable without a renderer, and reusable if
    // the presentation layer ever changes.
    for (const file of educationFiles) {
      for (const specifier of importsOf(file)) {
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/^phaser/)
      }
    }
  })

  it('never imports the DOM-facing ui/ layer', () => {
    for (const file of educationFiles) {
      for (const specifier of importsOf(file)) {
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/(^|\/)ui\//)
      }
    }
  })

  /**
   * The reverse direction is allowed but must go through the public surface,
   * so the internals stay free to change.
   */
  it('is only reached by other modules through education/index', () => {
    const outsiders = filesUnder(SRC).filter((file) => !file.includes('/education/'))
    for (const file of outsiders) {
      for (const specifier of importsOf(file)) {
        if (!specifier.includes('education')) continue
        expect(specifier, `${file} reaches into ${specifier}`).toMatch(/education$/)
      }
    }
  })
})
