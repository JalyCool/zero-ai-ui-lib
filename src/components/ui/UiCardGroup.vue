<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { SPRINGS, animateSpring } from '../../core/springPhysics'

const props = defineProps({
  /* gallery | circular | depth | wall | scroll-stack | stack | swap | bounce */
  variant: { type: String, default: 'gallery' },
  /* [{ title, meta?, tone?, image? }] */
  items: { type: Array, default: () => [] },
  height: { type: Number, default: 264 },
  /* gallery / 各形态的卡片宽度 */
  cardWidth: { type: Number, default: 190 },
  gap: { type: Number, default: 12 },
  /* 自动推进（depth / swap / gallery 自动漂移） */
  auto: { type: Boolean, default: false },
  interval: { type: Number, default: 2800 },
  modelValue: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'select'])

/* ============================================================
   卡片组（8 种形态共用一套卡池 / 手势 / 键盘）
   共同点：所有形态都能拖、能点、能用方向键，松手都有回弹或吸附；
   差异只在「每张卡落在三维空间的哪儿」和「拖拽改变哪个量」。
   · gallery      横向轨道：跟手 + 甩动惯性 + 吸附居中 + 循环
   · circular     圆环：拖动旋转 + 惯性 + 吸附最近格位
   · depth        Z 轴轨道：拖动带阻尼 + 吸附 + 自动前进
   · wall         透视墙：持续漂移 + 拖动改变漂移位置
   · scroll-stack 滚动压栈：滚动中逐张缩小变暗，点卡可滚过去
   · stack        牌堆：拖 / 甩 / 点换牌，甩出去的牌绕到最下面
   · swap         3D 牌堆：定时或甩动轮换，翻出去再绕回
   · bounce       扇形：入场弹跳、拖动改变展开角度、悬停 / 选中扶正
   ============================================================ */

const rootEl = ref(null)
const trackEl = ref(null)
const scrollerEl = ref(null)
const stageEl = ref(null)

const count = computed(() => props.items.length)
const active = ref(Math.max(0, Math.min(props.items.length - 1, props.modelValue)))
const pick = index => {
  if (index < 0 || index >= count.value) return
  active.value = index
  emit('update:modelValue', index)
  emit('select', { index, item: props.items[index] })
}

/* 形态切换时重放入场动画：给舞台换 key 会让 CSS 动画从头跑。 */
const enterKey = ref(0)
watch(() => props.variant, async () => { enterKey.value++; await nextTick(); resetVariant() })

/* ---------------- 通用指针手势 ---------------- */
let pid = null
let sx = 0
let sy = 0
let lx = 0
let ly = 0
let lt = 0
let vx = 0
let vy = 0
let dragging = false
let axis = ''

function capture(id) {
  try { rootEl.value && rootEl.value.setPointerCapture && rootEl.value.setPointerCapture(id) } catch (error) { /* 指针已失效 */ }
}
function release(id) {
  try { rootEl.value && rootEl.value.releasePointerCapture && rootEl.value.releasePointerCapture(id) } catch (error) { /* 指针已失效 */ }
}

function onDown(event) {
  if (event.button > 1) return
  pid = event.pointerId
  sx = lx = event.clientX
  sy = ly = event.clientY
  lt = event.timeStamp
  vx = vy = 0
  dragging = false
  axis = ''
  capture(pid)
  stopAllMotion()
}

function onMove(event) {
  if (pid === null || event.pointerId !== pid) return
  const dx = event.clientX - sx
  const dy = event.clientY - sy
  if (!dragging) {
    if (Math.abs(dx) + Math.abs(dy) < 6) return
    dragging = true
    axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
  }
  if (event.cancelable) event.preventDefault()
  const dt = Math.max(1, event.timeStamp - lt)
  vx = (event.clientX - lx) / dt
  vy = (event.clientY - ly) / dt
  lx = event.clientX
  ly = event.clientY
  lt = event.timeStamp
  applyDrag(dx, dy)
}

function onUp(event) {
  if (pid === null) return
  const dx = lx - sx
  const dy = ly - sy
  const wasDragging = dragging
  release(pid)
  pid = null
  dragging = false
  if (!wasDragging) {
    /* 没拖动 = 点击：交给各形态自己判断点中了谁。 */
    const target = event.target && event.target.closest && event.target.closest('[data-card-index]')
    if (target) hitCard(Number(target.dataset.cardIndex))
    return
  }
  endDrag(dx, dy)
}

/* ---------------- 动画小工具：rAF 补间 + 惯性 ---------------- */
const motion = { cancel: null, kind: '' }

function stopAllMotion() {
  if (motion.cancel) motion.cancel()
  motion.cancel = null
  motion.kind = ''
}

/* 朝目标跑真弹簧：松手速度会作为初速度注入，所以「甩得越快冲得越远」，
   接近时不过冲、落点干净 —— 这是原库 place / settle / fling 分档的做法。 */
function animateTo(getter, setter, target, done, options = {}) {
  stopAllMotion()
  const preset = SPRINGS[options.kind || 'place'] || SPRINGS.place
  motion.kind = 'spring'
  motion.cancel = animateSpring({
    from: getter(),
    to: target,
    velocity: options.velocity || 0,
    stiffness: preset.stiffness,
    damping: preset.damping,
    onUpdate: value => setter(value),
    onDone: () => {
      setter(target)
      motion.cancel = null
      motion.kind = ''
      if (done) done()
    }
  })
}

/* ---------------- gallery：横向轨道 ---------------- */
/* 唯一状态是「当前居中的是第几张卡（可为小数）」，轨道位移由它算出来。
   卡片宽度通常小于视口，若把位移当状态、按整格吸附，选中卡只会贴着左边 ——
   这正是之前「选中卡不居中」的根因。 */
