<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* ============================================================
   AgentAvatar —— 两只胶囊眼给出生命感的智能体头像
   ------------------------------------------------------------
   · 底层形状：传一段「纯剪影」SVG 内部标记（不要带 fill / style），
     组件自动上色 + 白 30% 描边（paint-order: stroke 画在外圈）。
   · 眼睛是状态机驱动的：**任意状态 → 任意状态** 都走同一组参数
     （开合 / 眼距 / 高度）的弹簧过渡，没有硬切。
   · 三条硬规则：
       1. 眼睛不旋转 —— 没有 tilt / 视线角度，只有位移；
       2. 尺寸零随机 —— 挂载即按状态落位，开合不含任何噪声项；
       3. 两眼成组位移 —— 注视偏移对两只眼完全同值，永远等大。
   · 生命层（呼吸、随机眨眼快闭慢开过冲 1.02）永远在；
     注意力层（弹簧注视 / 微扫视）叠加其上，左右眼只在**眨眼时序**
     上差 15ms，位置 / 大小完全同步。
   ============================================================ */

const props = defineProps({
  /* 纯剪影 SVG 内部标记：viewBox 24x24 内的 path / circle / rect */
  shape: { type: String, required: true },
  /* 形状主色（同时是情绪色） */
  color: { type: String, default: '#7438ff' },
  eyeColor: { type: String, default: '#ffffff' },
  /* px */
  size: { type: [Number, String], default: 40 },
  /* idle | listening | thinking | happy | confused | surprised | sleepy | speaking */
  state: { type: String, default: 'idle' },
  /* mouse 跟随指针 | none 只做微扫视 */
  gaze: { type: String, default: 'mouse' },
  /* false 时摆出当前状态的静止姿势，不跑动画循环 */
  animated: { type: Boolean, default: true },
  /* speaking 状态的外部音量包络 0~1；给了才调制开合，不给眼大小保持稳定 */
  level: { type: Number, default: -1 },
  /* 眼睛基准高度（viewBox 24 内）：圆形脸 12，三角等下半脸往下调 */
  eyesY: { type: Number, default: 12 }
})

/* ---------- 情绪层：状态配方表（参数即状态，状态即参数向量） ---------- */
/* open 开合（两眼同值）/ spread 眼距变化 / eyeY 整体高度偏移 /
   blink 眨眼频率倍率（0 = 不眨）/ kickY 进入状态时的速度冲击 /
   bias 注视偏置 / spring 该状态的过渡弹簧 */
const STATES = {
  idle:      { open: 1,    spread: 0,    eyeY: 0,    blink: 1 },
  listening: { open: 1.06, spread: -0.5, eyeY: 0,    blink: 0.5 },
  thinking:  { open: 0.88, spread: 0,    eyeY: -0.7, blink: 0.35, bias: { x: 0.5, y: -1.1 } },
  happy:     { open: 0.6,  spread: 1.2,  eyeY: -0.9, blink: 0.4, kickY: -9 },
  confused:  { open: 0.92, spread: 0.2,  eyeY: 0.5,  blink: 0.7 },
  surprised: { open: 1.3,  spread: 2.2,  eyeY: -1.2, blink: 0, kickY: -14, spring: { k: 420, c: 30 } },
  sleepy:    { open: 0.6,  spread: -0.6, eyeY: 0.9,  blink: 2.4, spring: { k: 40, c: 11 } },
  speaking:  { open: 1,    spread: 0.3,  eyeY: 0,    blink: 0.8, talk: true }
}

/* ---------- 弹簧：情绪参数向目标过渡（AnyState→AnyState 的实现本体） ---------- */
function makeSpring(k, c) { return { pos: 0, vel: 0, target: 0, k, c } }
function stepSpring(s, dt) {
  const a = -s.k * (s.pos - s.target) - s.c * s.vel
  s.vel += a * dt
  s.pos += s.vel * dt
}
const DEFAULT_SPRING = { k: 140, c: 17 }
const springs = {
  open: makeSpring(140, 17),
  spread: makeSpring(120, 16),
  eyeY: makeSpring(140, 17)
}
let curSpring = DEFAULT_SPRING
let blinkFactor = 1
let talkMode = false
let gazeBias = { x: 0, y: 0 }
let initialized = false

function applyState(name) {
  const preset = STATES[name] || STATES.idle
  curSpring = preset.spring || DEFAULT_SPRING
  for (const key of Object.keys(springs)) {
    springs[key].k = curSpring.k
    springs[key].c = curSpring.c
    springs[key].target = preset[key] !== undefined ? preset[key] : preset.open
    /* 眼生成时大小不随机：第一次落状态直接摆到位，不从 0 弹出来 */
    if (!initialized) { springs[key].pos = springs[key].target; springs[key].vel = 0 }
  }
  initialized = true
  if (preset.kickY) springs.eyeY.vel += preset.kickY
  blinkFactor = preset.blink
  talkMode = !!preset.talk
  gazeBias = preset.bias || { x: 0, y: 0 }
}

