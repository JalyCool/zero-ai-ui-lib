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

/* ---------- 长按竖向连选 ----------
   · 进入连选后整段手势被列表接管：touch-action 切成 none，
     并阻止默认行为，浏览器原生滚动不会再抢走这一下拖动。
   · 锚点行的初始状态决定这次是「全选」还是「取消」：
     锚点原本未选中 -> 经过的行都选中；锚点原本已选中 -> 经过的行都取消。
   · 结束位置可以来回改：往回拖会把中间段恢复成锚点的初始状态。
   · 拖到可视区边缘自动滚动，速度按超出深度线性缓入，最高约 12px/帧。 */
const dragState = ref(null)
let holdTimer = 0
let pointerId = null
let startY = 0
let lastRowIndex = -1
let autoScrollRaf = 0
let pointerY = 0
let moved = false
let baseSet = null
let anchorWasSelected = false

function rowIndexFromClientY(clientY) {
  const el = scrollEl.value
  if (!el) return -1
  const rect = el.getBoundingClientRect()
  const offset = clientY - rect.top + el.scrollTop
  return Math.max(0, Math.min(props.items.length - 1, Math.floor(offset / props.itemHeight)))
}

function rangeBetween(a, b) {
  const from = Math.min(a, b)
  const to = Math.max(a, b)
  const out = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

/* 把 [锚点, 当前行] 这一段设成目标状态（value），其余保持基线。 */
function applyRange(toIndex, value) {
  const next = new Set(baseSet)
  for (const index of rangeBetween(dragState.value.from, toIndex)) {
    if (value) next.add(index)
    else next.delete(index)
  }
  baseSet = next
  emit('update:modelValue', [...next].sort((a, b) => a - b))
}

function onRowPointerDown(event, index) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointerId = event.pointerId
  startY = event.clientY
  pointerY = event.clientY
  lastRowIndex = index
  moved = false
  if (!props.dragSelect || props.selection !== 'multiple') return
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    baseSet = new Set(props.modelValue || [])
    anchorWasSelected = baseSet.has(index)
    dragState.value = { from: index }
    moved = true
    /* 接管手势：容器禁止原生滚动，指针捕获到列表上。 */
    scrollEl.value?.setPointerCapture?.(event.pointerId)
    /* 锚点自身先切换一次，作为整段的起点。 */
    applyRange(index, !anchorWasSelected)
  }, props.holdMs)
}

function onPointerMove(event) {
  if (dragState.value) {
    /* 已进入连选：阻止原生滚动 / 下拉刷新抢走手势。 */
    if (event.cancelable) event.preventDefault()
    pointerY = event.clientY
    const index = rowIndexFromClientY(event.clientY)
    if (index !== lastRowIndex) {
      lastRowIndex = index
      /* 经过的行按锚点语义设置 / 取消；往回拖时，
         被排除在区间外的行自动恢复基线。 */
      applyRange(index, !anchorWasSelected)
    }
    autoScrollTick()
    return
  }
  if (pointerId === null) return
  if (Math.abs(event.clientY - startY) > 8) {
    /* 长按还没到就已经明显在滚：这是普通滚动，取消连选与点击。 */
    clearTimeout(holdTimer)
    holdTimer = 0
    moved = true
  }
}

/* 边缘自动滚动：超出深度线性映射到 0..12px/帧。 */
function autoScrollTick() {
  const el = scrollEl.value
  if (!el || !dragState.value) return stopAutoScroll()
  const rect = el.getBoundingClientRect()
  const edge = Math.max(40, props.itemHeight * 1.2)
  let speed = 0
  if (pointerY < rect.top + edge) speed = -((rect.top + edge) - pointerY) / edge
  else if (pointerY > rect.bottom - edge) speed = (pointerY - (rect.bottom - edge)) / edge
  if (!speed) return stopAutoScroll()
  if (autoScrollRaf) return
  const step = () => {
    if (!dragState.value) { autoScrollRaf = 0; return }
    const before = el.scrollTop
    /* 缓入：越靠近边缘越快，最深约 12px/帧，不至于飞出去。 */
    el.scrollTop += Math.sign(speed) * Math.min(12, Math.abs(speed) * 12)
    if (el.scrollTop !== before) {
      const index = rowIndexFromClientY(pointerY)
      if (index !== lastRowIndex) {
        lastRowIndex = index
        applyRange(index, !anchorWasSelected)
      }
    }
    autoScrollRaf = requestAnimationFrame(step)
  }
  autoScrollRaf = requestAnimationFrame(step)
}

function stopAutoScroll() {
  if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = 0 }
}

function onPointerUp() {
  clearTimeout(holdTimer)
  holdTimer = 0
  if (dragState.value) {
    /* 连选结束：交还滚动能力。 */
    dragState.value = null
    baseSet = null
    pointerId = null
    stopAutoScroll()
    return
  }
  /* 没进入连选 -> 单击选中 / 取消（用起手行，避免事件目标漂移）。 */
  if (!moved && lastRowIndex >= 0) toggle(lastRowIndex)
  pointerId = null
  moved = false
}

function onPointerLeaveList() {
  /* 指针离开列表：结束连选，不改变已选区间。 */
  if (!dragState.value) return
  dragState.value = null
  baseSet = null
  pointerId = null
  stopAutoScroll()
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
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerLeaveList"
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
.ui-vlist.is-dragging .ui-vlist__row { cursor: ns-resize; }
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
