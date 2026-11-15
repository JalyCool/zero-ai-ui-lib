<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/* ============================================================
   置底面板
   动效与设置面板（SettingsSheet / .sheet）保持一致：
   面板只做 transform 位移（打开 --t-sheet、关闭 --t-exit），
   不做整体透明度淡入淡出；遮罩用全局 .ui-scrim（压暗 + 模糊）。

   本轮新增：
   · 把手可拖拽：拖把手实时改面板高度（禁用 transition 跟手），
     松手按 位移 + 速度 吸附到锚点；最低锚点之下继续拖 -> 关闭。
   · anchors 吸附档位：20%、60%，以及「能显示全部内容的最小高度」。
     若最小高度不足全屏 60%，60% 档自动不出现（去重）。
   · scrim=false 版本：不加背景、不模糊背景，但模态性质保持
     （透明拦截层挡住背景交互 + Esc 关闭 + 锁页面滚动 + aria-modal）。
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

let scrollEl = null
let previousOverflow = ''
let closeTimer = null
let frameA = 0
let frameB = 0
let paintedOpen = false
let resizeObserver = null

function readDuration(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallback
  const amount = parseFloat(raw)
  if (!Number.isFinite(amount)) return fallback
  return raw.endsWith('ms') ? amount : amount * 1000
}

function reduceMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function viewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 640
}

/* 全内容锚点：把手 + 头部 + 内容完整高度 + 底部，夹在视口上限内。 */
function fullFraction() {
  const body = bodyEl.value
  if (!body) return 0.9
  /* chrome = 把手 + 头部 + 底部（都是 flex-shrink:0 的固定段）。
     面板自身高度在收起态是 0，不能用 offsetHeight - clientHeight 反推。 */
  const chrome =
    (handleEl.value?.offsetHeight || 0) +
    (headEl.value?.offsetHeight || 0) +
    (footerEl.value?.offsetHeight || 0)
  const needed = chrome + body.scrollHeight
  /* maxHeight 上限（px / dvh 都折算成视口比例） */
  const capMatch = /^(\d+(?:\.\d+)?)(dvh|vh|px|%)$/.exec(props.maxHeight)
  let cap = 0.9
  if (capMatch) {
    const value = Number(capMatch[1])
    cap = capMatch[2] === 'px' ? value / viewportHeight() : value / 100
  }
  return Math.min(cap, needed / viewportHeight())
}

/* 组装锚点：
   · 「全内容」档永远存在（两种版本都要有，它是能看全内容的最小高度）；
   · 固定档只保留 <= 全内容档的：有压暗背景时不放 20% 档（默认 [0.6]），
     且当全内容不足 60% 时，60% 档也一并去掉。 */
function computeAnchors() {
  const full = fullFraction()
  const base = props.anchors || (props.scrim ? [0.6] : [0.2, 0.6])
  const list = base
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0 && value <= full + 0.001)
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

function setHeight(fraction, { silent = false } = {}) {
  const clamped = Math.min(Math.max(fraction, 0.08), 1)
  heightPx.value = Math.round(clamped * viewportHeight())
  if (!silent) {
    const nearest = nearestAnchor(clamped)
    if (Math.abs(nearest - clamped) < 0.005) emit('anchor-change', nearest)
  }
}

/* ---------- 打开 / 关闭（沿用原有 transform 流程） ---------- */

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

function cancelFrames() {
  if (frameA) cancelAnimationFrame(frameA)
  if (frameB) cancelAnimationFrame(frameB)
  frameA = 0
  frameB = 0
}

function beginOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelFrames()

  if (rendered.value && paintedOpen && !open.value) {
    closing.value = false
    open.value = true
    lockPage()
    return
  }

  rendered.value = true
  closing.value = false
  open.value = false
  lockPage()

  nextTick(() => {
    const el = panel.value
    if (!props.modelValue || !el) return
    el.focus({ preventScroll: true })
    /* 先量锚点：打开落在「全内容」这一档。 */
    refreshAnchors()
    const full = anchorList.value[anchorList.value.length - 1] || 0.9
    setHeight(full, { silent: true })
    observeContent()

    void el.offsetHeight
    frameA = requestAnimationFrame(() => {
      frameA = 0
      frameB = requestAnimationFrame(() => {
        frameB = 0
        if (!props.modelValue) return
        open.value = true
        paintedOpen = true
      })
    })
  })
}

