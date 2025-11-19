import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import versionPlugin from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [
    versionPlugin(),
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
      },
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用现代 Sass API
        additionalData: `@use "@/assets/styles/variables.scss" as *;`,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
      '/image': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
      '/video': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
      '/voice': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
      '/file': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
        },
      },
    },
  },
})
