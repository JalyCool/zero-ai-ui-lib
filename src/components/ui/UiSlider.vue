<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  modelValue: { type: Number, default: 50 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  showValue: { type: Boolean, default: true },
  /* 吸附点：自定义数组，例如 [0, 25, 50, 75, 100] */
  stops: { type: Array, default: null },
  /* 或者等分：snapCount=4 -> min + i*(max-min)/4 */
  snapCount: { type: Number, default: 0 },
  /* 数据精度（小数位）；null 保持默认显示 */
  precision: { type: Number, default: null },
  /* 大刻度：区间数，大刻度位于 min + i*(max-min)/majorTicks */
  majorTicks: { type: Number, default: 0 },
  /* 小刻度：相邻大刻度之间的小刻度份数；majorTicks=0 时均分整个量程 */
  minorTicks: { type: Number, default: 0 },
  /* 是否显示刻度层（轨道上方的短刻度线与数值） */
  showScale: { type: Boolean, default: false },
  /* 弹簧参数统一进一个对象（syncfusion 的 slider 也是这么收的）：
     { stiffness, dampingRatio, flingTime, rubber, maxOverscroll }
     未提供的字段用默认值；下面的独立参数是旧写法，仍然可用但已废弃。 */
  spring: { type: Object, default: null },
  /** @deprecated 用 spring.stiffness */
  stiffness: { type: Number, default: 520 },
  /** @deprecated 用 spring.dampingRatio */
  dampingRatio: { type: Number, default: 1.05 },
  /** @deprecated 用 spring.flingTime */
  flingTime: { type: Number, default: 0.11 },
  /** @deprecated 用 spring.rubber */
  rubber: { type: Number, default: 0.32 },
  /** @deprecated 用 spring.maxOverscroll */
  maxOverscroll: { type: Number, default: 0.06 },
  /* 拖拽气泡：拖动时把手上方浮一个当前值（松手淡出） */
  showBubble: { type: Boolean, default: false }
})

/* 弹簧参数合并：默认 <- 旧独立 props <- spring 对象。 */
const springCfg = computed(() => ({
  stiffness: props.spring?.stiffness ?? props.stiffness,
  dampingRatio: props.spring?.dampingRatio ?? props.dampingRatio,
  flingTime: props.spring?.flingTime ?? props.flingTime,
  rubber: props.spring?.rubber ?? props.rubber,
  maxOverscroll: props.spring?.maxOverscroll ?? props.maxOverscroll
}))

const emit = defineEmits(['update:modelValue', 'snap', 'drag-start', 'drag-end'])

/* ============================================================
   滑块（自绘 · Pointer Events）
   · 拖拽完全跟手：位移直接写进显示值，无 transition、无延迟；
   · 记录最近若干帧的 (时间, 值) 样本，松手时用速度做惯性预测，
     目标 = 预测值最近的吸附点（不是简单对当前位置取整）；
   · 归位用可配置的临界阻尼弹簧（stiffness / dampingRatio），
     ratio=1 不回弹过头，默认约 300–450ms 停稳；
   · 越出边界时橡皮筋阻尼（rubber 系数衰减 + 最多越界 maxOverscroll × 量程）；
   · 松手惯性有触发阈值：甩出速度 ≥ 0.8 × 量程 / 秒才做惯性预测，慢松手原地落定；
     阻尼默认 1.05（略过阻尼），甩出去也不会跑太远；
   · 鼠标 / 触摸 / 触控笔统一走 Pointer Events，
     touch-action: none 阻止拖拽时页面滚动；
   · 吸附完成时 emit('snap', { index, value })。
   ============================================================ */

const trackEl = ref(null)
const dragging = ref(false)
/* 松手瞬间的「duang」：先缩到 70% 再弹回（只在活泼气质下播）。 */
const released = ref(false)
let releaseTimer = 0
function flashRelease() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  released.value = true
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => { released.value = false }, 460)
}

/* 显示值：拖拽时 = 指针原始值；松手后 = 弹簧动画值 */
const shown = ref(clampRaw(props.modelValue))
let target = shown.value
let velocity = 0
let frame = 0

const snapPoints = computed(() => {
  if (Array.isArray(props.stops) && props.stops.length) {
    return [...props.stops].filter(v => Number.isFinite(v)).sort((a, b) => a - b)
  }
  if (props.snapCount > 1) {
    const out = []
    for (let i = 0; i < props.snapCount; i += 1) {
      out.push(props.min + (range.value * i) / (props.snapCount - 1))
    }
    return out
  }
  return null
})

