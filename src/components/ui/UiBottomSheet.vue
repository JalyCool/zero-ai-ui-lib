<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  animate,
  getSpringConfig,
  getSpringPhysicsConfig,
  motion,
  prefersReducedMotion,
  useMotionValue
} from '../../composables/useMotion'

/* ============================================================
   置底面板（motion-v 版）
   与原版（UiBottomSheet.vue）行为一致，动画引擎换成 motion：
   · 进出：外层 frame 的 translateY 走声明式 :animate
     （sheet 弹簧进、exit 弹簧出，关闭途中再打开可打断续接）
   · 高度吸附：面板高度绑 MotionValue；把手拖拽时 .set() 跟手
     （无动画），松手用物理弹簧吸附——duration-based 弹簧会忽略
     初速度，所以吸附走 getSpringPhysicsConfig + velocity，
     甩得越快冲得越远，落点干净
   · 遮罩继续走全局 .ui-scrim 的 CSS 过渡（backdrop-filter 约束不变）
   · anchors 档位 / 全内容锚点 / scrim=false 拦截层：逻辑照旧
   ============================================================ */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '面板' },
  /* 兼容旧参数：作为「全内容锚点」的上限 */
  maxHeight: { type: String, default: '90dvh' },
  closeOnBackdrop: { type: Boolean, default: true },
  /* 是否压暗 + 模糊背景；false = 透明拦截层的无背景模态 */
  scrim: { type: Boolean, default: true },
  /* 固定锚点（视口比例），全内容锚点自动追加 */
  anchors: { type: Array, default: null }
})

const emit = defineEmits(['update:modelValue', 'anchor-change'])

const CLOSE_BUFFER = 80
const SCRIM_FADE = 420
/* 拖拽松手后的速度投射时长（ms），模拟惯性。 */
const FLING_MS = 140
/* 低于最低锚点这么多像素 -> 判定关闭意图。 */
const DISMISS_PX = 72

const FRAME_HIDDEN = { y: '105%' }
const FRAME_SHOWN = { y: '0%' }

const panel = ref(null)
const bodyEl = ref(null)
const handleEl = ref(null)
const headEl = ref(null)
const footerEl = ref(null)
const rendered = ref(false)
const open = ref(false)
const closing = ref(false)
const dragging = ref(false)

const anchorList = ref([])
const heightPx = ref(0)

/* 面板高度：拖拽 .set() 跟手，松手 animate 吸附。 */
const heightMv = useMotionValue(0)

let scrollEl = null
let previousOverflow = ''
let closeTimer = null
let resizeObserver = null

function panelNode() {
  const node = panel.value
  return node?.$el || node
}

function viewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 640
}

let measuring = false
function fullFraction() {
  const body = bodyEl.value
  const node = panelNode()
  if (!body) return 0.9
  const chrome =
    (handleEl.value?.offsetHeight || 0) +
    (headEl.value?.offsetHeight || 0) +
    (footerEl.value?.offsetHeight || 0)
  let needed = chrome + body.scrollHeight
  if (node && node.style.height && !measuring) {
    measuring = true
    const before = node.style.height
    node.style.height = 'auto'
    void node.offsetHeight
    needed = chrome + body.scrollHeight
    node.style.height = before
    void node.offsetHeight
    measuring = false
  }
  const capMatch = /^(\d+(?:\.\d+)?)(dvh|vh|px|%)$/.exec(props.maxHeight)
  let cap = 0.9
  if (capMatch) {
    const value = Number(capMatch[1])
    cap = capMatch[2] === 'px' ? value / viewportHeight() : value / 100
  }
  return Math.min(cap, needed / viewportHeight())
}

