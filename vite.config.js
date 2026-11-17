import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  /* Tailwind v4：CSS-first，src/styles/tailwind.css 里 @theme 映射库令牌。
     只接应用侧（演示/视图开发）；库产物构建（vite.lib.config.js）不经过它，
     组件库仍然是纯令牌 CSS。 */
  plugins: [vue(), tailwindcss()],
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
