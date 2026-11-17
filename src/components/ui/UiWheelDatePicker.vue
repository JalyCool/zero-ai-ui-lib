<script setup>
import { computed, ref, watch } from 'vue'
import { useMorphWindow } from '../../core/morphWindow'
import UiWheel from './UiWheel.vue'

const props = defineProps({
  /* 'YYYY-MM-DD'，默认今天 */
  modelValue: { type: String, default: '' },
  label: { type: String, default: '日期' },
  startYear: { type: Number, default: new Date().getFullYear() - 10 },
  endYear: { type: Number, default: new Date().getFullYear() + 10 }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   波轮日期选择器：与时间波轮共用同一基座 <UiWheel>，
   展开界面样式完全一致（浅底圆角框 + 主色高亮块 + 年/月/日分隔符）。
   日列随所选年月动态生成，切月/年时把日夹进当月。
   ============================================================ */

const surfaceEl = ref(null)
const fieldEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)
const wheelEl = ref(null)

const current = ref(normalizeDate(props.modelValue || formatInput(todayDate())))
const draftYear = ref(current.value.getFullYear())
const draftMonth = ref(current.value.getMonth() + 1)
const draftDay = ref(current.value.getDate())

const { open, closing, floating, compressed, style, viewStyle, openWindow, closeWindow, toggleWindow } = useMorphWindow({
  surface: () => surfaceEl.value,
  panel: () => panelEl.value,
  content: () => panelContentEl.value,
  width: () => Math.min(320, window.innerWidth - 32),
  onOpened: () => {
    requestAnimationFrame(() => wheelEl.value?.scrollAll('auto'))
  },
  onClosed: () => {
    fieldEl.value?.focus({ preventScroll: true })
  }
})

const displayParts = computed(() => splitDisplay(current.value))

const yearItems = computed(() => {
  const out = []
  for (let year = props.startYear; year <= props.endYear; year += 1) out.push({ value: year, label: String(year) })
  return out
})
const monthItems = computed(() => {
  const out = []
  for (let month = 1; month <= 12; month += 1) out.push({ value: month, label: pad(month) })
  return out
})
const dayItems = computed(() => {
  const days = daysInMonth(draftYear.value, draftMonth.value)
  const out = []
  for (let day = 1; day <= days; day += 1) out.push({ value: day, label: pad(day) })
  return out
})

/* 三列 + 年/月/日分隔符（最后一列也带分隔符，与时间波轮的冒号同位）。 */
const columns = computed(() => [
  { items: yearItems.value, value: draftYear.value, label: '年', separator: '年' },
  { items: monthItems.value, value: draftMonth.value, label: '月', separator: '月' },
  { items: dayItems.value, value: draftDay.value, label: '日', separator: '日' }
])

function pad(value) {
  return String(value).padStart(2, '0')
}
function todayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}
function normalizeDate(value) {
  if (typeof value !== 'string') return todayDate()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return todayDate()
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? todayDate() : date
}
function formatInput(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

const RELATIVE_LABELS = { '-3': '大前天', '-2': '前天', '-1': '昨天', 0: '今天', 1: '明天', 2: '后天', 3: '大后天' }
function dayOffsetFromToday(date) {
  return Math.round((date.getTime() - todayDate().getTime()) / 86400000)
}
function splitDisplay(date) {
  const label = RELATIVE_LABELS[dayOffsetFromToday(date)]
  if (label) return { year: '', monthDay: label }
  const monthDay = (date.getMonth() + 1) + '月' + date.getDate() + '日'
  const sameYear = date.getFullYear() === todayDate().getFullYear()
  return { year: sameYear ? '' : date.getFullYear() + '年', monthDay }
}

watch([draftYear, draftMonth], () => {
  const maxDay = daysInMonth(draftYear.value, draftMonth.value)
  if (draftDay.value > maxDay) draftDay.value = maxDay
})

function syncDraft() {
  draftYear.value = current.value.getFullYear()
  draftMonth.value = current.value.getMonth() + 1
  draftDay.value = current.value.getDate()
}

function onWheelChange({ index, value }) {
  const num = Number(value)
  if (index === 0) draftYear.value = num
  else if (index === 1) draftMonth.value = num
  else draftDay.value = num
}

function openPicker() {
  syncDraft()
  openWindow()
}
function togglePicker() {
  if (open.value) { closeWindow(); return }
  if (closing.value || compressed.value) { syncDraft(); toggleWindow(); return }
  openPicker()
}
function draftValue() {
  return formatInput(new Date(draftYear.value, draftMonth.value - 1, draftDay.value))
}
function confirm() {
  current.value = normalizeDate(draftValue())
  emit('update:modelValue', formatInput(current.value))
  closeWindow()
}
watch(() => props.modelValue, value => {
  current.value = normalizeDate(value || formatInput(todayDate()))
  if (!floating.value) syncDraft()
})
</script>

<template>
  <div class="ui-wheel-date">
    <span class="ui-wheel-date__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-wheel-date__surface ui-morph"
      :class="{
        'is-open': open,
        'is-closing': closing,
        'is-floating': floating,
        'is-compressed': compressed
      }"
      :style="style"
    >
      <div class="ui-wheel-date__view ui-morph__view" :style="viewStyle">
        <button
          ref="fieldEl"
          type="button"
          class="ui-wheel-date__field"
          :aria-expanded="floating"
          aria-haspopup="dialog"
          @click="togglePicker"
        >
          <span class="ui-wheel-date__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <span class="ui-wheel-date__value"><span v-if="displayParts.year" class="ui-wheel-date__year">{{ displayParts.year }}</span><span class="ui-wheel-date__month-day">{{ displayParts.monthDay }}</span></span>
          <span class="ui-wheel-date__chevron" :class="{ 'is-open': open }" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        ref="panelEl"
        class="ui-wheel-date__pop ui-morph__panel"
        role="dialog"
        aria-label="选择日期"
        :aria-hidden="open ? 'false' : 'true'"
        :inert="open ? null : ''"
        tabindex="-1"
        @pointerdown.stop
      >
        <div ref="panelContentEl" class="ui-wheel-date__pop-inner">
          <div class="ui-wheel-date__head">
            <span>选择日期</span>
            <strong>{{ draftValue() }}</strong>
          </div>

          <UiWheel
            ref="wheelEl"
            :columns="columns"
            :interactive="open"
            @change="onWheelChange"
          />

          <div class="ui-wheel-date__actions">
            <button type="button" class="ui-wheel-date__cancel" @click="closeWindow">取消</button>
            <button type="button" class="ui-wheel-date__confirm" @click="confirm">完成</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-wheel-date {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-wheel-date__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}

