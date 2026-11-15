<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSheet from './components/SettingsSheet.vue'
import { UiTabBar } from './components/ui'
import { initZeroConfig } from './lib'
import { state } from './core/state'
import * as spring from './core/spring'
import * as typography from './core/typography'
import * as visual from './core/visual'
import * as theme from './core/theme'
import { initPress } from './core/press'
import { activityState } from './core/activityStore'
import { useEdgeSwipeBack } from './core/edgeSwipeBack'
import { getActive } from './core/expandManager'

const route = useRoute()
const router = useRouter()
const sheetOpen = ref(false)
const scrollArea = ref(null)

const meta = computed(() => route.meta)
const activeTab = computed(() => route.meta.tab)

/* 导航项：icon 是 24x24 viewBox 内的 SVG 内部标记。 */
const tabItems = [
  { value: 'home', label: '首页', icon: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"/>' },
  { value: 'activity', label: '活动', icon: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>' },
  { value: 'trends', label: '趋势', icon: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>' },
  { value: 'components', label: '组件', icon: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>' },
  { value: 'profile', label: '我的', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' }
]

const pageSub = computed(() => {
  if (route.meta.tab !== 'activity') return route.meta.sub
  if (route.name === 'activity-new') return route.meta.sub
  if (!activityState.loaded) return '正在加载运动记录…'
  return `共 ${activityState.records.length} 条运动记录`
})

function selectTab(id) {
  if (document.body.classList.contains('locked')) return
  if (id === activeTab.value && route.name === id) return
  /* 历史栈规则：底部 Tab 切换用 replace —— Tab 是平级视图，
     不该往历史里堆；系统返回应该退到「上一页」或收起展开的卡片。 */
  router.replace({ name: id })
}

function toggleSheet() {
  sheetOpen.value = !sheetOpen.value
}

function closeSheet() {
  sheetOpen.value = false
}

watch(() => route.meta.tab, (value, oldValue) => {
  if (value === oldValue || !scrollArea.value) return
  scrollArea.value.scrollTo({ top: 0, behavior: 'smooth' })
})

watch(state, () => theme.apply({ animate: true }), { deep: true })

onBeforeUnmount(() => {
  if (swipeBack) swipeBack.unmount()
  swipeBack = null
})

/* iOS 侧滑跟手：完全接管左边缘手势（原生层需关闭系统滑动返回，
   并把左边缘系统手势优先交给 WebView）。只在有展开卡片时接管，
   拖的是那张卡片；过阈值 -> 完成动画后统一 back()，
   未过阈值 -> 恢复 transition 弹回。
   桌面端不启用：那里没有边缘手势的交互习惯，收起走遮罩 / Esc / 返回按钮。 */
let swipeBack = null
const isDesktopLayout = () =>
  window.matchMedia && window.matchMedia('(min-width: 900px)').matches

onMounted(() => {
  /* 应用级配置：根部 ui.motion / ui.density / ui.colors 等，缺文件不影响默认。 */
  initZeroConfig()

  swipeBack = useEdgeSwipeBack({
    container: () => document,
    target: () => getActive()?.card || document.getElementById('viewRoot'),
    shouldHandle: () => !isDesktopLayout() && !!getActive(),
    onBack: () => router.back()
  })

  spring.apply()
  typography.apply()
  visual.apply()
  theme.apply()
  initPress()

  // MD3 在后台加载；加载成功后自动升级配色，不阻塞首屏与交互。
  theme.loadMD3().then(loaded => {
    if (loaded) theme.apply({ animate: true })
  })
})
</script>

<template>
  <!-- 共享 SVG 渐变：首页、趋势页与展开页共用 -->
  <svg class="svg-defs" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
      </linearGradient>
    </defs>
  </svg>

  <div class="app">
    <main id="scrollArea" ref="scrollArea">
      <header>
        <div class="greet">
          <h1 id="greetTitle">{{ meta.title }}</h1>
          <p id="greetSub">{{ pageSub }}</p>
        </div>
        <button class="icon-btn" id="themeBtn" aria-label="打开设置" @click.stop="toggleSheet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </header>

      <div id="viewRoot">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" :key="route.meta.cacheKey || route.meta.tab" />
          </keep-alive>
        </router-view>
      </div>
    </main>

    <UiTabBar id="tabbar" :items="tabItems" :model-value="activeTab" @change="selectTab" />
  </div>

  <SettingsSheet :open="sheetOpen" @close="closeSheet" />
</template>
