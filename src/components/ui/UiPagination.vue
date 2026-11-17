<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 10 },
  /* 中间展开的最大页码数 */
  siblings: { type: Number, default: 1 }
})
const emit = defineEmits(['update:modelValue', 'change'])

/* 分页：首尾固定 + 当前页两侧若干 + 省略号，点击省略号跳一段。 */
const pages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize))))
const current = computed(() => Math.min(pages.value, Math.max(1, Math.round(props.modelValue))))
const list = computed(() => {
  const span = props.siblings * 2 + 1
  const out = []
  const start = Math.max(2, current.value - props.siblings)
  const end = Math.min(pages.value - 1, current.value + props.siblings)
  out.push(1)
  if (start > 2) out.push('...')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < pages.value - 1) out.push('...')
  if (pages.value > 1) out.push(pages.value)
  return out
})
function go(page) {
  const next = Math.min(pages.value, Math.max(1, page))
  if (next === current.value) return
  emit('update:modelValue', next)
  emit('change', next)
}
function jump(item, index) {
  if (item === '...') {
    const between = list.value.filter(value => typeof value === 'number')
    const before = between[Math.max(0, index - 1)] || 1
    const after = between[index + 1] || pages.value
    go(Math.round((before + after) / 2))
    return
  }
  go(item)
}
</script>
<template>
  <nav class="ui-pagination" aria-label="分页">
    <button type="button" class="ui-pagination__arrow" :disabled="current <= 1" aria-label="上一页" @click="go(current - 1)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
    <button v-for="(item, index) in list" :key="item + '-' + index" type="button"
      class="ui-pagination__page" :class="{ 'is-on': item === current, 'is-gap': item === '...' }"
      :aria-current="item === current ? 'page' : undefined" @click="jump(item, index)">
      {{ item === '...' ? '…' : item }}
    </button>
    <button type="button" class="ui-pagination__arrow" :disabled="current >= pages" aria-label="下一页" @click="go(current + 1)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  </nav>
</template>
<style scoped>
.ui-pagination { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.ui-pagination__page, .ui-pagination__arrow { display: grid; place-items: center; min-width: 30px; height: 30px; padding: 0 7px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface-variant); font: inherit; font-size: var(--fs-tiny); font-variant-numeric: tabular-nums;
 font-feature-settings: var(--font-feat-tnum); cursor: pointer; transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback); }
.ui-pagination__page:active, .ui-pagination__arrow:active { transform: scale(var(--press-scale)); }
.ui-pagination__page:hover, .ui-pagination__arrow:hover:not(:disabled) { background: var(--surface-container); }
.ui-pagination__page.is-on { background: var(--primary); color: var(--on-primary); font-weight: var(--w-label); }
.ui-pagination__page.is-gap { cursor: default; opacity: .6; }
.ui-pagination__arrow { color: var(--on-surface); }
.ui-pagination__arrow:disabled { opacity: .32; cursor: not-allowed; }
.ui-pagination__arrow svg { width: 14px; height: 14px; }
</style>