const galleryIndex = ref(0)
const span = computed(() => props.cardWidth + props.gap)
const totalWidth = computed(() => span.value * Math.max(1, count.value))
const galleryList = computed(() => (count.value ? [...props.items, ...props.items, ...props.items] : []))
let galleryIndexStart = 0

/* 轨道零点 = 第 0 张卡居中时的位移；再按一圈宽度取模，循环才接得上。 */
const wrapped = computed(() => {
  const loop = totalWidth.value || 1
  let value = (galleryBase() - galleryIndex.value * span.value) % loop
  if (value > 0) value -= loop
  return value
})

/* 离轨道中心越远越小、越淡、越模糊 —— 平铺就有了纵深。 */
function galleryCardStyle(index, item) {
  const el = rootEl.value
  const width = el ? el.clientWidth : 0
  const center = index * span.value + wrapped.value + props.cardWidth / 2
  const distance = width ? Math.abs(center - width / 2) / (width / 2) : 0
  const d = Math.min(1, distance)
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'scale(' + (1 - d * 0.14) + ') translateY(' + d * 6 + 'px)',
    opacity: String(1 - d * 0.42),
    filter: d > 0.24 ? 'blur(' + ((d - 0.24) * 4).toFixed(2) + 'px)' : '',
    zIndex: String(30 - Math.round(d * 20))
  }
}

function galleryBase() {
  const el = rootEl.value
  const half = el && el.clientWidth ? el.clientWidth / 2 : 0
  return half - props.cardWidth / 2
}

/* 目标索引取与当前进度「同一圈」的副本，换卡才走最短路径、不绕圈。 */
function galleryLoop(value) {
  const n = count.value || 1
  return value + n * Math.round((galleryIndex.value - value) / n)
}

/* 以居中索引为目标的弹簧：distance 是一格，手感可预期。 */
function goGallery(next) {
  const n = count.value || 1
  const target = galleryLoop(next)
  if (Math.abs(target - galleryIndex.value) < 0.001) return
  animateTo(() => galleryIndex.value, value => { galleryIndex.value = value }, target)
}

/* ---------------- circular：圆环 ---------------- */
const rotation = ref(0)
const stepAngle = computed(() => (count.value ? 360 / count.value : 0))
const ringRadius = computed(() => {
  const w = props.cardWidth
  const a = (stepAngle.value * Math.PI) / 180
  return Math.max(w * 0.62, (w * 0.5) / Math.max(0.18, Math.tan(a / 2)))
})
let rotationStart = 0
const circularActive = ref(0)

function circularStyle(index, item) {
  const angle = index * stepAngle.value + rotation.value
  const rad = (angle * Math.PI) / 180
  const facing = Math.max(0, Math.cos(rad))
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'rotateY(' + angle + 'deg) translateZ(' + ringRadius.value + 'px)',
    opacity: String(0.26 + 0.74 * facing),
    filter: facing < 0.6 ? 'blur(' + ((0.6 - facing) * 3).toFixed(2) + 'px)' : '',
    zIndex: String(10 + Math.round(facing * 20))
  }
}

function circularNearest() {
  const step = stepAngle.value || 1
  return Math.round(rotation.value / step) * step
}

/* ---------------- depth：Z 轴轨道 ---------------- */
/* depthDrag 的单位是「卡」，不是像素：拖动 1 张卡宽 = 1 格，
   松手按速度投射后吸附到整格。跟手和惯性都用同一套弹簧，所以
   拖得越远冲得越远，落点又是整格 —— 之前按固定阈值换一张，手感是木的。 */
const depthDrag = ref(0)
const depthActive = computed(() => active.value)
let depthStart = 0
const depthStepPx = computed(() => Math.max(88, props.cardWidth * 0.86))

function depthCommit(steps, velocity = 0) {
  if (!count.value) return
  const next = Math.max(0, Math.min(count.value - 1, active.value + steps))
  const moved = next - active.value
  if (!moved) {
    /* 到头了：把残余的越界量弹回 0，给一个「碰壁」的回弹。 */
    animateTo(() => depthDrag.value, value => { depthDrag.value = value }, 0, null, { kind: 'settle', velocity })
    return
  }
  /* 先让轨道滑到目标格，再在同一帧里把 active 加上去、depthDrag 减回来：
     两张卡的位置完全连续，不会「先归零再切卡」。 */
  animateTo(() => depthDrag.value, value => { depthDrag.value = value }, moved, () => {
    pick(next)
    depthDrag.value -= moved
  }, { kind: 'settle', velocity })
}

function depthStyle(index, item) {
  const raw = index - depthActive.value - depthDrag.value
  const d = Math.max(-3.4, Math.min(3.4, raw))
  const abs = Math.abs(d)
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(' + d * depthStepPx.value + 'px,' + abs * -8 + 'px,' + -abs * 130 + 'px) scale(' + (1 - Math.min(0.34, abs * 0.13)) + ')',
    opacity: String(Math.max(0, 1 - abs * 0.3)),
    filter: abs > 0.6 ? 'blur(' + ((abs - 0.6) * 2.4).toFixed(2) + 'px)' : '',
    zIndex: String(30 - Math.round(abs * 8))
  }
}

function depthStep(delta) {
  if (!count.value) return
  depthCommit(delta)
}

/* ---------------- wall：透视墙 ---------------- */
/* 整面墙由「同一组卡 × 3 份」拼成，位移在 -loop .. 0 之间循环，
   走到 -loop 就无缝接到 0 —— 之前按固定 620px 取模，卡片走到头会闪一下，
   而且内容只铺了上半屏，下半屏是空的。 */
