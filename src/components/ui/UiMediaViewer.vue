<script>
/* 同页可能挂多个查看器（示例页就有两个）：任一时刻只允许一个打开，
   否则两层 Teleport root 会叠在一起、出现两个遮罩。 */
let activeViewer = null
function releaseViewer(instance) {
  if (activeViewer === instance) activeViewer = null
}
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* 图片或视频地址 */
  src: { type: String, default: '' },
  /* auto = 按扩展名判断；也可以显式指定 */
  kind: { type: String, default: 'auto' },
  poster: { type: String, default: '' },
  label: { type: String, default: '' },
  alt: { type: String, default: '' },
  /* 缩略预览的宽高比 */
  aspect: { type: String, default: '4 / 3' },
  thumbWidth: { type: String, default: '100%' },
  zoomable: { type: Boolean, default: true },
  maxZoom: { type: Number, default: 4 }
})

const model = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['open', 'close', 'error'])

/* ============================================================
   媒体查看器（图片 / 视频）
   · 收起态是缩略预览；点击后这一块从缩略位置长到**整个视口**，
     几何连续，用户知道它从哪儿来；
   · 舞台就是全屏：放大、平移都在整个屏幕空间里发生，不会被
     「目标尺寸」那个小盒子裁掉；
   · 触摸 / 触控板都适配：双指捏合、双击、Ctrl+滚轮（触控板捏合
     在浏览器里就是带 ctrlKey 的 wheel）走指数缩放，普通滚轮也缩放，
     放大后单指拖动平移，未放大时下拉关闭；视频用原生控件，关闭即暂停。
   ============================================================ */

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i
const resolvedKind = computed(() => {
  if (props.kind === 'image' || props.kind === 'video') return props.kind
  return VIDEO_EXT.test(props.src) ? 'video' : 'image'
})

const thumbEl = ref(null)
const stageEl = ref(null)
const videoEl = ref(null)
const open = ref(false)
const closing = ref(false)
const rendered = ref(false)
const backdrop = ref(false)
const geometry = ref({ left: '0px', top: '0px', width: '0px', height: '0px', radius: '0px' })
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragDown = ref(0)
const gesturing = ref(false)
/* 下拉关闭的进度：0（不动）→ 1（该关了）。遮罩与缩放跟着它连续变化。 */
const dismiss = computed(() => Math.min(1, dragDown.value / 320))

const DUR = 420
let closeTimer = 0

const aspectRatio = computed(() => {
  const parts = String(props.aspect).split('/')
  const a = Number(parts[0])
  const b = Number(parts[1] || 1)
  return a > 0 && b > 0 ? a / b : 4 / 3
})

/* 打开后的舞台 = 整个视口：图片放大时才有一整屏可用。 */
function viewportRect() {
  return {
    left: '0px',
    top: '0px',
    width: window.innerWidth + 'px',
    height: window.innerHeight + 'px',
    radius: '0px'
  }
}

function thumbRect() {
  const el = thumbEl.value
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    left: r.left + 'px',
    top: r.top + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    radius: getComputedStyle(el).borderRadius
  }
}

function setGeometry(rect, animate) {
  const el = stageEl.value
  if (!el) return
  el.style.transition = animate
    ? 'left ' + DUR + 'ms cubic-bezier(.32,.72,.24,1), top ' + DUR + 'ms cubic-bezier(.32,.72,.24,1), width ' + DUR + 'ms cubic-bezier(.32,.72,.24,1), height ' + DUR + 'ms cubic-bezier(.32,.72,.24,1), border-radius ' + DUR + 'ms cubic-bezier(.32,.72,.24,1)'
    : 'none'
  el.style.left = rect.left
  el.style.top = rect.top
  el.style.width = rect.width
  el.style.height = rect.height
  el.style.borderRadius = rect.radius
  geometry.value = rect
}