const hasStops = computed(() => Array.isArray(snapPoints.value) && snapPoints.value.length > 0)
const range = computed(() => props.max - props.min || 1)

function clampRaw(value) {
  if (!Number.isFinite(value)) return props.min
  return Math.min(props.max, Math.max(props.min, value))
}

function quantize(value) {
  if (props.step > 0) {
    const snapped = Math.round((value - props.min) / props.step) * props.step + props.min
    return Math.min(props.max, Math.max(props.min, snapped))
  }
  return Math.min(props.max, Math.max(props.min, value))
}

const percent = computed(() => ((shown.value - props.min) / range.value) * 100)
const displayValue = computed(() => formatValue(quantize(shown.value)))

/* ---------- 刻度（轨道上方） ---------- */
/* 数值显示规则：
   · 未设置任何刻度 -> 只在最小值与最大值两个位置显示当前值；
   · 设置了小刻度或大刻度 -> 只在大刻度位置显示对应步进位置的值。 */
const majorPositions = computed(() => {
  if (props.majorTicks <= 0) return []
  const out = []
  for (let i = 0; i <= props.majorTicks; i += 1) {
    const fraction = i / props.majorTicks
    out.push({
      fraction,
      percent: fraction * 100,
      value: quantize(props.min + range.value * fraction)
    })
  }
  return out
})

const minorPositions = computed(() => {
  if (props.minorTicks <= 0) return []
  const out = []
  const segments = props.majorTicks > 0 ? props.majorTicks : 1
  for (let s = 0; s < segments; s += 1) {
    for (let k = 1; k < props.minorTicks; k += 1) {
      const fraction = (s + k / props.minorTicks) / segments
      out.push({ fraction, percent: fraction * 100 })
    }
  }
  return out
})

const hasTicks = computed(() => props.majorTicks > 0 || props.minorTicks > 0)

/* 刻度数值：无大刻度时退化为两端（最小值 / 最大值）。 */
const scaleLabels = computed(() => {
  if (!props.showScale) return []
  if (props.majorTicks > 0) {
    return majorPositions.value.map(item => ({ percent: item.percent, text: formatValue(item.value) }))
  }
  return [
    { percent: 0, text: formatValue(quantize(props.min)), edge: 'start' },
    { percent: 100, text: formatValue(quantize(props.max)), edge: 'end' }
  ]
})

function formatValue(value) {
  if (props.precision === null || props.precision === undefined) return String(value)
  return Number(value).toFixed(props.precision)
}

watch(() => props.modelValue, value => {
  if (dragging.value) return
  startSpring(clampRaw(value))
})

/* ---------- 指针 → 值 ---------- */
function posToValue(clientX) {
  const rect = trackEl.value?.getBoundingClientRect()
  if (!rect || !rect.width) return shown.value
  const ratio = (clientX - rect.left) / rect.width
  return props.min + ratio * range.value
}



/* 橡皮筋：越界部分按 rubber 系数衰减，最多越界 maxOverscroll × 量程 */
function rubberValue(raw) {
  const over = raw > props.max ? raw - props.max : raw < props.min ? raw - props.min : 0
  if (!over) return raw
  const limit = range.value * springCfg.value.maxOverscroll
  const eased = Math.sign(over) * Math.min(Math.abs(over) * springCfg.value.rubber, limit)
  return (over > 0 ? props.max : props.min) + eased
}

/* ---------- 速度采样 ---------- */
let samples = []
function pushSample(value) {
  const now = performance.now()
  samples.push({ t: now, v: value })
  while (samples.length > 2 && now - samples[0].t > 90) samples.shift()
}

function currentVelocity() {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = (last.t - first.t) / 1000
  if (dt <= 0) return 0
  return (last.v - first.v) / dt
}

/* ---------- 拖拽 ---------- */
let pointerId = null

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return
  const el = trackEl.value
  if (!el) return

  stopSpring()
  dragging.value = true
  pointerId = event.pointerId
  try { el.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }

  samples = []
  /* 把手永远钳在轨道内：按到轨道外也直接落在 min / max 上 */
  const raw = clampRaw(posToValue(event.clientX))
  shown.value = raw
  pushSample(raw)
  target = raw
  emit('update:modelValue', quantize(raw))
  emit('drag-start')
  event.preventDefault()
}

function onPointerMove(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  /* 拖拽橡皮筋：越界有阻尼衰减，且最多越出 maxOverscroll × 量程 */
  const raw = rubberValue(posToValue(event.clientX))
  shown.value = raw
  target = raw
  pushSample(raw)
  emit('update:modelValue', quantize(raw))
  event.preventDefault()
}

