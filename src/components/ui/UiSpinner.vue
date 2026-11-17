<script setup>
import { computed } from 'vue'

/* size 既吃档位字符串（sm / md / lg），也吃像素数字（20 / '20'）；
   数字走内联尺寸，档位走类名。 */
const props = defineProps({
  size: { type: [String, Number], default: 'md' },
  label: { type: String, default: '加载中' }
})

const isPixel = computed(() => {
  if (typeof props.size === 'number') return true
  return /^\d+(\.\d+)?$/.test(String(props.size))
})
const pixelStyle = computed(() => (isPixel.value ? { width: props.size + 'px', height: props.size + 'px', borderWidth: Math.max(1.5, Number(props.size) / 10) + 'px' } : undefined))
const sizeClass = computed(() => (!isPixel.value && props.size !== 'md' ? 'ui-spinner--' + props.size : ''))
</script>

<template>
  <span class="ui-spinner" :class="sizeClass" :style="pixelStyle" role="status" :aria-label="label"></span>
</template>
