<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import UiWheel from './UiWheel.vue'

const props = defineProps({
  modelValue: { type: String, default: '09:00' },
  label: { type: String, default: '' },
  /* h | m | s：决定波轮有几列，也决定键入格式 */
  precision: { type: String, default: 'm' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'change'])

/* 时间输入框：可以直接键入 HH:mm[:ss]，也可以点开波轮挑。
   键入合法即刻提交；失焦时把残缺值补成合法时间。 */
const rootEl = ref(null)
const open = ref(false)
const draft = ref(props.modelValue)

function pad(n) { return String(n).padStart(2, '0') }
function parse(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || '').trim())
  if (!match) return null
  const h = Number(match[1]); const m = Number(match[2]); const s = Number(match[3] || 0)
  if (h > 23 || m > 59 || s > 59) return null
  return { h, m, s }
}
function format(h, m, s) {
  return pad(h) + ':' + pad(m) + (props.precision === 's' ? ':' + pad(s) : '')
}
const current = computed(() => parse(props.modelValue) || { h: 9, m: 0, s: 0 })

const columns = computed(() => {
  const list = [
    { items: Array.from({ length: 24 }, (_, i) => pad(i)), value: pad(current.value.h), label: '时' },
    { items: Array.from({ length: 60 }, (_, i) => pad(i)), value: pad(current.value.m), label: '分' }
  ]
  if (props.precision === 's') list.push({ items: Array.from({ length: 60 }, (_, i) => pad(i)), value: pad(current.value.s), label: '秒' })
  return list
})

function commit(next) {
  draft.value = next
  emit('update:modelValue', next)
  emit('change', next)
}
function onInput(event) {
  draft.value = event.target.value
  const parsed = parse(event.target.value)
  if (parsed) commit(format(parsed.h, parsed.m, parsed.s))
}
function onBlur() {
  const parsed = parse(draft.value)
  if (parsed) commit(format(parsed.h, parsed.m, parsed.s))
  else draft.value = props.modelValue
}
function onWheel(payload) {
  const values = columns.value.map((column, index) => index === payload.index ? String(payload.value) : column.value)
  commit(format(Number(values[0]), Number(values[1]), Number(values[2] || 0)))
}
function onDocDown(event) {
  if (!rootEl.value || rootEl.value.contains(event.target)) return
  open.value = false
}
watch(open, value => { if (value) nextTick(() => document.addEventListener('pointerdown', onDocDown)); else document.removeEventListener('pointerdown', onDocDown) })
watch(() => props.modelValue, value => { if (!open.value) draft.value = value })
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocDown))
</script>

<template>
  <div ref="rootEl" class="ui-time-input">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <div class="ui-time-input__box" :class="{ 'is-open': open, 'is-disabled': disabled }">
      <input :value="draft" inputmode="numeric" :placeholder="precision === 's' ? 'HH:mm:ss' : 'HH:mm'"
        :disabled="disabled" @input="onInput" @blur="onBlur" @keydown.enter="$event.target.blur()" />
      <button type="button" class="ui-time-input__pick" aria-label="选择时间" :disabled="disabled" @click="open = !open">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
      </button>
    </div>
    <div v-if="open" class="ui-time-input__pop">
      <UiWheel :columns="columns" @change="onWheel" />
    </div>
  </div>
</template>

<style scoped>
.ui-time-input { position: relative; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ui-time-input__box { display: flex; align-items: center; border: var(--border-w) solid var(--outline-variant); border-radius: calc(13px * var(--radius-scale)); background: var(--surface-container-low); transition: border-color var(--t-fade); }
.ui-time-input__box.is-open { border-color: var(--primary); }
.ui-time-input__box.is-disabled { opacity: .42; }
.ui-time-input__box input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border: 0; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); font-variant-numeric: tabular-nums; outline: none; }
.ui-time-input__pick { display: grid; place-items: center; width: 38px; height: 42px; border: 0; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-time-input__pick svg { width: 17px; height: 17px; }
.ui-time-input__pop { position: absolute; left: 0; top: calc(100% + 6px); z-index: 320; width: max-content; padding: 8px; border: var(--border-w) solid var(--outline-variant); border-radius: 16px; background: var(--surface); box-shadow: var(--elev-tip); }
</style>
