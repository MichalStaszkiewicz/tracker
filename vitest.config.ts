import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Domyślne środowisko: node (core/ + shared/ — logika i baza).
// Testy komponentów w src/ deklarują jsdom docblokiem:  // @vitest-environment jsdom
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src'),
      '@shared': resolve('shared'),
      '@core': resolve('core')
    }
  },
  test: {
    environment: 'node',
    include: ['{core,shared,src}/**/*.test.{ts,tsx}']
  }
})