/* 单例：打开自己之前先把别的查看器立刻收起（不做动画）。 */
const instance = {
  closeImmediately() {
    clearTimeout(closeTimer)
    rendered.value = false
    open.value = false
    closing.value = false
    backdrop.value = false
    zoom.value = 1
    panX.value = 0
    panY.value = 0
    dragDown.value = 0
    model.value = false
    releaseViewer(instance)
  }
}

async function doOpen() {
  if (!props.src) return
  if (activeViewer && activeViewer !== instance) activeViewer.closeImmediately()
  activeViewer = instance
  clearTimeout(closeTimer)
  const from = thumbRect()
  if (!from) return
  rendered.value = true
  closing.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  dragDown.value = 0
  await nextTick()
  setGeometry(from, false)
  void stageEl.value.offsetWidth
  backdrop.value = true
  requestAnimationFrame(() => {
    setGeometry(viewportRect(), true)
    open.value = true
    model.value = true
    emit('open')
  })
}

function doClose() {
  if (!open.value || closing.value) return
  closing.value = true
  open.value = false
  backdrop.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  dragDown.value = 0
  const to = thumbRect()
  if (to) setGeometry(to, true)
  if (videoEl.value) { try { videoEl.value.pause() } catch (e) { /* 忽略 */ } }
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    rendered.value = false
    closing.value = false
    model.value = false
    releaseViewer(instance)
    emit('close')
  }, DUR)
}

watch(model, value => {
  if (value) { doOpen(); return }
  if (!rendered.value) return
  /* 外部直接置 false（或 doClose 因状态不符提前 return）时也要收尾：
     否则 rendered 一直是 true，那层 fixed 全屏舞台会挡住整个页面，
     表现就是「突然所有交互都失效」。 */
  if (!open.value || closing.value) forceClose()
  else doClose()
})

function forceClose() {
  clearTimeout(closeTimer)
  rendered.value = false
  open.value = false
  closing.value = false
  backdrop.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  dragDown.value = 0
  releaseViewer(instance)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function setZoom(next) {
  zoom.value = clamp(next, 1, props.maxZoom)
  if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
}

/* ---------- 图片手势 ---------- */
const pointers = new Map()
let pinchStart = 1
let pinchBase = 1
let pinchMid = { x: 0, y: 0 }
let panStart = null
let lastTap = 0
let gestureBase = 1

function onPointerDown(event) {
  /* 关闭按钮在舞台内部：pointerdown 一旦被舞台捕获，后续 click 会落到舞台，
     按钮就永远点不动。这里先让路。 */
  if (event.target && event.target.closest && event.target.closest('.ui-media-viewer__close')) return
  if (resolvedKind.value === 'video') return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  gesturing.value = true
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchStart = Math.hypot(a.x - b.x, a.y - b.y) || 1
    pinchBase = zoom.value
    pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  } else if (pointers.size === 1) {
    panStart = { x: event.clientX, y: event.clientY, panX: panX.value, panY: panY.value }
    const now = Date.now()
    if (now - lastTap < 280 && props.zoomable) {
      setZoom(zoom.value > 1.2 ? 1 : 2.5)
      lastTap = 0
      return
    }
    lastTap = now
  }
  try { stageEl.value && stageEl.value.setPointerCapture && stageEl.value.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
}

function onPointerMove(event) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && pinchStart > 0) {
    const [a, b] = [...pointers.values()]
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1
    setZoom((pinchBase * distance) / pinchStart)
    return
  }
  if (!panStart) return
  const dx = event.clientX - panStart.x
  const dy = event.clientY - panStart.y
  if (zoom.value > 1.01) {
    /* 放大后平移：范围按整屏算（舞台就是全屏）。 */
    const limitX = ((zoom.value - 1) * window.innerWidth) / 2
    const limitY = ((zoom.value - 1) * window.innerHeight) / 2
    panX.value = clamp(panStart.panX + dx, -limitX, limitX)
    panY.value = clamp(panStart.panY + dy, -limitY, limitY)
  } else {
    dragDown.value = Math.max(0, dy)
  }
}

