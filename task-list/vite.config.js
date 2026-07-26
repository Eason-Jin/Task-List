import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site works from any path (root domain, /repo/, file://).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