const driftY = ref(0)
let wallLast = 0
const wallPlaneEl = ref(null)
const wallLoop = ref(240)
const wallTiles = computed(() => {
  if (!count.value) return []
  const total = Math.max(18, count.value * 3)
  return Array.from({ length: total }, (_, i) => ({ item: props.items[i % count.value], index: i % count.value }))
})

function wrapDrift() {
  const loop = wallLoop.value || 1
  while (driftY.value <= -loop) driftY.value += loop
  while (driftY.value > 0) driftY.value -= loop
}

let wallFrame = 0
function wallTick(now) {
  const dt = wallLast ? Math.min(48, now - wallLast) : 16
  wallLast = now
  if (props.variant === 'wall' && !(dragging && axis === 'y')) {
    driftY.value -= dt * 0.03
    wrapDrift()
  }
  wallFrame = requestAnimationFrame(wallTick)
}

/* ---------------- scroll-stack：滚动压栈 ---------------- */
const scrollProgress = ref(0)
function onScroll(event) {
  if (props.variant !== 'scroll-stack') return
  const el = event.target
  const total = Math.max(1, el.scrollHeight - el.clientHeight)
  scrollProgress.value = el.scrollTop / total
}
function stackScrollStyle(index, item) {
  const total = Math.max(1, count.value - 1)
  const pin = index / total
  /* 提前 1.2 张就开始缩：不等滚到自己那一格，卡片已经开始「被压」。 */
  const lead = Math.max(0, (scrollProgress.value - pin) * total + 1.2)
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(0,' + Math.round(index * 9) + 'px,0) scale(' + (1 - Math.min(0.13, lead * 0.026)) + ')',
    /* 压栈靠「变淡」表达层次，不再把整张卡压暗到看不清。 */
    opacity: String(1 - Math.min(0.42, lead * 0.11)),
    filter: 'brightness(' + (1 - Math.min(0.12, lead * 0.045)) + ')' + (lead > 2.2 ? ' blur(' + Math.min(2, (lead - 2.2) * 0.8).toFixed(2) + 'px)' : ''),
    zIndex: String(10 + index)
  }
}
function scrollToCard(index) {
  const el = scrollerEl.value
  if (!el) return
  const inner = el.firstElementChild
  const target = inner && inner.children[index]
  if (!target) return
  el.scrollTo({ top: Math.max(0, target.offsetTop - el.clientHeight * 0.18), behavior: 'smooth' })
}

/* ---------------- stack / swap：牌堆 ---------------- */
const pile = ref([])
watch(count, value => {
  pile.value = Array.from({ length: value }, (_, i) => i)
}, { immediate: true })

const front = computed(() => pile.value[0] ?? 0)
/* swap = 3D 轮换：rest → exit（前卡向下退出）→ enter（从后层重新进场）。
   stack = 物理牌堆：直接重排，被甩出的卡靠 transform 过渡「钻回堆底」。 */
const swapPhase = ref('rest')
const enteringIndex = ref(-1)
/* 最上面那张的跟手 / 飞出状态 */
const frontMotion = ref({ x: 0, y: 0, rot: 0, scale: 1, flying: false, dim: 0 })
let pileStartX = 0
let pileStartY = 0

/* 甩出去那张的「回堆底」姿态：用 tuck 弹簧把飞出姿态收进堆底，
   而不是让 CSS 从重置后的原位重新过渡（那看起来就是「闪现」）。 */
const tuck = ref(null)
let tuckCancel = null
function stopTuck() {
  if (tuckCancel) { tuckCancel(); tuckCancel = null }
  tuck.value = null
}
function startTuck(id, from) {
  const p = Math.max(1, pile.value.length - 1)
  const to = { x: p * 9, y: p * -7, rot: (p % 2 ? 1.4 : -1.4) * p, scale: 1 - p * 0.055 }
  stopTuck()
  tuck.value = { id, ...from }
  const preset = SPRINGS.tuck || SPRINGS.settle
  const keys = Object.keys(to)
  const cancelers = []
  let left = keys.length
  const settle = () => { if (--left <= 0) { tuck.value = null; tuckCancel = null } }
  keys.forEach(key => {
    cancelers.push(animateSpring({
      from: from[key],
      to: to[key],
      stiffness: preset.stiffness,
      damping: preset.damping,
      onUpdate: value => { if (tuck.value && tuck.value.id === id) tuck.value = { ...tuck.value, [key]: value } },
      onDone: () => { settle() }
    }))
  })
  tuckCancel = () => cancelers.forEach(cancel => cancel && cancel())
}

