<script setup>
import { computed } from 'vue'
import { ICONS } from '../../core/icons'

const props = defineProps({
  name: { type: String, required: true },
  /* 像素尺寸；也可传 CSS 长度 */
  size: { type: [Number, String], default: 18 },
  /* 是否填充（默认描边） */
  filled: { type: Boolean, default: false },
  strokeWidth: { type: [Number, String], default: 1.9 },
  label: { type: String, default: '' }
})

/* 按名字取图标：注册表里没有就渲染空（开发期 console.warn 一次）。 */
const markup = computed(() => {
  const path = ICONS[props.name]
  if (!path && typeof console !== 'undefined') console.warn('[ui-icon] 未注册的图标：' + props.name)
  return path || ''
})
const style = computed(() => ({ width: typeof props.size === 'number' ? props.size + 'px' : props.size, height: typeof props.size === 'number' ? props.size + 'px' : props.size }))
</script>
<template>
  <span class="ui-icon" :style="style" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'">
    <svg viewBox="0 0 24 24" :fill="filled ? 'currentColor' : 'none'" :stroke="filled ? 'none' : 'currentColor'" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" v-html="markup"></svg>
  </span>
</template>
<style scoped>
.ui-icon { display: inline-grid; place-items: center; flex-shrink: 0; color: currentColor; }
.ui-icon svg { width: 100%; height: 100%; display: block; }
</style>