/* 平滑噪声：几个不可通约周期的正弦叠加（只用于呼吸 / 扫视的相位，不碰尺寸） */
function smoothNoise(t, seed = 0) {
  return 0.5
    + Math.sin(t * 0.0007 + seed) * 0.34
    + Math.sin(t * 0.00113 + seed * 2.1 + 1.7) * 0.22
    + Math.sin(t * 0.00191 + seed * 3.7 + 3.1) * 0.12
}

/* 眨眼曲线：快闭 → 保持 → 慢开（过冲 1.02），返回「闭合度」0~1（可略负） */
function blinkClosedness(elapsed, close, hold, open) {
  if (elapsed < close) { const p = elapsed / close; return p * p }
  if (elapsed < close + hold) return 1
  if (elapsed < close + hold + open) {
    const q = (elapsed - close - hold) / open
    const c1 = 0.36
    const c3 = c1 + 1
    const easeOutBack = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2)
    return 1 - easeOutBack
  }
  return 0
}
let blinkL = { start: -1, close: 100, hold: 30, open: 200 }
let blinkR = { start: -1, close: 100, hold: 30, open: 200 }
let nextBlinkAt = 0

function scheduleBlink(now) {
  if (blinkFactor <= 0) { nextBlinkAt = Infinity; return }
  /* 连眨概率 10%：间隔缩到 340–480ms */
  const rapid = Math.random() < 0.1
  const gap = rapid ? 340 + Math.random() * 140 : (3000 + Math.random() * 3000) / blinkFactor
  nextBlinkAt = now + gap
}
function startBlink(at, side) {
  const blink = { start: at, close: 80 + Math.random() * 40, hold: 20 + Math.random() * 20, open: 150 + Math.random() * 100 }
  if (side === 'L') blinkL = blink
  else blinkR = blink
}

/* 注意力层：弹簧注视 + 微扫视。**两眼成组位移**：同一偏移量画两只眼，
   永远同步；幅度加大到可感知（±1.2 个单位 ≈ 头像宽度的 5%）。 */
const lookX = makeSpring(60, 12)
const lookY = makeSpring(60, 12)
const saccSpring = makeSpring(30, 7)
let mouseTarget = { x: 0, y: 0 }
let saccTarget = { x: 0, y: 0 }
let nextSaccAt = 0

function onPointerMove(event) {
  const svg = svgEl.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
  const ny = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1
  mouseTarget.x = Math.max(-1, Math.min(1, nx)) * 0.9
  mouseTarget.y = Math.max(-1, Math.min(1, ny)) * 0.7
}

/* ---------- 渲染 ---------- */
const svgEl = ref(null)
const eyeL = ref(null)
const eyeR = ref(null)

const BASE_W = 2
const BASE_H = 4.8
const BASE_GAP = 4.6

/* 圆角矩形：四角同半径（= 宽度一半，再被高度夹住）。
   绝不用 scale 缩放 —— 宽 / 高 / 圆角直接写属性，不旋转（transform 只有平移）。 */
function renderEye(rect, cx, cy, w, h) {
  const radius = Math.min(w / 2, h / 2)
  rect.setAttribute('transform', `translate(${cx.toFixed(3)} ${cy.toFixed(3)})`)
  rect.setAttribute('width', w.toFixed(3))
  rect.setAttribute('height', h.toFixed(3))
  rect.setAttribute('x', (-w / 2).toFixed(3))
  rect.setAttribute('y', (-h / 2).toFixed(3))
  rect.setAttribute('rx', radius.toFixed(3))
  rect.setAttribute('ry', radius.toFixed(3))
}

let rafId = 0
let lastT = 0

