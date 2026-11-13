<script setup>
import { computed, ref, watch } from 'vue'
import UiTimePicker from './UiTimePicker.vue'
import UiRollNumber from './UiRollNumber.vue'
import { formatDurationBetween, parseClockTime } from '../../core/duration'

const props = defineProps({
  /* { start: 'HH:mm', end: 'HH:mm' } */
  modelValue: {
    type: Object,
    default: () => ({ start: '09:00', end: '18:00' })
  },
  /* 最小显示单位：'h' | 'm' | 's'，决定时长文本显示精度 */
  precision: {
    type: String,
    default: 's',
    validator: value => ['h', 'm', 's'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   范围时间选择器
   由两个真实的时间选择器横向拼接而成（不复制时间选择器
   内部代码），中间一个颜色较浅的箭头，时长文本就显示在
   箭头的正上方；文本规则见 core/duration.js（60 分钟 ->
   1h，63 分 3 秒 -> 1h03m03s），数字变化走统一滚动动效。
   ============================================================ */

const startValue = ref(sanitize(props.modelValue?.start, '09:00'))
const endValue = ref(sanitize(props.modelValue?.end, '18:00'))

const durationSeconds = computed(() => {
  const a = parseClockTime(startValue.value)
  const b = parseClockTime(endValue.value)
  if (a === null || b === null) return 0
  return Math.max(0, b - a)
})

const durationText = computed(() => formatDurationBetween(startValue.value, endValue.value, { precision: props.precision }))

function sanitize(value, fallback) {
  return typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback
}

function commit() {
  emit('update:modelValue', { start: startValue.value, end: endValue.value })
}

function onStart(value) {
  startValue.value = sanitize(value, startValue.value)
  commit()
}

function onEnd(value) {
  endValue.value = sanitize(value, endValue.value)
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
      <UiTimePicker
        class="ui-range-time__picker"
        :model-value="startValue"
        label=""
        @update:model-value="onStart"
      />

      <!-- 中间列：时长文本在箭头正上方；箭头与两个输入框垂直居中对齐。 -->
      <div class="ui-range-time__mid" :aria-label="'时长 ' + durationText" role="status">
        <span class="ui-range-time__duration">
          <UiRollNumber
            class="ui-range-time__duration-value"
            :value="durationText"
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

      <UiTimePicker
        class="ui-range-time__picker"
        :model-value="endValue"
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
/* 中间列与输入框同高：时长占顶部一行，箭头在余下空间垂直居中，
   恰好落在两个输入框的中线位置。 */
.ui-range-time__mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  min-width: 18px;
}
.ui-range-time__duration {
  height: 15px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.ui-range-time__duration-value {
  color: var(--on-surface-variant);
  font-family: ui-monospace, monospace;
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  font-variant-numeric: tabular-nums;
  letter-spacing: .02em;
  line-height: 1.1;
}
/* 较浅的箭头：比正文浅一档的描边色。 */
.ui-range-time__arrow {
  display: grid;
  place-items: center;
  width: 16px;
  margin: auto 0;
  color: color-mix(in oklab, var(--on-surface-variant) 55%, transparent);
}
.ui-range-time__arrow svg { width: 16px; height: 16px; }
</style>
