<script setup>
import { computed } from 'vue'
import ExpandableCard from '../ExpandableCard.vue'

/* ============================================================
   路由展开卡片
   把「父路由 + 子路由 + 展开键」的既有约定收敛成一个组件，
   页面只需要描述卡片本身和展开内容，不再重复四个路由参数。

   · section   父路由名，如 home / trends / activity
   · cardKey   展开键，如 steps / oxygen / 记录 id
   · routeName 默认 `${section}-${cardKey}`；不符合命名约定时显式传入
   · content   展开后的内容组件（同步或异步组件）
   · contentProps 透传给展开内容

   展开动画、路由联动、桌面端模态尺寸都在 ExpandableCard 内部处理，
   接入步骤见 docs/route-expand-card.md。
   ============================================================ */

const props = defineProps({
  section: { type: String, required: true },
  cardKey: { type: [String, Number], required: true },
  routeName: { type: String, default: '' },
  params: { type: Object, default: () => ({}) },
  tag: { type: String, default: 'section' },
  variant: { type: String, default: 'card' },
  feature: { type: Boolean, default: false },
  content: { type: [Object, Function], required: true },
  contentProps: { type: Object, default: () => ({}) }
})

const resolvedRoute = computed(() => props.routeName || `${props.section}-${props.cardKey}`)
</script>

<template>
  <ExpandableCard
    :tag="tag"
    :expand-key="String(cardKey)"
    :route-name="resolvedRoute"
    :parent-route-name="section"
    :route-params="params"
    :variant="variant"
    :feature="feature"
    :content="content"
    :content-props="contentProps"
  >
    <slot />
  </ExpandableCard>
</template>
