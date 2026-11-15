<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '输入以筛选' },
  /* [{ label, value }] */
  options: { type: Array, default: () => [] },
  /* 允许自由输入（不进列表的值也认） */
  free: { type: Boolean, default: true },
  max: { type: Number, default: 8 }
})
const emit = defineEmits(['update:modelValue', 'select'])

/* 自动完成：输入即过滤，↑↓ 移动、Enter 选中、Esc 收起；允许自由输入。 */
const open = ref(false)
const active = ref(-1)
const rootEl = ref(null)
const listEl = ref(null)
const filtered = computed(() => {
  const q = String(props.modelValue || '').trim().toLowerCase()
  const list = props.options.filter(o => !q || String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
  return list.slice(0, props.max)
})

function onInput(event) {
  emit('update:modelValue', event.target.value)
  open.value = true
  active.value = filtered.value.length ? 0 : -1
}
function choose(option) {
  emit('update:modelValue', String(option.value))
  emit('select', option)
  open.value = false
}
function onKeydown(event) {
  if (!open.value) { if (event.key === 'ArrowDown') open.value = true; return }
  if (event.key === 'ArrowDown') { event.preventDefault(); active.value = Math.min(filtered.value.length - 1, active.value + 1); scrollActive() }
  else if (event.key === 'ArrowUp') { event.preventDefault(); active.value = Math.max(0, active.value - 1); scrollActive() }
  else if (event.key === 'Enter') { event.preventDefault(); if (filtered.value[active.value]) choose(filtered.value[active.value]) }
  else if (event.key === 'Escape') { open.value = false }
}
function scrollActive() {
  nextTick(() => {
    const item = listEl.value && listEl.value.children[active.value]
    if (item) item.scrollIntoView({ block: 'nearest' })
  })
}
function onBlur() { setTimeout(() => { open.value = false }, 120) }
</script>
<template>
  <div ref="rootEl" class="ui-auto">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <div class="ui-auto__box" :class="{ 'is-open': open }">
      <input :value="modelValue" :placeholder="placeholder" @input="onInput" @focus="open = true" @blur="onBlur" @keydown="onKeydown" />
      <svg class="ui-auto__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
      <div v-if="open && filtered.length" ref="listEl" class="ui-auto__list" role="listbox">
        <button v-for="(option, index) in filtered" :key="option.value" type="button" role="option"
          :class="{ 'is-active': index === active }" @mousedown.prevent="choose(option)"
          @mouseenter="active = index">
          <span>{{ option.label }}</span>
          <small v-if="option.hint">{{ option.hint }}</small>
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.ui-auto { position: relative; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ui-auto__box { position: relative; display: flex; align-items: center; border: var(--border-w) solid var(--outline-variant); border-radius: calc(13px * var(--radius-scale)); background: var(--surface-container-low); transition: border-color var(--t-fade); }
.ui-auto__box.is-open { border-color: var(--primary); }
.ui-auto__box input { flex: 1; min-width: 0; height: 42px; padding: 0 34px 0 12px; border: 0; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); outline: none; }
.ui-auto__chev { position: absolute; right: 11px; width: 15px; height: 15px; color: var(--on-surface-variant); pointer-events: none; }
.ui-auto__list { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 320; max-height: 232px; overflow-y: auto; padding: 5px; border: var(--border-w) solid var(--outline-variant); border-radius: 14px; background: var(--surface); box-shadow: var(--elev-tip); }
.ui-auto__list button { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 10px; border: 0; border-radius: 10px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); text-align: left; cursor: pointer; }
.ui-auto__list button.is-active { background: var(--surface-container); }
.ui-auto__list small { color: var(--on-surface-variant); font-size: var(--fs-micro); }
</style>
