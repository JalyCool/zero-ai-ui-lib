<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* pending | running | done | failed（progress 只在 running 时有意义） */
  status: { type: String, default: 'pending' },
  progress: { type: Number, default: 0 },
  size: { type: Number, default: 26 },
  /* 待机虚环的段数 */
  dashes: { type: Number, default: 8 },
  /* 不定进度时弧占整圈的比例 */
  arcLength: { type: Number, default: 0.68 },
  /* 自转一圈时长（ms） */
  spinDuration: { type: Number, default: 1100 },
  /* 勾 / 叉抽笔时长（ms） */
  drawDuration: { type: Number, default: 240 }
})

/* ============================================================
   任务状态标记（按 react-bits 的 StatusMark 手法移植）
   关键点：圆环只有 **一个 circle**，它既不是「虚环」也不是「进度弧」，
   而是靠 stroke-dasharray 的 dash / gap 数值在两者之间**插值**：
     · pending：dashes 段等分虚线（dash:gap ≈ 3:7）
     · running：一段弧（不定进度 = 固定 0.68 圈；定进度 = progress）
     · done / failed：整圈（弧长 1）
   mode 0→1 与 arc 各自做补间，所以任意状态互转都是同一条描边的连续形变，
   不会出现「两个图形互相淡入」。自转用 dashoffset 的循环动画实现；
   勾 / 叉用 stroke-dashoffset 抽笔，进入时才可见（延迟 = 弧到位之后）。
   ============================================================ */

/* 兼容旧调用方：idle / progress / error 三个别名映射到标准状态名。 */
const ALIASES = { idle: 'pending', progress: 'running', error: 'failed' }
const state = computed(() => ALIASES[props.status] || props.status || 'pending')

const C = computed(() => 2 * Math.PI * 9)          /* r = 9 */
const period = computed(() => C.value / Math.max(1, props.dashes))
const clamped = computed(() => Math.max(0, Math.min(1, props.progress)))

const isRunning = computed(() => state.value === 'running')
const determinate = computed(() => isRunning.value && Number.isFinite(props.progress) && props.progress !== 0 || isRunning.value)
const solid = computed(() => isRunning.value || state.value === 'done' || state.value === 'failed')
const targetArc = computed(() => {
  if (state.value === 'pending') return 0.3
  if (state.value === 'running') return Math.max(0.0001, clamped.value || props.arcLength)
  return 1
})

/* 用一份本地状态做补间：mode 0..1、arc 0..1、spin。 */
const mode = ref(0)
const arc = ref(targetArc.value)
const spin = ref(0)
let raf = 0
let spinRaf = 0
let last = 0

const smooth = (from, to, speed) => from + (to - from) * speed

function tick(now) {
  const speed = last ? Math.min(0.34, (now - last) / 240) : 0.18
  last = now
  mode.value = smooth(mode.value, solid.value ? 1 : 0, speed)
  arc.value = smooth(arc.value, targetArc.value, speed)
  const settled = Math.abs(mode.value - (solid.value ? 1 : 0)) < 0.002 && Math.abs(arc.value - targetArc.value) < 0.002
  if (settled) {
    mode.value = solid.value ? 1 : 0
    arc.value = targetArc.value
    raf = 0
    last = 0
    return
  }
  raf = requestAnimationFrame(tick)
}

function startTween() {
  if (raf) return
  last = 0
  raf = requestAnimationFrame(tick)
}

watch([state, targetArc], () => startTween(), { immediate: true })

/* 自转：只有 running 时需要，靠 dashoffset 连续递减。 */
function spinTick(now) {
  if (!last && now) { /* noop */ }
  spin.value = (spin.value + 1.6) % C.value
  spinRaf = requestAnimationFrame(spinTick)
}
watch(isRunning, value => {
  if (value && !spinRaf) spinRaf = requestAnimationFrame(spinTick)
  if (!value && spinRaf) { cancelAnimationFrame(spinRaf); spinRaf = 0; spin.value = 0 }
}, { immediate: true })

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  if (spinRaf) cancelAnimationFrame(spinRaf)
})

