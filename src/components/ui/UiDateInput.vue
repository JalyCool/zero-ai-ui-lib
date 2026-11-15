<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'change'])

/* 日期输入框：可以直接键入（自动补格式），也可以点日历图标挑一天。
   两种方式共用同一个值，键入合法就即时提交。 */
const rootEl = ref(null)
const open = ref(false)
const draft = ref(props.modelValue)
const view = ref(startOfMonth(props.modelValue) || new Date())
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function pad(n) { return String(n).padStart(2, '0') }
function toISO(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) }
function parse(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}
function startOfMonth(value) { const date = parse(value); return date ? new Date(date.getFullYear(), date.getMonth(), 1) : null }

const monthLabel = computed(() => view.value.getFullYear() + ' 年 ' + (view.value.getMonth() + 1) + ' 月')
const cells = computed(() => {
  const first = new Date(view.value.getFullYear(), view.value.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return { date, iso: toISO(date), inMonth: date.getMonth() === view.value.getMonth(), today: toISO(new Date()) === toISO(date) }
  })
})
const selected = computed(() => parse(props.modelValue) && toISO(parse(props.modelValue)))

function disabledOf(iso) {
  if (props.min && iso < props.min) return true
  if (props.max && iso > props.max) return true
  return false
}

function commit(iso) {
  draft.value = iso
  emit('update:modelValue', iso)
  emit('change', iso)
  open.value = false
}

function onInput(event) {
  draft.value = event.target.value
  const iso = parse(event.target.value)
  if (iso) { emit('update:modelValue', toISO(iso)); emit('change', toISO(iso)) }
}
/* 失焦时把键入的残缺值补成合法日期，或者回退到上一个有效值。 */
function onBlur() {
  const iso = parse(draft.value)
  if (iso) commit(toISO(iso))
  else draft.value = props.modelValue
}

function shiftMonth(delta) {
  const date = new Date(view.value)
  date.setMonth(date.getMonth() + delta)
  view.value = date
}

function onDocDown(event) {
  if (!rootEl.value || rootEl.value.contains(event.target)) return
  open.value = false
}
watch(open, value => {
  if (value) {
    view.value = startOfMonth(props.modelValue) || new Date()
    nextTick(() => document.addEventListener('pointerdown', onDocDown))
  } else document.removeEventListener('pointerdown', onDocDown)
})
watch(() => props.modelValue, value => { if (!open.value) draft.value = value })
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocDown))
</script>
<template>
  <div ref="rootEl" class="ui-date-input">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <div class="ui-date-input__box" :class="{ 'is-open': open, 'is-disabled': disabled }">
      <input :value="draft" inputmode="numeric" placeholder="YYYY-MM-DD" :disabled="disabled"
        @input="onInput" @blur="onBlur" @focus="open = true" @keydown.enter="$event.target.blur()" />
      <button type="button" class="ui-date-input__pick" aria-label="选择日期" :disabled="disabled" @click="open = !open">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
      </button>
    </div>
    <div v-if="open" class="ui-date-input__pop">
      <div class="ui-date-input__head">
        <button type="button" aria-label="上个月" @click="shiftMonth(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
        <span>{{ monthLabel }}</span>
        <button type="button" aria-label="下个月" @click="shiftMonth(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <div class="ui-date-input__week"><span v-for="w in WEEK" :key="w">{{ w }}</span></div>
      <div class="ui-date-input__grid">
        <button v-for="cell in cells" :key="cell.iso" type="button"
          :class="{ 'is-out': !cell.inMonth, 'is-today': cell.today, 'is-on': cell.iso === selected }"
          :disabled="disabledOf(cell.iso)" @click="commit(cell.iso)">{{ cell.date.getDate() }}</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.ui-date-input { position: relative; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ui-date-input__box { display: flex; align-items: center; border: var(--border-w) solid var(--outline-variant); border-radius: calc(13px * var(--radius-scale)); background: var(--surface-container-low); transition: border-color var(--t-fade); }
.ui-date-input__box.is-open { border-color: var(--primary); }
.ui-date-input__box.is-disabled { opacity: .42; }
.ui-date-input__box input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border: 0; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); font-variant-numeric: tabular-nums; outline: none; }
.ui-date-input__pick { display: grid; place-items: center; width: 38px; height: 42px; border: 0; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-date-input__pick svg { width: 17px; height: 17px; }
.ui-date-input__pop { position: absolute; left: 0; top: calc(100% + 6px); z-index: 320; width: 264px; padding: 10px; border: var(--border-w) solid var(--outline-variant); border-radius: 16px; background: var(--surface); box-shadow: var(--elev-tip); }
.ui-date-input__head { display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 8px; font-size: var(--fs-small); font-weight: var(--w-label); }
.ui-date-input__head button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-date-input__head svg { width: 14px; height: 14px; }
.ui-date-input__week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding-bottom: 4px; color: var(--on-surface-variant); font-size: var(--fs-micro); text-align: center; }
.ui-date-input__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.ui-date-input__grid button { height: 32px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-tiny); font-variant-numeric: tabular-nums; cursor: pointer; }
.ui-date-input__grid button.is-out { color: var(--on-surface-variant); opacity: .45; }
.ui-date-input__grid button.is-today { box-shadow: inset 0 0 0 1px var(--primary); }
.ui-date-input__grid button.is-on { background: var(--primary); color: var(--on-primary); }
.ui-date-input__grid button:disabled { opacity: .28; cursor: not-allowed; }
</style>