function computeAnchors() {
  const full = fullFraction()
  /* 面板里固定的几段（把手 + 标题 + 底部）必须始终可见，比它还矮的档没意义。 */
  const chrome =
    (handleEl.value?.offsetHeight || 0) +
    (headEl.value?.offsetHeight || 0) +
    (footerEl.value?.offsetHeight || 0)
  const minUsable = (chrome + 56) / viewportHeight()
  const base = props.anchors || (props.scrim ? [0.6] : [0.2, 0.6])
  /* 固定档必须严格低于内容全高；留 2% 余量避免几乎重合的档。 */
  const list = base
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0 && value < full - 0.02 && value >= minUsable)
  list.push(full)
  const unique = []
  for (const value of list.sort((a, b) => a - b)) {
    if (!unique.length || value - unique[unique.length - 1] > 0.02) unique.push(value)
    else unique[unique.length - 1] = Math.max(unique[unique.length - 1], value)
  }
  return unique
}

function refreshAnchors() {
  const next = computeAnchors()
  anchorList.value = next
  if (!next.length) return
  /* 当前高度越界（内容变少）时夹回最近的锚点。 */
  const current = heightPx.value / viewportHeight()
  if (open.value && !dragging.value) {
    if (current > next[next.length - 1] + 0.01) setHeight(next[next.length - 1])
    else if (current < next[0] - 0.01) setHeight(next[0])
  }
}

function nearestAnchor(fraction, projected) {
  const list = anchorList.value
  if (!list.length) return fraction
  const probe = projected === undefined ? fraction : projected
  let best = list[0]
  for (const value of list) {
    if (Math.abs(value - probe) < Math.abs(best - probe)) best = value
  }
  return best
}

/* mode: 'jump' 立即落位（打开初值），'spring' 带弹簧吸附（松手/夹回）。 */
function setHeight(fraction, { mode = 'spring', silent = false, velocity = 0 } = {}) {
  const clamped = Math.min(Math.max(fraction, 0.08), 1)
  const px = Math.round(clamped * viewportHeight())
  heightPx.value = px
  if (mode === 'jump') {
    heightMv.jump(px)
  } else if (!prefersReducedMotion()) {
    animate(heightMv, px, { ...getSpringPhysicsConfig('sheet'), velocity })
  } else {
    heightMv.jump(px)
  }
  if (!silent) {
    const nearest = nearestAnchor(clamped)
    if (Math.abs(nearest - clamped) < 0.005) emit('anchor-change', nearest)
  }
}

/* ---------- 打开 / 关闭 ---------- */

function lockPage() {
  if (scrollEl) return
  scrollEl = document.getElementById('scrollArea')
  if (!scrollEl) return
  previousOverflow = scrollEl.style.overflow
  scrollEl.style.overflow = 'hidden'
}

function unlockPage() {
  if (!scrollEl) return
  scrollEl.style.overflow = previousOverflow
  scrollEl = null
}

function close() {
  if (!props.modelValue || closing.value) return
  emit('update:modelValue', false)
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) {
    event.preventDefault()
    close()
  }
}

function observeContent() {
  disconnectObserver()
  if (!bodyEl.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    if (open.value && !dragging.value) refreshAnchors()
  })
  resizeObserver.observe(bodyEl.value)
}
function disconnectObserver() {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
}

function beginOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  rendered.value = true
  closing.value = false
  lockPage()

  nextTick(() => {
    const el = panelNode()
    if (!props.modelValue || !el) return
    el.focus({ preventScroll: true })
    /* 先量锚点：打开落在「全内容」这一档（立即落位，随 frame 一起弹入）。 */
    refreshAnchors()
    const full = anchorList.value[anchorList.value.length - 1] || 0.9
    setHeight(full, { mode: 'jump', silent: true })
    observeContent()
    /* 首帧量到的 scrollHeight 可能还没算完（字体 / 图片 / 插槽），下一帧再校一次。 */
    requestAnimationFrame(() => {
      if (!props.modelValue) return
      refreshAnchors()
      const settled = anchorList.value[anchorList.value.length - 1] || full
      if (Math.abs(settled * viewportHeight() - heightPx.value) > 1) {
        setHeight(settled, { mode: 'jump', silent: true })
      }
    })
    open.value = true
  })
}