function pileStyle(position, item, index) {
  if (tuck.value && index === tuck.value.id && position === pile.value.length - 1) {
    const t = tuck.value
    return {
      '--card-tone': item.tone || 'primary',
      transform: 'translate3d(' + t.x + 'px,' + t.y + 'px,0) rotate(' + t.rot + 'deg) scale(' + t.scale + ')',
      opacity: '1',
      filter: '',
      zIndex: String(50 - position),
      transition: 'none'
    }
  }
  if (position === 0) {
    const m = frontMotion.value
    /* 拖动时按速度与位移算「倾斜」（lean）：左右甩 → 绕 Y 转，上下拉 → 绕 X 转。
       松手后 tilt 归零（face），这就是原库 lean / face 两档弹簧的简化版。 */
    return {
      '--card-tone': item.tone || 'primary',
      transform:
        'translate3d(' + m.x + 'px,' + m.y + 'px,0) ' +
        'rotate(' + m.rot + 'deg) ' +
        'rotateX(' + (m.tiltX || 0) + 'deg) rotateY(' + (m.tiltY || 0) + 'deg) ' +
        'scale(' + m.scale + ')',
      opacity: swapPhase.value === 'exit' ? '0' : String(1 - m.dim * 0.6),
      filter: swapPhase.value === 'exit' ? 'blur(6px)' : '',
      zIndex: '60',
      transition: swapPhase.value === 'exit'
        ? 'transform 240ms cubic-bezier(.5,0,.75,0), opacity 240ms ease, filter 240ms ease'
        : (m.flying ? 'transform 280ms cubic-bezier(.3,.7,.3,1), opacity 260ms ease' : 'none')
    }
  }
  /* 越靠后越沉：位移 + 压暗 + 轻微模糊，像一叠真的牌。 */
  const shade = Math.min(0.28, position * 0.07)
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(' + position * 9 + 'px,' + position * -7 + 'px,' + -position * 26 + 'px) rotate(' + (position % 2 ? 1.4 : -1.4) * position + 'deg) scale(' + (1 - position * 0.055) + ')',
    opacity: String(Math.max(0, 1 - position * 0.16)),
    filter: 'brightness(' + (1 - shade) + ')' + (position > 1 ? ' blur(' + Math.min(2, position * 0.5) + 'px)' : ''),
    zIndex: String(50 - position),
    transition: 'transform 320ms cubic-bezier(.22,1.2,.36,1), opacity var(--t-fade), filter var(--t-fade)'
  }
}

/* 牌堆：直接重排（前卡靠 transform 过渡飞过去/钻到底）。 */
function advancePile(tuckFrom = null) {
  if (pile.value.length < 2) return
  const moved = pile.value[0]
  const next = pile.value.slice(1)
  next.push(moved)
  pile.value = next
  frontMotion.value = { x: 0, y: 0, rot: 0, scale: 1, tiltX: 0, tiltY: 0, flying: false, dim: 0 }
  pick(pile.value[0])
  /* 同一帧就把飞出姿态接到堆底，避免先跳回原位再过渡。 */
  if (tuckFrom) startTuck(moved, tuckFrom)
}

/* 轮换：前卡先向下「退出」，再从后层重新进场（rest → exit → enter）。 */
function advanceSwap() {
  if (pile.value.length < 2 || swapPhase.value !== 'rest') return
  swapPhase.value = 'exit'
  setTimeout(() => {
    const next = pile.value.slice(1)
    const moved = pile.value[0]
    next.push(moved)
    pile.value = next
    enteringIndex.value = moved
    swapPhase.value = 'enter'
    frontMotion.value = { x: 0, y: 0, rot: 0, scale: 1, tiltX: 0, tiltY: 0, flying: false, dim: 0 }
    pick(next[0])
    setTimeout(() => {
      swapPhase.value = 'rest'
      enteringIndex.value = -1
    }, 360)
  }, 260)
}

/* 甩出去：先飞出去，再绕到牌堆最下面。 */
function flingFront(direction) {
  if (pile.value.length < 2) return
  if (props.variant === 'swap') { advanceSwap(); return }
  const from = { x: direction * 240, y: -46, rot: direction * 20, scale: 0.94 }
  frontMotion.value = { ...from, tiltX: -10, tiltY: direction * 12, flying: true, dim: 1 }
  /* 让飞出这一帧先落地，再换牌 —— 换牌时由 tuck 弹簧从这个姿态续接。 */
  requestAnimationFrame(() => {
    setTimeout(() => advancePile(from), 200)
  })
}

/* ---------------- bounce：扇形 ---------------- */
const spread = ref(0)
let spreadStart = 0

function bounceStyle(index, item) {
  const mid = (count.value - 1) / 2
  const o = index - mid
  /* 拖动改变张开角度：往右拖 = 扇子展开，往左拖 = 收拢。 */
  const openScale = 1 + spread.value / 180
  const angle = o * 9 * openScale
  const spreadX = o * 34 * openScale
  /* 沿一段很浅的圆弧排布：中间的卡最高，两侧略低。 */
  const y = Math.abs(o) * Math.abs(o) * 2.2
  const scale = 1 - Math.abs(o) * 0.035
  return {
    '--card-tone': item.tone || 'primary',
    '--i': index,
    '--bx': spreadX + 'px',
    '--by': y + 'px',
    transform: 'translate3d(' + spreadX + 'px,' + y + 'px,0) rotate(' + angle + 'deg) scale(' + scale + ')',
    zIndex: String(index === active.value ? 42 : 30 - Math.round(Math.abs(o) * 2))
  }
}

/* ---------------- 形态分派：拖拽 / 松手 / 点击 ---------------- */
function applyDrag(dx, dy) {
  const v = props.variant
  if (v === 'gallery') galleryIndex.value = galleryIndexStart - dx / Math.max(1, span.value)
  else if (v === 'circular') rotation.value = rotationStart + dx * 0.3
  else if (v === 'depth') {
    const step = depthStepPx.value
    let raw = depthStart - dx / step
    /* 两端越界走橡皮筋：拖到头还能再拉一点，但拉不远。 */
    const lowest = -active.value
    const highest = count.value - 1 - active.value
    if (raw < lowest) raw = lowest - (lowest - raw) * 0.32
    else if (raw > highest) raw = highest + (raw - highest) * 0.32
    depthDrag.value = raw
  }
  else if (v === 'wall') { driftY.value += dy * 0.6; wrapDrift() }
  else if (v === 'stack' || v === 'swap') {
    const width = props.cardWidth * 0.92
    /* lean：横向甩 → 绕 Y 倾斜，纵向拉 → 绕 X 倾斜（上限 14°）。 */
    const tiltY = Math.max(-14, Math.min(14, (vx * 120 + (dx / Math.max(1, width)) * 22)))
    const tiltX = Math.max(-12, Math.min(12, (-vy * 100) + (dy / Math.max(1, width)) * -14))
    frontMotion.value = {
      x: dx,
      y: dy * 0.42,
      rot: dx * 0.055,
      tiltX,
      tiltY,
      scale: 1 - Math.min(0.06, Math.abs(dx) / (width * 4)),
      flying: false,
      dim: Math.min(0.32, Math.abs(dx) / (width * 2))
    }
  } else if (v === 'bounce') spread.value = spreadStart + dx * 0.5
}