/* 单条描边的 dash 数值：虚环 ↔ 弧的插值。 */
const dashArray = computed(() => {
  const c = C.value
  const p = period.value
  const idleDash = 0.3 * p
  const idleGap = 0.7 * p
  const arcDash = arc.value * c
  const arcGap = (1 - arc.value) * c
  const m = mode.value
  const dash = idleDash + (arcDash - idleDash) * m
  const gap = idleGap + (arcGap - idleGap) * m
  return Math.max(0.01, dash) + ' ' + Math.max(0.01, gap)
})

const dashOffset = computed(() => (isRunning.value ? -spin.value : 0))

const spinDuration = computed(() => props.spinDuration + 'ms')
const checkStyle = computed(() => ({ '--draw': props.drawDuration + 'ms' }))
</script>

<template>
  <span
    class="ui-status-mark"
    :class="`is-${state}`"
    :style="{ width: size + 'px', height: size + 'px', ...checkStyle }"
    role="status"
    :aria-label="state === 'done' ? '已完成' : state === 'failed' ? '失败' : state === 'running' ? '进行中' : '待处理'"
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <!-- 轨道：极淡的底环，给弧一个参照 -->
      <circle class="ui-status-mark__track" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity=".14" />
      <!-- 主角：一条描边，虚环 ↔ 弧靠 dasharray 插值 -->
      <circle
        class="ui-status-mark__ring"
        cx="12" cy="12" r="9"
        transform="rotate(-90 12 12)"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
      />
      <!-- 勾 / 叉：pathLength=1 的抽笔，进入时才可见 -->
      <path class="ui-status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength="1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <path class="ui-status-mark__cross" d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" pathLength="1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  </span>
</template>

<style scoped>
.ui-status-mark {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  vertical-align: middle;
  color: var(--on-surface-variant);
  transition: color 200ms ease;
}
.ui-status-mark svg { width: 100%; height: 100%; display: block; overflow: visible; }

/* 描边：颜色与线宽随状态过渡；自转用 dashoffset 循环（不是 transform，圆心不会动）。 */
/* 注意：旋转由 SVG 属性 transform="rotate(-90 12 12)" 负责（自带原点）。
   这里不要再写 CSS transform-origin，否则原点会被应用两次，圆环整体偏移。 */
.ui-status-mark__ring {
  transition: stroke 200ms ease, stroke-width 200ms ease;
}
.ui-status-mark.is-running .ui-status-mark__ring {
  animation: uiStatusRotate v-bind(spinDuration) linear infinite;
}
@keyframes uiStatusRotate {
  to { stroke-dashoffset: calc(var(--spin, 0) - 100); }
}

.ui-status-mark.is-running { color: var(--primary); }
.ui-status-mark.is-pending { color: var(--on-surface-variant); }
.ui-status-mark.is-pending .ui-status-mark__ring { opacity: .62; }
.ui-status-mark.is-done { color: var(--ui-success, #15803d); }
.ui-status-mark.is-failed { color: var(--error); }

/* 勾 / 叉：默认抽笔（dashoffset 1），进入完成 / 失败时画出来。 */
.ui-status-mark__check,
.ui-status-mark__cross {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
}
.ui-status-mark.is-done .ui-status-mark__check {
  animation: uiStatusDraw var(--draw) cubic-bezier(.23,1,.32,1) forwards;
}
.ui-status-mark.is-failed .ui-status-mark__cross {
  animation: uiStatusDraw var(--draw) cubic-bezier(.23,1,.32,1) forwards;
}
@keyframes uiStatusDraw {
  from { stroke-dashoffset: 1; opacity: 1; }
  to { stroke-dashoffset: 0; opacity: 1; }
}
/* 完成 / 失败时圆环退成淡背景，让勾叉成为主角。 */
.ui-status-mark.is-done .ui-status-mark__ring,
.ui-status-mark.is-failed .ui-status-mark__ring { opacity: .28; transition: opacity 200ms ease 120ms; }

@media (prefers-reduced-motion: reduce) {
  .ui-status-mark__ring { animation: none !important; }
  .ui-status-mark__check,
  .ui-status-mark__cross { animation-duration: .01ms !important; }
}
</style>