function teardown() {
  rendered.value = false
  open.value = false
  closing.value = false
  dragging.value = false
  disconnectObserver()
  unlockPage()
}

function beginClose() {
  clearTimeout(closeTimer)
  closeTimer = null
  if (!rendered.value) { teardown(); return }

  closing.value = true
  open.value = false

  /* frame 退场弹簧 + 遮罩淡出取更长者 + 缓冲后卸载。 */
  const exitMs = getSpringConfig('exit').duration * 1000
  const scrimMs = prefersReducedMotion() ? 0 : (props.scrim ? SCRIM_FADE : 0)
  const holdMs = Math.max(exitMs, scrimMs) + CLOSE_BUFFER

  closeTimer = setTimeout(() => { closeTimer = null; teardown() }, holdMs)
}

/* ---------- 把手拖拽（指针驱动跟手，松手弹簧吸附带初速度） ---------- */
let dragStartY = 0
let dragStartHeight = 0
let dragLastY = 0
let dragLastT = 0
let dragVelocity = 0

function onHandleDown(event) {
  if (!open.value || closing.value) return
  event.preventDefault()
  dragging.value = true
  dragStartY = event.clientY
  dragStartHeight = heightPx.value
  dragLastY = event.clientY
  dragLastT = event.timeStamp
  dragVelocity = 0
  try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch (error) { /* 指针已失效，忽略 */ }
}

function onHandleMove(event) {
  if (!dragging.value) return
  const dy = event.clientY - dragStartY
  /* 向上拖 = 变高，向下拖 = 变矮；允许拖到最低锚点之下表达关闭意图。 */
  const next = Math.max(0, Math.round(dragStartHeight - dy))
  heightPx.value = next
  heightMv.set(next)
  dragVelocity = (event.clientY - dragLastY) / Math.max(1, event.timeStamp - dragLastT)
  dragLastY = event.clientY
  dragLastT = event.timeStamp
}

function onHandleUp() {
  if (!dragging.value) return
  dragging.value = false
  const vp = viewportHeight()
  const list = anchorList.value
  const lowest = list[0] || 0.2
  const highest = list[list.length - 1] || lowest
  const current = heightPx.value / vp
  /* 速度限幅：合成事件 / 高采样率下 velocity 可能异常大。 */
  const clampedVelocity = Math.max(-3, Math.min(3, dragVelocity))
  /* 关闭意图：位置先越界（位移门槛，或明显低于最低锚点 + 向下快甩）。 */
  const belowBy = lowest - current
  const dismissByDistance = heightPx.value < lowest * vp - DISMISS_PX
  const dismissByFling = clampedVelocity > 0.9 && belowBy > 0.06
  if (dismissByDistance || dismissByFling) {
    close()
    return
  }
  /* 投射：位移 + 速度 * 时长（±12% 视口），吸附到最近锚点；
     吸附动画带真实初速度（px/s），甩动方向延续松手势头。 */
  const projection = Math.max(-0.12, Math.min(0.12, (-clampedVelocity * FLING_MS) / vp))
  const projected = Math.min(highest, Math.max(lowest, current + projection))
  const target = nearestAnchor(current, projected)
  setHeight(target, {
    mode: 'spring',
    velocity: -clampedVelocity * 1000
  })
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value) beginClose()
}, { immediate: true })

