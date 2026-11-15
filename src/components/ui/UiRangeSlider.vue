<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  /* [lo, hi] 双值 */
  modelValue: { type: Array, default: () => [25, 75] },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  /* 数据精度（小数位）；null 保持默认显示 */
  precision: { type: Number, default: null },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  showValue: { type: Boolean, default: true },
  /* 弹簧参数统一收进 spring 对象；下面 5 个独立参数已废弃、仅作兼容。 */
  spring: { type: Object, default: null },
  /** @deprecated 用 spring.stiffness */
  stiffness: { type: Number, default: 520 },
  /** @deprecated 用 spring.dampingRatio */
  dampingRatio: { type: Number, default: 1 },
  /** @deprecated 用 spring.flingTime */
  flingTime: { type: Number, default: 0.11 },
  /** @deprecated 用 spring.rubber */
  rubber: { type: Number, default: 0.32 },
  /** @deprecated 用 spring.maxOverscroll */
  maxOverscroll: { type: Number, default: 0.06 }
})

/* 弹簧参数合并：默认 <- 旧独立 props <- spring 对象。 */
const springCfg = computed(() => ({
  stiffness: props.spring?.stiffness ?? props.stiffness,
  dampingRatio: props.spring?.dampingRatio ?? props.dampingRatio,
  flingTime: props.spring?.flingTime ?? props.flingTime,
  rubber: props.spring?.rubber ?? props.rubber,
  maxOverscroll: props.spring?.maxOverscroll ?? props.maxOverscroll
}))

const emit = defineEmits(['update:modelValue', 'drag-start', 'drag-end'])

/* ============================================================
   范围滑块（双拖拽头）
   · 点击轨道任意位置：比较点击位置与两个拖拽头的距离，
     把距离更近的那个头移动到点击位置；
     距离相等时不保持不动，默认移动左侧（lo）拖拽头。
   · 拖拽完全跟手；松手按 速度投射 + 临界阻尼弹簧 归位。
   · 拖拽头移动后始终遵守 min / max / step / precision，
     且 lo 不得越过 hi（交叉时互相夹住）；
     两个把手至少间隔一个最小的格子数（step），避免重合。
   · 读数走统一的 UiRollNumber；拖拽中（连续变化）直接换值。
   ============================================================ */

const trackEl = ref(null)
const dragging = ref(false)
const activeHead = ref('lo')
/* 松手「duang」用：记住刚松手的是哪个头，只让它缩一下再弹回。 */
const releasedHead = ref('')
let releaseTimer = 0
function flashRelease(head) {
  if (typeof window === 'undefined' || !window.matchMedia) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  releasedHead.value = head
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => { releasedHead.value = '' }, 460)
}

const initial = sanitizePair(
  sanitize(props.modelValue[0], props.min),
  sanitize(props.modelValue[1], props.max)
)
const lo = ref(initial[0])
const hi = ref(initial[1])

const springs = {
  lo: { frame: 0, velocity: 0, lastTime: 0, target: 0 },
  hi: { frame: 0, velocity: 0, lastTime: 0, target: 0 }
}
let samples = []
let pointerId = null

const range = computed(() => props.max - props.min || 1)
/* 把手最小间隔：一个最小的格子数（步进值）。 */
const minGap = computed(() => (props.step > 0 ? props.step : 0))
const percentLo = computed(() => ((lo.value - props.min) / range.value) * 100)
const percentHi = computed(() => ((hi.value - props.min) / range.value) * 100)

const displayLo = computed(() => formatValue(quantize(lo.value)))
const displayHi = computed(() => formatValue(quantize(hi.value)))

function sanitize(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(props.max, Math.max(props.min, number))
}

/* 成对整理：先排序，再保证至少间隔一个步进（量程放不下时尽力而为）。
   注意：初始化阶段 minGap computed 尚未创建，这里直接读 props.step。 */
