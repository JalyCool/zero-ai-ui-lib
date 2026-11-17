<script setup>
import { computed, ref } from 'vue'
import ZeroScroll from './ZeroScroll.vue'

const props = defineProps({
  /* 内容最大宽度（px）；0 = 不限制。移动优先的应用设 480 就够。 */
  maxWidth: { type: Number, default: 480 },
  /* 内容内边距；不传按 maxWidth / tabbarSpace 给一套稳妥值，
     传 'none' 表示**不写内联 padding**，完全交给应用自己的外壳 CSS
     （老项目已经有 #scrollArea 的响应式内边距时用这个，避免内联样式盖掉它） */
  padding: { type: String, default: '' },
  /* 底部给 TabBar 留的高度（px）；0 = 没有 TabBar */
  tabbarSpace: { type: Number, default: 0 },
  /* 顶 / 底淡出带高度（px）；0 = 关闭 */
  fade: { type: Number, default: 132 },
  fadeBlur: { type: Number, default: 9 },
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

     <ZeroApp :tabbar-space="tabBarHeightOr0">
       <router-view />
       <template #tabbar><UiTabBar … /></template>
     </ZeroApp>

   需要更多控制就退回 ZeroScroll，或直接用 UiProgressiveBlur 手搭。
   ============================================================ */

const scrollRef = ref(null)

const resolvedPadding = computed(() => {
  /* 'none' = 内联不写，交给应用的 #scrollArea 规则（含 media query） */
  if (props.padding === 'none') return ''
  if (props.padding) return props.padding
  const bottom = props.tabbarSpace > 0 ? props.tabbarSpace + 16 : 24
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
    >
      <slot />
    </ZeroScroll>
    <slot name="tabbar" />
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
</style>