function endDrag(dx, dy) {
  const v = props.variant
  if (v === 'gallery') {
    /* 甩动：把像素速度换算成「每秒几张」，作为弹簧初速度注入，
       冲多远由弹簧自己决定，落点永远是整格（正中）。 */
    const step = Math.max(1, span.value)
    const velocity = Math.max(-1600, Math.min(1600, vx * 1000))
    const projected = galleryIndex.value - (velocity * 0.18) / step
    const target = galleryLoop(Math.round(projected))
    animateTo(() => galleryIndex.value, value => { galleryIndex.value = value }, target, null, { kind: 'settle', velocity: -velocity / step })
    pick(((Math.round(target) % count.value) + count.value) % count.value)
  } else if (v === 'circular') {
    const step = stepAngle.value || 1
    const velocity = Math.max(-420, Math.min(420, vx * 300))
    const projected = rotation.value + velocity * 0.22
    animateTo(() => rotation.value, value => { rotation.value = value }, Math.round(projected / step) * step, () => {
      const index = ((Math.round(-rotation.value / step) % count.value) + count.value) % count.value
      pick(index)
    }, { kind: 'settle', velocity })
  } else if (v === 'depth') {
    const step = depthStepPx.value
    /* 速度换算成「每秒几张」，作为初速度注入；0.14s 的投射窗口。 */
    const projected = depthDrag.value + (-vx / step) * 140
    let steps = Math.round(projected)
    /* 明确甩了一下但没到半格：也认一格，不然「甩不动」。 */
    if (!steps && Math.abs(projected) > 0.28) steps = Math.sign(projected)
    const velocity = (-vx / step) * 1000
    depthCommit(steps, Math.max(-6, Math.min(6, velocity)))
  } else if (v === 'wall') {
    /* 惯性再飘一点，然后继续自动漂移；目标先折进 -loop..0，避免绕一整屏。 */
    const loop = wallLoop.value || 1
    let target = driftY.value + Math.max(-260, Math.min(260, vy * 220))
    while (target <= -loop) target += loop
    while (target > 0) target -= loop
    animateTo(() => driftY.value, value => { driftY.value = value }, target)
  } else if (v === 'stack' || v === 'swap') {
    const width = props.cardWidth * 0.92
    const reach = Math.max(56, width * 0.3)
    if (Math.abs(dx) > reach || Math.abs(vx) > 0.55) flingFront(dx >= 0 ? 1 : -1)
    else {
      /* 没到阈值：回弹（face + settle），倾斜一起回正。 */
      frontMotion.value = { ...frontMotion.value, x: 0, y: 0, rot: 0, tiltX: 0, tiltY: 0, scale: 1, dim: 0, flying: true }
      setTimeout(() => { frontMotion.value = { x: 0, y: 0, rot: 0, tiltX: 0, tiltY: 0, scale: 1, flying: false, dim: 0 } }, 300)
    }
  } else if (v === 'bounce') {
    animateTo(() => spread.value, value => { spread.value = value }, 0)
  }
}

function hitCard(index) {
  const v = props.variant
  if (!Number.isFinite(index)) return
  if (v === 'gallery') {
    /* 目标是把这张推到视口正中（不是把轨道推到 0）。 */
    pick(index)
    goGallery(index)
  } else if (v === 'circular') {
    const step = stepAngle.value || 1
    pick(index)
    animateTo(() => rotation.value, value => { rotation.value = value }, -index * step)
  } else if (v === 'depth') depthCommit(index - active.value)
  else if (v === 'wall' || v === 'bounce') pick(index)
  else if (v === 'scroll-stack') scrollToCard(index)
  else if (v === 'stack' || v === 'swap') {
    if (index === front.value) {
      if (v === 'swap') advanceSwap()
      else advancePile()
    } else pick(index)
  }
}

/* ---------------- 键盘 ---------------- */
function onKeydown(event) {
  const v = props.variant
  const left = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  const right = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  if (!left && !right) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      hitCard(v === 'stack' || v === 'swap' || v === 'scroll-stack' ? front.value : active.value)
    }
    return
  }
  event.preventDefault()
  const delta = right ? 1 : -1
  if (v === 'gallery') hitCard(Math.max(0, Math.min(count.value - 1, active.value + delta)))
  else if (v === 'circular') depthStep(delta)
  else if (v === 'depth') depthCommit(delta)
  else if (v === 'stack' || v === 'swap') {
    if (delta > 0) advancePile()
    else {
      /* 往回：把最后一张翻到最前面。 */
      if (pile.value.length > 1) {
        const next = pile.value.slice()
        next.unshift(next.pop())
        pile.value = next
        pick(next[0])
      }
    }
  } else if (v === 'scroll-stack') scrollToCard(Math.max(0, Math.min(count.value - 1, active.value + delta)))
  else hitCard(Math.max(0, Math.min(count.value - 1, active.value + delta)))
}

