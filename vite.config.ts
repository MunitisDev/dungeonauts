import { cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'

const ASSETS_DIR = resolve(import.meta.dirname, 'assets')
const ASSETS_PREFIX = '/assets/'

/**
 * Serves a real 404 for a missing file under `/assets/`.
 *
 * Without this, Vite's SPA fallback answers `200 text/html` for any unknown
 * path. The image loader would then receive an HTML document where a PNG was
 * expected — it still fails, but for a confusing reason, and a genuine typo in
 * a manifest path becomes impossible to tell apart from art that simply has not
 * been produced yet. `AssetRegistry` needs a clean failure to swap in a
 * placeholder, so give it one.
 */
const missingAssetIs404: Connect.NextHandleFunction = (req, res, next) => {
  const path = (req.url ?? '').split('?')[0] ?? ''
  if (!path.startsWith(ASSETS_PREFIX)) return next()

  // `normalize` collapses any `..` before the prefix check, so a crafted URL
  // cannot probe outside the assets directory.
  const target = normalize(join(ASSETS_DIR, decodeURIComponent(path.slice(ASSETS_PREFIX.length))))
  if (target.startsWith(ASSETS_DIR) && existsSync(target)) return next()

  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(`Asset not found: ${path}\nExpected a file at the path given in docs/art/ASSET_MANIFEST.md`)
}

/**
 * Production art lives at the repository-root `assets/` directory, using the
 * exact paths written in `docs/art/ASSET_MANIFEST.md`. Keeping the folder at the
 * root (instead of moving it under `public/`) means the artist can drop a PNG at
 * the literal manifest path and it just works.
 *
 * Vite's dev server already serves root-relative files, so this plugin only has
 * to install the 404 middleware and mirror the directory into `dist/` on build.
 */
function assetsPlugin(): Plugin {
  return {
    name: 'dungeonauts:assets',
    // Registered synchronously so it sits ahead of Vite's SPA fallback.
    configureServer(server: ViteDevServer) {
      server.middlewares.use(missingAssetIs404)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(missingAssetIs404)
    },
    async closeBundle() {
      if (!existsSync(ASSETS_DIR)) return
      await cp(ASSETS_DIR, resolve(import.meta.dirname, 'dist/assets'), { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [assetsPlugin()],
  // `assets/` is served from the project root; there is no `public/` directory.
  publicDir: false,
  build: {
    target: 'es2022',
    // Vite's own bundles would default to `dist/assets/`, which is where the
    // game art is copied. Keep the two apart so `dist/assets/` stays a faithful
    // mirror of the manifest paths.
    assetsDir: 'bundle',
    // The single oversized chunk is Phaser itself, which is expected.
    chunkSizeWarningLimit: 1500,
    // Phaser is large and versioned; splitting it keeps app rebuilds cache-friendly.
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
})