function onPointerUp(event) {
  pointers.delete(event.pointerId)
  const wasDown = dragDown.value
  panStart = null
  dragDown.value = 0
  if (pointers.size === 0) gesturing.value = false
  if (wasDown > 96) doClose()
  if (pointers.size < 2) pinchStart = 0
}

/* ---------- 滚轮 / 触控板 ---------- */
/* 触控板捏合在浏览器里表现为 ctrlKey=true 的 wheel，deltaY 很细；
   普通滚轮 deltaY 是台阶。两者都用指数换算，避免一滚就跳到底。 */
function onWheel(event) {
  if (!props.zoomable || resolvedKind.value === 'video') return
  event.preventDefault()
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
  const delta = event.deltaY * unit
  const k = event.ctrlKey ? 0.012 : 0.0026
  const factor = clamp(Math.exp(-delta * k), 0.8, 1.25)
  setZoom(zoom.value * factor)
}

/* Safari 的触控板捏合走 gesture 事件。 */
function onGestureStart(event) {
  if (resolvedKind.value === 'video') return
  event.preventDefault()
  gestureBase = zoom.value
}
function onGestureChange(event) {
  if (resolvedKind.value === 'video') return
  event.preventDefault()
  setZoom(gestureBase * event.scale)
}

function onKeydown(event) {
  if (!open.value) return
  if (event.key === 'Escape') { event.preventDefault(); doClose() }
  if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoom.value * 1.2) }
  if (event.key === '-') { event.preventDefault(); setZoom(zoom.value / 1.2) }
  if (event.key === '0') { event.preventDefault(); setZoom(1) }
}

watch(rendered, value => {
  if (typeof document === 'undefined') return
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  document.removeEventListener('keydown', onKeydown)
  releaseViewer(instance)
})

defineExpose({ open: doOpen, close: doClose, closeImmediately: instance.closeImmediately })
</script>

<template>
  <span class="ui-media-viewer" :style="{ '--mv-aspect': aspect, maxWidth: thumbWidth }">
    <button
      ref="thumbEl"
      type="button"
      class="ui-media-viewer__thumb"
      :aria-label="label || (resolvedKind === 'video' ? '播放视频' : '查看图片')"
      @click="doOpen"
    >
      <img v-if="resolvedKind === 'image'" :src="src" :alt="alt || label" loading="lazy" />
      <template v-else>
        <img v-if="poster" :src="poster" :alt="alt || label" loading="lazy" />
        <span v-else class="ui-media-viewer__video-blank" aria-hidden="true"></span>
        <span class="ui-media-viewer__play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 6.5l9 5.5-9 5.5z" /></svg>
        </span>
      </template>
      <span v-if="label" class="ui-media-viewer__caption">{{ label }}</span>
      <span class="ui-media-viewer__expand" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
      </span>
    </button>

    <Teleport to="body">
      <div v-if="rendered" class="ui-media-viewer__root" :class="{ 'is-open': open, 'is-closing': closing }">
        <div
          class="ui-media-viewer__backdrop"
          :class="{ 'is-open': backdrop }"
          :style="{ '--dismiss': dismiss }"
          @click="doClose"
        ></div>
        <div
          ref="stageEl"
          class="ui-media-viewer__stage"
          :style="geometry"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
          @gesturestart="onGestureStart"
          @gesturechange="onGestureChange"
        >
          <img
            v-if="resolvedKind === 'image'"
            class="ui-media-viewer__media"
            :src="src"
            :alt="alt || label"
            :style="{
              transform: 'translate3d(' + panX + 'px,' + panY + 'px,0) scale(' + (zoom * (1 - dismiss * 0.14)) + ')',
              translate: '0 ' + dragDown + 'px',
              transition: gesturing ? 'none' : 'transform var(--t-panel)'
            }"
            draggable="false"
            @error="emit('error', $event)"
          />
          <video
            v-else
            ref="videoEl"
            class="ui-media-viewer__media"
            :src="src"
            :poster="poster"
            controls
            playsinline
            preload="metadata"
            :style="{ transform: 'translate3d(0,' + dragDown + 'px,0)' }"
            @error="emit('error', $event)"
          ></video>
          <div class="ui-media-viewer__bar">
            <span class="ui-media-viewer__zoom" aria-hidden="true">{{ Math.round(zoom * 100) }}%</span>
            <button type="button" class="ui-media-viewer__close" aria-label="关闭" @click.stop="doClose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.ui-media-viewer { display: inline-block; width: 100%; min-width: 0; }

