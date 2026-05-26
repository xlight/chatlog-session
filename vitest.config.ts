/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __BUILD_DATE__: JSON.stringify('2026-05-15'),
    __BUILD_TIME__: JSON.stringify('2026-05-15 12:00:00'),
    __GIT_HASH__: JSON.stringify('testhash'),
    __GIT_BRANCH__: JSON.stringify('main'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,js}'],
    css: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/auto-imports.d.ts',
        'src/components.d.ts',
        'src/main.ts',
        'src/vite-env.d.ts',
        'src/env.d.ts',
      ],
    },
  },
})