function sanitizePair(a, b) {
  let nextLo = Math.min(a, b)
  let nextHi = Math.max(a, b)
  const gap = props.step > 0 ? props.step : 0
  if (gap > 0 && nextHi - nextLo < gap) {
    nextHi = Math.min(props.max, nextLo + gap)
    if (nextHi - nextLo < gap) nextLo = Math.max(props.min, nextHi - gap)
  }
  return [nextLo, nextHi]
}

function formatValue(value) {
  if (props.precision === null || props.precision === undefined) return String(value)
  return Number(value).toFixed(props.precision)
}

/* 量化：先按 step 吸附，再按 precision 取整，最后夹回 [min, max]。 */
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

function posToValue(clientX) {
  const rect = trackEl.value?.getBoundingClientRect()
  if (!rect || !rect.width) return lo.value
  const ratio = (clientX - rect.left) / rect.width
  return props.min + ratio * range.value
}

/* 越界橡皮筋：越出边界的部分按系数衰减并限制最大越界量。 */
function rubberValue(raw) {
  const over = raw > props.max ? raw - props.max : raw < props.min ? raw - props.min : 0
  if (!over) return raw
  const limit = range.value * springCfg.value.maxOverscroll
  const eased = Math.sign(over) * Math.min(Math.abs(over) * springCfg.value.rubber, limit)
  return (over > 0 ? props.max : props.min) + eased
}

/* ---------- 速度采样（松手惯性预测） ---------- */
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

/* ---------- 指针 ---------- */
function headValue(head) {
  return head === 'lo' ? lo.value : hi.value
}

function setHeadRaw(head, raw) {
  /* 交叉夹住 + 最小间隔：lo 不越过 hi、hi 不越过 lo，
     且两头始终至少相隔一个步进，把手不会重合。 */
  const gap = minGap.value
  if (head === 'lo') lo.value = Math.min(raw, hi.value - gap)
  else hi.value = Math.max(raw, lo.value + gap)
}

function commit() {
  let a = quantize(lo.value)
  let b = quantize(hi.value)
  if (b < a) [a, b] = [b, a]
  const gap = minGap.value
  if (gap > 0 && b - a < gap) {
    /* 量化后若间隔不足，只挪动正在被拖动的那个头，另一头保持不动。 */
    if (activeHead.value === 'lo') a = Math.max(props.min, b - gap)
    else b = Math.min(props.max, a + gap)
  }
  emit('update:modelValue', [a, b])
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return
  const el = trackEl.value
  if (!el) return

  const raw = posToValue(event.clientX)
  /* 就近规则：与 lo、hi 的值域距离比较；相等时移动左侧（lo）头。 */
  const distanceLo = Math.abs(raw - lo.value)
  const distanceHi = Math.abs(raw - hi.value)
  const head = distanceLo <= distanceHi ? 'lo' : 'hi'

  stopSpring(head)
  dragging.value = true
  activeHead.value = head
  pointerId = event.pointerId
  try { el.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }

  samples = []
  setHeadRaw(head, raw)
  pushSample(headValue(head))
  commit()
  emit('drag-start', { head })
  event.preventDefault()
}

function onPointerMove(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  const raw = rubberValue(posToValue(event.clientX))
  setHeadRaw(activeHead.value, raw)
  pushSample(headValue(activeHead.value))
  commit()
  event.preventDefault()
}

function onPointerUp(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  dragging.value = false
  pointerId = null
  try { trackEl.value?.releasePointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }

  const head = activeHead.value
  const velocity = currentVelocity()
  const predicted = headValue(head) + velocity * springCfg.value.flingTime
  const target = quantize(predicted)
  /* 与普通滑轨一致：**不要**先把值直接写成吸附点（那等于瞬移），
     而是让弹簧从松手位置跑到吸附点；v-model 先按目标值同步。 */
  emit('drag-end', { head })
  commitTarget(head, target)
  flashRelease(head)
  startSpring(head, target)
}