/* ---------------- 生命周期 / 自动播放 ---------------- */
let autoTimer = 0
function resetVariant() {
  stopAllMotion()
  stopTuck()
  galleryIndexStart = galleryIndex.value
  galleryIndex.value = active.value
  rotation.value = 0
  depthDrag.value = 0
  spread.value = 0
  frontMotion.value = { x: 0, y: 0, rot: 0, scale: 1, flying: false, dim: 0 }
  if (props.variant === 'scroll-stack' && scrollerEl.value) scrollerEl.value.scrollTop = 0
}

function startAuto() {
  clearInterval(autoTimer)
  const v = props.variant
  const shouldRun = v === 'swap' || (props.auto && (v === 'depth' || v === 'gallery' || v === 'circular' || v === 'wall'))
  if (!shouldRun) return
  autoTimer = setInterval(() => {
    if (dragging) return
    if (v === 'swap') advanceSwap()
    else if (v === 'stack') advancePile()
    else if (v === 'depth') depthStep(1)
    else if (v === 'gallery') hitCard(Math.min(count.value - 1, active.value + 1))
    else if (v === 'circular') hitCard((active.value + 1) % Math.max(1, count.value))
  }, Math.max(700, props.interval))
}

watch(() => [props.variant, props.auto, props.interval], () => { startAuto(); resetVariant() }, { deep: true })

function recenterGallery() {
  if (props.variant !== 'gallery') return
  stopAllMotion()
  galleryIndex.value = active.value
}

function measureWall() {
  const el = wallPlaneEl.value
  if (!el) return
  const height = el.scrollHeight || el.offsetHeight || 0
  if (height > 0) wallLoop.value = Math.max(80, height / 3)
}

onMounted(() => {
  startAuto()
  nextTick(() => { recenterGallery(); measureWall() })
  window.addEventListener('resize', measureWall)
  window.addEventListener('resize', recenterGallery)
  wallFrame = requestAnimationFrame(wallTick)
  nextTick(() => { if (props.variant === 'scroll-stack' && scrollerEl.value) scrollerEl.value.scrollTop = 0 })
})
onBeforeUnmount(() => {
  stopAllMotion()
  stopTuck()
  clearInterval(autoTimer)
  window.removeEventListener('resize', recenterGallery)
  window.removeEventListener('resize', measureWall)
  if (wallFrame) cancelAnimationFrame(wallFrame)
})

watch(() => props.modelValue, value => {
  if (Number.isFinite(value) && value !== active.value) active.value = Math.max(0, Math.min(count.value - 1, value))
})
</script>

<template>
  <div
    ref="rootEl"
    class="ui-card-group"
    :class="`is-${variant}`"
    :style="{ '--cg-height': height + 'px', '--cg-card-width': cardWidth + 'px', '--cg-gap': gap + 'px' }"
    tabindex="0"
    role="group"
    aria-label="卡片组（可拖动 / 方向键切换）"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @keydown="onKeydown"
  >
    <div :key="enterKey" ref="stageEl" class="ui-card-group__stage" :class="`is-${variant}`">
      <!-- ---------- gallery ---------- -->
      <div v-if="variant === 'gallery'" class="ui-card-group__gallery">
        <div class="ui-card-group__track" :style="{ transform: 'translate3d(' + wrapped + 'px,0,0)' }">
          <div
            v-for="(item, index) in galleryList"
            :key="'g' + index"
            class="ui-card-group__card"
            :class="{ 'is-active': index % (count || 1) === active }"
            :data-card-index="index % (count || 1)"
            :style="[galleryCardStyle(index, item), { '--i': index }]"
          >
            <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" draggable="false" />
            <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
            <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
          </div>
        </div>
      </div>

      <!-- ---------- circular ---------- -->
      <div v-else-if="variant === 'circular'" class="ui-card-group__ring">
        <div
          v-for="(item, index) in items"
          :key="'c' + index"
          class="ui-card-group__card ui-card-group__ring-card"
          :class="{ 'is-active': index === active }"
          :data-card-index="index"
          :style="[circularStyle(index, item), { '--i': index }]"
        >
          <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" draggable="false" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
        </div>
      </div>

      <!-- ---------- depth ---------- -->
      <div v-else-if="variant === 'depth'" class="ui-card-group__depth">
        <div
          v-for="(item, index) in items"
          :key="'d' + index"
          class="ui-card-group__card ui-card-group__depth-card"
          :class="{ 'is-active': index === active }"
          :data-card-index="index"
          :style="[depthStyle(index, item), { '--i': index }]"
        >
          <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" draggable="false" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
        </div>
      </div>

      <!-- ---------- wall ---------- -->
      <div v-else-if="variant === 'wall'" class="ui-card-group__wall">
        <div
          ref="wallPlaneEl"
          class="ui-card-group__wall-plane"
          :style="{ transform: 'rotateX(18deg) rotateZ(-4deg) translate3d(0,' + driftY + 'px,0)' }"
        >
          <div
            v-for="(tile, index) in wallTiles"
            :key="'w' + index"
            class="ui-card-group__tile"
            :data-card-index="tile.index"
          >
            <img v-if="tile.item.image" :src="tile.item.image" :alt="tile.item.title" loading="lazy" draggable="false" />
            <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
            <span class="ui-card-group__tile-label">{{ tile.item.title }}</span>
          </div>
        </div>
      </div>

      <!-- ---------- scroll-stack ---------- -->
      <div v-else-if="variant === 'scroll-stack'" ref="scrollerEl" class="ui-card-group__scroller" @scroll.passive="onScroll">
        <div class="ui-card-group__scroller-inner" :style="{ height: (count + 1) * 64 + '%' }">
          <div
            v-for="(item, index) in items"
            :key="'s' + index"
            class="ui-card-group__pin"
            :data-card-index="index"
            :style="[{ top: index * 9 + 'px' }, stackScrollStyle(index, item)]"
          >
            <div class="ui-card-group__pin-card">
              <b>{{ item.title }}</b>
              <small v-if="item.meta">{{ item.meta }}</small>
              <span class="ui-card-group__pin-index">{{ index + 1 }} / {{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ---------- stack / swap ---------- -->
      <div v-else-if="variant === 'stack' || variant === 'swap'" class="ui-card-group__pile">
        <div
          v-for="(index, position) in pile"
          :key="'p' + index"
          class="ui-card-group__card ui-card-group__pile-card"
          :class="{
            'is-front': position === 0,
            'is-flying': position === 0 && frontMotion.flying,
            'is-exiting': variant === 'swap' && position === 0 && swapPhase === 'exit',
            'is-entering': variant === 'swap' && enteringIndex === index && swapPhase !== 'rest'
          }"
          :data-card-index="index"
          :style="[pileStyle(position, items[index] || {}, index), { '--i': position }]"
        >
          <img v-if="items[index] && items[index].image" :src="items[index].image" :alt="items[index].title" loading="lazy" draggable="false" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__caption">
            <b>{{ items[index] && items[index].title }}</b>
            <small v-if="items[index] && items[index].meta">{{ items[index].meta }}</small>
          </span>
        </div>
        <div class="ui-card-group__pile-actions">
          <button type="button" class="ui-card-group__pill" @click.stop="advancePile">下一张</button>
          <button type="button" class="ui-card-group__pill" @click.stop="flingFront(-1)">甩掉</button>
        </div>
      </div>

      <!-- ---------- bounce ---------- -->
      <div v-else class="ui-card-group__bounce">
        <div
          v-for="(item, index) in items"
          :key="'b' + index"
          class="ui-card-group__card ui-card-group__bounce-card"
          :class="{ 'is-active': index === active }"
          :data-card-index="index"
          :style="[bounceStyle(index, item), { '--i': index }]"
        >
          <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" draggable="false" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
        </div>
      </div>
    </div>

    <!-- 底部提示：可拖 / 可点 / 方向键 -->
    <span class="ui-card-group__hint" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 12h8M11 8l-3 4 3 4M13 8l3 4-3 4"/></svg>
      拖拽 · 点击 · 方向键
    </span>
  </div>
</template>

<style scoped>
.ui-card-group {
  position: relative;
  width: 100%;
  outline: none;
  touch-action: pan-y;
  user-select: none;
  cursor: grab;
}
.ui-card-group:active { cursor: grabbing; }
.ui-card-group:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 3px; }
.ui-card-group__stage { position: relative; }

