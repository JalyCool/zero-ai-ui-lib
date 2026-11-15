import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  /* 同上：忽略调试浏览器 profile，避免构建扫描无关文件。 */
  server: { watch: { ignored: ['**/.chrome-p*/**', '**/.chrome-profile*/**'] } },
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
