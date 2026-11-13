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
  /* 多选模式：横向滑过阈值切换选中（swipe-select 思路），
     点击行也能切换；选中集合通过 v-model 回传 */
  swipeSelect: { type: Boolean, default: false },
  modelValue: { type: Array, default: () => [] },
  itemKey: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'swipe-select'])

/* ============================================================
   虚拟滚动列表：只渲染窗口内的行，几百上千条也不卡。
   swipeSelect 打开时行可横向拖拽：拖过阈值即切换该行的
   选中态，松手回弹；配合多选语义用于会话批量操作。
   ============================================================ */

const scrollEl = ref(null)
const scrollTop = ref(0)
const selected = computed(() => new Set(props.modelValue))

const totalHeight = computed(() => props.items.length * props.itemHeight)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer))
const visibleCount = computed(() => Math.ceil(props.height / props.itemHeight) + props.buffer * 2)
const window = computed(() => props.items
  .slice(startIndex.value, startIndex.value + visibleCount.value)
  .map((item, i) => ({ item, index: startIndex.value + i })))

function onScroll(event) { scrollTop.value = event.target.scrollTop }

function keyOf(item, index) {
  return props.itemKey ? item[props.itemKey] : index
}

function toggle(index) {
  const next = new Set(props.modelValue)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  emit('update:modelValue', [...next].sort((a, b) => a - b))
  emit('swipe-select', { index, selected: next.has(index) })
}

/* ---------- 滑动选择：横向位移 + 回弹 ---------- */
const drag = ref(null)
let dragStartX = 0
let dragIndex = -1

function onPointerDown(event, index) {
  if (!props.swipeSelect) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  dragIndex = index
  dragStartX = event.clientX
  drag.value = { index, x: 0 }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (!drag.value) return
  /* 只取横向分量；纵向留给滚动 */
  const dx = event.clientX - dragStartX
  drag.value = { index: dragIndex, x: Math.max(-90, Math.min(90, dx)) }
}

function onPointerUp() {
  if (!drag.value) return
  const passed = Math.abs(drag.value.x) > 44
  if (passed) toggle(dragIndex)
  drag.value = null
  dragIndex = -1
}

onBeforeUnmount(() => { drag.value = null })

watch(() => props.items.length, length => {
  /* 数据变短后清掉越界的选中项 */
  if (!props.modelValue.length) return
  const kept = props.modelValue.filter(i => i < length)
  if (kept.length !== props.modelValue.length) emit('update:modelValue', kept)
})
</script>

<template>
  <div
    ref="scrollEl"
    class="ui-vlist"
    :style="{ height: height + 'px' }"
    @scroll.passive="onScroll"
  >
    <div class="ui-vlist__spacer" :style="{ height: totalHeight + 'px' }">
      <div class="ui-vlist__window" :style="{ transform: 'translateY(' + startIndex * itemHeight + 'px)' }">
        <div
          v-for="entry in window"
          :key="keyOf(entry.item, entry.index)"
          class="ui-vlist__row"
          :class="{ 'is-selected': selected.has(entry.index) }"
          :style="{
            height: itemHeight + 'px',
            transform: drag && drag.index === entry.index ? 'translateX(' + drag.x + 'px)' : undefined,
            transition: drag && drag.index === entry.index ? 'none' : undefined
          }"
          @pointerdown="onPointerDown($event, entry.index)"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
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
  touch-action: pan-y;
}
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
  transition: transform var(--t-feedback), background var(--t-fade);
}
.ui-vlist__row.is-selected {
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.ui-vlist__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) {
  .ui-vlist__row { transition: none; }
}
</style>
