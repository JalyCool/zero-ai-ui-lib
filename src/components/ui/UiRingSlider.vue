<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import UiRollNumber from './UiRollNumber.vue'
import { arcStroke } from '../../core/arcStroke'

const props = defineProps({
  modelValue: { type: Number, default: 25 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  precision: { type: Number, default: null },
  size: { type: Number, default: 116 },
  /* 弧线宽度档位：'thin'(10) / 'bold'(12) / 具体数值 */
  stroke: { type: [String, Number], default: 'thin' },
  label: { type: String, default: '' },
  unit: { type: String, default: '%' },
  showValue: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'drag-start', 'drag-end'])

/* ============================================================
   环形滑块
   圆环从 12 点方向起、顺时针转满 360° 表示整个量程；
   按下任意处即开始拖拽：指针相对圆心的角度换算成值，
   跨过 0 点（底部附近）时取环向最短路径。
   几何与 UiRingProgress 同源（circle + rotate(-90)）。
   ============================================================ */

const ringEl = ref(null)
const dragging = ref(false)
const shown = ref(sanitize(props.modelValue))

/* 档位解析：数值或档名。 */
const strokeWidth = computed(() => arcStroke(props.stroke, 'thin'))
const radius = computed(() => props.size / 2 - strokeWidth.value / 2 - 1)
const center = computed(() => props.size / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const range = computed(() => props.max - props.min || 1)

const fraction = computed(() => (shown.value - props.min) / range.value)
const dashOffset = computed(() => circumference.value * (1 - Math.min(1, Math.max(0, fraction.value))))

const displayValue = computed(() => formatValue(quantize(shown.value)))

/* thumb 骑在环上：从顶部起顺时针转 fraction * 360°。 */
const thumbAngle = computed(() => fraction.value * 360 - 90)
const thumbPos = computed(() => ({
  x: center.value + radius.value * Math.cos((thumbAngle.value * Math.PI) / 180),
  y: center.value + radius.value * Math.sin((thumbAngle.value * Math.PI) / 180)
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

/* ---------- 指针 -> 角度 -> 值 ---------- */
function angleToFraction(angle) {
  /* angle: 从顶部起顺时针 0..360。 */
  const normalized = ((angle % 360) + 360) % 360
  return normalized / 360
}

/* 屏幕角度（atan2，0 = 右侧，顺时针为正，y 向下）转成「从顶部起顺时针 0..360」。 */
function angleFromTop(event) {
  const rect = ringEl.value?.getBoundingClientRect()
  if (!rect || !rect.width) return null
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  const screen = (Math.atan2(dy, dx) * 180) / Math.PI
  return (screen + 90 + 360) % 360
}

/* 拖拽用累积角（解绕）：满量程圆环的 0% 与 100% 在接缝同一个位置，
   按绝对角度取值会在接缝处从 100% 掉回 0%。改成每帧只累加指针的
   最短角位移（折到 ±180°），总角夹在 [0, 360]：越过上接缝停在 100%，
   反向拖回才下降 —— 与手在环上走的直觉一致。 */
let dragAccum = 0
let dragLastAngle = 0

function beginDrag(event) {
  const angle = angleFromTop(event)
  if (angle === null) return
  /* 按下即跳到指针位置，再以该点为累积原点。 */
  shown.value = sanitize(props.min + angleToFraction(angle) * range.value)
  dragAccum = ((shown.value - props.min) / range.value) * 360
  dragLastAngle = angle
  commit()
}

function moveDrag(event) {
  const angle = angleFromTop(event)
  if (angle === null) return
  let delta = angle - dragLastAngle
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  dragAccum = Math.min(360, Math.max(0, dragAccum + delta))
  dragLastAngle = angle
  shown.value = sanitize(props.min + (dragAccum / 360) * range.value)
  commit()
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return
  dragging.value = true
  try { event.currentTarget?.setPointerCapture?.(event.pointerId) } catch (error) { /* 忽略 */ }
  beginDrag(event)
  emit('drag-start')
  event.preventDefault()
}

function onPointerMove(event) {
  if (!dragging.value) return
  moveDrag(event)
  event.preventDefault()
}

function onPointerUp(event) {
  if (!dragging.value) return
  dragging.value = false
  try { event.currentTarget?.releasePointerCapture?.(event.pointerId) } catch (error) { /* 忽略 */ }
  shown.value = quantize(shown.value)
  commit()
  emit('drag-end')
  event.preventDefault()
}

/* 底部跨 0 点：往哪个方向转过去更短就取哪个方向。 */
function stepToward(current, target) {
  const span = range.value
  let delta = target - current
  /* 把 delta 折到 [-span/2, span/2]，走环上最短路径。 */
  if (delta > span / 2) delta -= span
  if (delta < -span / 2) delta += span
  return current + delta
}

function onKeyDown(event) {
  const current = shown.value
  let target = null
  const step = props.step > 0 ? props.step : range.value / 60
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp': target = current + step; break
    case 'ArrowLeft':
    case 'ArrowDown': target = current - step; break
    case 'Home': target = props.min; break
    case 'End': target = props.max; break
    default: return
  }
  event.preventDefault()
  target = Math.min(props.max, Math.max(props.min, target))
  shown.value = quantize(stepToward(current, target))
  commit()
}

watch(() => props.modelValue, value => {
  if (dragging.value) return
  shown.value = sanitize(value)
})

onBeforeUnmount(() => { /* 无常驻动画 */ })
</script>

<template>
  <div
    ref="ringEl"
    class="ui-ring-slider"
    :class="{ 'is-dragging': dragging }"
    :style="{ width: size + 'px', height: size + 'px' }"
    role="slider"
    :aria-label="label || '环形滑块'"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="displayValue"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <svg :viewBox="'0 0 ' + size + ' ' + size" aria-hidden="true">
      <!-- 环带命中区：只有这条透明粗描边接受指针（pointer-events: stroke），
           环内 / 环外不再捕获触控，页面滚动与点击照常穿透。 -->
      <circle
        class="ui-ring-slider__hit"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth + 26"
        vector-effect="non-scaling-stroke"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <circle
        class="ui-ring-slider__track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        vector-effect="non-scaling-stroke"
      />
      <circle
        class="ui-ring-slider__progress"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        vector-effect="non-scaling-stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :transform="'rotate(-90 ' + center + ' ' + center + ')'"
      />
    </svg>

    <span
      class="ui-ring-slider__thumb"
      :style="{ left: thumbPos.x + 'px', top: thumbPos.y + 'px' }"
      aria-hidden="true"
    ></span>

    <div v-if="showValue" class="ui-ring-slider__center">
      <strong>
        <UiRollNumber class="ui-ring-slider__num" :value="displayValue" :direction-key="shown" :step="step" :instant="dragging" /><small>{{ unit }}</small>
      </strong>
      <span v-if="label" class="ui-ring-slider__caption">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ui-ring-slider {
  position: relative;
  flex-shrink: 0;
  /* 环外区域不拦触摸：根不再 touch-action:none，只有命中环带禁用手势。 */
  touch-action: auto;
  cursor: pointer;
  outline: none;
  border-radius: 50%;
}
.ui-ring-slider:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent);
}
.ui-ring-slider.is-dragging { cursor: grabbing; }
.ui-ring-slider svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  /* svg 本身不命中，只有下面的 __hit 环带命中。 */
  pointer-events: none;
}
.ui-ring-slider__hit {
  stroke: transparent;
  pointer-events: stroke;
  /* 命中环带时禁用浏览器手势，拖拽完全跟手。 */
  touch-action: none;
  cursor: grab;
}
.ui-ring-slider.is-dragging .ui-ring-slider__hit { cursor: grabbing; }
.ui-ring-slider__track {
  stroke: var(--outline-variant);
}
.ui-ring-slider__progress {
  stroke: var(--primary);
  stroke-linecap: round;
  transition: stroke var(--t-fade);
}
.ui-ring-slider__thumb {
  position: absolute;
  z-index: 1;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: 3px solid var(--surface);
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: transform var(--t-feedback);
}
.ui-ring-slider.is-dragging .ui-ring-slider__thumb { transform: translate(-50%, -50%) scale(1.12); }

.ui-ring-slider__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}
.ui-ring-slider__center strong {
  display: block;
  font-size: 1.45rem;
  font-weight: var(--w-heading);
  line-height: 1;
  letter-spacing: -.02em;
  color: var(--on-surface);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ui-ring-slider__center small {
  margin-left: 1px;
  color: var(--on-surface-variant);
  font-size: .92rem;
  font-weight: var(--w-strong);
}
.ui-ring-slider__num { line-height: 1; }
.ui-ring-slider__caption {
  margin-top: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  letter-spacing: .02em;
}

@media (prefers-reduced-motion: reduce) {
  .ui-ring-slider__thumb { transition-duration: .01ms; }
}
</style>
