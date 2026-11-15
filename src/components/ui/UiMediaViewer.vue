<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/* 指针捕获在指针已失效时会抛 NotFoundError，包一层避免打断手势。 */
function safeCapture(el, id) {
  try { el && el.setPointerCapture && el.setPointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}
function safeRelease(el, id) {
  try { el && el.releasePointerCapture && el.releasePointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}

const props = defineProps({
  /* 图片或视频地址 */
  src: { type: String, default: '' },
  /* auto = 按扩展名判断；也可以显式指定 */
  kind: { type: String, default: 'auto' },
  /* 视频封面 / 图片占位 */
  poster: { type: String, default: '' },
  label: { type: String, default: '' },
  alt: { type: String, default: '' },
  /* 缩略预览的宽高比 */
  aspect: { type: String, default: '4 / 3' },
  /* 缩略预览宽度上限 */
  thumbWidth: { type: String, default: '100%' },
  /* 是否可缩放（图片） */
  zoomable: { type: Boolean, default: true },
  maxZoom: { type: Number, default: 4 }
})

const model = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['open', 'close', 'error'])

/* ============================================================
   媒体查看器（图片 / 视频）
   · 收起态就是一张缩略预览：点击后这一块从缩略的位置「长」到屏幕中央，
     不是淡入一个新窗口 —— 几何连续，用户知道它从哪儿来；
   · 关闭反向缩回缩略位置；Esc / 点空白 / 下拉 都能关；
   · 触摸：双指捏合、双击放大、放大后单指拖动平移、未放大时下拉关闭；
     视频用原生控件，关闭时自动暂停。
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
/* 手势进行中：关掉图片的 transform 过渡，保证跟手。 */
const gesturing = ref(false)

const DUR = 420
let closeTimer = 0

const aspectRatio = computed(() => {
  const parts = String(props.aspect).split('/')
  const a = Number(parts[0])
  const b = Number(parts[1] || 1)
  return a > 0 && b > 0 ? a / b : 4 / 3
})

/* 目标尺寸：在视口内留边，并保持媒体自身比例。 */
function targetRect() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const marginX = Math.min(64, vw * 0.06)
  const marginY = Math.min(96, vh * 0.1)
  const maxW = vw - marginX * 2
  const maxH = vh - marginY * 2
  let width = maxW
  let height = width / aspectRatio.value
  if (height > maxH) { height = maxH; width = height * aspectRatio.value }
  return {
    left: (vw - width) / 2 + 'px',
    top: (vh - height) / 2 + 'px',
    width: width + 'px',
    height: height + 'px',
    radius: (Math.min(24, width * 0.03)) + 'px'
  }
}

function thumbRect() {
  const el = thumbEl.value
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', radius: getComputedStyle(el).borderRadius }
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

async function doOpen() {
  if (!props.src) return
  clearTimeout(closeTimer)
  const from = thumbRect()
  if (!from) return
  rendered.value = true
  closing.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  await nextTick()
  setGeometry(from, false)
  void stageEl.value.offsetWidth
  backdrop.value = true
  requestAnimationFrame(() => {
    setGeometry(targetRect(), true)
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
  const to = thumbRect()
  if (to) setGeometry(to, true)
  if (videoEl.value) { try { videoEl.value.pause() } catch (e) { /* 忽略 */ } }
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    rendered.value = false
    closing.value = false
    model.value = false
    emit('close')
  }, DUR)
}

watch(model, value => {
  if (value) doOpen()
  else if (rendered.value) doClose()
})

/* ---------- 图片手势 ---------- */
const pointers = new Map()
let pinchStart = 1
let pinchBase = 1
let panStart = null
let lastTap = 0

function onPointerDown(event) {
  if (resolvedKind.value === 'video') return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  gesturing.value = true
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchStart = Math.hypot(a.x - b.x, a.y - b.y) || 1
    pinchBase = zoom.value
  } else if (pointers.size === 1) {
    panStart = { x: event.clientX, y: event.clientY, panX: panX.value, panY: panY.value }
    const now = Date.now()
    if (now - lastTap < 280 && props.zoomable) {
      /* 双击：在 1 与 2.5 之间切换。 */
      zoom.value = zoom.value > 1.2 ? 1 : 2.5
      if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
      lastTap = 0
      return
    }
    lastTap = now
  }
  stageEl.value && stageEl.value.setPointerCapture && safeCapture(stageEl.value, event.pointerId)
}

