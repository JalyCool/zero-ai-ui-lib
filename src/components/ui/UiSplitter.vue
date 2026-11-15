<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
const props = defineProps({
  /* 第一面板占比 0~1 */
  modelValue: { type: Number, default: 0.5 },
  direction: { type: String, default: 'horizontal' },
  min: { type: Number, default: 0.15 },
  max: { type: Number, default: 0.85 },
  /* 分隔条宽度（px） */
  handle: { type: Number, default: 10 }
})
const emit = defineEmits(['update:modelValue'])
const rootEl = ref(null)
let pointerId = null
let rect = null

/* 分割面板：拖中间的分隔条分配空间，方向可横可纵。 */
const ratio = computed(() => Math.min(props.max, Math.max(props.min, props.modelValue)))
const firstStyle = computed(() => props.direction === 'vertical' ? { height: ratio.value * 100 + '%' } : { width: ratio.value * 100 + '%' })

function onDown(event) {
  pointerId = event.pointerId
  rect = rootEl.value.getBoundingClientRect()
  try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
}
function onMove(event) {
  if (pointerId === null || !rect) return
  const raw = props.direction === 'vertical'
    ? (event.clientY - rect.top) / Math.max(1, rect.height)
    : (event.clientX - rect.left) / Math.max(1, rect.width)
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, raw)))
}
function onUp() { pointerId = null; rect = null }
onBeforeUnmount(() => { pointerId = null })
</script>
<template>
  <div ref="rootEl" class="ui-splitter" :class="`is-${direction}`" :style="{ '--handle': handle + 'px' }">
    <div class="ui-splitter__pane" :style="firstStyle"><slot name="first" /></div>
    <div class="ui-splitter__handle" role="separator" :aria-orientation="direction === 'vertical' ? 'horizontal' : 'vertical'"
      :aria-valuenow="Math.round(ratio * 100)"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <span></span>
    </div>
    <div class="ui-splitter__pane is-second"><slot /></div>
  </div>
</template>
<style scoped>
.ui-splitter { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; }
.ui-splitter.is-vertical { flex-direction: column; }
.ui-splitter__pane { min-width: 0; min-height: 0; overflow: auto; }
.ui-splitter.is-horizontal .ui-splitter__pane { height: 100%; }
.ui-splitter.is-vertical .ui-splitter__pane { width: 100%; }
.ui-splitter__pane.is-second { flex: 1; }
.ui-splitter__handle { position: relative; flex: 0 0 var(--handle); display: grid; place-items: center; background: var(--surface-container); touch-action: none; cursor: col-resize; }
.ui-splitter.is-vertical .ui-splitter__handle { cursor: row-resize; }
.ui-splitter__handle span { width: 3px; height: 26px; border-radius: 99px; background: var(--outline-variant); transition: background var(--t-fade); }
.ui-splitter.is-vertical .ui-splitter__handle span { width: 26px; height: 3px; }
.ui-splitter__handle:hover span { background: var(--primary); }
</style>
