<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

/* 指针捕获在指针已失效时会抛 NotFoundError，包一层避免打断手势。 */
function safeCapture(el, id) {
  try { el && el.setPointerCapture && el.setPointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}
function safeRelease(el, id) {
  try { el && el.releasePointerCapture && el.releasePointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  /* 小数位 */
  precision: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  label: { type: String, default: '' },
  /* 横向拖动多少像素改变全量程（越大越细腻） */
  pixelsPerRange: { type: Number, default: 240 },
  /* 越界时还能拖出多少（占量程比例），松手弹回 */
  rubber: { type: Number, default: 0.12 },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

/* ============================================================
   可拖数字（scrub）
   · 横向拖动改数值：手指数位移按量程换算，拖多快走多快；
   · 越界不硬停：超出上下限的部分按 rubber 系数衰减，形成橡皮筋，
     松手立刻弹回最近的合法值；
   · 没拖动（位移小于阈值）就当作点击，切换成输入框直接输入。
   ============================================================ */

const rootEl = ref(null)
const editing = ref(false)
const draft = ref('')
const inputEl = ref(null)
const dragging = ref(false)
const overshoot = ref(0)   /* 越界量（像素语义上的视觉偏移） */

let pointerId = null
let startX = 0
let startY = 0
let startValue = 0
let moved = false

const range = computed(() => Math.max(1e-6, props.max - props.min))
const precision = computed(() => Math.max(0, Math.min(6, props.precision)))
const shown = computed(() => Number(props.modelValue).toFixed(precision.value))

function clamp(value) {
  return Math.min(props.max, Math.max(props.min, value))
}

function quantize(value) {
  const steps = Math.round((value - props.min) / (props.step || 1))
  const snapped = props.min + steps * (props.step || 1)
  return Number(snapWithPrecision(snapped))
}

function snapWithPrecision(value) {
  const factor = Math.pow(10, precision.value)
  return Math.round(value * factor) / factor
}

function commit(value) {
  const next = snapWithPrecision(quantize(clamp(value)))
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
    emit('change', next)
  }
}

function onPointerDown(event) {
  if (props.disabled || event.button > 0) return
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  startValue = Number(props.modelValue) || 0
  moved = false
  dragging.value = true
  overshoot.value = 0
  rootEl.value && rootEl.value.setPointerCapture && safeCapture(rootEl.value, event.pointerId)
}

function onPointerMove(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  if (!moved && Math.abs(dx) < 4) return
  moved = true
  if (event.cancelable) event.preventDefault()

  const raw = startValue + (dx / props.pixelsPerRange) * range.value
  if (raw > props.max) overshoot.value = raw - props.max
  else if (raw < props.min) overshoot.value = raw - props.min
  else overshoot.value = 0

  /* 橡皮筋：越界部分按系数衰减，最多拖出 rubber 倍量程。 */
  const limit = range.value * props.rubber
  let value = raw
  if (raw > props.max) value = props.max + Math.min(limit, overshoot.value) * 0.42
  if (raw < props.min) value = props.min - Math.min(limit, -overshoot.value) * 0.42

  const visual = Math.min(limit * 0.42, Math.abs(value - clamp(value)))
  overshoot.value = value > clamp(value) ? visual : value < clamp(value) ? -visual : 0
  commitVisual(value)
}

/* 拖动过程中按视觉值显示（可以短时越界），但不写进 v-model 之外。 */
function commitVisual(value) {
  const display = snapWithPrecision(quantize(clamp(value)))
  if (display !== props.modelValue) {
    emit('update:modelValue', display)
    emit('change', display)
  }
}

function onPointerUp(event) {
  if (!dragging.value) return
  dragging.value = false
  rootEl.value && rootEl.value.releasePointerCapture && safeRelease(rootEl.value, event.pointerId)
  /* 松手：越界值立刻弹回合法范围。 */
  if (overshoot.value !== 0) commit(props.modelValue)
  overshoot.value = 0
  pointerId = null
  if (!moved) openEditor()
}

function onKeydown(event) {
  if (props.disabled || editing.value) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    commit(Number(props.modelValue) + (props.step || 1))
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    commit(Number(props.modelValue) - (props.step || 1))
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openEditor()
  }
}

function openEditor() {
  if (props.disabled) return
  draft.value = shown.value
  editing.value = true
  nextTick(() => {
    const el = inputEl.value
    if (el) { el.focus(); el.select() }
  })
}

function closeEditor(commitValue) {
  if (!editing.value) return
  editing.value = false
  if (commitValue) {
    const parsed = Number(String(draft.value).replace(/[^\d.-]/g, ''))
    if (Number.isFinite(parsed)) commit(parsed)
  }
}

onBeforeUnmount(() => { pointerId = null })

defineExpose({ focus: () => rootEl.value && rootEl.value.focus() })
</script>

<template>
  <span class="ui-scrub-field" :class="{ 'is-dragging': dragging, 'is-editing': editing, 'is-disabled': disabled }">
    <span v-if="label" class="ui-scrub-field__label">{{ label }}</span>

    <span
      ref="rootEl"
      class="ui-scrub-field__chip"
      :class="{ 'is-over': overshoot !== 0 }"
      role="spinbutton"
      tabindex="0"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="Number(modelValue)"
      :aria-label="label || '可拖动数值'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <span v-if="!editing" class="ui-scrub-field__value">
        <span class="ui-scrub-field__num">{{ shown }}</span>
        <span v-if="unit" class="ui-scrub-field__unit">{{ unit }}</span>
      </span>
      <input
        v-else
        ref="inputEl"
        v-model="draft"
        class="ui-scrub-field__input"
        type="text"
        inputmode="decimal"
        @blur="closeEditor(true)"
        @keydown.enter.prevent="closeEditor(true)"
        @keydown.esc.prevent="closeEditor(false)"
      />
    </span>
  </span>
</template>

<style scoped>
.ui-scrub-field { display: inline-flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-scrub-field__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-scrub-field__chip {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  min-width: 78px;
  padding: 8px 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface);
  cursor: ew-resize;
  user-select: none;
  touch-action: pan-y;
  transition: border-color var(--t-fade), background var(--t-fade), transform var(--t-feedback), box-shadow var(--t-fade);
}
.ui-scrub-field__chip:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 2px; }
/* 拖动中：抬起来一点，光标提示左右拖。 */
.ui-scrub-field.is-dragging .ui-scrub-field__chip {
  border-color: var(--primary);
  background: var(--surface-container);
  transform: scale(1.02);
}
/* 越界：描边转成警示色，配合橡皮筋的视觉回拉。 */
.ui-scrub-field__chip.is-over { border-color: var(--ui-warning, #c8862a); }
.ui-scrub-field__value { display: inline-flex; align-items: baseline; gap: 2px; font-variant-numeric: tabular-nums;
 font-feature-settings: var(--font-feat-tnum); }
.ui-scrub-field__num { font-size: 1.02rem; font-weight: var(--w-heading); letter-spacing: -.01em; }
.ui-scrub-field__unit { font-size: var(--fs-micro); color: var(--on-surface-variant); }
.ui-scrub-field.is-editing .ui-scrub-field__chip { cursor: text; border-color: var(--primary); }
.ui-scrub-field__input {
  width: 62px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.02rem;
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  text-align: center;
  outline: none;
}
.ui-scrub-field.is-disabled .ui-scrub-field__chip { opacity: .42; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .ui-scrub-field__chip { transition-duration: .01ms; }
  .ui-scrub-field.is-dragging .ui-scrub-field__chip { transform: none; }
}
</style>