/* ---------- 缩略预览 ---------- */
.ui-media-viewer__thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: var(--mv-aspect, 4 / 3);
  padding: 0;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container);
  cursor: zoom-in;
  transition: transform var(--t-feedback), border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-media-viewer__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--t-panel); }
.ui-media-viewer__thumb:hover img { transform: scale(1.04); }
.ui-media-viewer__thumb:active { transform: scale(var(--press-scale)); }
.ui-media-viewer__thumb:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 2px; }
.ui-media-viewer__video-blank { position: absolute; inset: 0; background: linear-gradient(135deg, var(--surface-container-high), var(--surface-container)); }
.ui-media-viewer__play {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(0, 0, 0, .46);
  color: #fff;
  backdrop-filter: blur(6px);
}
.ui-media-viewer__play svg { width: 22px; height: 22px; margin-left: 2px; }
.ui-media-viewer__caption {
  position: absolute;
  inset: auto 0 0 0;
  padding: 18px 12px 9px;
  background: linear-gradient(to top, rgba(0, 0, 0, .58), transparent);
  color: #fff;
  font-size: var(--fs-micro);
  text-align: left;
}
.ui-media-viewer__expand {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, .34);
  color: #fff;
  opacity: 0;
  transition: opacity var(--t-fade);
}
.ui-media-viewer__expand svg { width: 14px; height: 14px; }
.ui-media-viewer__thumb:hover .ui-media-viewer__expand { opacity: 1; }

/* ---------- 展开层 ---------- */
.ui-media-viewer__root { position: fixed; inset: 0; z-index: 360; }
.ui-media-viewer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .86);
  opacity: 0;
  backdrop-filter: blur(0px);
  transition: opacity var(--t-panel), backdrop-filter var(--t-panel);
}
.ui-media-viewer__backdrop.is-open { opacity: 1; backdrop-filter: blur(8px); }
/* 下拉关闭：遮罩随进度变淡，舞台轻微缩小 —— 松手前就有「要关了」的预期。 */
.ui-media-viewer__backdrop { opacity: calc(1 - var(--dismiss, 0) * 0.9); }
.ui-media-viewer__backdrop.is-open { opacity: calc(1 - var(--dismiss, 0) * 0.9); }
/* 舞台：位置 / 尺寸由 JS 从缩略位置过渡到整个视口。
   注意这里没有 max-width / max-height —— 放大后的图片要用满屏空间。 */
.ui-media-viewer__stage {
  position: fixed;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  touch-action: none;
  will-change: left, top, width, height;
  overscroll-behavior: contain;
}
.ui-media-viewer__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  transform-origin: center center;
  will-change: transform;
}
.ui-media-viewer__bar {
  position: absolute;
  inset: 12px 12px auto 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  pointer-events: none;
}
.ui-media-viewer__zoom {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .46);
  color: #fff;
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(6px);
  opacity: .92;
  transition: opacity var(--t-fade);
}
.ui-media-viewer__close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, .5);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  pointer-events: auto;
  transition: transform var(--t-feedback), background var(--t-fade);
}
.ui-media-viewer__close svg { width: 16px; height: 16px; }
.ui-media-viewer__close:active { transform: scale(.92); }
.ui-media-viewer__root:not(.is-open) .ui-media-viewer__close,
.ui-media-viewer__root:not(.is-open) .ui-media-viewer__zoom { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ui-media-viewer__stage { transition: none !important; }
  .ui-media-viewer__backdrop { transition-duration: .01ms; }
}
</style>
