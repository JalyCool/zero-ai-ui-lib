<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  /* 固定行高（像素）：虚拟滚动按它计算窗口 */
  itemHeight: { type: Number, default: 48 },
  /* 可视区高度 */
  height: { type: Number, default: 360 },
  /* 上下额外渲染的缓冲行数 */
  buffer: { type: Number, default: 6 },
  /* 选中语义：single 单选（点一下就换）/ multiple 多选（点击切换） */
  selection: { type: String, default: 'multiple' },
  /* 多选模式下：modelValue 是索引数组；单选模式：单个索引 */
  modelValue: { type: [Number, Array], default: null },
  itemKey: { type: String, default: '' },
  /* 长按行后竖向拖动连续勾选（swipe-select）。 */
  dragSelect: { type: Boolean, default: true },
  /* 长按判定门槛（ms） */
  holdMs: { type: Number, default: 260 },
  /* 长按后需要移动多少行才开始连选 */
  holdRows: { type: Number, default: 1 }
})

const emit = defineEmits(['update:modelValue', 'select'])

/* ============================================================
   虚拟滚动列表
   · 定高窗口渲染：几百上千行只画视口内十几行。
   · 单击选中：单选模式点一行换一行；多选模式点一行切换一行。
   · 长按 + 竖向拖动连选（swipe-select 语义）：按住某行超过
     holdMs 进入连选，之后手指 / 光标经过的每一行都被勾选；
     拖到可视区边缘时列表自动滚动，选中随滚动继续延伸，
     松手结束。连选只增不减（与系统列表习惯一致）。
   · 勾选标记在行首（左侧），不在末尾。
   ============================================================ */

const scrollEl = ref(null)
const scrollTop = ref(0)

const selected = computed(() => new Set(
  props.selection === 'single'
    ? (typeof props.modelValue === 'number' ? [props.modelValue] : [])
    : (Array.isArray(props.modelValue) ? props.modelValue : [])
))

const totalHeight = computed(() => props.items.length * props.itemHeight)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer))
const visibleCount = computed(() => Math.ceil(props.height / props.itemHeight) + props.buffer * 2)
const windowRows = computed(() => props.items
  .slice(startIndex.value, startIndex.value + visibleCount.value)
  .map((item, i) => ({ item, index: startIndex.value + i })))

function onScroll(event) { scrollTop.value = event.target.scrollTop }

function keyOf(item, index) {
  return props.itemKey ? item[props.itemKey] : index
}

/* ---------- 选中提交 ---------- */
function emitSingle(index) {
  emit('update:modelValue', index)
  emit('select', { index, selected: true })
}

function emitMultiple(next, changed) {
  emit('update:modelValue', [...next].sort((a, b) => a - b))
  for (const index of changed) emit('select', { index, selected: next.has(index) })
}

function toggle(index) {
  if (props.selection === 'single') { emitSingle(index); return }
  const next = new Set(props.modelValue || [])
  if (next.has(index)) next.delete(index)
  else next.add(index)
  emitMultiple(next, [index])
}

/* ---------- 长按竖向连选 ---------- */
const dragState = ref(null)   /* { from, added:Set, anchorRect } */
let holdTimer = 0
let pointerId = null
let startY = 0
let lastRowIndex = -1
let autoScrollRaf = 0
let pointerY = 0
let dragMoved = false

function rowIndexFromClientY(clientY) {
  const el = scrollEl.value
  if (!el) return -1
  const rect = el.getBoundingClientRect()
  const offset = clientY - rect.top + el.scrollTop
  return Math.max(0, Math.min(props.items.length - 1, Math.floor(offset / props.itemHeight)))
}

function onRowPointerDown(event, index) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointerId = event.pointerId
  startY = event.clientY
  pointerY = event.clientY
  lastRowIndex = index
  dragMoved = false
  if (!props.dragSelect || props.selection !== 'multiple') return
  /* 长按门槛：超过 holdMs 仍未当成点击，则进入连选模式。 */
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    const base = new Set(props.modelValue || [])
    base.add(index)
    dragState.value = { from: index, added: new Set([index]), base }
    dragMoved = true
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    emitMultiple(base, [index])
  }, props.holdMs)
}

function onRowPointerMove(event) {
  pointerY = event.clientY
  const dy = Math.abs(event.clientY - startY)
  if (dy > 6) { dragMoved = true }
  if (!dragState.value) return
  event.preventDefault()
  const index = rowIndexFromClientY(event.clientY)
  if (index === lastRowIndex) { autoScrollTick(); return }
  lastRowIndex = index
  const next = new Set(dragState.value.base)
  /* 锚点到当前行之间的整段一起选中（拖动经过的行都勾上）。 */
  const from = Math.min(dragState.value.from, index)
  const to = Math.max(dragState.value.from, index)
  const changed = []
  for (let i = from; i <= to; i++) {
    if (!next.has(i)) { next.add(i); changed.push(i) }
  }
  dragState.value.base = next
  if (changed.length) emitMultiple(next, changed)
  autoScrollTick()
}

