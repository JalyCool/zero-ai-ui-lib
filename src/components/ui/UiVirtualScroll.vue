<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
const props = defineProps({
  items: { type: Array, default: () => [] },
  /* 行高估值（px）；实测后会缓存真实高度 */
  estimate: { type: Number, default: 48 },
  height: { type: Number, default: 360 },
  buffer: { type: Number, default: 6 },
  keyField: { type: String, default: '' }
})
const emit = defineEmits(['range'])

/* 通用虚拟滚动：不限行高，先按估值排布，滚到哪儿就实测哪儿并缓存；
   返回 [start, end) 的可见区间，渲染层自己决定高度。
   与 UiVirtualList 的分工：这个是「任意内容的通用虚拟化」，那个是带选中语义的列表。 */
const scrollerEl = ref(null)
const scrollTop = ref(0)
const measured = new Map()

const offsets = computed(() => {
  const out = [0]
  for (let i = 0; i < props.items.length; i++) out.push(out[i] + (measured.get(i) || props.estimate))
  return out
})
const total = computed(() => offsets.value[offsets.value.length - 1] || 0)

const range = computed(() => {
  const offs = offsets.value
  let start = 0
  while (start < offs.length - 2 && offs[start + 1] < scrollTop.value) start++
  let end = start
  const limit = scrollTop.value + props.height
  while (end < offs.length - 1 && offs[end] < limit) end++
  start = Math.max(0, start - props.buffer)
  end = Math.min(props.items.length, end + props.buffer)
  return { start, end }
})
const visible = computed(() => props.items.slice(range.value.start, range.value.end).map((item, i) => ({ item, index: range.value.start + i })))
const paddingTop = computed(() => offsets.value[range.value.start] || 0)
const paddingBottom = computed(() => Math.max(0, total.value - (offsets.value[range.value.end] || 0)))

function onScroll(event) {
  scrollTop.value = event.target.scrollTop
  emit('range', range.value)
}
function measureRow(index, el) {
  if (!el) return
  const height = el.offsetHeight
  if (height && measured.get(index) !== height) measured.set(index, height)
}
function keyOf(entry) { return props.keyField ? entry.item[props.keyField] : entry.index }
</script>
<template>
  <div ref="scrollerEl" class="ui-vscroll" :style="{ height: height + 'px' }" @scroll.passive="onScroll">
    <div :style="{ height: total + 'px', position: 'relative' }">
      <div :style="{ transform: 'translateY(' + paddingTop + 'px)' }">
        <div v-for="entry in visible" :key="keyOf(entry)" :ref="el => measureRow(entry.index, el)" class="ui-vscroll__row">
          <slot :item="entry.item" :index="entry.index">{{ entry.item }}</slot>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.ui-vscroll { overflow-y: auto; scrollbar-width: thin; overscroll-behavior: contain; border: var(--border-w) solid var(--outline-variant); border-radius: calc(14px * var(--radius-scale)); background: var(--surface-container-low); }
.ui-vscroll__row { display: flex; align-items: center; padding: 0 12px; min-height: 32px; font-size: var(--fs-small); border-bottom: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 40%, transparent); }
</style>
