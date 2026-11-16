<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AGENT_SHAPES } from '../../core/agentShapes'
import LaptopColorSvg from '../../assets/agent/Laptop.svg?raw'
import LaptopWhiteSvg from '../../assets/agent/LaptopW.svg?raw'
import PhoneColorSvg from '../../assets/agent/Phone.svg?raw'
import PhoneWhiteSvg from '../../assets/agent/PhoneW.svg?raw'

/* ============================================================
   AgentAvatar —— 两只胶囊眼给出生命感的智能体头像
   ------------------------------------------------------------
   · 底层形状：shape 传内置 key（AGENT_SHAPES：circle / squircle /
     triangle / diamond / hexagon / flower / tilt / star / sparkle /
     scallop）或一段「纯剪影」标记；组件自动上色 + 白 30% 描边。
   · 眼睛是状态机驱动的：任意状态 → 任意状态都是同一组参数
     （开合 / 眼距 / 高度）的弹簧过渡，没有硬切。
   · 三条硬规则：
       1. 眼睛不旋转 —— 没有 tilt / 视线角度，只有位移；
       2. 尺寸零随机 —— 挂载即按状态落位，开合无噪声；眨眼两眼
          完全同步（同一闭合度），不会出现一睁一闭的大小差；
       3. 两眼成组位移 —— 注视偏移对两只眼完全同值。
   · 默认眼略偏右上（EYE_BASE）。
   · 根元素 overflow visible：眼移到边上、描边外圈、设备 / 手都
     不会被裁。
   · ---------- UsingDevice：设备使用变体 ----------
     device = laptop / phone / none：设备底图（Figma 3D 导出）放在
     AI 右下方，眼睛自动看向设备中心 —— 电脑左右轻扫、手机上下
     轻点；手是纯白圆：电脑一只敲击手（连续敲键盘），手机两只，
     持机手固定在手机前方（z 在设备之上），滑动手沿屏幕滑动。
     deviceColor 替换底图里的 #FF00FF 占位（multiply 混色，禁用
     #000000，最深 #444444；#FFFFFF = 原色；空 = 纯白 W 版）。
   ============================================================ */

