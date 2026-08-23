import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Default to `node`; DOM-facing suites opt in with a
    // `@vitest-environment jsdom` docblock so the fast tests stay fast.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