function onPointerUp(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  dragging.value = false
  pointerId = null
  try { trackEl.value?.releasePointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }

  velocity = currentVelocity()
  /* 惯性触发阈值：甩出速度要足够大（≥ 0.8 × 量程 / 秒）才做惯性预测，
     慢慢松手就原地落定，不会被轻轻一带就甩出去 */
  const flingMin = range.value * 0.8
  const predicted = Math.abs(velocity) >= flingMin
    ? shown.value + velocity * springCfg.value.flingTime
    : shown.value

  let next
  if (hasStops.value) {
    next = nearestStop(predicted)
  } else {
    next = clampRaw(predicted)
  }

  emit('update:modelValue', quantize(next))
  emit('drag-end')
  flashRelease()
  startSpring(next)
}

function nearestStop(value) {
  const stops = snapPoints.value
  let bestIndex = 0
  let bestDistance = Math.abs(value - stops[0])
  for (let i = 1; i < stops.length; i += 1) {
    const distance = Math.abs(value - stops[i])
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }
  return stops[bestIndex]
}

function stopIndexOf(value) {
  if (!hasStops.value) return -1
  return snapPoints.value.findIndex(stop => Math.abs(stop - value) < 1e-6)
}

function emitSnap(value) {
  const index = stopIndexOf(value)
  if (index >= 0) emit('snap', { index, value })
  else if (!hasStops.value) emit('snap', { index: -1, value: quantize(value) })
}

/* ---------- 临界阻尼弹簧 ---------- */
function startSpring(to) {
  target = to
  if (Math.abs(target - shown.value) < 1e-4) {
    shown.value = target
    emitSnap(target)
    return
  }
  if (!frame) frame = requestAnimationFrame(springStep)
}

let lastTime = 0
function springStep(now) {
  frame = 0
  if (!lastTime) lastTime = now
  let dt = (now - lastTime) / 1000
  lastTime = now
  dt = Math.min(dt, 1 / 30)

  const omega = Math.sqrt(Math.max(1, springCfg.value.stiffness))
  const damping = 2 * springCfg.value.dampingRatio * omega

  // 半隐式欧拉：a = -ω²(x-target)·… 用标准弹簧方程
  const displacement = shown.value - target
  const accel = -omega * omega * displacement - damping * velocity
  velocity += accel * dt
  shown.value += velocity * dt

  /* 停稳判定用「量程比例」阈值：小量程滑轨（0.2~1 这类）也要完整走完
     弹簧过渡 —— 绝不用绝对单位在半路瞬间跳到目标（那就是「闪过去」）。 */
  const epsPos = Math.max(1e-4, range.value * 0.002)
  const epsVel = Math.max(1e-4, range.value * 0.01)
  if (Math.abs(displacement) < epsPos && Math.abs(velocity) < epsVel) {
    shown.value = target
    velocity = 0
    lastTime = 0
    emitSnap(target)
    return
  }
  frame = requestAnimationFrame(springStep)
}

function stopSpring() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  lastTime = 0
  velocity = 0
}

/* ---------- 键盘 ---------- */
function onKeyDown(event) {
  const big = Math.max(props.step, range.value * 0.1)
  let next = null
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp': next = shown.value + props.step; break
    case 'ArrowLeft':
    case 'ArrowDown': next = shown.value - props.step; break
    case 'PageUp': next = shown.value + big; break
    case 'PageDown': next = shown.value - big; break
    case 'Home': next = props.min; break
    case 'End': next = props.max; break
    default: return
  }
  event.preventDefault()
  stopSpring()
  const stops = hasStops.value ? [nearestStop(next)] : [clampRaw(next)]
  shown.value = clampRaw(next)
  emit('update:modelValue', quantize(stops[0]))
  startSpring(stops[0])
}

onBeforeUnmount(() => {
  stopSpring()
})
</script>

