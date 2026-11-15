import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    /* 调试用无头 Chrome 的 profile 目录会被写大量文件，
       不排除会让 dev server 不停热更甚至拖垮预览服务。 */
    watch: {
      /* 无头 Chrome 的 profile（.chrome-color 等）与截图会往根目录写大量文件，
         不排除的话 dev server 会不停热更。 */
      ignored: ['**/.chrome-*/**', '**/.shot*']
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
})