/* 松手瞬间把 v-model 同步到吸附目标（视觉仍由弹簧追赶）。 */
function commitTarget(head, target) {
  const gap = minGap.value
  if (head === 'lo') {
    const nextLo = quantize(Math.min(target, hi.value - gap))
    emit('update:modelValue', [nextLo, quantize(hi.value)])
  } else {
    const nextHi = quantize(Math.max(target, lo.value + gap))
    emit('update:modelValue', [quantize(lo.value), nextHi])
  }
}

/* ---------- 临界阻尼弹簧（每个拖拽头独立归位） ---------- */
function stopSpring(head) {
  const spring = springs[head]
  if (spring.frame) cancelAnimationFrame(spring.frame)
  spring.frame = 0
  spring.lastTime = 0
  spring.velocity = 0
}

function startSpring(head, to) {
  const spring = springs[head]
  spring.target = to
  if (reduceMotion() || Math.abs(to - headValue(head)) < 1e-4) {
    setHeadRaw(head, to)
    spring.velocity = 0
    return
  }
  if (!spring.frame) spring.frame = requestAnimationFrame(now => stepSpring(head, now))
}

function stepSpring(head, now) {
  const spring = springs[head]
  spring.frame = 0
  if (!spring.lastTime) spring.lastTime = now
  let dt = (now - spring.lastTime) / 1000
  spring.lastTime = now
  dt = Math.min(dt, 1 / 30)

  const omega = Math.sqrt(Math.max(1, springCfg.value.stiffness))
  const damping = 2 * springCfg.value.dampingRatio * omega
  const displacement = headValue(head) - spring.target
  const accel = -omega * omega * displacement - damping * spring.velocity
  spring.velocity += accel * dt
  setHeadRaw(head, headValue(head) + spring.velocity * dt)

  /* 收得再紧一点：0.3 的残差在 0–100 量程上是 0.3%，肉眼能看出「没落到格上」。 */
  if (Math.abs(headValue(head) - spring.target) < 0.05 && Math.abs(spring.velocity) < 0.6) {
    setHeadRaw(head, spring.target)
    spring.velocity = 0
    spring.lastTime = 0
    commit()
    return
  }
  spring.frame = requestAnimationFrame(t => stepSpring(head, t))
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ---------- 键盘（两个 thumb 均可聚焦） ---------- */
function onKeyDown(head, event) {
  const big = Math.max(props.step, range.value * 0.1)
  const current = headValue(head)
  let next = null
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp': next = current + props.step; break
    case 'ArrowLeft':
    case 'ArrowDown': next = current - props.step; break
    case 'PageUp': next = current + big; break
    case 'PageDown': next = current - big; break
    case 'Home': next = head === 'lo' ? props.min : lo.value; break
    case 'End': next = head === 'hi' ? props.max : hi.value; break
    default: return
  }
  event.preventDefault()
  stopSpring(head)
  /* 键盘也走弹簧：算出目标后让把手滑过去，而不是直接跳。 */
  const target = quantize(next)
  commitTarget(head, target)
  startSpring(head, target)
}

watch(() => props.modelValue, value => {
  /* 弹簧跑的时候不要用外部值直接改写 lo/hi：那等于把逐帧动画替换成一次瞬移，
     吸附就只剩下最后一帧。落定时 stepSpring 会自己 commit。 */
  const springing = Boolean(springs.lo.frame || springs.hi.frame)
  if (dragging.value || springing || !Array.isArray(value)) return
  const pair = sanitizePair(
    sanitize(value[0], props.min),
    sanitize(value[1], props.max)
  )
  lo.value = pair[0]
  hi.value = pair[1]
}, { deep: true })

onBeforeUnmount(() => {
  stopSpring('lo')
  stopSpring('hi')
  clearTimeout(releaseTimer)
})
</script>