/* 形变外壳：与日期 / 时间选择器同一套按压式形变。 */
.ui-wheel-date__surface {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--surface-container-low);
  transition: left var(--t-panel), top var(--t-panel),
              width var(--t-panel), height var(--t-panel),
              border-radius var(--t-panel), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-wheel-date__surface.is-floating {
  position: fixed;
  z-index: 320;
}
.ui-wheel-date__surface.is-open {
  border-radius: calc(var(--r-20) * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
  box-shadow: var(--elev-tip);
}
.ui-wheel-date__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-wheel-date__surface.is-compressed {
  transform: scale(.94);
  transition: transform var(--t-feedback);
}
.ui-wheel-date__surface:not(.is-floating):has(.ui-wheel-date__field:hover) {
  border-color: color-mix(in oklab, var(--primary) 36%, var(--outline-variant));
}
.ui-wheel-date__surface:has(.ui-wheel-date__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

.ui-wheel-date__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-wheel-date__field {
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
.ui-wheel-date__field:focus-visible { outline: none; }
.ui-wheel-date__icon {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
}
.ui-wheel-date__icon svg { width: 17px; height: 17px; }
.ui-wheel-date__value {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  line-height: 1.35;
}
.ui-wheel-date__year,
.ui-wheel-date__month-day {
  display: inline-block;
  white-space: nowrap;
}
.ui-wheel-date__chevron {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback);
}
.ui-wheel-date__chevron svg { width: 15px; height: 15px; }
.ui-wheel-date__chevron.is-open { transform: rotate(180deg); }

.ui-wheel-date__pop {
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
.ui-wheel-date__pop::-webkit-scrollbar { display: none; }
.ui-wheel-date__pop-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
}
.ui-wheel-date__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 1px 2px 10px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-wheel-date__head strong {
  color: var(--on-surface);
  font-family: var(--font-mono);
  font-size: var(--fs-body);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}

.ui-wheel-date__actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 10px;
}
.ui-wheel-date__actions button {
  min-width: 58px;
  padding: 7px 12px;
  border-radius: 10px;
  font: inherit;
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: transform var(--t-feedback), background var(--t-fade), color var(--t-fade);
}
.ui-wheel-date__actions button:active { transform: scale(var(--press-scale)); }
.ui-wheel-date__cancel {
  border: 0;
  background: transparent;
  color: var(--on-surface-variant);
}
.ui-wheel-date__cancel:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-wheel-date__confirm {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
}

@media (prefers-reduced-motion: reduce) {
  .ui-wheel-date__surface.is-compressed { transition-duration: .01ms; }
}
</style>
