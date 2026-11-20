<script setup>
import { computed, ref, watch } from 'vue'
import TimePickerImpl from './TimePicker.vue'
import UiRollNumber from '../UiRollNumber.vue'
import { formatDurationBetweenApprox, parseClockTime } from '../../../core/duration'

const props = defineProps({
  /* { start: 'HH:mm', end: 'HH:mm' } */
  modelValue: {
    type: Object,
    default: () => ({ start: '09:00', end: '18:00' })
  },
  /* 选择器精度：'h' | 'm' | 's'。
     它同时决定两端时间选择器的字段数量，以及时长文本的最小显示单位。 */
  precision: {
    type: String,
    default: 'm',
    validator: value => ['h', 'm', 's'].includes(value)
  },
  /* 显示精度：时长四舍五入到的精度，支持整 / 半单位
     'h' | 'h/2' | 'm' | 'm/2' | 's'。取整改变了数值时文本前加 '~'。 */
  displayPrecision: {
    type: String,
    default: 's',
    validator: value => ['h', 'h/2', 'm', 'm/2', 's'].includes(value)
  },
  /* 可选范围（含端点）：'HH:mm' / 'HH:mm:ss'；null = 不限制。透传给两端波轮 */
  min: { type: String, default: null },
  max: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   范围时间选择器
   由两个真实的时间选择器横向拼接而成（不复制时间选择器
   内部代码），中间一个颜色较浅的箭头，时长文本就显示在
   箭头的正上方。
   · precision 决定两端选择器有几列（时 / 时分 / 时分秒），
     也决定时长文本的最小显示单位；
   · displayPrecision 决定时长四舍五入到的精度（可半单位），
     一旦取整改变了真实数值，文本前加 '~' 表示近似。
   文本规则见 core/duration.js（60 分钟 -> 1h，63 分 3 秒 -> 1h03m03s），
   数字变化走统一滚动动效。
   ============================================================ */

const startValue = ref(sanitize(props.modelValue?.start, '09:00'))
const endValue = ref(sanitize(props.modelValue?.end, '18:00'))

const durationSeconds = computed(() => {
  const a = parseClockTime(startValue.value)
  const b = parseClockTime(endValue.value)
  if (a === null || b === null) return 0
  return Math.max(0, b - a)
})

const duration = computed(() => formatDurationBetweenApprox(startValue.value, endValue.value, {
  precision: props.precision,
  displayPrecision: props.displayPrecision
}))
const durationText = computed(() => duration.value.text)
/* 滚动数字只吃文本部分，'~' 单独静态渲染，避免每次近似切换都抖动宽度。 */
const durationValue = computed(() => duration.value.text.replace(/^~/, ''))

function sanitize(value, fallback) {
  return typeof value === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value) ? value : fallback
}

/* 精度对应的最小单位（秒）：时 → 3600，分 → 60，秒 → 1 */
const unitSeconds = computed(() => (props.precision === 'h' ? 3600 : props.precision === 'm' ? 60 : 1))

/* 秒 -> 与 precision 等宽的时钟字符串（09:00 / 09:00:00） */
function toClock(total) {
  const day = 86400
  const t = ((total % day) + day) % day
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = n => String(n).padStart(2, '0')
  return props.precision === 'h' ? pad(h) + ':' + pad(m) : props.precision === 'm' ? pad(h) + ':' + pad(m) : pad(h) + ':' + pad(m) + ':' + pad(s)
}

/* 把秒数按精度向下取整（避免精度切换后出现 09:00:30 这种半格值） */
function alignToPrecision(total) {
  return Math.floor(total / unitSeconds.value) * unitSeconds.value
}

function commit() {
  emit('update:modelValue', { start: startValue.value, end: endValue.value })
}

function onStart(value) {
  const next = sanitize(value, startValue.value)
  const a = parseClockTime(next)
  const b = parseClockTime(endValue.value)
  startValue.value = next
  /* 开始时间不早于结束时间：把结束推到「开始 + 一个最小单位」 */
  if (a !== null && b !== null && a >= b) {
    endValue.value = toClock(alignToPrecision(a) + unitSeconds.value)
  }
  commit()
}

function onEnd(value) {
  const next = sanitize(value, endValue.value)
  const a = parseClockTime(startValue.value)
  const b = parseClockTime(next)
  endValue.value = next
  /* 结束时间不晚于开始时间：把开始拉到「结束 - 一个最小单位」 */
  if (a !== null && b !== null && b <= a) {
    startValue.value = toClock(alignToPrecision(b) - unitSeconds.value)
  }
  commit()
}

watch(() => props.modelValue, value => {
  const next = value && typeof value === 'object' ? value : {}
  startValue.value = sanitize(next.start, startValue.value)
  endValue.value = sanitize(next.end, endValue.value)
}, { deep: true })
</script>

<template>
  <div class="ui-range-time">
    <div class="ui-range-time__row">
      <!-- 时钟图标前置：两个时间选择器内部不再各画一个，
           范围控件共用行首这一枚。 -->
      <span class="ui-range-time__clock" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      </span>
      <TimePickerImpl
        class="ui-range-time__picker"
        :model-value="startValue"
        :precision="precision"
        :min="min"
        :max="max"
        label=""
        @update:model-value="onStart"
      />

      <!-- 中间列：时长文本在箭头正上方；箭头与两个输入框垂直居中对齐。 -->
      <div class="ui-range-time__mid" :aria-label="'时长 ' + durationText" role="status">
        <span class="ui-range-time__duration">
          <span v-if="duration.approx" class="ui-range-time__approx" aria-hidden="true">~</span>
          <UiRollNumber
            class="ui-range-time__duration-value"
            :value="durationValue"
            :direction-key="durationSeconds"
            :step="60"
          />
        </span>
        <span class="ui-range-time__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12h15" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      <TimePickerImpl
        class="ui-range-time__picker"
        :model-value="endValue"
        :precision="precision"
        :min="min"
        :max="max"
        label=""
        @update:model-value="onEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.ui-range-time {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ui-range-time__row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}
.ui-range-time__picker {
  flex: 1;
  min-width: 0;
}
/* 中列：时长文本在流内撑出宽度；箭头**绝对定位钉在字段中线**（42px 字段
   的一半 = 21px）——之前用「剩余空间居中」，波轮一展开（行高 172px）
   箭头就漂到波轮中心，与两端字段错位；钉线后展开收起都不动。 */
.ui-range-time__mid {
  position: relative;
  flex: 0 0 auto;
  min-width: 3.6em;
}
/* 时长文本超出也不换行，避免把箭头挤下去 */
.ui-range-time__duration {
  height: 15px;
  padding-top: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.ui-range-time__approx {
  color: var(--on-surface-variant);
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  margin-right: 1px;
}
.ui-range-time__duration-value {
  color: var(--on-surface-variant);
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  letter-spacing: .02em;
  line-height: 1.1;
}
/* 较浅的箭头：比正文浅一档的描边色，垂直钉在两端字段的中线上。 */
.ui-range-time__clock {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-self: center;
  border-radius: 10px;
  background: var(--surface-container-high);
  color: var(--primary);
}
.ui-range-time__clock svg { width: 18px; height: 18px; }
.ui-range-time__arrow {
  position: absolute;
  left: 0;
  right: 0;
  top: 21px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  color: color-mix(in oklab, var(--on-surface-variant) 55%, transparent);
}
.ui-range-time__arrow svg { width: 16px; height: 16px; }
</style>
