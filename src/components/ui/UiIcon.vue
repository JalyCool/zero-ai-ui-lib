<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS, iconMarkup } from '../../core/icons'
import { normalizeIconName } from '../../core/iconify'

const props = defineProps({
  name: { type: String, required: true },
  /* 像素尺寸；也可传 CSS 长度（如 1em，内联在文字里用） */
  size: { type: [Number, String], default: 18 },
  /* 是否填充（默认描边；只对本地注册表标记生效，Iconify 图标跟随 currentColor） */
  filled: { type: Boolean, default: false },
  strokeWidth: { type: [Number, String], default: 1.9 },
  label: { type: String, default: '' }
})

/* 本地注册表优先（registerIcons / 内置 ICONS）；否则按 Iconify 名字渲染。
   名字先归一化：pack/icon、pack--icon、i-pack:icon 都折算成 pack:icon。 */
const local = computed(() => iconMarkup(props.name) || ICONS[props.name] || '')
const iconifyName = computed(() => {
  if (local.value) return ''
  const n = normalizeIconName(props.name)
  /* 没有 pack:icon 分隔符的裸名字不是 Iconify 名（注册表未命中就渲染空） */
  return n.includes(':') ? n : ''
})
const style = computed(() => ({ width: typeof props.size === 'number' ? props.size + 'px' : props.size, height: typeof props.size === 'number' ? props.size + 'px' : props.size }))
</script>
<template>
  <span class="ui-icon" :style="style" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'">
    <Icon v-if="iconifyName" :icon="iconifyName" :width="size" :height="size" aria-hidden="true" />
    <svg v-else viewBox="0 0 24 24" :fill="filled ? 'currentColor' : 'none'" :stroke="filled ? 'none' : 'currentColor'" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" v-html="local"></svg>
  </span>
</template>
<style scoped>
.ui-icon { display: inline-grid; place-items: center; flex-shrink: 0; color: currentColor; }
.ui-icon svg { width: 100%; height: 100%; display: block; }
.ui-icon :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
