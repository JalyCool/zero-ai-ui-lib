<script setup>
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSheet from './components/SettingsSheet.vue'
import { AppHead, UiButton, UiCommandPalette, UiIcon, UiTabBar, UiToastHost, ViewSwap, ZeroApp } from './lib'
import { initZeroConfig } from './lib'
import { state, persistThemeState } from './core/state'
import * as spring from './core/spring'
import * as typography from './core/typography'
import * as visual from './core/visual'
import * as theme from './core/theme'
import { initPress } from './core/press'
import { activityState } from './core/activityStore'
import { useEdgeSwipeBack } from './core/edgeSwipeBack'
import { getActive } from './core/expandManager'
import { appHeadState } from './composables/useAppHead'

const route = useRoute()
const router = useRouter()
const sheetOpen = ref(false)
const scrollRef = ref(null)
const toastRef = ref(null)
const paletteOpen = ref(false)

const meta = computed(() => route.meta)
const activeTab = computed(() => route.meta.tab)

/* 导航项：icon 是 24x24 viewBox 内的 SVG 内部标记。 */
const tabItems = [
  { value: 'home', label: '首页', icon: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"/>' },
  { value: 'chat', label: '对话', icon: '<path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.3-.7L3 21l1.9-5.4A8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z"/>' },
  { value: 'activity', label: '活动', icon: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>' },
  { value: 'trends', label: '趋势', icon: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>' },
  { value: 'components', label: '组件', icon: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>' },
  { value: 'profile', label: '我的', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' }
]

/* 页面切换（方向 / 过渡名 / keep-alive）统一交给 ViewSwap，
   这里只提供 TabBar 的顺序用于判断 next / prev。 */
const tabOrder = tabItems.map(item => item.value)

/* 页面通过 useAppHead 注册的头部动作：渲染在全局按钮旁边，
   默认态与融合条共用同一份（AppHead 两态渲染同一插槽）。 */
const pageActionsComp = computed(() =>
  appHeadState.actions ? { render: appHeadState.actions } : null
)

/* 头部第二行（#after）：页面注入，默认态与融合条共用 */
const pageAfterComp = computed(() =>
  appHeadState.after ? { render: appHeadState.after } : null
)

/* 非 tab 根页显示返回键（Figma 46:363 左侧箭头） */
const canBack = computed(() => !!(route.meta.tab && route.name !== route.meta.tab))
function goBack() {
  router.back()
}

const pageSub = computed(() => {
  if (route.meta.tab !== 'activity') return route.meta.sub
  if (route.name === 'activity-new') return route.meta.sub
  if (!activityState.loaded) return '正在加载运动记录…'
  return `共 ${activityState.records.length} 条运动记录`
})

/* ---------- 全局命令面板（⌘K / Ctrl+K） ----------
   一个入口就能跳任意页面、切换外观、打开设置 —— 不必再给每个页面
   单独做快捷键。 */
const paletteItems = computed(() => {
  const nav = tabItems.map(t => ({
    value: 'go:' + t.value,
    label: t.label,
    description: t.value === activeTab.value ? '当前页面' : '跳转',
    keywords: t.value
  }))
  const extras = [
    { value: 'appearance:light', label: '浅色外观', description: '设置', keywords: 'theme light 浅色' },
    { value: 'appearance:dark', label: '深色外观', description: '设置', keywords: 'theme dark 深色' },
    { value: 'appearance:auto', label: '跟随系统', description: '设置', keywords: 'auto system 跟随' },
    { value: 'open:settings', label: '打开设置', description: '配色 / 外观 / 动效', keywords: 'settings 设置 主题' },
    { value: 'toast:demo', label: '发一条提示', description: 'Toast 演示', keywords: 'toast 提示' }
  ]
  return [...nav, ...extras]
})

function onPalettePick(item) {
  const [kind, arg] = String(item.value).split(':')
  if (kind === 'go') { router.replace({ name: arg }); return }
  if (kind === 'appearance') {
    state.appearance = arg
    persistThemeState()
    theme.apply({ animate: true })
    return
  }
  if (kind === 'open') { sheetOpen.value = true; return }
  if (kind === 'toast') { toastRef.value?.show('这是一条来自命令面板的提示', 'info') }
}

function openPalette() { paletteOpen.value = true }

/* ⌘K / Ctrl+K 由 UiCommandPalette 自己监听（它内置 shortcut），
   这里不要再注册一遍 —— 两处都 toggle 会开了又关。 */

function selectTab(id) {
  if (document.body.classList.contains('locked')) return
  if (id === activeTab.value && route.name === id) return
  /* 历史栈规则：底部 Tab 切换用 replace —— Tab 是平级视图，
     不该往历史里堆；系统返回应该退到「上一页」或收起展开的卡片。 */
  router.replace({ name: id })
}

function toggleSheet() { sheetOpen.value = !sheetOpen.value }
function closeSheet() { sheetOpen.value = false }

/* 切页回顶：滚动容器由 ZeroApp 持有。
   用瞬时回顶而不是 smooth —— smooth 会与页面切换过渡叠加，
   看起来就是「换页时抖一下」。回顶是定位，不是动效。 */
watch(() => route.meta.tab, (value, oldValue) => {
  if (value === oldValue) return
  scrollRef.value?.scrollTo?.({ top: 0, behavior: 'auto' })
})

watch(state, () => theme.apply({ animate: true }), { deep: true })

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

onBeforeUnmount(() => {
  if (swipeBack) swipeBack.unmount()
  swipeBack = null
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

  <!-- 外壳交给 ZeroApp：滚动容器（#scrollArea，弹层锁滚动依赖它）
       与**页面上下边缘溢出时的渐进式模糊**都是约定好的，不用每页配置。
       padding 传 none —— 内边距仍由应用自己的 #scrollArea 规则管
       （它带 media query，内联样式会把它盖掉）。 -->
  <div class="app">
    <ZeroApp ref="scrollRef" :max-width="0" padding="none">
      <template #edge-top>
        <!-- 融合条（fixed，滚过头才淡入）：底色就是顶部渐变模糊带本身。
             按钮与默认态共享同一组插槽 —— 页面注入的动作会出现在全局按钮旁边。 -->
        <AppHead fuse-only :title="meta.title || ''">
          <template #actions>
            <component :is="pageActionsComp" />
            <UiButton variant="icon" aria-label="打开命令面板" title="⌘K" @click.stop="openPalette">
              <UiIcon name="mdi:magnify" :size="19" />
            </UiButton>
            <UiButton variant="icon" id="themeBtn" aria-label="打开设置" @click.stop="toggleSheet">
              <UiIcon name="mdi:cog-outline" :size="19" />
            </UiButton>
          </template>
          <template #after><component :is="pageAfterComp" v-if="pageAfterComp" /></template>
        </AppHead>
      </template>

      <!-- 默认态大标题：在页面流内随内容滚走。同一组动作再渲染一次，
           所以「页面按钮 + 全局按钮」永远并排、不会各画一套头。 -->
      <AppHead :title="meta.title || ''" :sub="pageSub || ''">
        <template #actions>
          <component :is="pageActionsComp" />
          <UiButton variant="icon" aria-label="打开命令面板" title="⌘K" @click.stop="openPalette">
            <UiIcon name="mdi:magnify" :size="19" />
          </UiButton>
          <UiButton variant="icon" id="themeBtn" aria-label="打开设置" @click.stop="toggleSheet">
            <UiIcon name="mdi:cog-outline" :size="19" />
          </UiButton>
        </template>
        <template #after><component :is="pageAfterComp" v-if="pageAfterComp" /></template>
      </AppHead>

      <!-- 视图区：切换保活 + 过渡统一在 ViewSwap（keep-alive 在外，
           避免 out-in 的空白期与组件重建） -->
      <div id="viewRoot">
        <ViewSwap :tabs="tabOrder" />
      </div>

      <template #tabbar>
        <UiTabBar id="tabbar" :items="tabItems" :model-value="activeTab" @change="selectTab" />
      </template>
    </ZeroApp>
  </div>

  <SettingsSheet :open="sheetOpen" @close="closeSheet" />

  <!-- 全局反馈 / 命令面板：应用级只放一份，页面里直接 ref 调用 -->
  <UiToastHost ref="toastRef" />
  <UiCommandPalette
    :model-value="paletteOpen"
    :items="paletteItems"
    @update:model-value="v => (paletteOpen = v)"
    @select="onPalettePick"
  />
</template>

<style>
/* AppHead 自带排版；这里只留 icon-btn 的尺寸约定 */
</style>