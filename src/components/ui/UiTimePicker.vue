<script setup>
import { computed, ref, watch } from 'vue'
import { useMorphWindow } from '../../core/morphWindow'

const props = defineProps({
  modelValue: { type: String, default: '09:00' },
  label: { type: String, default: '时间' },
  presets: {
    type: Array,
    default: () => [
      { label: '早上', value: '08:00' },
      { label: '中午', value: '12:00' },
      { label: '傍晚', value: '18:30' },
      { label: '晚上', value: '21:00' }
    ]
  }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   时间选择
   和日期选择同一套按压式形变：输入框先收缩，再放大成居中的
   时间窗口；窗口不压暗背景，输入框内容模糊淡出、滚轮内容浮现。
   高亮块固定在窗口中央不动，点击和滑动移动的是背后的数字层。
   ============================================================ */

const surfaceEl = ref(null)
const fieldEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)
const hourColumn = ref(null)
const minuteColumn = ref(null)

const current = ref(normalizeTime(props.modelValue))
const draftHour = ref('09')
const draftMinute = ref('00')

const { open, closing, floating, compressed, style, viewStyle, openWindow, closeWindow, toggleWindow } = useMorphWindow({
  surface: () => surfaceEl.value,
  panel: () => panelEl.value,
  content: () => panelContentEl.value,
  width: () => Math.min(300, window.innerWidth - 32),
  onOpened: () => {
    requestAnimationFrame(() => scrollSelectedIntoView('auto'))
  },
  onClosed: () => {
    fieldEl.value?.focus({ preventScroll: true })
  }
})

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

const displayValue = computed(() => current.value)
const draftValue = computed(() => `${draftHour.value}:${draftMinute.value}`)
const normalizedPresets = computed(() => (Array.isArray(props.presets) ? props.presets : [])
  .map(item => {
    if (typeof item === 'string') {
      return { label: item, value: normalizeTime(item) }
    }
    if (!item || typeof item !== 'object') return null

    const rawValue = item.value
      ?? (item.hour !== undefined ? `${pad(item.hour)}:${pad(item.minute ?? 0)}` : '')
    const value = normalizeTime(rawValue)
    return { label: item.label || value, value }
  })
  .filter(Boolean))
const presetColumns = computed(() => Math.min(Math.max(normalizedPresets.value.length, 1), 4))

function pad(value) {
  return String(value).padStart(2, '0')
}

function normalizeTime(value) {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) return '09:00'
  const [hour, minute] = value.split(':').map(Number)
  if (hour > 23 || minute > 59) return '09:00'
  return `${pad(hour)}:${pad(minute)}`
}

function syncDraft() {
  const [hour, minute] = current.value.split(':')
  draftHour.value = hour
  draftMinute.value = minute
}

function scrollColumn(column, value, behavior = 'smooth') {
  if (!column) return
  const target = column.querySelector(`[data-value="${value}"]`)
  if (!target) return
  const top = target.offsetTop - (column.clientHeight - target.offsetHeight) / 2
  column.scrollTo({
    top: Math.max(0, top),
    behavior
  })
}

function scrollSelectedIntoView(behavior = 'smooth') {
  scrollColumn(hourColumn.value, draftHour.value, behavior)
  scrollColumn(minuteColumn.value, draftMinute.value, behavior)
}

/* 数字层中心落在高亮块里的那一项，就是当前值。 */
function centeredValue(column) {
  if (!column) return ''
  const center = column.scrollTop + column.clientHeight / 2
  let best = ''
  let bestDistance = Infinity
  column.querySelectorAll('button[data-value]').forEach(button => {
    const middle = button.offsetTop + button.offsetHeight / 2
    const distance = Math.abs(middle - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = button.dataset.value
    }
  })
  return best
}

function settleColumn(column, apply) {
  if (!column) return
  const value = centeredValue(column)
  if (!value) return
  apply(value)
  scrollColumn(column, value)
}

