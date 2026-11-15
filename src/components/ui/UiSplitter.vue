<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
const props = defineProps({
  /* 第一面板占比 0~1（兼容旧写法：>1 时按百分数解释） */
  modelValue: { type: Number, default: 0.5 },
  direction: { type: String, default: 'horizontal' },
  min: { type: Number, default: 0.15 },
  max: { type: Number, default: 0.85 },
  /* 分隔条宽度（px） */
  handle: { type: Number, default: 10 }
})
const emit = defineEmits(['update:modelValue'])
const rootEl = ref(null)
const dragging = ref(false)
let pointerId = null
let rect = null

/* ============================================================
   分割面板
   · 第一面板的宽度（纵向时是高度）按「扣除分隔条后的可用空间」分配，
     分隔条本身固定宽度：50% + 10px 不会把容器撑出横向滚动条。
   · min / max 只接受 0~1；误传 20 / 80 这种百分数时自动换算，
     不会再算出 2000% 宽、把分隔条甩到滚动条那边。
   ============================================================ */
function fraction(value, fallback) {
  if (!Number.isFinite(value)) return fallback
  return value > 1 ? value / 100 : value
}
const minRatio = computed(() => Math.min(1, Math.max(0, fraction(props.min, 0.15))))
const maxRatio = computed(() => Math.min(1, Math.max(minRatio.value, fraction(props.max, 0.85))))
const ratio = computed(() => Math.min(maxRatio.value, Math.max(minRatio.value, fraction(props.modelValue, 0.5))))

const rootStyle = computed(() => ({
  '--handle': props.handle + 'px',
  '--r': String(ratio.value)
}))

function onDown(event) {
  pointerId = event.pointerId
  rect = rootEl.value.getBoundingClientRect()
  dragging.value = true
  try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
  event.preventDefault()
}
function onMove(event) {
  if (pointerId === null || !rect) return
  const raw = props.direction === 'vertical'
    ? (event.clientY - rect.top) / Math.max(1, rect.height)
    : (event.clientX - rect.left) / Math.max(1, rect.width)
  const bounded = Math.min(maxRatio.value, Math.max(minRatio.value, raw))
  if (Math.abs(bounded - ratio.value) < 0.0005) return
  emit('update:modelValue', bounded)
}
function onUp() { pointerId = null; rect = null; dragging.value = false }
onBeforeUnmount(() => { pointerId = null; dragging.value = false })
</script>
<template>
  <div
    ref="rootEl"
    class="ui-splitter"
    :class="[`is-${direction}`, { 'is-dragging': dragging }]"
    :style="rootStyle"
  >
    <div class="ui-splitter__pane" :style="{ flexBasis: 'calc(var(--r) * (100% - var(--handle)))' }"><slot name="first" /></div>
    <div class="ui-splitter__handle" role="separator" :aria-orientation="direction === 'vertical' ? 'horizontal' : 'vertical'"
      :aria-valuenow="Math.round(ratio * 100)" :aria-valuemin="Math.round(minRatio * 100)" :aria-valuemax="Math.round(maxRatio * 100)"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <span></span>
    </div>
    <div class="ui-splitter__pane is-second"><slot /></div>
  </div>
</template>
<style scoped>
.ui-splitter {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: calc(12px * var(--radius-scale));
}
.ui-splitter.is-vertical { flex-direction: column; }

/* 两个面板都不许把内容撑大：flex-basis 只吃「总宽 - 分隔条」的份额，
   子内容再宽也只在面板内部滚动。 */
.ui-splitter__pane {
  flex: 0 0 0;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.ui-splitter.is-horizontal .ui-splitter__pane { height: 100%; }
.ui-splitter.is-vertical .ui-splitter__pane { width: 100%; }
.ui-splitter.is-vertical .ui-splitter__pane { flex-basis: calc(var(--r) * (100% - var(--handle))); }
.ui-splitter__pane.is-second { flex: 1 1 0; }

.ui-splitter__handle {
  position: relative;
  flex: 0 0 var(--handle);
  display: grid;
  place-items: center;
  background: var(--surface-container);
  touch-action: none;
  cursor: col-resize;
  transition: background var(--t-fade);
  z-index: 1;
}
.ui-splitter.is-vertical .ui-splitter__handle { cursor: row-resize; }
.ui-splitter__handle:hover, .ui-splitter.is-dragging .ui-splitter__handle { background: var(--surface-container-high); }
.ui-splitter__handle span { width: 3px; height: 26px; border-radius: 99px; background: var(--outline-variant); transition: background var(--t-fade), height var(--t-pop); }
.ui-splitter.is-vertical .ui-splitter__handle span { width: 26px; height: 3px; }
.ui-splitter__handle:hover span, .ui-splitter.is-dragging .ui-splitter__handle span { background: var(--primary); }
.ui-splitter.is-dragging { user-select: none; }

@media (prefers-reduced-motion: reduce) {
  .ui-splitter__handle, .ui-splitter__handle span { transition-duration: .01ms; }
}
</style>
