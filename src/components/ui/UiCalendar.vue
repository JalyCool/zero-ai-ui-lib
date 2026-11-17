<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /* 当前月份：YYYY-MM */
  modelValue: { type: String, default: '' },
  /* 事件：{ [YYYY-MM-DD]: [{ title, tone? }] } */
  events: { type: Object, default: () => ({}) },
  /* 视图类型：
     month  = 月网格（默认）
     week   = 单周
     year   = 一年 12 个月总览（点月份下钻到月视图）
     agenda = 日程列表（当月有事件的日期按时间顺序列出） */
  view: { type: String, default: 'month', validator: v => ['month', 'week', 'year', 'agenda'].includes(v) },
  /* 允许在组件内切换视图（显示右上角视图选择） */
  switchable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select', 'change', 'update:view'])

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const VIEWS = [
  { value: 'month', label: '月' },
  { value: 'week', label: '周' },
  { value: 'year', label: '年' },
  { value: 'agenda', label: '日程' }
]

function pad(n) { return String(n).padStart(2, '0') }
function toISO(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) }

const today = toISO(new Date())
/* 内部视图：switchable 时由内部状态驱动，否则跟随 prop */
const innerView = ref(props.view)
watch(() => props.view, value => { innerView.value = value })
const activeView = computed(() => (props.switchable ? innerView.value : props.view))

/* 视图深度：年 = 宏观(0)，月 / 周 / 日程 = 细(1)。
   切换方向决定 ZoomTo 用推近还是拉远那组过渡类。 */
const VIEW_DEPTH = { year: 0, month: 1, week: 1, agenda: 1 }
const zoomBack = ref(false)
const calTransition = computed(() => (zoomBack.value ? 'cal-zoom-back' : 'cal-view'))
function pickView(value) {
  zoomBack.value = VIEW_DEPTH[value] < VIEW_DEPTH[activeView.value]
  innerView.value = value
  emit('update:view', value)
}

function startOfMonth() {
  const match = /^(\d{4})-(\d{2})$/.exec(String(props.modelValue || ''))
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const cursor = ref(startOfMonth())
watch(() => props.modelValue, () => { cursor.value = startOfMonth() })

const label = computed(() => {
  if (activeView.value === 'year') return cursor.value.getFullYear() + ' 年'
  if (activeView.value === 'week') {
    const start = new Date(cursor.value)
    start.setDate(cursor.value.getDate() - cursor.value.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return (start.getMonth() + 1) + '月' + start.getDate() + '日 - ' + (end.getMonth() + 1) + '月' + end.getDate() + '日'
  }
  return cursor.value.getFullYear() + ' 年 ' + (cursor.value.getMonth() + 1) + ' 月'
})

/* 月 / 周共用同一套日格子 */
const days = computed(() => {
  if (activeView.value === 'week') {
    const start = new Date(cursor.value)
    start.setDate(cursor.value.getDate() - cursor.value.getDay())
    return Array.from({ length: 7 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return cell(date) })
  }
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return cell(date) })
})

/* 年视图：12 个月，带当月事件数 */
const months = computed(() => {
  const year = cursor.value.getFullYear()
  return Array.from({ length: 12 }, (_, m) => {
    let count = 0
    for (const key of Object.keys(props.events)) {
      if (key.startsWith(year + '-' + pad(m + 1))) count += props.events[key].length
    }
    return { month: m, label: m + 1, count, isCurrent: year === new Date().getFullYear() && m === new Date().getMonth() }
  })
})

