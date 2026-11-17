<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* 选项：字符串 / 数字，或 { value, label } */
  items: { type: Array, default: () => [] },
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  /* false 时列不可交互（面板未展开时屏蔽焦点） */
  interactive: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   滚轮列（波轮选择器共用）
   高亮块固定在中间不动，点击和滚动移动的是背后的数字层；
   停止 140ms 后把最近的数字吸附到正中并采纳为当前值。
   ============================================================ */

const columnEl = ref(null)
let settleTimer = 0
let suppressWatch = false

function itemText(item) {
  if (item && typeof item === 'object') return String(item.label ?? item.value)
  return String(item)
}

function itemValue(item) {
  if (item && typeof item === 'object') return item.value
  return item
}

function scrollToValue(value, behavior = 'smooth') {
  const column = columnEl.value
  if (!column) return
  const target = column.querySelector('[data-value="' + CSS.escape(String(value)) + '"]')
  if (!target) return
  const top = target.offsetTop - (column.clientHeight - target.offsetHeight) / 2
  column.scrollTo({ top: Math.max(0, top), behavior })
}

function centeredValue() {
  const column = columnEl.value
  if (!column) return null
  const center = column.scrollTop + column.clientHeight / 2
  let best = null
  let bestDistance = Infinity
  column.querySelectorAll('button[data-value]').forEach(button => {
    const middle = button.offsetTop + button.offsetHeight / 2
    const distance = Math.abs(middle - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = button.dataset.value
    }
  })
  return best
}

function settle() {
  const value = centeredValue()
  if (value === null) return
  const current = itemValue(props.items.find(item => String(itemValue(item)) === value) ?? value)
  if (String(current) !== String(props.modelValue)) {
    suppressWatch = true
    emit('update:modelValue', current)
  }
  scrollToValue(value)
}

function onScroll() {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => {
    settleTimer = 0
    settle()
  }, 140)
}

function select(item) {
  const value = itemValue(item)
  suppressWatch = true
  emit('update:modelValue', value)
  scrollToValue(value)
}

watch(() => props.modelValue, value => {
  if (suppressWatch) {
    suppressWatch = false
    return
  }
  scrollToValue(value)
})

onBeforeUnmount(() => {
  clearTimeout(settleTimer)
})

defineExpose({ scrollToValue })
</script>

<template>
  <div
    ref="columnEl"
    class="ui-wheel-column"
    role="listbox"
    :aria-label="label"
    :aria-valuenow="String(modelValue)"
    @scroll.passive="onScroll"
  >
    <button
      v-for="(item, index) in items"
      :key="index"
      type="button"
      role="option"
      :data-value="String(itemValue(item))"
      :aria-selected="String(itemValue(item)) === String(modelValue)"
      :tabindex="interactive ? 0 : -1"
      :class="{ 'is-selected': String(itemValue(item)) === String(modelValue) }"
      @click="select(item)"
    >
      {{ itemText(item) }}
    </button>
  </div>
</template>

<style scoped>
.ui-wheel-column {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 66px 2px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
}
.ui-wheel-column::-webkit-scrollbar { display: none; }
.ui-wheel-column button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 30px;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  cursor: pointer;
  transition: color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-wheel-column button:hover {
  background: color-mix(in oklab, var(--surface) 46%, transparent);
  color: var(--on-surface);
}
.ui-wheel-column button:active { transform: scale(.96); }
.ui-wheel-column button.is-selected {
  background: transparent;
  color: var(--on-primary-container);
  font-weight: var(--w-strong);
}
</style>