function teardown() {
  rendered.value = false
  open.value = false
  closing.value = false
  paintedOpen = false
  dragging.value = false
  disconnectObserver()
  unlockPage()
}

function beginClose() {
  cancelFrames()
  clearTimeout(closeTimer)
  closeTimer = null

  if (!paintedOpen) { teardown(); return }

  closing.value = true
  open.value = false

  const exitMs = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 650)
  const scrimMs = reduceMotion() ? 0 : (props.scrim ? SCRIM_FADE : 0)
  const holdMs = reduceMotion() ? 0 : Math.max(exitMs, scrimMs) + CLOSE_BUFFER

  closeTimer = setTimeout(() => { closeTimer = null; teardown() }, holdMs)
}

/* ---------- 内容变化监听（锚点跟着重算） ---------- */
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

/* ---------- 把手拖拽 ---------- */
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
  const next = dragStartHeight - dy
  heightPx.value = Math.max(0, Math.round(next))
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
  /* 速度限幅：合成事件 / 高采样率下 velocity 可能异常大，
     不限幅会把投射量算成整屏，吸附直接跳到端点。 */
  const clampedVelocity = Math.max(-3, Math.min(3, dragVelocity))
  /* 关闭意图：必须真的拖到最低锚点之下足够多（位移门槛），
     或者「已经明显低于最低锚点」且向下快甩 —— 两个条件都要求
     位置先越界，避免正常小幅下拉被误判成关闭。 */
  const belowBy = lowest - current
  const dismissByDistance = heightPx.value < lowest * vp - DISMISS_PX
  const dismissByFling = clampedVelocity > 0.9 && belowBy > 0.06
  if (dismissByDistance || dismissByFling) {
    close()
    return
  }
  /* 投射：位移 + 速度 * 时长，但投射量限制在 ±12% 视口内，
     然后吸附到最近的锚点。 */
  const projection = Math.max(-0.12, Math.min(0.12, (-clampedVelocity * FLING_MS) / vp))
  const projected = Math.min(highest, Math.max(lowest, current + projection))
  setHeight(nearestAnchor(current, projected))
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value || paintedOpen) beginClose()
}, { immediate: true })

watch(() => props.anchors, () => { if (open.value) refreshAnchors() }, { deep: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  cancelFrames()
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

      <section
        ref="panel"
        class="ui-sheet-panel"
        :class="{ 'is-open': open, 'is-closing': closing, 'is-dragging': dragging, 'no-scrim': !scrim }"
        :style="{ height: heightPx + 'px' }"
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
          <button type="button" class="ui-sheet-close" aria-label="关闭面板" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div ref="bodyEl" class="ui-sheet-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" ref="footerEl" class="ui-sheet-footer">
          <slot name="footer" />
        </footer>
      </section>
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
.ui-sheet-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  background: var(--surface-container-high);
  border: var(--border-w) solid var(--outline-variant);
  border-bottom: 0;
  border-radius: calc(28px * var(--radius-scale)) calc(28px * var(--radius-scale)) 0 0;
  overflow: hidden;
  outline: none;
  transform: translateY(105%);
  will-change: transform;
  /* 打开位移走 sheet，高度吸附走 view：两段同时可过渡互不干扰。 */
  transition: transform var(--t-sheet), height var(--t-view), box-shadow var(--t-fade);
}
.ui-sheet-panel.is-open { transform: none; }
.ui-sheet-panel.is-closing {
  will-change: transform;
  transition: transform var(--t-exit), height var(--t-exit);
}
/* 拖拽中彻底禁用过渡，位移完全跟手。 */
.ui-sheet-panel.is-dragging {
  transition: none;
  will-change: transform, height;
}
/* 无背景版给一点离地阴影，保证与内容的分层仍然可读。 */
.ui-sheet-panel.no-scrim {
  box-shadow: 0 -8px 32px color-mix(in oklab, var(--on-surface) 14%, transparent);
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
.ui-sheet-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), border-radius var(--t-panel), transform var(--t-feedback);
}
.ui-sheet-close:hover { background: var(--surface-container-highest); }
.ui-sheet-close:active { transform: scale(var(--press-scale)); }
.ui-sheet-close svg { width: 14px; height: 14px; }
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

@media (prefers-reduced-motion: reduce) {
  .ui-sheet-panel {
    transition-duration: .01ms !important;
    transition-delay: 0ms !important;
  }
}
</style>