/* 滑动结束后把数字吸附到高亮块正中，并把当前值同步过去。 */
function makeSettler(columnRef, apply) {
  let timer = 0
  return {
    onScroll() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        timer = 0
        settleColumn(columnRef.value, apply)
      }, 140)
    }
  }
}

const hourSettler = makeSettler(hourColumn, value => { draftHour.value = value })
const minuteSettler = makeSettler(minuteColumn, value => { draftMinute.value = value })

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

function selectHour(value) {
  draftHour.value = value
  scrollColumn(hourColumn.value, value)
}

function selectMinute(value) {
  draftMinute.value = value
  scrollColumn(minuteColumn.value, value)
}

function usePreset(value) {
  const [hour, minute] = normalizeTime(value).split(':')
  draftHour.value = hour
  draftMinute.value = minute
  requestAnimationFrame(() => scrollSelectedIntoView())
}

function confirm() {
  current.value = draftValue.value
  emit('update:modelValue', draftValue.value)
  closeWindow()
}

watch(() => props.modelValue, value => {
  current.value = normalizeTime(value)
  if (!floating.value) syncDraft()
})
</script>

<template>
  <div class="ui-time">
    <span v-if="label" class="ui-time__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-time__surface ui-morph"
      :class="{
        'is-open': open,
        'is-closing': closing,
        'is-floating': floating,
        'is-compressed': compressed
      }"
      :style="style"
    >
      <div class="ui-time__view ui-morph__view" :style="viewStyle">
        <button
          ref="fieldEl"
          type="button"
          class="ui-time__field"
          :aria-expanded="floating"
          aria-haspopup="dialog"
          @click="togglePicker"
        >
          <span class="ui-time__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.2 1.9" />
            </svg>
          </span>
          <span class="ui-time__value">{{ displayValue }}</span>
          <span class="ui-time__chevron" :class="{ 'is-open': open }" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        ref="panelEl"
        class="ui-time__pop ui-morph__panel"
        role="dialog"
        aria-label="选择时间"
        :aria-hidden="open ? 'false' : 'true'"
        :inert="open ? null : ''"
        tabindex="-1"
        @pointerdown.stop
      >
        <div ref="panelContentEl" class="ui-time__pop-inner">
          <div class="ui-time__head">
            <span>选择时间</span>
            <strong>{{ draftValue }}</strong>
          </div>

          <div class="ui-time__body">
            <span class="ui-time__highlight" aria-hidden="true"></span>

            <div
              ref="hourColumn"
              class="ui-time__column"
              aria-label="小时"
              @scroll.passive="hourSettler.onScroll"
            >
              <button
                v-for="hour in hours"
                :key="hour"
                type="button"
                :data-value="hour"
                :tabindex="open ? 0 : -1"
                :class="{ 'is-selected': draftHour === hour }"
                @click="selectHour(hour)"
              >
                {{ hour }}
              </button>
            </div>

            <span class="ui-time__colon" aria-hidden="true">:</span>

            <div
              ref="minuteColumn"
              class="ui-time__column"
              aria-label="分钟"
              @scroll.passive="minuteSettler.onScroll"
            >
              <button
                v-for="minute in minutes"
                :key="minute"
                type="button"
                :data-value="minute"
                :tabindex="open ? 0 : -1"
                :class="{ 'is-selected': draftMinute === minute }"
                @click="selectMinute(minute)"
              >
                {{ minute }}
              </button>
            </div>
          </div>

          <div
            v-if="normalizedPresets.length"
            class="ui-time__presets"
            :style="{ '--preset-cols': presetColumns }"
          >
            <button
              v-for="preset in normalizedPresets"
              :key="`${preset.value}-${preset.label}`"
              type="button"
              :tabindex="open ? 0 : -1"
              @click="usePreset(preset.value)"
            >
              {{ preset.label }}
            </button>
          </div>

          <div class="ui-time__actions">
            <button type="button" class="ui-time__cancel" @click="closeWindow">取消</button>
            <button type="button" class="ui-time__confirm" @click="confirm">完成</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-time {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-time__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}