/* 拖到可视区上下边缘时自动滚动，让连选能越过屏幕继续。 */
function autoScrollTick() {
  const el = scrollEl.value
  if (!el || !dragState.value) return
  const rect = el.getBoundingClientRect()
  const edge = Math.max(36, props.itemHeight)
  const cancel = () => {
    if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = 0 }
  }
  if (pointerY < rect.top + edge || pointerY > rect.bottom - edge) {
    if (autoScrollRaf) return
    const step = () => {
      const now = dragState.value
      if (!now) { cancel(); return }
      const direction = pointerY < rect.top + edge ? -1 : 1
      el.scrollTop += direction * Math.max(4, props.itemHeight * 0.35)
      /* 滚动后重新计算当前行并补选。 */
      const index = rowIndexFromClientY(pointerY)
      if (index !== lastRowIndex) {
        lastRowIndex = index
        const next = new Set(now.base)
        const from = Math.min(now.from, index)
        const to = Math.max(now.from, index)
        const changed = []
        for (let i = from; i <= to; i++) if (!next.has(i)) { next.add(i); changed.push(i) }
        now.base = next
        if (changed.length) emitMultiple(next, changed)
      }
      if (dragState.value) autoScrollRaf = requestAnimationFrame(step)
      else cancel()
    }
    autoScrollRaf = requestAnimationFrame(step)
  } else {
    cancel()
  }
}

function onRowPointerUp(event, index) {
  clearTimeout(holdTimer)
  holdTimer = 0
  if (dragState.value) {
    /* 连选结束：清状态（滚动补选循环自然停止）。 */
    dragState.value = null
    if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = 0 }
    return
  }
  /* 没进入连选 -> 视为一次单击选中。 */
  if (!dragMoved || true) {
    if (event.pointerType !== 'mouse' || !dragMoved) toggle(index)
  }
  pointerId = null
}

watch(() => props.items.length, length => {
  if (props.selection !== 'multiple' || !Array.isArray(props.modelValue) || !props.modelValue.length) return
  const kept = props.modelValue.filter(i => i < length)
  if (kept.length !== props.modelValue.length) emit('update:modelValue', kept)
})

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf)
})

defineExpose({
  /* 全选 / 清空，供批量操作按钮使用。 */
  selectAll: () => emit('update:modelValue', props.items.map((_, i) => i)),
  clear: () => emit('update:modelValue', props.selection === 'single' ? null : [])
})
</script>

<template>
  <div
    ref="scrollEl"
    class="ui-vlist"
    :class="{ 'is-dragging': !!dragState }"
    :style="{ height: height + 'px' }"
    @scroll.passive="onScroll"
  >
    <div class="ui-vlist__spacer" :style="{ height: totalHeight + 'px' }">
      <div class="ui-vlist__window" :style="{ transform: 'translateY(' + startIndex * itemHeight + 'px)' }">
        <div
          v-for="entry in windowRows"
          :key="keyOf(entry.item, entry.index)"
          class="ui-vlist__row"
          :class="{ 'is-selected': selected.has(entry.index) }"
          :style="{ height: itemHeight + 'px' }"
          @pointerdown="onRowPointerDown($event, entry.index)"
          @pointermove="onRowPointerMove"
          @pointerup="onRowPointerUp($event, entry.index)"
          @pointercancel="onRowPointerUp($event, entry.index)"
        >
          <!-- 勾选标记在行首（左侧）。 -->
          <span v-if="selection === 'multiple'" class="ui-vlist__mark" :class="{ 'is-on': selected.has(entry.index) }" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <span v-else class="ui-vlist__mark ui-vlist__mark--radio" :class="{ 'is-on': selected.has(entry.index) }" aria-hidden="true"></span>
          <slot :item="entry.item" :index="entry.index" :selected="selected.has(entry.index)" :toggle="() => toggle(entry.index)">
            <span class="ui-vlist__text">{{ typeof entry.item === 'object' ? (entry.item.label ?? JSON.stringify(entry.item)) : entry.item }}</span>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-vlist {
  overflow: auto;
  min-width: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container-low);
  scrollbar-width: thin;
  /* 连选时要能 preventDefault，滚动交给 JS。 */
  touch-action: pan-y;
}
.ui-vlist.is-dragging { user-select: none; touch-action: none; }
.ui-vlist__spacer { position: relative; }
.ui-vlist__window { position: absolute; top: 0; left: 0; right: 0; will-change: transform; }
.ui-vlist__row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border-bottom: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 40%, transparent);
  font-size: var(--fs-small);
  color: var(--on-surface);
  transition: background var(--t-fade);
}
.ui-vlist__row.is-selected { background: var(--primary-container); color: var(--on-primary-container); }
.ui-vlist__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 行首勾选标记。 */
.ui-vlist__mark {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 4px;
  color: transparent;
  transition: background var(--t-fade), border-color var(--t-fade), color var(--t-fade);
}
.ui-vlist__mark svg { width: 10px; height: 10px; }
.ui-vlist__mark.is-on { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.ui-vlist__mark--radio { border-radius: 50%; }
.ui-vlist__mark--radio.is-on { background: var(--primary); border-color: var(--primary); box-shadow: inset 0 0 0 3px var(--surface); }
@media (prefers-reduced-motion: reduce) {
  .ui-vlist__row { transition: none; }
}
</style>
