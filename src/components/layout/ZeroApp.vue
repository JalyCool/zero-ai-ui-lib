<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import ZeroScroll from './ZeroScroll.vue'

const slots = useSlots()

const props = defineProps({
  /* 内容最大宽度（px）；0 = 不限制。移动优先的应用设 480 就够。 */
  maxWidth: { type: Number, default: 480 },
  /* 内容内边距；不传按 maxWidth / tabbarSpace 给一套稳妥值，
     传 'none' 表示**不写内联 padding**，完全交给应用自己的外壳 CSS
     （老项目已经有 #scrollArea 的响应式内边距时用这个，避免内联样式盖掉它） */
  padding: { type: String, default: '' },
  /* 底部给 TabBar 留的高度（px）；0 = 没有 TabBar。
     传了非 0 且没有 #tabbar 插槽时按此值让位；有 #tabbar 插槽时
     **自动实测** TabBar 高度（fixed 悬浮层的真实占位），见 tabBarInset。 */
  tabbarSpace: { type: Number, default: 0 },
  /* 顶 / 底淡出带高度（px）；0 = 关闭 */
  fade: { type: Number, default: 84 },
  fadeBlur: { type: Number, default: 7 },
  fadeLayers: { type: Number, default: 12 },
  fadeTint: { type: String, default: 'var(--surface)' },
  fadeTintStrength: { type: Number, default: 0.8 }
})

/* ============================================================
   ZeroApp —— 应用外壳根组件（约定优于配置）
   ------------------------------------------------------------
   学 Nuxt 的做法：把这套装框架里「每个页面都要写一遍、又永远该一样」
   的东西收进一个根组件，应用只负责往里放内容。

   用上它，下面这些就**不需要 AI 或人再去配置**：
   · #scrollArea 滚动容器（库的弹层靠这个 id 锁滚动）
   · 页面上下边缘溢出时的渐进式模糊（随滚动位置自动淡入淡出）
   · 移动优先的居中列 + 安全区 + 桌面端铺满
   · TabBar 占位（底部自动留出高度，内容不会被压在 tab 下）
   · **底部模糊带以 TabBar 顶边为底边** —— 模糊不再糊进 TabBar 区域

     <ZeroApp>
       <router-view />
       <template #tabbar><UiTabBar … /></template>
     </ZeroApp>

   需要更多控制就退回 ZeroScroll，或直接用 UiProgressiveBlur 手搭。
   ============================================================ */

const scrollRef = ref(null)

/* 不在这里 provide 滚动元素：插槽内容的作用域链经过 ZeroApp，
   但 provide 的值一旦涉及子组件的 computed 就容易形成读取链循环
   （实测整页白屏）。AppHead 改为**自己向上找滚动容器**，
   不依赖 provide/inject —— 见 useScrollEdges 的说明。 */
const barEl = ref(null)
const barHeight = ref(0)
let barRo = null

/* #tabbar 槽位存在时实测 TabBar 高度（fixed 层不占布局，必须量）。
   ResizeObserver 跟随旋转 / 字体加载引起的高度变化。 */
onMounted(() => {
  nextTickBar()
})
function nextTickBar() {
  const el = barEl.value?.firstElementChild || barEl.value
  if (el && typeof ResizeObserver !== 'undefined') {
    barRo = new ResizeObserver(() => {
      barHeight.value = Math.round(el.getBoundingClientRect().height)
    })
    barRo.observe(el)
    barHeight.value = Math.round(el.getBoundingClientRect().height)
  } else if (el) {
    barHeight.value = Math.round(el.getBoundingClientRect().height)
  }
}
onBeforeUnmount(() => { if (barRo) barRo.disconnect() })

/* 底部固定层高度：实测优先，fallback 用 tabbarSpace */
const tabBarInset = computed(() => {
  if (slots && slots.tabbar) return barHeight.value
  return props.tabbarSpace
})

const resolvedPadding = computed(() => {
  /* 'none' = 内联不写，交给应用的 #scrollArea 规则（含 media query） */
  if (props.padding === 'none') return ''
  if (props.padding) return props.padding
  const bottom = tabBarInset.value > 0 ? tabBarInset.value + 16 : 24
  return `20px clamp(16px, 4vw, 48px) ${bottom}px`
})

const appStyle = computed(() => {
  const style = {}
  if (props.maxWidth > 0) style.maxWidth = props.maxWidth + 'px'
  return style
})

defineExpose({
  scrollTo: (...args) => scrollRef.value?.scrollTo?.(...args),
  scrollTop: (top = 0) => scrollRef.value?.scrollTop?.(top),
  el: computed(() => scrollRef.value?.el)
})
</script>

<template>
  <div class="zero-app" :style="appStyle">
    <ZeroScroll
      ref="scrollRef"
      id="scrollArea"
      tag="main"
      :padding="resolvedPadding"
      :fade="fade"
      :fade-blur="fadeBlur"
      :fade-layers="fadeLayers"
      :fade-tint="fadeTint"
      :fade-tint-strength="fadeTintStrength"
      :bottom-inset="tabBarInset"
    >
      <slot />
      <!-- 边缘插槽：渲染在渐变模糊带**上层**的固定内容。
           AppHead 放 #edge-top：默认态大标题在流内，滚出后自动融合成
           迷你条（与模糊带融为一体）。 -->
      <template v-if="$slots['edge-top']" #edge-top><slot name="edge-top" /></template>
      <template v-if="$slots['edge-bottom']" #edge-bottom><slot name="edge-bottom" /></template>
    </ZeroScroll>
    <!-- TabBar 槽位：UiTabBar 自己是 position:fixed 悬浮层（z-20），
         而 ZeroScroll 的模糊层 z-50 —— 不包一层的话，底部模糊会糊在
         TabBar 文字上。包一层抬到 z-60；同时实测高度传给 bottomInset，
         让底部模糊带以 TabBar 顶边为底边。 -->
    <div v-if="$slots.tabbar" ref="barEl" class="zero-app__bar"><slot name="tabbar" /></div>
  </div>
</template>

<style scoped>
/* 移动端：整屏一列，内容居中限宽；桌面端由 maxWidth 放开交给应用 */
.zero-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  min-height: 0;
}
/* 槽位本身不占布局（内部是 fixed），只负责抬高 z：
   必须高于模糊层的 z-50，TabBar 才不会被底部模糊盖住 */
.zero-app__bar {
  position: relative;
  z-index: 60;
}
</style>