/* 形变外壳：关闭时就是输入框本身，展开时固定定位长成时间窗口。 */
.ui-time__surface {
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
.ui-time__surface.is-floating {
  position: fixed;
  z-index: 320;
}
.ui-time__surface.is-open {
  border-radius: calc(20px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
  box-shadow: var(--elev-tip);
}
.ui-time__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
/* 第一阶段：输入框先按下收缩。 */
.ui-time__surface.is-compressed {
  transform: scale(.94);
  transition: transform var(--t-feedback);
}
.ui-time__surface:not(.is-floating):has(.ui-time__field:hover) {
  border-color: color-mix(in oklab, var(--primary) 36%, var(--outline-variant));
}
.ui-time__surface:has(.ui-time__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

.ui-time__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-time__field {
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
.ui-time__field:focus-visible { outline: none; }
.ui-time__icon {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
}
.ui-time__icon svg { width: 17px; height: 17px; }
.ui-time__value {
  flex: 1;
  text-align: left;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  letter-spacing: .03em;
}
.ui-time__chevron {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback);
}
.ui-time__chevron svg { width: 15px; height: 15px; }
.ui-time__chevron.is-open { transform: rotate(180deg); }

/* 新内容：铺满外壳，随外壳一起被裁剪与滚动。 */
.ui-time__pop {
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
.ui-time__pop::-webkit-scrollbar { display: none; }
.ui-time__pop-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
}
.ui-time__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 1px 2px 10px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-time__head strong {
  color: var(--on-surface);
  font-family: ui-monospace, monospace;
  font-size: var(--fs-body);
  font-variant-numeric: tabular-nums;
}

/* 滚轮：高亮块固定在中间不动，只有数字层在它背后上下移动。 */
.ui-time__body {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 5px;
  height: 172px;
  padding: 4px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 13px;
  background: var(--surface-container-low);
}
.ui-time__highlight {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 50%;
  height: 30px;
  transform: translateY(-50%);
  border-radius: 9px;
  background: var(--primary-container);
  pointer-events: none;
  z-index: 0;
}
.ui-time__column {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 66px 2px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
}
.ui-time__column::-webkit-scrollbar { display: none; }
.ui-time__column button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 30px;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-time__column button:hover { background: color-mix(in oklab, var(--surface) 46%, transparent); color: var(--on-surface); }
.ui-time__column button:active { transform: scale(.96); }
/* 落在高亮块里的那一项：数字本身不带底色，只换颜色和字重。 */
.ui-time__column button.is-selected {
  background: transparent;
  color: var(--on-primary-container);
  font-weight: var(--w-strong);
}
.ui-time__colon {
  align-self: center;
  position: relative;
  z-index: 1;
  color: var(--on-surface-variant);
  font-size: var(--fs-body);
  font-weight: var(--w-strong);
}
.ui-time__presets {
  display: grid;
  grid-template-columns: repeat(var(--preset-cols, 4), minmax(0, 1fr));
  gap: 5px;
  margin-top: 9px;
}
.ui-time__presets button {
  padding: 6px 2px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-micro);
  cursor: pointer;
  transition: border-color var(--t-fade), color var(--t-fade), background var(--t-fade);
}
.ui-time__presets button:hover {
  border-color: var(--primary);
  background: color-mix(in oklab, var(--primary) 7%, transparent);
  color: var(--primary);
}
.ui-time__actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 10px;
}
.ui-time__actions button {
  min-width: 58px;
  padding: 7px 12px;
  border-radius: 10px;
  font: inherit;
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: transform var(--t-feedback), background var(--t-fade), color var(--t-fade);
}
.ui-time__actions button:active { transform: scale(var(--press-scale)); }
.ui-time__cancel {
  border: 0;
  background: transparent;
  color: var(--on-surface-variant);
}
.ui-time__cancel:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-time__confirm {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
}
</style>
