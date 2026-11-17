<script setup>
import { computed, ref, watch } from 'vue'
import { useMorphWindow } from '../../core/morphWindow'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '日期' },
  /* 最终精度：day / month / year。必须选到这一级才会提交并关闭。 */
  precision: { type: String, default: 'day', validator: v => ['day', 'month', 'year'].includes(v) },
  /* 可选范围（含端点）：'YYYY-MM-DD'；null = 不限制 */
  min: { type: String, default: null },
  max: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   日期选择
   点击后输入框先收缩一下，再放大成居中的日历窗口。
   窗口不压暗背景：外壳沿用卡片展开的几何过渡，
   输入框内容模糊淡出，日历内容从模糊里浮现。
   ============================================================ */

const surfaceEl = ref(null)
const fieldEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)

const current = ref(props.modelValue || formatInput(todayDate()))
const viewDate = ref(startOfMonth(todayDate()))

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

const selectedDate = computed(() => parseDate(current.value) || todayDate())
const displayParts = computed(() => splitDisplay(selectedDate.value))
const monthLabel = computed(() => {
  if (viewMode.value === 'years') return yearPageStart.value + ' - ' + (yearPageStart.value + 9)
  if (viewMode.value === 'months') return viewDate.value.getFullYear() + '年'
  return viewDate.value.getFullYear() + '年' + (viewDate.value.getMonth() + 1) + '月'
})

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

/* ---------------- 三级视图状态机：日 → 月 → 年 ---------------- */
/* precision 决定「哪一级是终点」：
   day   → 日网格里点某天即完成；
   month → 月网格里点某月即完成（补 01 日）；
   year  → 年网格里点某年即完成（补 01-01）。 */
const viewMode = ref('days')
const yearPage = ref(0)

const minDate = computed(() => parseDate(props.min))
const maxDate = computed(() => parseDate(props.max))

/* 某天是否可选（两端都含） */
function dayInRange(date) {
  const t = date.getTime()
  if (minDate.value && t < minDate.value.getTime()) return false
  if (maxDate.value && t > maxDate.value.getTime()) return false
  return true
}

/* 某月是否还有可选的日子 */
function monthSelectable(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  if (minDate.value && last.getTime() < minDate.value.getTime()) return false
  if (maxDate.value && first.getTime() > maxDate.value.getTime()) return false
  return true
}

/* 某年是否还有可选的月份 */
function yearSelectable(year) {
  return monthSelectable(year, 0) || monthSelectable(year, 11)
    || (minDate.value && minDate.value.getFullYear() < year && (!maxDate.value || maxDate.value.getFullYear() > year))
    || (maxDate.value && maxDate.value.getFullYear() > year && (!minDate.value || minDate.value.getFullYear() < year))
    || (minDate.value && maxDate.value && minDate.value.getFullYear() <= year && year <= maxDate.value.getFullYear())
}

/* 年视图：以十年为一页（2000-2009 / 2010-2019…） */
const yearPageStart = computed(() => yearPage.value * 10)
const yearCells = computed(() => Array.from({ length: 10 }, (_, i) => yearPageStart.value + i))

/* 月视图：当前 viewDate 所在年的 12 个月 */
const monthCells = computed(() => Array.from({ length: 12 }, (_, i) => i))

function enterMonths() {
  viewMode.value = 'months'
}
function enterYears() {
  yearPage.value = Math.floor(viewDate.value.getFullYear() / 10)
  viewMode.value = 'years'
}
function backToDays() {
  viewMode.value = 'days'
}
function backToMonths() {
  viewMode.value = 'months'
}

/* 选月：precision=month 直接完成；否则进入该月的日视图 */
function selectMonth(month) {
  const year = viewDate.value.getFullYear()
  const next = new Date(year, month, 1)
  if (props.precision === 'month') {
    viewDate.value = next
    commitDate(next)
    return
  }
  viewDate.value = next
  viewMode.value = 'days'
}

