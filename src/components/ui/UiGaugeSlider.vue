<script setup>
import { computed, ref, watch } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  modelValue: { type: Number, default: 72 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  precision: { type: Number, default: null },
  label: { type: String, default: '' },
  unit: { type: String, default: '%' },
  showValue: { type: Boolean, default: true },
  showScale: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'drag-start', 'drag-end'])

/* ============================================================
   仪表盘型滑块
   几何与 UiGauge 完全同源：220° 圆弧（起点 160° 顺时针扫到
   380°，底部留 140° 开口）、圆心 (100,100)、半径 78。
   数字显示复用仪表盘的逻辑：数字放大居中在圆心稍偏上，
   单位紧跟其后，说明文字挂在数字下方 —— 数字变化走
   统一的 UiRollNumber 滚动。
   拖拽：指针相对圆心的角度换算弧上位置，按下即跟手。
   ============================================================ */

/* 220° 圆弧：起点 160°，顺时针扫到 380°，半径 78，圆心 (100,100)。 */
const ARC_PATH = 'M 26.7 126.68 A 78 78 0 1 1 173.3 126.68'
const START_ANGLE = 160
const SWEEP = 220

const dialEl = ref(null)
const dragging = ref(false)
const shown = ref(sanitize(props.modelValue))

const range = computed(() => props.max - props.min || 1)
const fraction = computed(() => (shown.value - props.min) / range.value)
/* UiGauge 同款：pathLength=100 + strokeDasharray 100 + dashoffset。 */
const dashOffset = computed(() => 100 - Math.min(1, Math.max(0, fraction.value)) * 100)

const displayValue = computed(() => formatValue(quantize(shown.value)))
const displayMin = computed(() => formatValue(quantize(props.min)))
const displayMax = computed(() => formatValue(quantize(props.max)))

/* thumb 骑在弧上：θ = 160° + f * 220°（屏幕坐标系，y 向下）。 */
const thumbAngle = computed(() => (START_ANGLE + fraction.value * SWEEP) * Math.PI / 180)
const thumbPos = computed(() => ({
  x: 100 + 78 * Math.cos(thumbAngle.value),
  y: 100 + 78 * Math.sin(thumbAngle.value)
}))

function sanitize(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return props.min
  return Math.min(props.max, Math.max(props.min, number))
}

function formatValue(value) {
  if (props.precision === null || props.precision === undefined) return String(value)
  return Number(value).toFixed(props.precision)
}

function quantize(value) {
  let next = value
  if (props.step > 0) {
    next = Math.round((value - props.min) / props.step) * props.step + props.min
  }
  next = Math.min(props.max, Math.max(props.min, next))
  if (props.precision !== null && props.precision !== undefined) {
    next = Number(next.toFixed(props.precision))
  }
  return next
}

function commit() {
  emit('update:modelValue', quantize(shown.value))
}

/* ---------- 指针 -> 角度 -> 弧上位置 ---------- */
/* 圆心附近的数字区：角度在这里没有意义（微小位移 -> 角度剧变），
   指针进入该区域时冻结当前值，离开后继续。 */
const CENTER_DEAD = 26

/* 屏幕角折算进 [160, 540) 的连续数轴；弧占 [160, 380]，开口占 (380, 540)。 */
function pointerTheta(event) {
  const rect = dialEl.value?.getBoundingClientRect()
  if (!rect || !rect.width) return null
  const vx = (event.clientX - rect.left) * (200 / rect.width) - 100
  const vy = (event.clientY - rect.top) * (140 / rect.height) - 100
  if (Math.hypot(vx, vy) < CENTER_DEAD) return null
  let phi = (Math.atan2(vy, vx) * 180) / Math.PI
  if (phi < START_ANGLE) phi += 360
  return phi
}

/* 绝对角度 -> 弧上比例：开口区按离哪端更近就近夹（450° = 正下方是分界）。
   只用于按下时的跳位。 */
function thetaToFrac(theta) {
  if (theta > 380) theta = theta <= 450 ? 380 : 160
  return Math.min(1, Math.max(0, (theta - START_ANGLE) / SWEEP))
}

/* 拖拽用累积角：每帧只累加指针的最短角位移并夹在弧范围内。
   这样从弧上往圆心方向或横穿底盘拖拽都不会把值甩到 100% ——
   只有真正沿弧走的角位移才改变数值。 */
let dragTheta = START_ANGLE
let dragLast = START_ANGLE

function beginGaugeDrag(event) {
  const theta = pointerTheta(event)
  dragTheta = START_ANGLE + fraction.value * SWEEP
  if (theta === null) {
    dragLast = dragTheta
    return
  }
  shown.value = props.min + thetaToFrac(theta) * range.value
  dragTheta = START_ANGLE + ((shown.value - props.min) / range.value) * SWEEP
  dragLast = theta
  commit()
}

