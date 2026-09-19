import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const alias = {
  '@': resolve('src'),
  '@shared': resolve('shared'),
  '@core': resolve('core')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: { input: { index: resolve('electron/main.ts') } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: { input: { index: resolve('electron/preload.ts') } }
    }
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: { alias },
    build: {
      rollupOptions: { input: { index: resolve('index.html') } }
    }
  }
})