/* ---------- 通用卡片 ---------- */
.ui-card-group__card {
  position: relative;
  flex: 0 0 auto;
  /* 入场位移随气质放大（活泼模式更远一点）。 */
  animation-name: cgCardIn;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(16px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  box-shadow: var(--elev-card);
  transform-origin: center center;
  animation: cgCardIn 460ms var(--spring-view) both;
  animation-delay: calc(var(--i, 0) * 34ms);
}
.ui-card-group__card img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.ui-card-group__blank {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 120% at 18% 0%, color-mix(in oklab, var(--primary) 32%, transparent), transparent 62%),
    radial-gradient(120% 120% at 92% 100%, color-mix(in oklab, var(--accent, var(--primary)) 24%, transparent), transparent 58%),
    linear-gradient(150deg, var(--surface-container-high), var(--surface-container));
}
.ui-card-group__caption {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 18px 12px 9px;
  background: linear-gradient(to top, rgba(0, 0, 0, .52), transparent);
  color: #fff;
  font-size: var(--fs-tiny);
}
.ui-card-group__caption b { font-weight: var(--w-label); }
.ui-card-group__caption small { font-size: var(--fs-micro); opacity: .82; }
/* 选中的卡：抬起 + 亮边，其它卡退后。 */
.ui-card-group__card.is-active { border-color: color-mix(in oklab, var(--primary) 55%, var(--outline-variant)); }

/* ---------- gallery ---------- */
.ui-card-group__gallery {
  height: var(--cg-height);
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
}
.ui-card-group__track {
  display: flex;
  gap: var(--cg-gap);
  align-items: center;
  height: 100%;
  will-change: transform;
}
.ui-card-group__gallery .ui-card-group__card {
  width: var(--cg-card-width);
  height: 74%;
  transition: transform var(--t-panel) var(--spring-view), opacity var(--t-fade), filter var(--t-fade), border-color var(--t-fade);
}

/* ---------- circular ---------- */
.ui-card-group__ring {
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 1100px;
  transform-style: preserve-3d;
}
.ui-card-group__ring-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.84);
  aspect-ratio: 4 / 3;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: transform var(--t-fade) linear, opacity var(--t-fade), filter var(--t-fade);
}

/* ---------- depth ---------- */
.ui-card-group__depth {
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 820px;
  transform-style: preserve-3d;
}
.ui-card-group__depth-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.9);
  aspect-ratio: 4 / 3;
  transition: transform var(--t-panel) var(--spring-view), opacity var(--t-fade), filter var(--t-fade);
}