watch(() => props.anchors, () => { if (open.value) refreshAnchors() }, { deep: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  disconnectObserver()
  unlockPage()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-sheet-root">
      <!-- 有背景版：压暗 + 模糊遮罩；无背景版：透明拦截层，照样挡住背景交互。 -->
      <div
        v-if="scrim"
        class="ui-scrim ui-sheet-scrim"
        :class="{ 'is-open': open, 'is-static': !closeOnBackdrop }"
        aria-hidden="true"
        @click="closeOnBackdrop && close()"
      ></div>
      <div
        v-else
        class="ui-sheet-veil"
        :class="{ 'is-static': !closeOnBackdrop }"
        aria-hidden="true"
        @click="closeOnBackdrop && close()"
      ></div>

      <!-- 外层 frame 只做纵向位移：sheet 弹簧进、exit 弹簧出。 -->
      <motion.div
        class="ui-sheet-frame"
        :initial="FRAME_HIDDEN"
        :animate="open ? FRAME_SHOWN : FRAME_HIDDEN"
        :transition="getSpringConfig(open ? 'sheet' : 'exit')"
      >
        <motion.section
          ref="panel"
          class="ui-sheet-panel"
          :class="{ 'no-scrim': !scrim }"
          :style="{ height: heightMv }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <div
            ref="handleEl"
            class="ui-sheet-handle"
            :class="{ 'is-grabbing': dragging }"
            aria-hidden="true"
            @pointerdown="onHandleDown"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
          ></div>
          <header ref="headEl" class="ui-sheet-head">
            <h2>{{ title }}</h2>
          </header>
          <div ref="bodyEl" class="ui-sheet-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" ref="footerEl" class="ui-sheet-footer">
            <slot name="footer" />
          </footer>
        </motion.section>
        <!-- 弹簧裙边：活泼模式弹簧上冲、面板下沿离开视口底时补住缺口。 -->
        <span class="ui-sheet-skirt" aria-hidden="true"></span>
      </motion.div>
    </div>
  </Teleport>
</template>

<style scoped>
.ui-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}
.ui-sheet-scrim { z-index: 0; }
.ui-sheet-scrim.is-static { pointer-events: none; }
/* 无背景版：完全透明，但仍然盖住背景（模态拦截）。 */
.ui-sheet-veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: transparent;
}
.ui-sheet-veil.is-static { pointer-events: none; }
/* 外层 frame 的位移由 motion 驱动（y: 105% ↔ 0），这里只管布局。 */
.ui-sheet-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  will-change: transform;
}

.ui-sheet-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  background: var(--surface-container-high);
  border-bottom: 0;
  border-radius: calc(28px * var(--radius-scale)) calc(28px * var(--radius-scale)) 0 0;
  overflow: hidden;
  outline: none;
}

/* 视口下方的「弹簧裙边」：约半屏高，正常状态被 root 裁掉。 */
.ui-sheet-skirt {
  position: absolute;
  z-index: 0;
  top: 100%;
  left: 0;
  right: 0;
  height: 50dvh;
  background: var(--surface-container-high);
  border-left: var(--border-w) solid var(--outline-variant);
  border-right: var(--border-w) solid var(--outline-variant);
  pointer-events: none;
}
.ui-sheet-handle {
  padding: 10px 0 4px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
}
.ui-sheet-handle.is-grabbing { cursor: grabbing; }
/* 扩大把手命中区域：拖动更从容。 */
.ui-sheet-handle::before {
  content: '';
  position: absolute;
  top: 0;
  height: 22px;
  left: 0;
  right: 0;
}
.ui-sheet-handle::after {
  content: '';
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--outline-variant);
  transition: background var(--t-fade), width var(--t-feedback);
}
.ui-sheet-handle.is-grabbing::after {
  width: 44px;
  background: var(--primary);
}
.ui-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 20px 12px;
  flex-shrink: 0;
}
.ui-sheet-head h2 {
  margin: 0;
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  letter-spacing: -.015em;
}
.ui-sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0 20px 16px;
  scrollbar-width: none;
}
.ui-sheet-body::-webkit-scrollbar { display: none; }
.ui-sheet-footer {
  flex-shrink: 0;
  padding: 10px 20px calc(18px + env(safe-area-inset-bottom));
  border-top: var(--border-w) solid var(--outline-variant);
  background: color-mix(in oklab, var(--surface-container-high) 92%, transparent);
}
</style>