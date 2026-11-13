import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/lib/index.js', import.meta.url)),
      name: 'ZeroAiUiLib',
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'zero-ai-ui-lib.mjs' : 'zero-ai-ui-lib.cjs'),
      cssFileName: 'zero-ai-ui-lib'
    },
    rollupOptions: {
      external: ['vue', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