<template>
  <div class="ui-range" :class="{ 'is-dragging': dragging }">
    <div class="ui-range__head">
      <span v-if="label" class="ui-range__label">{{ label }}</span>
      <span v-if="showValue" class="ui-range__value">
        <UiRollNumber class="ui-range__num" :value="displayLo" :direction-key="lo" :step="step" :instant="dragging" />
        <span class="ui-range__dash" aria-hidden="true">–</span>
        <UiRollNumber class="ui-range__num" :value="displayHi" :direction-key="hi" :step="step" :instant="dragging" />
        <span v-if="unit" class="ui-range__unit">{{ unit }}</span>
      </span>
    </div>

    <div
      ref="trackEl"
      class="ui-range__track"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="ui-range__rail" aria-hidden="true"></span>
      <span class="ui-range__fill" :style="{ left: percentLo + '%', width: Math.max(0, percentHi - percentLo) + '%' }" aria-hidden="true"></span>
      <button
        type="button"
        class="ui-range__thumb"
        :class="{ 'is-active': activeHead === 'lo', 'is-released': releasedHead === 'lo' }"
        role="slider"
        aria-label="最小值"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="displayLo"
        :style="{ left: percentLo + '%' }"
        @keydown="onKeyDown('lo', $event)"
      ><span class="ui-range__thumb-body" aria-hidden="true"></span></button>
      <button
        type="button"
        class="ui-range__thumb"
        :class="{ 'is-active': activeHead === 'hi', 'is-released': releasedHead === 'hi' }"
        role="slider"
        aria-label="最大值"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="displayHi"
        :style="{ left: percentHi + '%' }"
        @keydown="onKeyDown('hi', $event)"
      ><span class="ui-range__thumb-body" aria-hidden="true"></span></button>
    </div>
  </div>
</template>

<style scoped>
.ui-range {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.ui-range__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ui-range__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}
.ui-range__value {
  display: inline-flex;
  align-items: flex-end;
  gap: 4px;
  font-family: ui-monospace, monospace;
  font-size: var(--fs-tiny);
  font-weight: var(--w-strong);
  color: var(--on-surface);
}
.ui-range__num { line-height: 1.2; }
.ui-range__dash {
  color: var(--on-surface-variant);
  line-height: 1.2;
}
.ui-range__unit {
  color: var(--on-surface-variant);
  font-weight: var(--w-label);
  white-space: nowrap;
}

.ui-range__track {
  position: relative;
  display: flex;
  align-items: center;
  height: 20px;
  touch-action: none;
  cursor: pointer;
}
.ui-range__rail {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: 999px;
  background: var(--surface-container-highest);
  transition: background var(--t-fade);
}
.ui-range__fill {
  position: absolute;
  height: 6px;
  border-radius: 999px;
  background: var(--primary);
  transition: background var(--t-fade);
  will-change: left, width;
}
.ui-range__thumb {
  position: absolute;
  z-index: 2;
  top: 50%;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  display: grid;
  place-items: center;
}
.ui-range__thumb-body {
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
.ui-range__thumb:hover .ui-range__thumb-body { background: color-mix(in oklab, var(--primary) 88%, var(--on-primary)); }
.ui-range__thumb:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent);
}
.ui-range.is-dragging .ui-range__thumb { cursor: grabbing; }
.ui-range.is-dragging .ui-range__thumb-body { transform: scale(1.16); }
[data-motion="lively"] .ui-range.is-dragging .ui-range__thumb-body { transform: scale(1.28); }
[data-motion="lively"] .ui-range__thumb.is-released .ui-range__thumb-body {
  animation: uiRangeDuang calc(var(--spring-pop-dur) * 1.35) cubic-bezier(.3, .8, .3, 1) both;
}
@keyframes uiRangeDuang {
  0% { transform: scale(.7); }
  22% { transform: scale(.7); }
  58% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
/* 覆盖头修正：当前活动的把手永远盖在另一个把手上（含贴身相邻时）。 */
.ui-range__thumb.is-active { z-index: 3; }

@media (prefers-reduced-motion: reduce) {
  .ui-range__thumb { transition-duration: .01ms; }
}
</style>
