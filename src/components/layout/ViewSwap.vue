<script setup>
/* ============================================================
   ViewSwap：页面（视图）切换的唯一出口。

   两条硬规则（都是「一换就闪/卡」的成因）：

   1. keep-alive 在 Transition **外面**。
      切走的页面保活：滚动位置、输入内容、Canvas / 图表实例都还在，
      切回来不重建、不重绘。若把 Transition 放外面并用 mode="out-in"，
      旧页会被卸载并留出一段空白期 —— 那一下就是「闪」。
   2. 过渡只动 opacity / transform / filter。
      不碰 height / margin / display，避免强制重排（reflow）。
      离开页在 leave 阶段 absolute 化（见 base.css 的过渡类），
      保留渲染状态的同时不占布局。

   方向（next / prev）由上一个与当前 tab 在 TabBar 里的相对位置决定：
   向右/向后 = next，向左/向前 = prev；桌面端表现为纵向（y），
   移动端为横向（x）。
   ============================================================ */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  /* tab 的顺序（TabBar 里的排列），用于判断切换方向 */
  tabs: { type: Array, default: () => [] }
})

const route = useRoute()

const isDesktop = () => typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(min-width: 900px)').matches

const viewDir = ref('next')
watch(() => route.meta.tab, (next, prev) => {
  const from = props.tabs.indexOf(prev)
  const to = props.tabs.indexOf(next)
  if (from >= 0 && to >= 0) viewDir.value = to >= from ? 'next' : 'prev'
})

const transitionName = computed(() => `${isDesktop() ? 'y' : 'x'}-${viewDir.value}`)
/* 缓存 key：展开页（子路由）与父页必须是**不同实例**，
   否则展开时父页实例被顶掉，返回后滚动位置 / 状态全丢。 */
const viewKey = computed(() =>
  route.meta.cacheKey || route.meta.expandKey || route.meta.tab
)
</script>

<template>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <Transition :name="transitionName">
        <component :is="Component" :key="viewKey" />
      </Transition>
    </keep-alive>
  </router-view>
</template>
