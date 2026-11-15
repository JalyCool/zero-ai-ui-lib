<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({
  /* 当前月份：YYYY-MM */
  modelValue: { type: String, default: '' },
  /* 事件：{ [YYYY-MM-DD]: [{ title, tone? }] } */
  events: { type: Object, default: () => ({}) },
  /* month | week */
  view: { type: String, default: 'month' }
})
const emit = defineEmits(['update:modelValue', 'select', 'change'])
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/* 日历：月视图为主（周视图取同一套单元格，仅是行数不同）。
   事件表按日期字符串索引，点某天回传日期与当天事件。 */
function pad(n) { return String(n).padStart(2, '0') }
function toISO(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) }

const today = toISO(new Date())
const cursor = ref(startOfMonth())
function startOfMonth() {
  const match = /^(\d{4})-(\d{2})$/.exec(String(props.modelValue || ''))
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
watch(() => props.modelValue, () => { cursor.value = startOfMonth() })

const label = computed(() => cursor.value.getFullYear() + ' 年 ' + (cursor.value.getMonth() + 1) + ' 月')
const days = computed(() => {
  if (props.view === 'week') {
    const start = new Date(cursor.value)
    start.setDate(cursor.value.getDate() - cursor.value.getDay())
    return Array.from({ length: 7 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return cell(date) })
  }
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return cell(date) })
})
function cell(date) {
  const iso = toISO(date)
  return {
    iso,
    day: date.getDate(),
    inMonth: date.getMonth() === cursor.value.getMonth(),
    isToday: iso === today,
    events: props.events[iso] || []
  }
}
function shift(delta) {
  const next = new Date(cursor.value)
  next.setMonth(next.getMonth() + delta)
  cursor.value = next
  const value = next.getFullYear() + '-' + pad(next.getMonth() + 1)
  emit('update:modelValue', value)
  emit('change', value)
}
function pick(cell) {
  emit('select', { date: cell.iso, events: cell.events })
}
</script>
<template>
  <div class="ui-calendar">
    <div class="ui-calendar__head">
      <button type="button" aria-label="上个月" @click="shift(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
      <b>{{ label }}</b>
      <button type="button" aria-label="下个月" @click="shift(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
    </div>
    <div class="ui-calendar__week"><span v-for="w in WEEK" :key="w">{{ w }}</span></div>
    <div class="ui-calendar__grid" :class="`is-${view}`">
      <button v-for="cell in days" :key="cell.iso" type="button" class="ui-calendar__day"
        :class="{ 'is-out': !cell.inMonth, 'is-today': cell.isToday, 'has-events': cell.events.length }"
        @click="pick(cell)">
        <span class="ui-calendar__num">{{ cell.day }}</span>
        <span v-if="cell.events.length" class="ui-calendar__dots">
          <i v-for="(event, index) in cell.events.slice(0, 3)" :key="index" :class="`is-${event.tone || 'primary'}`"></i>
        </span>
      </button>
    </div>
  </div>
</template>
<style scoped>
.ui-calendar { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-calendar__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ui-calendar__head b { font-size: var(--fs-small); font-weight: var(--w-heading); }
.ui-calendar__head button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-calendar__head button:hover { background: var(--surface-container); }
.ui-calendar__head svg { width: 14px; height: 14px; }
.ui-calendar__week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; color: var(--on-surface-variant); font-size: var(--fs-micro); text-align: center; }
.ui-calendar__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.ui-calendar__grid.is-week { grid-template-rows: 1fr; }
.ui-calendar__day { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 3px; min-height: 44px; padding: 5px 2px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-tiny); font-variant-numeric: tabular-nums; cursor: pointer; transition: background var(--t-fade); }
.ui-calendar__day:hover { background: var(--surface-container); }
.ui-calendar__day.is-out { color: var(--on-surface-variant); opacity: .42; }
.ui-calendar__day.is-today .ui-calendar__num { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: var(--on-primary); }
.ui-calendar__dots { display: flex; gap: 2px; }
.ui-calendar__dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--primary); }
.ui-calendar__dots i.is-success { background: var(--ui-success, #15803d); }
.ui-calendar__dots i.is-warning { background: var(--ui-warning, #b45309); }
.ui-calendar__dots i.is-danger { background: var(--error); }
</style>