/* ---------- wall ---------- */
.ui-card-group__wall {
  position: relative;
  height: var(--cg-height);
  overflow: hidden;
  perspective: 900px;
  mask-image: radial-gradient(130% 120% at 50% 50%, #000 55%, transparent 100%);
}
/* 平面比舞台更宽更高，旋转后仍然铺满；translateY 在 -1/3 高度处循环。 */
.ui-card-group__wall-plane {
  position: absolute;
  left: -22%;
  top: -42%;
  width: 144%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
  will-change: transform;
  transform-origin: 50% 0;
}
.ui-card-group__tile {
  position: relative;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  border-radius: calc(12px * var(--radius-scale));
  border: var(--border-w) solid var(--outline-variant);
  background: var(--surface-container-low);
  transition: transform var(--t-panel) var(--spring-view), box-shadow var(--t-fade), border-color var(--t-fade);
}
.ui-card-group__tile img { width: 100%; height: 100%; object-fit: cover; }
.ui-card-group__tile-label {
  position: absolute;
  inset: auto 6px 5px 6px;
  color: var(--on-surface);
  font-size: var(--fs-micro);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-card-group__tile:hover {
  transform: translateZ(52px) scale(1.06);
  box-shadow: var(--elev-tip);
  border-color: var(--primary);
  z-index: 2;
}

/* ---------- scroll-stack ---------- */
.ui-card-group__scroller {
  height: var(--cg-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  border-radius: inherit;
  cursor: default;
}
.ui-card-group__scroller::-webkit-scrollbar { display: none; }
.ui-card-group__scroller-inner { position: relative; padding: 0 2px; }
.ui-card-group__pin { position: sticky; height: 60px; transform-origin: top center; transition: transform var(--t-fade), filter var(--t-fade); }
.ui-card-group__pin-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  padding: 11px 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: linear-gradient(140deg, var(--surface-container-low), var(--surface-container));
  box-shadow: var(--elev-card);
  font-size: var(--fs-small);
}
.ui-card-group__pin-card small { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-card-group__pin-index { position: absolute; right: 14px; top: 12px; color: var(--on-surface-variant); font-size: var(--fs-micro); font-variant-numeric: tabular-nums; }

/* ---------- stack / swap ---------- */
.ui-card-group__pile {
  position: relative;
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 1100px;
}
.ui-card-group__pile-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.92);
  aspect-ratio: 4 / 3;
  transform-style: preserve-3d;
}
/* 牌堆卡不参与「入场动画」：重新排序时 --i 变化会让 cgCardIn 重跑，
   把飞出的牌瞬间拉回原位 —— 这正是「回队尾闪现」的根因。 */
.ui-card-group__pile-card { animation: none; }
.ui-card-group__pile-card.is-front { cursor: grab; }
.ui-card-group__pile-card.is-front.is-flying { pointer-events: none; }
/* 轮换：退出的那张已经淡出，重新进场的那张从后层抬起来。 */
.ui-card-group__pile-card.is-entering {
  animation: cgSwapEnter 360ms cubic-bezier(.22,1.2,.36,1) both;
}
@keyframes cgSwapEnter {
  from { opacity: 0; transform: translate3d(0, 16%, -40px) rotateX(-18deg) scale(.86); filter: blur(8px); }
  to { opacity: 1; filter: blur(0); }
}
.ui-card-group__pile-actions {
  position: absolute;
  inset: auto 0 6px 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 70;
}
.ui-card-group__pill {
  padding: 7px 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 84%, transparent);
  color: var(--on-surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: transform var(--t-feedback), border-color var(--t-fade);
}
.ui-card-group__pill:active { transform: scale(var(--press-scale)); }

/* ---------- bounce ---------- */
.ui-card-group__bounce {
  height: var(--cg-height);
  position: relative;
  display: grid;
  place-items: center;
  perspective: 900px;
}
.ui-card-group__bounce-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.68);
  aspect-ratio: 4 / 3;
  transition: transform var(--t-panel) var(--spring-view), box-shadow var(--t-fade), border-color var(--t-fade);
  animation: cgBounceIn 620ms var(--spring-view) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}
/* 悬停的那张扶正并抬起来，其它保持扇形倾斜。 */
.ui-card-group__bounce-card {
  /* 扇形以卡片下缘外的共同圆心为轴：旋转自然向外张开，不再像随机歪斜。 */
  transform-origin: 50% 150%;
}
.ui-card-group__bounce-card:hover,
.ui-card-group__bounce-card.is-active {
  transform: translate3d(var(--bx, 0px), calc(var(--by, 0px) - 14px), 0) rotate(0deg) scale(1.08) !important;
  z-index: 40;
  box-shadow: var(--elev-tip);
}

/* ---------- 入场 / 提示 ---------- */
@keyframes cgCardIn {
  from {
    opacity: 0;
    transform: translateY(calc(18px * var(--motion-distance, 1))) scale(calc(1 - 0.06 * var(--motion-scale, 1)));
    filter: blur(var(--motion-blur, 10px));
  }
  to { opacity: 1; filter: blur(0); }
}
@keyframes cgBounceIn {
  0% { opacity: 0; transform: translate3d(0, 130%, 0) rotate(0deg) scale(.7); filter: blur(10px); }
  62% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; }
}
.ui-card-group__hint {
  /* 提示放在舞台右上角内侧：放到组件外面（bottom: -18px）会压住下方说明文字。 */
  position: absolute;
  right: 8px;
  top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 78%, transparent);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  opacity: .8;
  backdrop-filter: blur(6px);
  pointer-events: none;
}
.ui-card-group__hint svg { width: 13px; height: 13px; }

@media (prefers-reduced-motion: reduce) {
  .ui-card-group__card,
  .ui-card-group__bounce-card { animation: none; }
  .ui-card-group__card,
  .ui-card-group__tile,
  .ui-card-group__pill { transition-duration: .01ms; }
}
</style>
