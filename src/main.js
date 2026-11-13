import { createApp } from 'vue'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/ui.css'
import './styles/views/home.css'
import './styles/views/activity.css'
import './styles/views/add-record.css'
import './styles/views/profile.css'
import './styles/views/library.css'
import './styles/sheet.css'
import './styles/expand.css'
import './styles/responsive.css'

import App from './App.vue'
import router from './router'
import * as spring from './core/spring'
import * as typography from './core/typography'
import * as visual from './core/visual'
import * as theme from './core/theme'

/* 首帧前同步落地已保存的外观与配色，避免加载后再改色造成跳变。 */
spring.apply()
typography.apply()
visual.apply()
theme.apply()

createApp(App).use(router).mount('#app')

/* 首帧渲染完成后再解除引导态：此前所有过渡都被关闭，
   确保启动时不会出现颜色从浅到深的可见过渡。 */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-booting')
  })
})