<template>
  <div class="ui-slider" :class="{ 'is-dragging': dragging, 'is-stepped': hasStops }">
    <div class="ui-slider__head">
      <span v-if="label" class="ui-slider__label">{{ label }}</span>
      <span v-if="showValue" class="ui-slider__value">
        <UiRollNumber class="ui-slider__num" :value="displayValue" :direction-key="quantize(shown)" :step="step" :instant="dragging" /><template v-if="unit">{{ unit }}</template>
      </span>
    </div>

    <!-- 刻度数值行：只放文字，刻度线本身贴进轨道容器里。 -->
    <div v-if="showScale" class="ui-slider__scale" aria-hidden="true">
      <span
        v-for="(item, index) in scaleLabels"
        :key="`label-${index}`"
        class="ui-slider__scale-value"
        :class="{ 'is-start': item.edge === 'start', 'is-end': item.edge === 'end' }"
        :style="{ left: `${item.percent}%` }"
      >{{ item.text }}</span>
    </div>

    <div
      ref="trackEl"
      class="ui-slider__track"
      :style="{ '--pct': `${percent}%` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- 刻度线紧贴轨道并向下探入 3px，靠近拖拽头的部分允许被把手盖住。 -->
      <span
        v-for="(item, index) in majorPositions"
        :key="`major-${index}`"
        class="ui-slider__tick ui-slider__tick--major"
        :style="{ left: `${item.percent}%` }"
      ></span>
      <span
        v-for="(item, index) in minorPositions"
        :key="`minor-${index}`"
        class="ui-slider__tick ui-slider__tick--minor"
        :style="{ left: `${item.percent}%` }"
      ></span>
      <span class="ui-slider__fill" aria-hidden="true"></span>
      <button
        type="button"
        class="ui-slider__thumb"
        :class="{ 'is-released': released }"
        role="slider"
        :aria-label="label || '滑块'"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="displayValue"
        :aria-valuetext="`${displayValue}${unit}`"
        @keydown="onKeyDown"
      >
        <span class="ui-slider__thumb-body" aria-hidden="true"></span>
        <span v-if="showBubble" class="ui-slider__bubble" aria-hidden="true"><UiRollNumber :value="displayValue" :direction-key="quantize(shown)" :step="step" :instant="true" />{{ unit }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ui-slider__bubble {
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%) scale(.86);
  padding: 2px 7px;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-fade), transform var(--t-feedback);
}
.ui-slider__bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--primary);
}
.ui-slider.is-dragging .ui-slider__bubble { opacity: 1; transform: translateX(-50%) scale(1); }
.ui-slider__track {
  touch-action: none;
  cursor: pointer;
}
.ui-slider__thumb {
  position: absolute;
  touch-action: none;
  left: var(--pct, 50%);
  top: 50%;
  z-index: 2;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  /* 位移只在这一层；圆的缩放在内层，气泡才不会跟着被拉扁。 */
  transform: translate(-50%, -50%);
  cursor: grab;
  display: grid;
  place-items: center;
}
.ui-slider__thumb-body {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 3px solid var(--surface);
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
  transform: scale(1);
  transition: transform var(--t-pop), background var(--t-fade), box-shadow var(--t-fade);
}
.ui-slider__thumb:hover .ui-slider__thumb-body { background: color-mix(in oklab, var(--primary) 88%, var(--on-primary)); }
.ui-slider__thumb:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent);
}
.ui-slider.is-dragging .ui-slider__thumb { cursor: grabbing; }
.ui-slider.is-dragging .ui-slider__thumb-body { transform: scale(1.16); }
[data-motion="lively"] .ui-slider.is-dragging .ui-slider__thumb-body { transform: scale(1.28); }
/* 松手：先缩到 70%，再弹过 1.16，最后落回 1 —— 就是「duang」一下。 */
[data-motion="lively"] .ui-slider__thumb.is-released .ui-slider__thumb-body {
  animation: uiThumbDuang calc(var(--spring-pop-dur) * 1.35) cubic-bezier(.3, .8, .3, 1) both;
}
@keyframes uiThumbDuang {
  0% { transform: scale(.7); }
  22% { transform: scale(.7); }
  58% { transform: scale(1.18); }
  100% { transform: scale(1); }
}

/* ---------- 刻度：数值行在上；刻度线长在轨道里、向上探出并紧贴轨道 ---------- */
.ui-slider__scale {
  position: relative;
  height: 14px;
  margin-bottom: 7px;
  pointer-events: none;
}
.ui-slider__scale-value {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: 1.2;
}
/* 两端不允许溢出：首尾分别对齐左 / 右。 */
.ui-slider__scale-value.is-start { transform: none; }
.ui-slider__scale-value.is-end { transform: translateX(-100%); }
/* 刻度线底端探入轨道 3px：紧贴进度条，被拖拽头盖住也没关系。 */
.ui-slider__tick {
  position: absolute;
  bottom: calc(100% - 3px);
  width: 1px;
  background: var(--outline-variant);
  pointer-events: none;
}
/* 小刻度短，大刻度长。 */
.ui-slider__tick--minor { height: 6px; opacity: .75; }
.ui-slider__tick--major { height: 10px; }
</style>
