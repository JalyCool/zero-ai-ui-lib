<script setup>
import { computed, ref, watch } from 'vue'
import { useMorphWindow } from '../../core/morphWindow'

const props = defineProps({
  /* { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }，null 视为全空 */
  modelValue: { type: Object, default: null },
  label: { type: String, default: '日期范围' },
  /* 快捷预设（借鉴日历控件）：天数数组，空数组关闭 */
  presets: { type: Array, default: () => [0, 7, 30] },
  /* 可选范围（含端点）：YYYY-MM-DD；null = 不限制 */
  min: { type: String, default: null },
  max: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   范围日期选择器
   收起时是普通输入框，展开成月历窗口（与日期选择同一套
   按压式形变，不压暗背景）。第一次点选起点，第二次点选
   终点；第二次若早于起点，则重新作为新起点。区间内的日期
   铺浅色底，两个端点实心主色。桌面端悬停可预览区间。
   ============================================================ */

const surfaceEl = ref(null)
const fieldEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)

const viewDate = ref(startOfMonth(todayDate()))
const draftStart = ref('')
const draftEnd = ref('')
const hoverDate = ref('')

const { open, closing, floating, compressed, style, viewStyle, openWindow, closeWindow, toggleWindow } = useMorphWindow({
  surface: () => surfaceEl.value,
  panel: () => panelEl.value,
  content: () => panelContentEl.value,
  width: () => Math.min(300, window.innerWidth - 32),
  onOpened: () => {
    requestAnimationFrame(() => {
      surfaceEl.value?.querySelector('.is-selected')?.focus({ preventScroll: true })
    })
  },
  onClosed: () => {
    fieldEl.value?.focus({ preventScroll: true })
  }
})

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const modelStart = computed(() => (props.modelValue && typeof props.modelValue.start === 'string') ? props.modelValue.start : '')
const modelEnd = computed(() => (props.modelValue && typeof props.modelValue.end === 'string') ? props.modelValue.end : '')

const monthLabel = computed(() => viewDate.value.getFullYear() + '年' + (viewDate.value.getMonth() + 1) + '月')

const calendarCells = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1)
  ]
})

/* 字段显示：每个端点单独走日期显示规范。 */
const startParts = computed(() => modelStart.value ? splitDisplay(parseDate(modelStart.value)) : null)
const endParts = computed(() => modelEnd.value ? splitDisplay(parseDate(modelEnd.value)) : null)

function pad(value) {
  return String(value).padStart(2, '0')
}

function todayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function parseDate(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatInput(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function isSameDay(left, right) {
  return left && right
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

const RELATIVE_LABELS = {
  '-3': '大前天',
  '-2': '前天',
  '-1': '昨天',
  0: '今天',
  1: '明天',
  2: '后天',
  3: '大后天'
}

function dayOffsetFromToday(date) {
  const base = todayDate()
  return Math.round((date.getTime() - base.getTime()) / 86400000)
}

function splitDisplay(date) {
  if (!date) return { year: '', monthDay: '' }
  const label = RELATIVE_LABELS[dayOffsetFromToday(date)]
  if (label) return { year: '', monthDay: label }
  const monthDay = (date.getMonth() + 1) + '月' + date.getDate() + '日'
  const sameYear = date.getFullYear() === todayDate().getFullYear()
  return { year: sameYear ? '' : date.getFullYear() + '年', monthDay }
}

/* ---------- 范围限制 ---------- */
const minDate = computed(() => parseDate(props.min))
const maxDate = computed(() => parseDate(props.max))

/* 某天是否在可选范围内（两端都含） */
function dayInRange(date) {
  const t = date.getTime()
  if (minDate.value && t < minDate.value.getTime()) return false
  if (maxDate.value && t > maxDate.value.getTime()) return false
  return true
}

/* ---------- 选择 ---------- */
function syncDraft() {
  draftStart.value = modelStart.value
  draftEnd.value = modelEnd.value
  viewDate.value = startOfMonth(parseDate(draftStart.value) || todayDate())
}

function openPicker() {
  syncDraft()
  openWindow()
}

function togglePicker() {
  if (open.value) {
    closeWindow()
    return
  }
  if (closing.value || compressed.value) {
    // 收起 / 按压途中再次点击：打断并直接展开。
    syncDraft()
    toggleWindow()
    return
  }
  openPicker()
}

function commit(close) {
  emit('update:modelValue', { start: draftStart.value, end: draftEnd.value })
  if (close) closeWindow()
}

function shiftMonth(amount) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + amount, 1)
}

function cellDate(day) {
  return new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
}

function selectDay(day) {
  const date = cellDate(day)
  /* 超出 min / max 的日期点了也没反应 */
  if (!dayInRange(date)) return
  const value = formatInput(date)
  if (!draftStart.value || (draftStart.value && draftEnd.value)) {
    /* 开始新一轮：先选起点。 */
    draftStart.value = value
    draftEnd.value = ''
    commit(false)
    return
  }
  if (value <= draftStart.value) {
    /* 第二次点得比起点早：重新作为新起点。 */
    draftStart.value = value
    commit(false)
    return
  }
  draftEnd.value = value
  commit(true)
}

function clearRange() {
  draftStart.value = ''
  draftEnd.value = ''
  emit('update:modelValue', { start: '', end: '' })
  closeWindow()
}

/* 区间底色：选完两端用 end，只选了起点时用悬停预览。 */
function isInRange(day) {
  if (!draftStart.value) return false
  const end = draftEnd.value || (hoverDate.value && hoverDate.value > draftStart.value ? hoverDate.value : '')
  if (!end) return false
  const value = formatInput(cellDate(day))
  return value > draftStart.value && value < end
}

function cellClass(day) {
  const date = cellDate(day)
  const value = formatInput(date)
  return {
    'is-selected': value === draftStart.value || value === draftEnd.value,
    'is-inrange': isInRange(day),
    'is-today': isSameDay(date, todayDate())
  }
}

const pendingHint = computed(() => {
  if (draftStart.value && draftEnd.value) return '已选择范围'
  if (draftStart.value) return '再点一次选择结束日期'
  return '点击选择开始日期'
})

/* 面板摘要：紧凑的「M月D日」（跨年补年份）。 */
function shortLabel(value) {
  const date = parseDate(value)
  if (!date) return ''
  const year = date.getFullYear() === todayDate().getFullYear() ? '' : date.getFullYear() + '年'
  return year + (date.getMonth() + 1) + '月' + date.getDate() + '日'
}

const summaryStart = computed(() => shortLabel(draftStart.value))
const summaryEnd = computed(() => shortLabel(draftEnd.value))

/* 预设：[今天] / [近 N 天]，直接提交并收起。 */
function presetLabel(days) {
  return days === 0 ? '今天' : '近' + days + '天'
}

function applyPreset(days) {
  const end = todayDate()
  const start = todayDate()
  if (days > 1) start.setDate(end.getDate() - (days - 1))
  const value = { start: formatInput(start), end: formatInput(end) }
  emit('update:modelValue', value)
  closeWindow()
}

watch(() => props.modelValue, () => {
  if (!floating.value) syncDraft()
}, { deep: true })
</script>

<template>
  <div class="ui-range-date">
    <span class="ui-range-date__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-range-date__surface ui-morph"
      :class="{
        'is-open': open,
        'is-closing': closing,
        'is-floating': floating,
        'is-compressed': compressed
      }"
      :style="style"
    >
      <div class="ui-range-date__view ui-morph__view" :style="viewStyle">
        <button
          ref="fieldEl"
          type="button"
          class="ui-range-date__field"
          :aria-expanded="floating"
          aria-haspopup="dialog"
          @click="togglePicker"
        >
          <span class="ui-range-date__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <span class="ui-range-date__value" :class="{ 'is-empty': !startParts && !endParts }">
            <template v-if="startParts">
              <span class="ui-range-date__seg"><span v-if="startParts.year" class="ui-range-date__year">{{ startParts.year }}</span><span class="ui-range-date__month-day">{{ startParts.monthDay }}</span></span>
              <span class="ui-range-date__tilde" aria-hidden="true">~</span>
              <span v-if="endParts" class="ui-range-date__seg"><span v-if="endParts.year" class="ui-range-date__year">{{ endParts.year }}</span><span class="ui-range-date__month-day">{{ endParts.monthDay }}</span></span>
              <span v-else class="ui-range-date__pending">待选终点</span>
            </template>
            <template v-else>选择起止日期</template>
          </span>
          <span class="ui-range-date__chevron" :class="{ 'is-open': open }" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        ref="panelEl"
        class="ui-range-date__pop ui-morph__panel"
        role="dialog"
        aria-label="选择日期范围"
        :aria-hidden="open ? 'false' : 'true'"
        :inert="open ? null : ''"
        tabindex="-1"
        @pointerdown.stop
        @pointerleave="hoverDate = ''"
      >
        <div ref="panelContentEl" class="ui-range-date__pop-inner">
          <div class="ui-range-date__head">
            <button type="button" class="ui-range-date__nav" aria-label="上个月" @click="shiftMonth(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <strong>{{ monthLabel }}</strong>
            <button type="button" class="ui-range-date__nav" aria-label="下个月" @click="shiftMonth(1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <!-- 本次选择的摘要：起点 -> 终点，未选上是虚线占位。 -->
          <div class="ui-range-date__summary">
            <span class="ui-range-date__summary-pill" :class="{ 'is-set': draftStart }">{{ summaryStart || '开始' }}</span>
            <span class="ui-range-date__summary-arrow" aria-hidden="true">→</span>
            <span class="ui-range-date__summary-pill" :class="{ 'is-set': draftEnd }">{{ summaryEnd || '结束' }}</span>
          </div>

          <div class="ui-range-date__weekdays" aria-hidden="true">
            <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
          </div>

          <div class="ui-range-date__grid">
            <span v-for="(day, index) in calendarCells" :key="monthLabel + '-' + index" class="ui-range-date__cell" @mouseenter="day && (hoverDate = formatInput(cellDate(day)))">
              <button
                v-if="day"
                type="button"
                :tabindex="open ? 0 : -1"
                :class="cellClass(day)"
                :disabled="!dayInRange(cellDate(day))"
                @click="selectDay(day)"
              >
                {{ day }}
              </button>
            </span>
          </div>

          <div v-if="presets.length" class="ui-range-date__presets">
            <button
              v-for="days in presets"
              :key="days"
              type="button"
              class="ui-range-date__preset"
              @click="applyPreset(days)"
            >{{ presetLabel(days) }}</button>
          </div>

          <div class="ui-range-date__footer">
            <span>{{ pendingHint }}</span>
            <button type="button" @click="clearRange">清除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-range-date {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-range-date__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}

