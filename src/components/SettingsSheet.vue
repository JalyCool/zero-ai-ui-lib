<script setup>
import { computed } from 'vue'
import { UiBottomSheet } from './ui'
import StyleLab from './StyleLab.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

/* Playground = 库自己的 UiBottomSheet + 样式测试面板。
   不再手写 sheet 结构：遮罩、拖拽把手、锚点、锁滚动都由组件负责。 */
const model = computed({
  get: () => props.open,
  set: value => { if (!value) emit('close') }
})
</script>

<template>
  <UiBottomSheet
    v-model="model"
    title="Playground · 样式测试"
    max-height="88dvh"
  >
    <StyleLab />
  </UiBottomSheet>
</template>
