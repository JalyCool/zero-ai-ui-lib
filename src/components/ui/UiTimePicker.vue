<script setup>
import { computed, ref, watch } from 'vue'
import { useMorphWindow } from '../../core/morphWindow'
import UiWheel from './UiWheel.vue'

const props = defineProps({
  modelValue: { type: String, default: '09:00' },
  label: { type: String, default: '时间' },
  /* 精度：'h' 只有时；'m' 时分；'s' 时分秒。决定波轮字段数量。 */
  precision: { type: String, default: 'm', validator: v => ['h', 'm', 's'].includes(v) },
  /* 可选范围（含端点）：'HH:mm' / 'HH:mm:ss'；null = 不限制 */
  min: { type: String, default: null },
  max: { type: String, default: null },
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
   时间选择：按压式形变外壳 + 通用波轮 <UiWheel>。
   字段数量随 precision 增删（时 / 时分 / 时分秒），
   波轮交互（高亮块固定、数字层移动、140ms 吸附）全部在 UiWheel 里。
   ============================================================ */

const surfaceEl = ref(null)
const fieldEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)
const wheelEl = ref(null)

const { open, closing, floating, compressed, style, viewStyle, openWindow, closeWindow, toggleWindow } = useMorphWindow({
  surface: () => surfaceEl.value,
  panel: () => panelEl.value,
  content: () => panelContentEl.value,
  width: () => Math.min(300, window.innerWidth - 32),
  onOpened: () => {
    requestAnimationFrame(() => wheelEl.value?.scrollAll('auto'))
  },
  onClosed: () => {
    fieldEl.value?.focus({ preventScroll: true })
  }
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function splitParts(value) {
  const [h, m, s] = value.split(':')
  return { h: h ?? '00', m: m ?? '00', s: s ?? '00' }
}
function normalizeTime(value) {
  if (typeof value !== 'string') return '09:00'
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) return '09:00'
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? 0)
  if (hour > 23 || minute > 59 || second > 59) return '09:00'
  const composed = props.precision === 'h'
    ? pad(hour)
    : props.precision === 'm'
      ? pad(hour) + ':' + pad(minute)
      : pad(hour) + ':' + pad(minute) + ':' + pad(second)
  return clampTime(composed)
}

/* 范围约束：min / max 都按秒比较，越界直接钳回边界 */
const minSeconds = computed(() => toSeconds(props.min))
const maxSeconds = computed(() => toSeconds(props.max))

function toSeconds(value) {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0)
}

function clampTime(value) {
  const t = toSeconds(value)
  if (t === null) return value
  const lo = minSeconds.value
  const hi = maxSeconds.value
  if (lo !== null && t < lo) return fromSeconds(lo)
  if (hi !== null && t > hi) return fromSeconds(hi)
  return value
}

function fromSeconds(total) {
  const t = Math.max(0, Math.min(86399, total))
  const h = Math.floor(t / 3600)
  const mi = Math.floor((t % 3600) / 60)
  const s = t % 60
  if (props.precision === 'h') return pad(h)
  if (props.precision === 'm') return pad(h) + ':' + pad(mi)
  return pad(h) + ':' + pad(mi) + ':' + pad(s)
}

/* 初始值必须等 pad / splitParts / normalizeTime / clampTime / min·maxSeconds
   全部声明完再算（否则命中 TDZ：can't access lexical declaration before initialization） */
const current = ref(normalizeTime(props.modelValue))
const parts = ref(splitParts(current.value))

const hourItems = Array.from({ length: 24 }, (_, i) => pad(i))
const minuteItems = Array.from({ length: 60 }, (_, i) => pad(i))

const columns = computed(() => {
  const list = [{ items: hourItems, value: parts.value.h, label: '小时', separator: props.precision !== 'h' ? ':' : '' }]
  if (props.precision !== 'h') {
    list.push({ items: minuteItems, value: parts.value.m, label: '分钟', separator: props.precision === 's' ? ':' : '' })
  }
  if (props.precision === 's') {
    list.push({ items: minuteItems, value: parts.value.s, label: '秒' })
  }
  return list
})

const draftValue = computed(() => columns.value.map(c => c.value).join(':'))
const displayValue = computed(() => current.value)

const normalizedPresets = computed(() => (Array.isArray(props.presets) ? props.presets : [])
  .map(item => {
    if (typeof item === 'string') return { label: item, value: normalizeTime(item) }
    if (!item || typeof item !== 'object') return null
    const rawValue = item.value ?? ''
    return { label: item.label || rawValue, value: normalizeTime(rawValue) }
  })
  .filter(Boolean))
const presetColumns = computed(() => Math.min(Math.max(normalizedPresets.value.length, 1), 4))

function syncDraft() {
  parts.value = splitParts(current.value)
}

function onWheelChange({ index, value }) {
  const next = { ...parts.value }
  if (index === 0) next.h = value
  else if (index === 1) next.m = value
  else next.s = value
  parts.value = next
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
    syncDraft()
    toggleWindow()
    return
  }
  openPicker()
}

function usePreset(value) {
  parts.value = splitParts(normalizeTime(value))
  requestAnimationFrame(() => wheelEl.value?.scrollAll())
}

function confirm() {
  const next = clampTime(draftValue.value)
  current.value = next
  emit('update:modelValue', next)
  closeWindow()
}

watch(() => props.modelValue, value => {
  current.value = normalizeTime(value)
  if (!floating.value) syncDraft()
})

/* 精度切换时重新归一，避免留下多余字段。 */
watch(() => props.precision, () => {
  current.value = normalizeTime(current.value)
  syncDraft()
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

          <UiWheel
            ref="wheelEl"
            class="ui-time__wheel"
            :columns="columns"
            :interactive="open"
            @change="onWheelChange"
          />

          <div
            v-if="normalizedPresets.length"
            class="ui-time__presets"
            :style="{ '--preset-cols': presetColumns }"
          >
            <button
              v-for="preset in normalizedPresets"
              :key="preset.value + '-' + preset.label"
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
/* 波轮与外壳之间留一点间距。 */
.ui-time__wheel { margin-top: 2px; }
</style>

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
  /* 预留最宽形态「00:00:00」的宽度：precision 在 h/m/s 之间切换时输入框不抖动 */
  min-width: 8.2ch;
  text-align: left;
  font-size: var(--fs-small);
  font-family: var(--font-numeric);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
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
  font-family: var(--font-mono);
  font-size: var(--fs-body);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}

.ui-time__presets {
  display: grid;
  grid-template-columns: repeat(var(--preset-cols, 4), minmax(0, 1fr));
  gap: 5px;
  margin-top: 9px;
}
.ui-time__presets button {
  padding: 6px 2px;
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