const props = defineProps({
  /* 内置形状 key（AGENT_SHAPES）或纯剪影 SVG 内部标记（24x24 viewBox） */
  shape: { type: String, default: 'circle' },
  /* 形状主色（同时是情绪色） */
  color: { type: String, default: '#7438ff' },
  eyeColor: { type: String, default: '#ffffff' },
  /* px */
  size: { type: [Number, String], default: 40 },
  /* idle | listening | thinking | happy | confused | surprised | sleepy | speaking */
  state: { type: String, default: 'idle' },
  /* mouse 跟随指针 | none 只做微扫视 | point 看向 gazeX / gazeY；
     device != none 时自动切到 point 看向设备中心 */
  gaze: { type: String, default: 'mouse' },
  /* point 模式的注视点（24 盒内坐标） */
  gazeX: { type: Number, default: 12 },
  gazeY: { type: Number, default: 12 },
  /* 注视微摆：none | x（左右轻扫）| y（上下轻点）；
     device != none 时自动按设备取 x / y */
  gazeWobble: { type: String, default: 'none' },
  gazeWobbleAmp: { type: Number, default: 0.3 },
  gazeWobblePeriod: { type: Number, default: 2600 },
  /* false 时摆出当前状态的静止姿势，不跑动画循环 */
  animated: { type: Boolean, default: true },
  /* speaking 状态的外部音量包络 0~1；给了才调制开合，不给眼大小保持稳定 */
  level: { type: Number, default: -1 },
  /* 眼睛基准高度；不传时用内置形状的推荐值 faceY（三角这类下半脸会往下调） */
  eyesY: { type: Number, default: null },
  /* ---------- UsingDevice：设备使用变体 ---------- */
  /* none 不带设备 | laptop 电脑 | phone 手机 */
  device: { type: String, default: 'none' },
  /* 设备上色：替换底图里的 #FF00FF 占位。空 = 纯白 W 版；
     #FFFFFF = 原色；最深只能给 #444444（multiply 下禁用 #000000） */
  deviceColor: { type: String, default: '' },
  /* 设备位置（容器左上原点，px）；不传用各设备的推荐位 */
  deviceDx: { type: Number, default: null },
  deviceDy: { type: Number, default: null },
  /* 设备宽度 = size * deviceScale；不传用推荐值 */
  deviceScale: { type: Number, default: null },
  /* 手的直径 = size * handScale；不传用推荐值 */
  handScale: { type: Number, default: null },
  /* 电脑：敲击手相对推荐位的偏移 */
  laptopHandDx: { type: Number, default: 0 },
  laptopHandDy: { type: Number, default: 0 },
  /* 手机：持机手（在手机前方，固定）偏移 */
  holdDx: { type: Number, default: 0 },
  holdDy: { type: Number, default: 0 },
  /* 滑动手轨迹：从起点来回滑到终点（容器左上原点 px）；不传用推荐值 */
  swipeStartX: { type: Number, default: null },
  swipeStartY: { type: Number, default: null },
  swipeEndX: { type: Number, default: null },
  swipeEndY: { type: Number, default: null },
  /* 注视压缩系数：看向设备 / 指定点时「距离 → 眼偏移」的换算比例 */
  gazeScale: { type: Number, default: 0.35 },
  /* 眼整体基础偏移（相对 24 盒中心）：默认略偏右上，可调相对位置 */
  eyesOffsetX: { type: Number, default: 0.55 },
  eyesOffsetY: { type: Number, default: -0.55 }
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

/* shape：内置 key 优先，否则当原始剪影标记用 */
const shapeMarkup = computed(() => {
  const builtin = AGENT_SHAPES[props.shape]
  return builtin ? builtin.markup : props.shape
})
/* 眼睛基准高度：显式传了 eyesY 就用它，否则用内置形状的推荐 faceY */
const eyesCenter = computed(() => {
  if (props.eyesY !== null && props.eyesY !== undefined) return props.eyesY
  const builtin = AGENT_SHAPES[props.shape]
  return builtin ? builtin.faceY : 12
})

/* ---------- UsingDevice：设备底图 / 位置 / 手 ---------- */
const DEVICE_RAW = {
  laptop: { color: LaptopColorSvg, white: LaptopWhiteSvg },
  phone: { color: PhoneColorSvg, white: PhoneWhiteSvg }
}
const deviceOn = computed(() => props.device === 'laptop' || props.device === 'phone')
const deviceMarkup = computed(() => {
  if (!deviceOn.value) return ''
  const base = props.deviceColor ? DEVICE_RAW[props.device].color : DEVICE_RAW[props.device].white
  return props.deviceColor ? base.replaceAll('#FF00FF', props.deviceColor) : base
})
const deviceAspect = computed(() => {
  if (!deviceOn.value) return 1
  const m = deviceMarkup.value.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  return m ? Number(m[1]) / Number(m[2]) : 1.6
})
const sizeNum = computed(() => Number(props.size) || 0)
/* 各设备的推荐位（size 的比例）——来自 140px 调节台的实测固化值 */
const DEVICE_DEFAULTS = {
  laptop: { dx: 0.279, dy: 0.3, scale: 1, handScale: 0.16, handDy: -0.036 },
  phone: { dx: 0.421, dy: 0.429, scale: 0.62, holdDx: 0.286, holdDy: -0.079, swipeStartX: 0.504, swipeStartY: 0.714, swipeEndX: 0.504, swipeEndY: 0.5 }
}
const deviceLeft = computed(() => {
  if (props.deviceDx !== null) return props.deviceDx
  return sizeNum.value * DEVICE_DEFAULTS[props.device].dx
})
const deviceTop = computed(() => {
  if (props.deviceDy !== null) return props.deviceDy
  return sizeNum.value * DEVICE_DEFAULTS[props.device].dy
})
const deviceWidth = computed(() => sizeNum.value * (props.deviceScale ?? DEVICE_DEFAULTS[props.device].scale))
const deviceHeight = computed(() => deviceWidth.value / deviceAspect.value)
const handPx = computed(() => sizeNum.value * (props.handScale ?? DEVICE_DEFAULTS[props.device].handScale))
const laptopHandBase = computed(() => ({ x: sizeNum.value * 0.58 + props.laptopHandDx, y: sizeNum.value * (0.764) + props.laptopHandDy }))
const holdHandBase = computed(() => ({ x: sizeNum.value * (0.55 + 0.286) + props.holdDx, y: sizeNum.value * (0.88 - 0.079) + props.holdDy }))
const swipeStart = computed(() => ({
  x: props.swipeStartX !== null ? props.swipeStartX : sizeNum.value * DEVICE_DEFAULTS[props.device].swipeStartX,
  y: props.swipeStartY !== null ? props.swipeStartY : sizeNum.value * DEVICE_DEFAULTS[props.device].swipeStartY
}))
const swipeEnd = computed(() => ({
  x: props.swipeEndX !== null ? props.swipeEndX : sizeNum.value * DEVICE_DEFAULTS[props.device].swipeEndX,
  y: props.swipeEndY !== null ? props.swipeEndY : sizeNum.value * DEVICE_DEFAULTS[props.device].swipeEndY
}))

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

/* 眨眼曲线：快闭 → 保持 → 慢开（过冲 1.02），返回「闭合度」0~1（可略负）。
   两只眼共用同一条曲线 —— 同步眨，尺寸永不出现随机差。 */
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
let blink = { start: -1, close: 100, hold: 30, open: 200 }
let nextBlinkAt = 0

function scheduleBlink(now) {
  if (blinkFactor <= 0) { nextBlinkAt = Infinity; return }
  /* 连眨概率 10%：间隔缩到 340–480ms */
  const rapid = Math.random() < 0.1
  const gap = rapid ? 340 + Math.random() * 140 : (3000 + Math.random() * 3000) / blinkFactor
  nextBlinkAt = now + gap
}

/* 注意力层：弹簧注视 + 微扫视。两眼成组位移：同一偏移画两只眼。 */
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
const laptopHandEl = ref(null)
const holdHandEl = ref(null)
const swipeHandEl = ref(null)

const BASE_W = 2
const BASE_H = 4.8
const BASE_GAP = 4.6

/* 圆角矩形：四角同半径（= 宽度一半，再被高度夹住）。
   绝不用 scale 缩放 —— 宽 / 高 / 圆角直接写属性，transform 只有平移。 */
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

/* 手：白圆，transform 只有平移（不缩放） */
function placeHand(el, x, y) {
  if (!el) return
  el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%)`
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
    saccTarget.x = (Math.random() * 2 - 1) * 0.6
    saccTarget.y = (Math.random() * 2 - 1) * 0.4
    nextSaccAt = now + 2000 + Math.random() * 3000
  }
  saccSpring.target = saccTarget.x
  stepSpring(saccSpring, dt)

  /* device != none 时自动看向设备中心（覆盖 gaze / 注视点 / 微摆轴） */
  const devicePoint = deviceOn.value
    ? { x: ((deviceLeft.value + deviceWidth.value / 2) / sizeNum.value) * 24,
        y: ((deviceTop.value + deviceHeight.value / 2) / sizeNum.value) * 24 }
    : null
  const mouseOn = !devicePoint && props.gaze === 'mouse'
  const pointOn = devicePoint || props.gaze === 'point'
  const pointX = devicePoint ? devicePoint.x : props.gazeX
  const pointY = devicePoint ? devicePoint.y : props.gazeY
  const wobbleAxis = deviceOn.value ? (props.device === 'laptop' ? 'x' : 'y') : props.gazeWobble
  const bias = gazeBias
  let tx = 0
  let ty = 0
  if (mouseOn) { tx = mouseTarget.x * 0.9; ty = mouseTarget.y * 0.7 }
  else if (pointOn) {
    /* 看向指定点：距离越远偏得越多，gazeScale 决定压缩比例（可调） */
    tx = (pointX - 12) * props.gazeScale
    ty = (pointY - 12) * props.gazeScale
  }
  tx += saccSpring.pos * (mouseOn ? 0.5 : 1.6) + bias.x * 0.6
  ty += saccTarget.y * (mouseOn ? 0.2 : 0.8) + bias.y * 0.6
  /* 注视微摆：看电脑左右轻扫 / 看手机上下轻点（正弦，不碰尺寸） */
  const wobble = Math.sin((now / Math.max(400, props.gazeWobblePeriod)) * Math.PI * 2) * props.gazeWobbleAmp
  if (wobbleAxis === 'x') tx += wobble
  else if (wobbleAxis === 'y') ty += wobble
  lookX.target = Math.max(-1.8, Math.min(1.8, tx))
  lookY.target = Math.max(-1.8, Math.min(1.8, ty))
  stepSpring(lookX, dt)
  stepSpring(lookY, dt)

  /* 眨眼调度（两眼同步）；连眨概率 10% */
  if (now >= nextBlinkAt) {
    blink = { start: now, close: 80 + Math.random() * 40, hold: 20 + Math.random() * 20, open: 150 + Math.random() * 100 }
    scheduleBlink(now)
  }
  const closed = now >= blink.start ? Math.max(-0.02, Math.min(1, blinkClosedness(now - blink.start, blink.close, blink.hold, blink.open))) : 0

  /* 情绪层：参数弹簧过渡 */
  for (const key of Object.keys(springs)) {
    springs[key].k = curSpring.k
    springs[key].c = curSpring.c
    stepSpring(springs[key], dt)
  }

  /* 说话：只在给了外部 level 时调制开合（确定值，不随机） */
  let talk = 0
  if (talkMode && props.level >= 0) talk = (props.level - 0.5) * 0.3

  const openL = Math.max(0.08, springs.open.pos * (1 - closed) + talk)

  const hL = Math.max(0.45, BASE_H * openL)
  const hR = hL
  /* 闭眼是一条宽度略增 5–10% 的细线，不是消失 */
  const wL = BASE_W * (1 + 0.08 * Math.max(0, 1 - openL))
  const wR = wL

  /* 两眼成组位移：同一个 look 偏移画两只眼；默认略偏右上 */
  const half = BASE_GAP / 2 + springs.spread.pos / 2 + spreadBreath / 2
  const gx = lookX.pos * 1.6
  const gy = lookY.pos * 1.2
  const cxL = 12 - half + gx + props.eyesOffsetX
  const cxR = 12 + half + gx + props.eyesOffsetX
  const cy = eyesCenter.value + springs.eyeY.pos + gy + breath * 0.5 + props.eyesOffsetY

  if (eyeL.value && eyeR.value) {
    renderEye(eyeL.value, cxL, cy, wL, hL)
    renderEye(eyeR.value, cxR, cy, wR, hR)
  }
  if (svgEl.value) {
    svgEl.value.setAttribute('transform', `translate(0 ${breath.toFixed(3)})`)
  }

  /* 手的动画：确定性正弦，只有位置在动（尺寸零随机） */
  const S = sizeNum.value
  if (props.device === 'laptop' && laptopHandEl.value) {
    /* 敲击：快速下按回弹 + 轻微换位 */
    const tap = -Math.abs(Math.sin((now / 1000) * Math.PI * 2 * 2.6)) * S * 0.028
    const drift = Math.sin((now / 1000) * Math.PI * 2 * 1.3) * S * 0.012
    placeHand(laptopHandEl.value, laptopHandBase.value.x + drift, laptopHandBase.value.y + tap)
  }
  if (props.device === 'phone') {
    /* 持机手固定不动（图层在手机前方） */
    placeHand(holdHandEl.value, holdHandBase.value.x, holdHandBase.value.y)
    /* 滑动手：从起点来回滑到终点 */
    const phase = (now / 1000) * Math.PI * 2 / 1.6
    const t = (Math.sin(phase) + 1) / 2
    placeHand(swipeHandEl.value,
      swipeStart.value.x + (swipeEnd.value.x - swipeStart.value.x) * t,
      swipeStart.value.y + (swipeEnd.value.y - swipeStart.value.y) * t)
  }

  rafId = requestAnimationFrame(frame)
}

/* 静止姿势：参数直接落位，不跑循环；手摆在推荐位 */
function renderStatic() {
  if (!eyeL.value || !eyeR.value) return
  const half = BASE_GAP / 2 + springs.spread.target / 2
  const open = springs.open.target
  const h = Math.max(0.45, BASE_H * open)
  const cx = 12 + props.eyesOffsetX
  const cy = eyesCenter.value + springs.eyeY.target + props.eyesOffsetY
  renderEye(eyeL.value, cx - half, cy, BASE_W, h)
  renderEye(eyeR.value, cx + half, cy, BASE_W, h)
  if (svgEl.value) svgEl.value.setAttribute('transform', 'translate(0 0)')
  if (props.device === 'laptop') placeHand(laptopHandEl.value, laptopHandBase.value.x, laptopHandBase.value.y)
  if (props.device === 'phone') {
    placeHand(holdHandEl.value, holdHandBase.value.x, holdHandBase.value.y)
    placeHand(swipeHandEl.value, swipeStart.value.x, swipeStart.value.y)
  }
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
watch(() => [props.animated, props.gaze, eyesCenter.value], () => startLoop())
watch(() => [props.gazeWobble, props.device, props.size], () => { if (!props.animated) renderStatic() })

onMounted(() => {
  applyState(props.state)
  if (props.gaze === 'mouse' && !deviceOn.value) window.addEventListener('pointermove', onPointerMove, { passive: true })
  startLoop()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
})

const label = computed(() => `智能体头像（${props.state}${deviceOn.value ? ' · ' + (props.device === 'laptop' ? '电脑' : '手机') : ''}）`)
</script>

<template>
  <span class="ui-agent-avatar" :style="{ width: size + 'px', height: size + 'px' }" role="img" :aria-label="label">
    <svg
      ref="svgEl"
      class="ui-agent-avatar__svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :style="{ '--agent-color': color }"
    >
      <g class="ui-agent-avatar__body">
        <g class="ui-agent-avatar__shape" v-html="shapeMarkup"></g>
        <rect ref="eyeL" class="ui-agent-avatar__eye" :fill="eyeColor" width="2" height="4.8" x="-0.45" :y="eyesCenter - 2.95" rx="1" ry="1" />
        <rect ref="eyeR" class="ui-agent-avatar__eye" :fill="eyeColor" width="2" height="4.8" x="4.15" :y="eyesCenter - 2.95" rx="1" ry="1" />
      </g>
    </svg>
    <span
      v-if="deviceOn"
      class="ui-agent-avatar__device"
      :style="{ left: deviceLeft + 'px', top: deviceTop + 'px', width: deviceWidth + 'px', height: deviceHeight + 'px' }"
      v-html="deviceMarkup"
    ></span>
    <span
      v-if="device === 'laptop'"
      ref="laptopHandEl"
      class="ui-agent-avatar__hand"
      :style="{ width: handPx + 'px', height: handPx + 'px' }"
    ></span>
    <template v-if="device === 'phone'">
      <span ref="holdHandEl" class="ui-agent-avatar__hand is-hold" :style="{ width: handPx * 1.15 + 'px', height: handPx * 1.15 + 'px' }"></span>
      <span ref="swipeHandEl" class="ui-agent-avatar__hand" :style="{ width: handPx + 'px', height: handPx + 'px' }"></span>
    </template>
  </span>
</template>

<style scoped>
/* 根是定位容器：overflow visible，设备 / 手 / 描边都不被裁，
   容器裁不裁头像由使用方自己决定，组件绝不主动裁。 */
.ui-agent-avatar { position: relative; display: inline-block; flex-shrink: 0; overflow: visible; }
.ui-agent-avatar__svg { display: block; width: 100%; height: 100%; overflow: visible; }
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
/* 设备层在头像之上；手再上一层（持机手在手机前方）。
   不做任何额外合成 / AA 处理：设备是 Figma 3D 场景，translateZ /
   透明 outline / backface-visibility 都会干扰它的原生透视渲染。 */
.ui-agent-avatar__device { position: absolute; z-index: 2; pointer-events: none; }
.ui-agent-avatar__device :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
/* 手：纯白圆；动态手（敲击 / 滑动）在设备下层，持机手 is-hold 在设备上层（手机前方）。 */
.ui-agent-avatar__hand {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px color-mix(in oklab, var(--on-surface) 22%, transparent);
  pointer-events: none;
  will-change: transform;
}
.ui-agent-avatar__hand.is-hold { z-index: 3; }


@media (prefers-reduced-motion: reduce) {
  .ui-agent-avatar__body { transform: none !important; }
}
</style>