/* 日程视图：当月所有事件，按日期排序 */
const agenda = computed(() => {
  const prefix = cursor.value.getFullYear() + '-' + pad(cursor.value.getMonth() + 1)
  const rows = []
  for (const [date, list] of Object.entries(props.events)) {
    if (!date.startsWith(prefix)) continue
    for (const item of list) rows.push({ date, ...item })
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
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
  if (activeView.value === 'year') next.setFullYear(next.getFullYear() + delta)
  else if (activeView.value === 'week') next.setDate(next.getDate() + delta * 7)
  else next.setMonth(next.getMonth() + delta)
  cursor.value = next
  const value = next.getFullYear() + '-' + pad(next.getMonth() + 1)
  emit('update:modelValue', value)
  emit('change', value)
}

function pickCell(item) {
  emit('select', { date: item.iso, events: item.events })
}

/* 年视图点某月：回到月视图并跳到该月（下钻：强制推近方向） */
function pickMonth(item) {
  const next = new Date(cursor.value.getFullYear(), item.month, 1)
  cursor.value = next
  if (props.switchable) {
    zoomBack.value = false
    innerView.value = 'month'
    emit('update:view', 'month')
  }
  emit('update:modelValue', next.getFullYear() + '-' + pad(next.getMonth() + 1))
}

function pickAgenda(row) {
  emit('select', { date: row.date, events: props.events[row.date] || [] })
}
</script>

<template>
  <div class="ui-calendar" :class="'is-view-' + activeView">
    <div class="ui-calendar__head">
      <button type="button" aria-label="上一段" @click="shift(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
      <b>{{ label }}</b>
      <button type="button" aria-label="下一段" @click="shift(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
    </div>

    <!-- 视图切换（仅 switchable 时出现） -->
    <div v-if="switchable" class="ui-calendar__views" role="tablist">
      <button
        v-for="v in VIEWS"
        :key="v.value"
        type="button"
        role="tab"
        :aria-selected="activeView === v.value"
        :class="{ 'is-active': activeView === v.value }"
        @click="pickView(v.value)"
      >{{ v.label }}</button>
    </div>

    <Transition :name="calTransition" mode="out-in">
      <!-- 年视图 -->
      <div v-if="activeView === 'year'" key="year" class="ui-calendar__months">
        <button
          v-for="item in months"
          :key="item.month"
          type="button"
          class="ui-calendar__month"
          :class="{ 'is-current': item.isCurrent }"
          @click="pickMonth(item)"
        >
          <span>{{ item.label }}月</span>
          <small v-if="item.count">{{ item.count }} 项</small>
        </button>
      </div>

      <!-- 日程视图 -->
      <div v-else-if="activeView === 'agenda'" key="agenda" class="ui-calendar__agenda">
        <template v-if="agenda.length">
          <button v-for="(row, i) in agenda" :key="row.date + i" type="button" class="ui-calendar__row" @click="pickAgenda(row)">
            <span class="ui-calendar__row-date">{{ row.date.slice(5) }}</span>
            <span class="ui-calendar__row-title">{{ row.title }}</span>
            <i :class="'is-' + (row.tone || 'primary')"></i>
          </button>
        </template>
        <span v-else class="ui-calendar__empty">本月没有安排</span>
      </div>

      <!-- 月 / 周 -->
      <div v-else key="grid" class="ui-calendar__body">
        <div class="ui-calendar__week"><span v-for="w in WEEK" :key="w">{{ w }}</span></div>
        <div class="ui-calendar__grid" :class="'is-' + activeView">
          <button v-for="item in days" :key="item.iso" type="button" class="ui-calendar__day"
            :class="{ 'is-out': !item.inMonth, 'is-today': item.isToday, 'has-events': item.events.length }"
            @click="pickCell(item)">
            <span class="ui-calendar__num">{{ item.day }}</span>
            <span v-if="item.events.length" class="ui-calendar__dots">
              <i v-for="(event, index) in item.events.slice(0, 3)" :key="index" :class="'is-' + (event.tone || 'primary')"></i>
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ui-calendar { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-calendar__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ui-calendar__head b { font-size: var(--fs-small); font-weight: var(--w-heading); }
.ui-calendar__head button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-calendar__head button:hover { background: var(--surface-container); }
.ui-calendar__head svg { width: 14px; height: 14px; }

/* 视图切换：胶囊组，选中项填主色 */
.ui-calendar__views { display: flex; gap: 3px; padding: 3px; border-radius: 999px; background: var(--surface-container-low); }
.ui-calendar__views button {
  flex: 1;
  padding: 5px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-micro);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-calendar__views button.is-active { background: var(--primary); color: var(--on-primary); }

.ui-calendar__body { display: flex; flex-direction: column; gap: 2px; }
.ui-calendar__week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; color: var(--on-surface-variant); font-size: var(--fs-micro); text-align: center; }
.ui-calendar__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.ui-calendar__grid.is-week { grid-template-rows: 1fr; }
.ui-calendar__day { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 3px; min-height: 44px; padding: 5px 2px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-tiny); font-variant-numeric: tabular-nums;
 font-feature-settings: var(--font-feat-tnum); cursor: pointer; transition: background var(--t-fade), transform var(--t-feedback); }
.ui-calendar__day:hover { background: var(--surface-container); }
.ui-calendar__day:active { transform: scale(var(--press-scale)); }
.ui-calendar__day.is-out { color: var(--on-surface-variant); opacity: .42; }
.ui-calendar__day.is-today .ui-calendar__num { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: var(--on-primary); }
.ui-calendar__dots { display: flex; gap: 2px; }
.ui-calendar__dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--primary); }
.ui-calendar__dots i.is-success { background: var(--ui-success, #15803d); }
.ui-calendar__dots i.is-warning { background: var(--ui-warning, #b45309); }
.ui-calendar__dots i.is-danger { background: var(--error); }

/* 年视图：4×3 月份网格 */
.ui-calendar__months { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.ui-calendar__month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 4px;
  border: 0;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-tiny);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-calendar__month:hover { background: var(--surface-container-high); }
.ui-calendar__month:active { transform: scale(var(--press-scale)); }
.ui-calendar__month.is-current { background: var(--primary-container); color: var(--on-primary-container); }
.ui-calendar__month small { font-size: var(--fs-micro); color: var(--on-surface-variant); }

/* 日程视图：一行一条 */
.ui-calendar__agenda { display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto; }
.ui-calendar__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade);
}
.ui-calendar__row:hover { background: var(--surface-container-low); }
.ui-calendar__row-date { color: var(--on-surface-variant); font-size: var(--fs-micro); font-variant-numeric: tabular-nums; font-feature-settings: var(--font-feat-tnum); }
.ui-calendar__row-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-calendar__row i { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }
.ui-calendar__row i.is-success { background: var(--ui-success, #15803d); }
.ui-calendar__row i.is-warning { background: var(--ui-warning, #b45309); }
.ui-calendar__row i.is-danger { background: var(--error); }
.ui-calendar__empty { padding: 24px 0; text-align: center; color: var(--on-surface-variant); font-size: var(--fs-small); }

/* 视图切换 = 精细度改变：ZoomTo。
   下钻（年 -> 月 -> 日）：旧层放大淡出、新层从缩小放大落定；
   拉远（日 -> 月 -> 年）方向相反，由 cal-zoom-back 组承担。 */
.cal-view-enter-active, .cal-view-leave-active,
.cal-zoom-back-enter-active, .cal-zoom-back-leave-active {
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-panel);
}
.cal-view-enter-from { opacity: 0; filter: blur(10px); transform: scale(.72); }
.cal-view-leave-to { opacity: 0; filter: blur(10px); transform: scale(1.35); }
.cal-zoom-back-enter-from { opacity: 0; filter: blur(10px); transform: scale(1.35); }
.cal-zoom-back-leave-to { opacity: 0; filter: blur(10px); transform: scale(.72); }
</style>