/* 选年：precision=year 直接完成；否则进入月视图 */
function selectYear(year) {
  const next = new Date(year, viewDate.value.getMonth(), 1)
  if (props.precision === 'year') {
    viewDate.value = next
    commitDate(next)
    return
  }
  viewDate.value = next
  viewMode.value = 'months'
}

/* 按精度把日期写成对应格式并提交 */
function commitDate(date) {
  const value = props.precision === 'year'
    ? String(date.getFullYear())
    : props.precision === 'month'
      ? date.getFullYear() + '-' + pad(date.getMonth() + 1)
      : formatInput(date)
  current.value = value
  emit('update:modelValue', value)
  closeWindow()
}

function formatInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

/* 相对今天 -3 ~ +3 天只显示称呼，不显示具体日期。 */
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

/* 显示拆分：
   · 相对今天 ±3 天 -> 只显示称呼；
   · 与今天同年 -> 不显示年份；
   · 需要折行时在「年」之后断开，月日尽量保持同一行
     （年与月日是两个 nowrap 的 inline-block，放不下才整体换行）。 */
function splitDisplay(date) {
  const label = RELATIVE_LABELS[dayOffsetFromToday(date)]
  if (label) return { year: '', monthDay: label }
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`
  const sameYear = date.getFullYear() === todayDate().getFullYear()
  return { year: sameYear ? '' : `${date.getFullYear()}年`, monthDay }
}

function openPicker() {
  viewDate.value = startOfMonth(selectedDate.value)
  viewMode.value = props.precision === 'year' ? 'years' : props.precision === 'month' ? 'months' : 'days'
  yearPage.value = Math.floor(viewDate.value.getFullYear() / 10)
  openWindow()
}

function togglePicker() {
  if (open.value) {
    closeWindow()
    return
  }
  if (closing.value || compressed.value) {
    // 收起 / 按压途中再次点击：打断并直接展开。
    viewDate.value = startOfMonth(selectedDate.value)
    toggleWindow()
    return
  }
  openPicker()
}

function shiftMonth(amount) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + amount, 1)
}

/* 左右箭头按当前视图走：日 -> 月，月 -> 年，年 -> 十年 */
function stepBackward() {
  if (viewMode.value === 'days') shiftMonth(-1)
  else if (viewMode.value === 'months') viewDate.value = new Date(viewDate.value.getFullYear() - 1, viewDate.value.getMonth(), 1)
  else yearPage.value -= 1
}
function stepForward() {
  if (viewMode.value === 'days') shiftMonth(1)
  else if (viewMode.value === 'months') viewDate.value = new Date(viewDate.value.getFullYear() + 1, viewDate.value.getMonth(), 1)
  else yearPage.value += 1
}

function selectDay(day) {
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
  if (!dayInRange(date)) return
  commitDate(date)
}

function selectToday() {
  const date = todayDate()
  if (!dayInRange(date)) return
  viewDate.value = startOfMonth(date)
  commitDate(date)
}

watch(() => props.modelValue, value => {
  current.value = value || formatInput(todayDate())
  if (!floating.value) viewDate.value = startOfMonth(selectedDate.value)
})
</script>

<template>
  <div class="ui-date">
    <span class="ui-date__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-date__surface ui-morph"
      :class="{
        'is-open': open,
        'is-closing': closing,
        'is-floating': floating,
        'is-compressed': compressed
      }"
      :style="style"
    >
      <div class="ui-date__view ui-morph__view" :style="viewStyle">
        <button
          ref="fieldEl"
          type="button"
          class="ui-date__field"
          :aria-expanded="floating"
          aria-haspopup="dialog"
          @click="togglePicker"
        >
          <span class="ui-date__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <span class="ui-date__value"><span v-if="displayParts.year" class="ui-date__year">{{ displayParts.year }}</span><span class="ui-date__month-day">{{ displayParts.monthDay }}</span></span>
          <span class="ui-date__chevron" :class="{ 'is-open': open }" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        ref="panelEl"
        class="ui-date__pop ui-morph__panel"
        role="dialog"
        aria-label="选择日期"
        :aria-hidden="open ? 'false' : 'true'"
        :inert="open ? null : ''"
        tabindex="-1"
        @pointerdown.stop
      >
        <div ref="panelContentEl" class="ui-date__pop-inner">
          <div class="ui-date__head">
            <button
              type="button"
              class="ui-date__nav"
              :aria-label="viewMode === 'days' ? '上个月' : viewMode === 'months' ? '上一年' : '上一页'"
              @click="stepBackward"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>

            <!-- 标题三段可点：日 -> 月 -> 年（由 precision 决定能不能再往上走） -->
            <div class="ui-date__crumbs">
              <button
                type="button"
                class="ui-date__crumb"
                :class="{ 'is-current': viewMode === 'years' }"
                @click="enterYears"
              >{{ viewMode === 'years' ? yearPageStart + ' - ' + (yearPageStart + 9) : viewDate.getFullYear() + '年' }}</button>
              <button
                v-if="viewMode === 'days'"
                type="button"
                class="ui-date__crumb"
                @click="enterMonths"
              >{{ viewDate.getMonth() + 1 }}月</button>
            </div>

            <button
              type="button"
              class="ui-date__nav"
              :aria-label="viewMode === 'days' ? '下个月' : viewMode === 'months' ? '下一年' : '下一页'"
              @click="stepForward"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <!-- 三套网格叠在同一格：切换时旧视图模糊淡出、新视图从模糊浮入 -->
          <div class="ui-date__stage">
            <Transition name="date-view">
              <!-- 日 -->
              <div v-if="viewMode === 'days'" key="days" class="ui-date__pane">
                <div class="ui-date__weekdays" aria-hidden="true">
                  <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
                </div>
                <div class="ui-date__grid">
                  <span v-for="(day, index) in calendarCells" :key="`${monthLabel}-${index}`" class="ui-date__cell">
                    <button
                      v-if="day"
                      type="button"
                      :tabindex="open ? 0 : -1"
                      :disabled="!dayInRange(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))"
                      :class="{
                        'is-selected': isSameDay(new Date(viewDate.getFullYear(), viewDate.getMonth(), day), selectedDate),
                        'is-today': isSameDay(new Date(viewDate.getFullYear(), viewDate.getMonth(), day), todayDate())
                      }"
                      @click="selectDay(day)"
                    >
                      {{ day }}
                    </button>
                  </span>
                </div>
              </div>

              <!-- 月 -->
              <div v-else-if="viewMode === 'months'" key="months" class="ui-date__pane">
                <div class="ui-date__months">
                  <button
                    v-for="month in monthCells"
                    :key="month"
                    type="button"
                    :tabindex="open ? 0 : -1"
                    :disabled="!monthSelectable(viewDate.getFullYear(), month)"
                    :class="{ 'is-selected': viewDate.getFullYear() === selectedDate.getFullYear() && month === selectedDate.getMonth() }"
                    @click="selectMonth(month)"
                  >{{ month + 1 }}月</button>
                </div>
              </div>

              <!-- 年 -->
              <div v-else key="years" class="ui-date__pane">
                <div class="ui-date__months">
                  <button
                    v-for="year in yearCells"
                    :key="year"
                    type="button"
                    :tabindex="open ? 0 : -1"
                    :disabled="!yearSelectable(year)"
                    :class="{ 'is-selected': year === selectedDate.getFullYear() }"
                    @click="selectYear(year)"
                  >{{ year }}</button>
                </div>
              </div>
            </Transition>
          </div>

          <div class="ui-date__footer">
            <span>选择后会立即生效</span>
            <button type="button" @click="selectToday">今天</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-date {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-date__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}

/* 形变外壳：关闭时就是输入框本身，展开时固定定位长成日历窗口。 */
.ui-date__surface {
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
.ui-date__surface.is-floating {
  position: fixed;
  z-index: 320;
}
.ui-date__surface.is-open {
  border-radius: calc(20px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
}
.ui-date__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
/* 第一阶段：输入框先收缩一下。 */
.ui-date__surface.is-compressed {
  transform: scale(.94);
  transition: transform var(--t-feedback);
}
.ui-date__surface:not(.is-floating):has(.ui-date__field:hover) {
  border-color: color-mix(in oklab, var(--primary) 36%, var(--outline-variant));
}
.ui-date__surface:has(.ui-date__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

.ui-date__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-date__field {
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
.ui-date__field:focus-visible { outline: none; }
.ui-date__icon {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
}
.ui-date__icon svg { width: 17px; height: 17px; }
.ui-date__value {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  line-height: 1.35;
}
/* 年 / 月日各自不折行：放不下时整段「月日」换到第二行。 */
.ui-date__year,
.ui-date__month-day {
  display: inline-block;
  white-space: nowrap;
}
.ui-date__chevron {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback);
}
.ui-date__chevron svg { width: 15px; height: 15px; }
.ui-date__chevron.is-open { transform: rotate(180deg); }

/* 新内容：铺满外壳，随外壳一起被裁剪与滚动。 */
.ui-date__pop {
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
.ui-date__pop::-webkit-scrollbar { display: none; }
.ui-date__pop-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
}
.ui-date__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 9px;
}
.ui-date__head strong {
  font-size: var(--fs-small);
  font-weight: var(--w-strong);
  letter-spacing: -.01em;
}
.ui-date__nav {
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
.ui-date__nav:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-date__nav:active { transform: scale(var(--press-scale)); }
.ui-date__nav svg { width: 16px; height: 16px; }
.ui-date__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-bottom: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  text-align: center;
}
/* 三套视图叠在同一格：切换时旧视图模糊淡出、新视图从模糊浮入 */
.ui-date__stage { position: relative; min-height: 232px; }
.ui-date__pane { display: flex; flex-direction: column; gap: 2px; }
.date-view-enter-active, .date-view-leave-active {
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
.date-view-enter-from { opacity: 0; transform: scale(.96); filter: blur(8px); }
.date-view-leave-to { opacity: 0; transform: scale(1.03); filter: blur(8px); }
.date-view-leave-active { position: absolute; inset: 0; }

/* 顶部三段标题：年 / 月 可点，当前这一级高亮 */
.ui-date__crumbs { display: flex; align-items: baseline; gap: 2px; flex: 1; justify-content: center; }
.ui-date__crumb {
  border: 0;
  background: none;
  padding: 2px 4px;
  border-radius: 6px;
  color: var(--on-surface);
  font: inherit;
  font-weight: var(--w-heading);
  font-size: var(--fs-small);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-date__crumb:hover { background: var(--surface-container-high); }
.ui-date__crumb.is-current { color: var(--primary); }

/* 月 / 年网格：三列 */
.ui-date__months {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 2px 0;
}
.ui-date__months button {
  height: 44px;
  border: 0;
  border-radius: calc(11px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-date__months button:hover { background: var(--surface-container-high); }
.ui-date__months button:active { transform: scale(var(--press-scale)); }
.ui-date__months button.is-selected { background: var(--primary); color: var(--on-primary); }
.ui-date__months button:disabled { opacity: .34; cursor: not-allowed; }

.ui-date__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.ui-date__cell {
  display: grid;
  place-items: center;
  min-height: 32px;
}
.ui-date__cell button {
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
.ui-date__cell button:disabled { opacity: .3; cursor: not-allowed; }
.ui-date__cell button:disabled:hover { background: none; }
.ui-date__cell button:hover { background: var(--surface-container); }
.ui-date__cell button:active { transform: scale(.92); }
.ui-date__cell button.is-today { color: var(--primary); font-weight: var(--w-strong); }
.ui-date__cell button.is-today::after {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}
.ui-date__cell button.is-selected {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: var(--w-strong);
}
.ui-date__cell button.is-selected::after { display: none; }
.ui-date__footer {
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
.ui-date__footer button {
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
.ui-date__footer button:hover { filter: brightness(1.04); }
.ui-date__footer button:active { transform: scale(var(--press-scale)); }
</style>
