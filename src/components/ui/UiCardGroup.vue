<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
const motion = { frame: 0, kind: '' }

function stopAllMotion() {
  if (motion.frame) cancelAnimationFrame(motion.frame)
  motion.frame = 0
  motion.kind = ''
}

/* 朝目标做阻尼补间（每帧走剩余距离的固定比例），到点即停。 */
function animateTo(getter, setter, target, done) {
  stopAllMotion()
  motion.kind = 'tween'
  const step = () => {
    const current = getter()
    const delta = target - current
    if (Math.abs(delta) < 0.4) {
      setter(target)
      motion.frame = 0
      motion.kind = ''
      if (done) done()
      return
    }
    setter(current + delta * 0.2)
    motion.frame = requestAnimationFrame(step)
  }
  motion.frame = requestAnimationFrame(step)
}

/* ---------------- gallery：横向轨道 ---------------- */
const offset = ref(0)
const span = computed(() => props.cardWidth + props.gap)
const totalWidth = computed(() => span.value * Math.max(1, count.value))
const galleryList = computed(() => (count.value ? [...props.items, ...props.items, ...props.items] : []))
let offsetStart = 0

const wrapped = computed(() => {
  if (!totalWidth.value) return 0
  let value = offset.value % totalWidth.value
  if (value > 0) value -= totalWidth.value
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

function galleryNearest() {
  const step = span.value
  return Math.round(offset.value / step) * step
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
const depthDrag = ref(0)
const depthActive = computed(() => active.value)
let depthStart = 0

function depthStyle(index, item) {
  const raw = index - depthActive.value - depthDrag.value
  const d = Math.max(-3.4, Math.min(3.4, raw))
  const abs = Math.abs(d)
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(' + d * 34 + 'px,' + abs * -8 + 'px,' + -abs * 130 + 'px) scale(' + (1 - abs * 0.13) + ')',
    opacity: String(Math.max(0, 1 - abs * 0.3)),
    filter: abs > 0.6 ? 'blur(' + ((abs - 0.6) * 2.4).toFixed(2) + 'px)' : '',
    zIndex: String(30 - Math.round(abs * 8))
  }
}

function depthStep(delta) {
  if (!count.value) return
  const next = Math.max(0, Math.min(count.value - 1, active.value + delta))
  if (next === active.value) return
  pick(next)
}

/* ---------------- wall：透视墙 ---------------- */
const driftY = ref(0)
let wallLast = 0
const wallTiles = computed(() => {
  if (!count.value) return []
  const total = Math.max(12, count.value * 4)
  return Array.from({ length: total }, (_, i) => ({ item: props.items[i % count.value], index: i % count.value }))
})
let wallFrame = 0
function wallTick(now) {
  const dt = wallLast ? Math.min(48, now - wallLast) : 16
  wallLast = now
  if (props.variant === 'wall' && dragging && axis === 'y') {
    /* 拖动时由手势写位置，自动漂移暂停。 */
  } else {
    driftY.value = (driftY.value - dt * 0.028) % 620
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
  const distance = Math.max(0, scrollProgress.value - pin) * total
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(0,' + Math.round(index * 9) + 'px,0) scale(' + (1 - Math.min(0.14, distance * 0.05)) + ')',
    filter: 'brightness(' + (1 - Math.min(0.46, distance * 0.16)) + ')' + (distance > 1.6 ? ' blur(' + ((distance - 1.6) * 0.9).toFixed(2) + 'px)' : ''),
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
/* 最上面那张的跟手 / 飞出状态 */
const frontMotion = ref({ x: 0, y: 0, rot: 0, scale: 1, flying: false, dim: 0 })
let pileStartX = 0
let pileStartY = 0

function pileStyle(position, item) {
  if (position === 0) {
    const m = frontMotion.value
    return {
      '--card-tone': item.tone || 'primary',
      transform: 'translate3d(' + m.x + 'px,' + m.y + 'px,0) rotate(' + m.rot + 'deg) scale(' + m.scale + ')',
      opacity: String(1 - m.dim * 0.6),
      zIndex: '60',
      transition: m.flying ? 'transform 260ms cubic-bezier(.3,.7,.3,1), opacity 260ms ease' : 'none'
    }
  }
  return {
    '--card-tone': item.tone || 'primary',
    transform: 'translate3d(' + position * 9 + 'px,' + position * -7 + 'px,' + -position * 26 + 'px) rotate(' + (position % 2 ? 1.4 : -1.4) * position + 'deg) scale(' + (1 - position * 0.055) + ')',
    opacity: String(Math.max(0, 1 - position * 0.16)),
    filter: position > 1 ? 'brightness(' + (1 - Math.min(0.3, position * 0.1)) + ')' : '',
    zIndex: String(50 - position),
    transition: 'transform var(--t-panel) var(--spring-view), opacity var(--t-fade), filter var(--t-fade)'
  }
}

function advancePile() {
  if (pile.value.length < 2) return
  const next = pile.value.slice(1)
  next.push(pile.value[0])
  pile.value = next
  frontMotion.value = { x: 0, y: 0, rot: 0, scale: 1, flying: false, dim: 0 }
  pick(pile.value[0])
}

/* 甩出去：先飞出去，再绕到牌堆最下面。 */
function flingFront(direction) {
  if (pile.value.length < 2) return
  frontMotion.value = { x: direction * 240, y: -46, rot: direction * 20, scale: 0.94, flying: true, dim: 1 }
  setTimeout(() => {
    advancePile()
  }, 250)
}

/* ---------------- bounce：扇形 ---------------- */
const spread = ref(0)
let spreadStart = 0

function bounceStyle(index, item) {
  const mid = (count.value - 1) / 2
  const o = index - mid
  const spreadScale = 1 + spread.value / 240
  const x = o * 54 * spreadScale
  const y = o * 8 - Math.abs(o) * 2
  return {
    '--card-tone': item.tone || 'primary',
    '--i': index,
    transform: 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + o * 6 * (1 + spread.value / 400) + 'deg) scale(' + (1 - Math.abs(o) * 0.04) + ')',
    zIndex: String(20 - Math.round(Math.abs(o)))
  }
}

/* ---------------- 形态分派：拖拽 / 松手 / 点击 ---------------- */
function applyDrag(dx, dy) {
  const v = props.variant
  if (v === 'gallery') offset.value = offsetStart + dx
  else if (v === 'circular') rotation.value = rotationStart + dx * 0.3
  else if (v === 'depth') depthDrag.value = depthStart - dx / 110
  else if (v === 'wall') driftY.value += dy * 0.6
  else if (v === 'stack' || v === 'swap') {
    frontMotion.value = {
      x: dx,
      y: dy * 0.35,
      rot: dx * 0.06,
      scale: 1 - Math.min(0.05, Math.abs(dx) / 1600),
      flying: false,
      dim: Math.min(0.3, Math.abs(dx) / 600)
    }
  } else if (v === 'bounce') spread.value = spreadStart + dx * 0.5
}

function endDrag(dx, dy) {
  const v = props.variant
  if (v === 'gallery') {
    /* 甩动：按速度多滑一段，再吸到最近格位。 */
    const projected = offset.value + vx * 260
    animateTo(() => offset.value, value => { offset.value = value }, galleryNearestOf(projected))
    const nearestIndex = Math.round(-wrapped.value / span.value) % Math.max(1, count.value)
    pick(((nearestIndex % count.value) + count.value) % count.value)
  } else if (v === 'circular') {
    const step = stepAngle.value || 1
    const projected = rotation.value + vx * 240
    animateTo(() => rotation.value, value => { rotation.value = value }, Math.round(projected / step) * step, () => {
      const index = ((Math.round(-rotation.value / step) % count.value) + count.value) % count.value
      pick(index)
    })
  } else if (v === 'depth') {
    const overflow = depthDrag.value
    const moved = Math.abs(overflow) > 0.22 || Math.abs(vx) > 0.6
    if (moved) depthStep(overflow < 0 ? 1 : -1)
    animateTo(() => depthDrag.value, value => { depthDrag.value = value }, 0)
  } else if (v === 'wall') {
    /* 惯性再飘一点，然后继续自动漂移。 */
    animateTo(() => driftY.value, value => { driftY.value = value }, driftY.value + vy * 220)
  } else if (v === 'stack' || v === 'swap') {
    if (Math.abs(dx) > 92 || Math.abs(vx) > 0.65) flingFront(dx >= 0 ? 1 : -1)
    else {
      frontMotion.value = { ...frontMotion.value, x: 0, y: 0, rot: 0, scale: 1, dim: 0, flying: true }
      setTimeout(() => { frontMotion.value = { x: 0, y: 0, rot: 0, scale: 1, flying: false, dim: 0 } }, 260)
    }
  } else if (v === 'bounce') {
    animateTo(() => spread.value, value => { spread.value = value }, 0)
  }
}

function galleryNearestOf(projected) {
  const step = span.value
  return Math.round(projected / step) * step
}

function hitCard(index) {
  const v = props.variant
  if (!Number.isFinite(index)) return
  if (v === 'gallery') {
    pick(index)
    const current = wrapped.value
    const want = -index * span.value
    /* 选到最近的一圈副本，避免绕一大圈。 */
    const delta = want - current
    animateTo(() => offset.value, value => { offset.value = value }, offset.value + delta)
  } else if (v === 'circular') {
    const step = stepAngle.value || 1
    pick(index)
    animateTo(() => rotation.value, value => { rotation.value = value }, -index * step)
  } else if (v === 'depth') pick(index)
  else if (v === 'wall' || v === 'bounce') pick(index)
  else if (v === 'scroll-stack') scrollToCard(index)
  else if (v === 'stack' || v === 'swap') {
    if (index === front.value) advancePile()
    else pick(index)
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
  else if (v === 'circular' || v === 'depth') depthStep(delta)
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
  offsetStart = offset.value
  offset.value = 0
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
    if (v === 'swap' || v === 'stack') advancePile()
    else if (v === 'depth') depthStep(1)
    else if (v === 'gallery') hitCard(Math.min(count.value - 1, active.value + 1))
    else if (v === 'circular') hitCard((active.value + 1) % Math.max(1, count.value))
  }, Math.max(700, props.interval))
}

watch(() => [props.variant, props.auto, props.interval], () => { startAuto(); resetVariant() }, { deep: true })

onMounted(() => {
  startAuto()
  wallFrame = requestAnimationFrame(wallTick)
  nextTick(() => { if (props.variant === 'scroll-stack' && scrollerEl.value) scrollerEl.value.scrollTop = 0 })
})
onBeforeUnmount(() => {
  stopAllMotion()
  clearInterval(autoTimer)
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
          class="ui-card-group__wall-plane"
          :style="{ transform: 'rotateX(24deg) rotateZ(-6deg) translate3d(0,' + driftY + 'px,0)' }"
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
          :class="{ 'is-front': position === 0, 'is-flying': position === 0 && frontMotion.flying }"
          :data-card-index="index"
          :style="[pileStyle(position, items[index] || {}), { '--i': position }]"
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
  height: var(--cg-height);
  overflow: hidden;
  perspective: 900px;
  mask-image: radial-gradient(130% 120% at 50% 50%, #000 48%, transparent 100%);
}
.ui-card-group__wall-plane {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  height: 170%;
  align-content: start;
  will-change: transform;
  transform-origin: center top;
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
.ui-card-group__pile-card.is-front { cursor: grab; animation: none; }
.ui-card-group__pile-card.is-front.is-flying { pointer-events: none; }
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
.ui-card-group__bounce-card:hover,
.ui-card-group__bounce-card.is-active {
  transform: translate3d(var(--bx, 0px), calc(var(--by, 0px) - 16px), 0) rotate(0deg) scale(1.06) !important;
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
  position: absolute;
  right: 2px;
  bottom: -18px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  opacity: .72;
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
