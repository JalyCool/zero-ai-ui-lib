<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSheet from './components/SettingsSheet.vue'
import { state } from './core/state'
import * as spring from './core/spring'
import * as typography from './core/typography'
import * as visual from './core/visual'
import * as theme from './core/theme'
import { initPress } from './core/press'
import { activityState } from './core/activityStore'

const route = useRoute()
const router = useRouter()
const sheetOpen = ref(false)
const scrollArea = ref(null)

const meta = computed(() => route.meta)
const activeTab = computed(() => route.meta.tab)

const pageSub = computed(() => {
  if (route.meta.tab !== 'activity') return route.meta.sub
  if (route.name === 'activity-new') return route.meta.sub
  if (!activityState.loaded) return '正在加载运动记录…'
  return `共 ${activityState.records.length} 条运动记录`
})

function selectTab(id) {
  if (document.body.classList.contains('locked')) return
  if (id === activeTab.value && route.name === id) return
  router.push({ name: id })
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

onMounted(() => {
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

    <nav class="tabbar" id="tabbar" aria-label="主导航">
      <button class="tab" :class="{ active: activeTab === 'home' }" data-tab="home" @click="selectTab('home')">
        <span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"/></svg></span>
        <span>首页</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'activity' }" data-tab="activity" @click="selectTab('activity')">
        <span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 8L9 4l-3 8H2"/></svg></span>
        <span>活动</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'trends' }" data-tab="trends" @click="selectTab('trends')">
        <span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg></span>
        <span>趋势</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'components' }" data-tab="components" @click="selectTab('components')">
        <span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg></span>
        <span>组件</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'profile' }" data-tab="profile" @click="selectTab('profile')">
        <span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></span>
        <span>我的</span>
      </button>
    </nav>
  </div>

  <SettingsSheet :open="sheetOpen" @close="closeSheet" />
</template>