function frame(now) {
  const dt = Math.min(0.032, lastT ? (now - lastT) / 1000 : 0.016)
  lastT = now

  /* 生命层：呼吸（3–5s 周期）+ 眼距极轻微呼吸 */
  const breath = Math.sin((now / 4200) * Math.PI * 2) * 0.12
  const spreadBreath = Math.sin((now / 4200) * Math.PI * 2 + 0.6) * 0.08

  /* 注意力层：微扫视每 2–5s 换一个虚拟兴趣点，弹簧追过去 */
  if (now >= nextSaccAt) {
    saccTarget.x = (Math.random() * 2 - 1) * 0.5
    saccTarget.y = (Math.random() * 2 - 1) * 0.3
    nextSaccAt = now + 2000 + Math.random() * 3000
  }
  saccSpring.target = saccTarget.x
  stepSpring(saccSpring, dt)

  const mouseOn = props.gaze === 'mouse'
  const bias = gazeBias
  const tx = (mouseOn ? mouseTarget.x : 0) * 0.8 + saccSpring.pos * (mouseOn ? 0.5 : 1.6) + bias.x * 0.6
  const ty = (mouseOn ? mouseTarget.y : 0) * 0.6 + saccTarget.y * (mouseOn ? 0.2 : 0.8) + bias.y * 0.6
  lookX.target = Math.max(-1.3, Math.min(1.3, tx))
  lookY.target = Math.max(-1.3, Math.min(1.3, ty))
  stepSpring(lookX, dt)
  stepSpring(lookY, dt)

  /* 眨眼调度：左右差 15ms（仅时序）；连眨概率 10% */
  if (now >= nextBlinkAt) {
    startBlink(now, 'L')
    startBlink(now + 15, 'R')
    scheduleBlink(now)
  }
  const closedL = now >= blinkL.start ? Math.max(-0.02, Math.min(1, blinkClosedness(now - blinkL.start, blinkL.close, blinkL.hold, blinkL.open))) : 0
  const closedR = now >= blinkR.start ? Math.max(-0.02, Math.min(1, blinkClosedness(now - blinkR.start, blinkR.close, blinkR.hold, blinkR.open))) : 0

  /* 情绪层：参数弹簧过渡 */
  for (const key of Object.keys(springs)) {
    springs[key].k = curSpring.k
    springs[key].c = curSpring.c
    stepSpring(springs[key], dt)
  }

  /* 说话：只在给了外部 level 时调制开合（确定值，不随机） */
  let talk = 0
  if (talkMode && props.level >= 0) talk = (props.level - 0.5) * 0.3

  const open = springs.open.pos
  const openL = Math.max(0.08, open * (1 - closedL) + talk)
  const openR = Math.max(0.08, open * (1 - closedR) + talk)

  const hL = Math.max(0.45, BASE_H * openL)
  const hR = Math.max(0.45, BASE_H * openR)
  /* 闭眼是一条宽度略增 5–10% 的细线，不是消失 */
  const wL = BASE_W * (1 + 0.08 * Math.max(0, 1 - openL))
  const wR = BASE_W * (1 + 0.08 * Math.max(0, 1 - openR))

  /* 两眼成组位移：同一个 look 偏移画两只眼，永远同步 */
  const half = BASE_GAP / 2 + springs.spread.pos / 2 + spreadBreath / 2
  const gx = lookX.pos * 1.2
  const gy = lookY.pos * 0.9
  const cxL = 12 - half + gx
  const cxR = 12 + half + gx
  const cy = props.eyesY + springs.eyeY.pos + gy + breath * 0.5

  if (eyeL.value && eyeR.value) {
    renderEye(eyeL.value, cxL, cy, wL, hL)
    renderEye(eyeR.value, cxR, cy, wR, hR)
  }
  if (svgEl.value) {
    svgEl.value.setAttribute('transform', `translate(0 ${breath.toFixed(3)})`)
  }

  rafId = requestAnimationFrame(frame)
}

/* 静止姿势：参数直接落位，不跑循环 */
function renderStatic() {
  if (!eyeL.value || !eyeR.value) return
  const half = BASE_GAP / 2 + springs.spread.target / 2
  const open = springs.open.target
  const h = Math.max(0.45, BASE_H * open)
  renderEye(eyeL.value, 12 - half, props.eyesY + springs.eyeY.target, BASE_W, h)
  renderEye(eyeR.value, 12 + half, props.eyesY + springs.eyeY.target, BASE_W, h)
  if (svgEl.value) svgEl.value.setAttribute('transform', 'translate(0 0)')
}

function startLoop() {
  cancelAnimationFrame(rafId)
  lastT = 0
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!props.animated || reduce) {
    renderStatic()
    return
  }
  nextBlinkAt = performance.now() + 1200 + Math.random() * 2000
  nextSaccAt = performance.now() + 800
  rafId = requestAnimationFrame(frame)
}

watch(() => props.state, () => { applyState(props.state); if (!props.animated) renderStatic() })
watch(() => [props.animated, props.gaze, props.eyesY], () => startLoop())

onMounted(() => {
  applyState(props.state)
  if (props.gaze === 'mouse') window.addEventListener('pointermove', onPointerMove, { passive: true })
  startLoop()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
})

const label = computed(() => `智能体头像（${props.state}）`)
</script>

<template>
  <svg
    ref="svgEl"
    class="ui-agent-avatar"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :aria-label="label"
    :style="{ '--agent-color': color }"
  >
    <g class="ui-agent-avatar__body">
      <g class="ui-agent-avatar__shape" v-html="shape"></g>
      <rect ref="eyeL" class="ui-agent-avatar__eye" :fill="eyeColor" width="2" height="4.8" x="-1" :y="eyesY - 2.4" rx="1" ry="1" />
      <rect ref="eyeR" class="ui-agent-avatar__eye" :fill="eyeColor" width="2" height="4.8" x="3.6" :y="eyesY - 2.4" rx="1" ry="1" />
    </g>
  </svg>
</template>

<style scoped>
.ui-agent-avatar { display: block; flex-shrink: 0; }
.ui-agent-avatar__body { will-change: transform; }
/* 形状上色 + 外圈描边：CSS 覆盖标记里的 fill / stroke 表现属性，
   paint-order: stroke 让描边画在填充下面，只露出外半圈 —— 和设计稿的细环一致。 */
.ui-agent-avatar__shape :deep(*) {
  fill: var(--agent-color, #7438ff);
  stroke: color-mix(in oklab, #fff 30%, transparent);
  stroke-width: 2;
  paint-order: stroke;
  stroke-linejoin: round;
}
.ui-agent-avatar__eye { pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .ui-agent-avatar__body { transform: none !important; }
}
</style>