.ui-range-date__surface {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container-low);
  transition: left var(--t-panel), top var(--t-panel),
              width var(--t-panel), height var(--t-panel),
              border-radius var(--t-panel), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-range-date__surface.is-floating {
  position: fixed;
  z-index: 320;
}
.ui-range-date__surface.is-open {
  border-radius: calc(20px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
}
.ui-range-date__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-range-date__surface.is-compressed {
  transform: scale(.94);
  transition: transform var(--t-feedback);
}
.ui-range-date__surface:not(.is-floating):has(.ui-range-date__field:hover) {
  border-color: color-mix(in oklab, var(--primary) 36%, var(--outline-variant));
}
.ui-range-date__surface:has(.ui-range-date__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

.ui-range-date__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-range-date__field {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
  text-align: left;
}
.ui-range-date__field:focus-visible { outline: none; }
.ui-range-date__icon {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
}
.ui-range-date__icon svg { width: 17px; height: 17px; }
.ui-range-date__value {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 1px 6px;
  text-align: left;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  line-height: 1.35;
}
.ui-range-date__value.is-empty { color: var(--on-surface-variant); }
/* 端点各自不折行；放不下时在「~」后整体换行。 */
.ui-range-date__seg { display: inline-flex; align-items: baseline; gap: 0; }
.ui-range-date__year,
.ui-range-date__month-day {
  display: inline-block;
  white-space: nowrap;
}
.ui-range-date__tilde {
  color: var(--on-surface-variant);
  white-space: nowrap;
  margin: 0 1px;
}
/* 待选终点：虚线占位胶囊，与面板摘要同一个语言。 */
.ui-range-date__pending {
  padding: 0 6px;
  border: var(--border-w) dashed var(--outline-variant);
  border-radius: 999px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  line-height: 1.6;
  white-space: nowrap;
}
.ui-range-date__chevron {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback);
}
.ui-range-date__chevron svg { width: 15px; height: 15px; }
.ui-range-date__chevron.is-open { transform: rotate(180deg); }

.ui-range-date__pop {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  scrollbar-width: none;
}
.ui-range-date__pop::-webkit-scrollbar { display: none; }
.ui-range-date__pop-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
}
.ui-range-date__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 9px;
}
.ui-range-date__head strong {
  font-size: var(--fs-small);
  font-weight: var(--w-strong);
  letter-spacing: -.01em;
}
.ui-range-date__nav {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-range-date__nav:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-range-date__nav:active { transform: scale(var(--press-scale)); }
.ui-range-date__nav svg { width: 16px; height: 16px; }
.ui-range-date__presets {
  display: flex;
  gap: 6px;
  padding: 0 2px 8px;
}
.ui-range-date__cell button:disabled { opacity: .3; cursor: not-allowed; }
.ui-range-date__preset {
  padding: 3px 10px;
  border-radius: 999px;
  background: transparent;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), border-color var(--t-fade), transform var(--t-feedback);
}
.ui-range-date__preset:hover {
  border-color: var(--primary);
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.ui-range-date__preset:active { transform: scale(var(--press-scale)); }
.ui-range-date__summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px 9px;
}
.ui-range-date__summary-pill {
  padding: 3px 9px;
  border: var(--border-w) dashed var(--outline-variant);
  border-radius: 999px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  white-space: nowrap;
  transition: background var(--t-fade), color var(--t-fade), border-color var(--t-fade);
}
/* 已选：实心主色容器胶囊。 */
.ui-range-date__summary-pill.is-set {
  border-color: transparent;
  background: var(--primary-container);
  color: var(--on-primary-container);
  font-weight: var(--w-label);
}
.ui-range-date__summary-arrow {
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-range-date__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-bottom: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  text-align: center;
}
.ui-range-date__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.ui-range-date__cell {
  display: grid;
  place-items: center;
  min-height: 32px;
}
.ui-range-date__cell button {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-tiny);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-range-date__cell button:hover { background: var(--surface-container); }
.ui-range-date__cell button.is-inrange:hover { background: color-mix(in oklab, var(--primary) 20%, transparent); }
.ui-range-date__cell button:active { transform: scale(.92); }
.ui-range-date__cell button.is-today { color: var(--primary); font-weight: var(--w-strong); }
.ui-range-date__cell button.is-today::after {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}
/* 区间内：整格浅主色带（连续成条），端点是实心主色圆。 */
.ui-range-date__cell button.is-inrange {
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  border-radius: 0;
  width: 100%;
  height: 30px;
  color: var(--on-surface);
}
.ui-range-date__cell button.is-inrange.is-today { color: var(--primary); }
.ui-range-date__cell button.is-selected {
  position: relative;
  z-index: 1;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: var(--w-strong);
  border-radius: 9px;
  width: 30px;
  box-shadow: 0 0 0 2px var(--surface);
}
.ui-range-date__cell button.is-selected::after { display: none; }
.ui-range-date__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 2px 0;
  border-top: var(--border-w) solid var(--outline-variant);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-range-date__footer button {
  padding: 4px 9px;
  border: 0;
  border-radius: 7px;
  background: var(--primary-container);
  color: var(--on-primary-container);
  font: inherit;
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: transform var(--t-feedback), filter var(--t-fade);
}
.ui-range-date__footer button:hover { filter: brightness(1.04); }
.ui-range-date__footer button:active { transform: scale(var(--press-scale)); }

@media (prefers-reduced-motion: reduce) {
  .ui-range-date__surface.is-compressed { transition-duration: .01ms; }
}
</style>