function onPointerMove(event) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && pinchStart > 0) {
    const [a, b] = [...pointers.values()]
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1
    zoom.value = Math.min(props.maxZoom, Math.max(1, (pinchBase * distance) / pinchStart))
    return
  }
  if (!panStart) return
  const dx = event.clientX - panStart.x
  const dy = event.clientY - panStart.y
  if (zoom.value > 1.01) {
    /* 放大后拖动平移：限制在放大出来的范围内。 */
    const limitX = ((zoom.value - 1) * (stageEl.value?.clientWidth || 0)) / 2
    const limitY = ((zoom.value - 1) * (stageEl.value?.clientHeight || 0)) / 2
    panX.value = Math.max(-limitX, Math.min(limitX, panStart.panX + dx))
    panY.value = Math.max(-limitY, Math.min(limitY, panStart.panY + dy))
  } else {
    /* 未放大：只允许下拉，用来关闭。 */
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

function onWheel(event) {
  if (!props.zoomable || resolvedKind.value === 'video') return
  event.preventDefault()
  const next = zoom.value * (event.deltaY < 0 ? 1.08 : 0.92)
  zoom.value = Math.min(props.maxZoom, Math.max(1, next))
  if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
}

function onKeydown(event) {
  if (!open.value) return
  if (event.key === 'Escape') { event.preventDefault(); doClose() }
}

watch(rendered, value => {
  if (typeof document === 'undefined') return
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ open: doOpen, close: doClose })
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
        <div class="ui-media-viewer__backdrop" :class="{ 'is-open': backdrop }" @click="doClose"></div>
        <div
          ref="stageEl"
          class="ui-media-viewer__stage"
          :style="geometry"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
        >
          <img
            v-if="resolvedKind === 'image'"
            class="ui-media-viewer__media"
            :src="src"
            :alt="alt || label"
            :style="{
              transform: 'translate3d(' + panX + 'px,' + panY + 'px,0) scale(' + zoom + ')',
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
          <button type="button" class="ui-media-viewer__close" aria-label="关闭" @click.stop="doClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
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
/* 播放角标：视频缩略图上居中。 */
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
  background: rgba(0, 0, 0, .82);
  opacity: 0;
  backdrop-filter: blur(0px);
  transition: opacity var(--t-panel), backdrop-filter var(--t-panel);
}
.ui-media-viewer__backdrop.is-open { opacity: 1; backdrop-filter: blur(8px); }
/* 舞台：位置 / 尺寸 / 圆角都由 JS 从缩略位置过渡到目标位置。 */
.ui-media-viewer__stage {
  position: fixed;
  overflow: hidden;
  border-radius: 0;
  background: #000;
  box-shadow: 0 18px 60px -24px rgba(0, 0, 0, .7);
  touch-action: none;
  will-change: left, top, width, height;
}
.ui-media-viewer__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  transform-origin: center center;
}
.ui-media-viewer__close {
  position: absolute;
  top: 10px;
  right: 10px;
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
  transition: transform var(--t-feedback), background var(--t-fade);
}
.ui-media-viewer__close svg { width: 16px; height: 16px; }
.ui-media-viewer__close:active { transform: scale(.92); }
.ui-media-viewer__root:not(.is-open) .ui-media-viewer__close { opacity: 0; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .ui-media-viewer__stage { transition: none !important; }
  .ui-media-viewer__backdrop { transition-duration: .01ms; }
}
</style>