function moveGaugeDrag(event) {
  const theta = pointerTheta(event)
  if (theta === null) return
  let delta = theta - dragLast
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  dragLast = theta
  dragTheta = Math.min(380, Math.max(160, dragTheta + delta))
  shown.value = props.min + ((dragTheta - START_ANGLE) / SWEEP) * range.value
  commit()
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return
  dragging.value = true
  try { dialEl.value?.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
  beginGaugeDrag(event)
  emit('drag-start')
  event.preventDefault()
}

function onPointerMove(event) {
  if (!dragging.value) return
  moveGaugeDrag(event)
  event.preventDefault()
}

function onPointerUp(event) {
  if (!dragging.value) return
  dragging.value = false
  try { dialEl.value?.releasePointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
  shown.value = quantize(shown.value)
  commit()
  emit('drag-end')
  event.preventDefault()
}

function onKeyDown(event) {
  const step = props.step > 0 ? props.step : range.value / 60
  let next = null
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp': next = shown.value + step; break
    case 'ArrowLeft':
    case 'ArrowDown': next = shown.value - step; break
    case 'Home': next = props.min; break
    case 'End': next = props.max; break
    default: return
  }
  event.preventDefault()
  shown.value = quantize(next)
  commit()
}

watch(() => props.modelValue, value => {
  if (dragging.value) return
  shown.value = sanitize(value)
})
</script>

<template>
  <div class="ui-gauge-slider">
    <div
      ref="dialEl"
      class="ui-gauge-slider__dial"
      role="slider"
      :aria-label="label || '仪表盘滑块'"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="displayValue"
      tabindex="0"
      :class="{ 'is-dragging': dragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeyDown"
    >
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <path class="ui-gauge-slider__track" :d="ARC_PATH" pathLength="100" fill="none" />
        <path
          class="ui-gauge-slider__progress"
          :d="ARC_PATH"
          pathLength="100"
          fill="none"
          :style="{ strokeDashoffset: dashOffset }"
        />
      </svg>

      <span
        class="ui-gauge-slider__thumb"
        :style="{ left: thumbPos.x / 200 * 100 + '%', top: thumbPos.y / 140 * 100 + '%' }"
        aria-hidden="true"
      ></span>

      <div v-if="showValue" class="ui-gauge-slider__center">
        <strong>
          <UiRollNumber class="ui-gauge-slider__num" :value="displayValue" :direction-key="shown" :step="step" :instant="dragging" /><small>{{ unit }}</small>
        </strong>
        <span v-if="label" class="ui-gauge-slider__caption">{{ label }}</span>
      </div>
    </div>

    <div v-if="showScale" class="ui-gauge-slider__scale" aria-hidden="true">
      <span>{{ displayMin }}</span>
      <span>{{ displayMax }}</span>
    </div>
  </div>
</template>

<style scoped>
.ui-gauge-slider {
  width: 100%;
  max-width: 258px;
  margin-inline: auto;
}
.ui-gauge-slider__dial {
  position: relative;
  touch-action: none;
  cursor: pointer;
  outline: none;
  border-radius: 12px;
}
.ui-gauge-slider__dial:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent);
}
.ui-gauge-slider__dial.is-dragging { cursor: grabbing; }
.ui-gauge-slider__dial svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  pointer-events: none;
}
.ui-gauge-slider__track {
  stroke: var(--surface-container-high);
  stroke-width: 12;
  stroke-linecap: round;
}
.ui-gauge-slider__progress {
  stroke: var(--primary);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 100;
  transition: stroke var(--t-fade);
}
.ui-gauge-slider__thumb {
  position: absolute;
  z-index: 1;
  width: 18px;
  height: 18px;
  border: 3px solid var(--surface);
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: transform var(--t-feedback);
}
.ui-gauge-slider__dial.is-dragging .ui-gauge-slider__thumb { transform: translate(-50%, -50%) scale(1.12); }

/* 数字显示逻辑与 UiGauge 相同：数字在圆心稍偏上（top 65.5%）。 */
.ui-gauge-slider__center {
  position: absolute;
  left: 50%;
  top: 65.5%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.ui-gauge-slider__center strong {
  display: block;
  color: var(--on-surface);
  font-size: 2.2rem;
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  letter-spacing: -.012em;
  line-height: 1;
  white-space: nowrap;
}
.ui-gauge-slider__center small {
  margin-left: 2px;
  color: var(--on-surface-variant);
  font-size: 1.02rem;
  font-weight: var(--w-strong);
  letter-spacing: 0;
}
.ui-gauge-slider__num { line-height: 1; }
.ui-gauge-slider__caption {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  letter-spacing: .02em;
}
.ui-gauge-slider__scale {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding: 0 2px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .ui-gauge-slider__thumb { transition-duration: .01ms; }
}
</style>
