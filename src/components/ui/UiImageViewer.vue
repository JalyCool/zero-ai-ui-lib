<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from './UiButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /* 图片地址（可带 name 用于下载文件名建议） */
  src: { type: String, required: true },
  alt: { type: String, default: '图片预览' }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   图片查看器：滚轮/按钮缩放（25%–400%）、±180° 旋转、
   拖拽平移、下载原图；Esc / 点背景关闭。
   ============================================================ */

const scale = ref(1)
const rotation = ref(0)
const pan = ref({ x: 0, y: 0 })
const dragging = ref(false)
let moved = false

function reset() {
  scale.value = 1
  rotation.value = 0
  pan.value = { x: 0, y: 0 }
}

watch(() => props.modelValue, open => { if (open) reset() })

function zoom(delta) {
  scale.value = Math.min(4, Math.max(0.25, Math.round((scale.value + delta) * 100) / 100))
}

function onWheel(event) {
  event.preventDefault()
  zoom(event.deltaY < 0 ? 0.15 : -0.15)
}

function rotate(deg) {
  rotation.value = (rotation.value + deg + 360) % 360 - 180
  if (rotation.value === -180) rotation.value = 180
}

let startX = 0
let startY = 0
function onPointerDown(event) {
  dragging.value = true
  moved = false
  startX = event.clientX - pan.value.x
  startY = event.clientY - pan.value.y
  event.currentTarget.setPointerCapture?.(event.pointerId)
}
function onPointerMove(event) {
  if (!dragging.value) return
  pan.value = { x: event.clientX - startX, y: event.clientY - startY }
  moved = true
}
function onPointerUp() { dragging.value = false }

function close() { emit('update:modelValue', false) }

function onKey(event) {
  if (!props.modelValue) return
  if (event.key === 'Escape') close()
  if (event.key === '+' || event.key === '=') zoom(0.15)
  if (event.key === '-') zoom(-0.15)
  if (event.key === 'r') rotate(90)
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const downloadName = computed(() => {
  try {
    const url = new URL(props.src, location.href)
    return decodeURIComponent(url.pathname.split('/').pop() || 'image')
  } catch {
    return 'image'
  }
})

async function download() {
  try {
    const response = await fetch(props.src)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName.value
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch {
    window.open(props.src, '_blank', 'noopener')
  }
}

const transform = computed(() =>
  'translate(' + pan.value.x + 'px,' + pan.value.y + 'px) scale(' + scale.value + ') rotate(' + rotation.value + 'deg)')
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-viewer">
      <div v-if="modelValue" class="ui-viewer" @pointerdown.self="close" @wheel="onWheel">
        <img
          class="ui-viewer__img"
          :src="src"
          :alt="alt"
          draggable="false"
          :style="{ transform }"
          @pointerdown.prevent="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @dblclick="reset"
        >

        <div class="ui-viewer__bar" @pointerdown.stop>
          <button type="button" class="ui-viewer__btn" aria-label="缩小" @click="zoom(-0.15)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14" /></svg>
          </button>
          <span class="ui-viewer__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="ui-viewer__btn" aria-label="放大" @click="zoom(0.15)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <span class="ui-viewer__sep" aria-hidden="true"></span>
          <button type="button" class="ui-viewer__btn" aria-label="向左旋转" @click="rotate(-90)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l4-4 4 4" /><path d="M7 5v6a5 5 0 0 0 10 0V9" /></svg>
          </button>
          <button type="button" class="ui-viewer__btn" aria-label="向右旋转" @click="rotate(90)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 9l4-4-4 4" transform="translate(0 0)" /><path d="M21 5v6a5 5 0 0 1-10 0" /></svg>
          </button>
          <span class="ui-viewer__sep" aria-hidden="true"></span>
          <button type="button" class="ui-viewer__btn" aria-label="重置" @click="reset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-4 1" /><path d="M3 5v4h4" /></svg>
          </button>
          <button type="button" class="ui-viewer__btn" aria-label="下载原图" @click="download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M4 19h16" /></svg>
          </button>
          <UiButton size="sm" variant="tonal" @click="close">关闭</UiButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-viewer {
  position: fixed;
  inset: 0;
  z-index: 620;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, var(--on-surface) 82%, transparent);
  backdrop-filter: blur(6px);
  overflow: hidden;
  touch-action: none;
}
.ui-viewer__img {
  max-width: min(92vw, 1400px);
  max-height: 82vh;
  cursor: grab;
  transition: transform var(--t-feedback);
  user-select: none;
  border-radius: calc(8px * var(--radius-scale));
}
.ui-viewer__bar {
  position: absolute;
  bottom: calc(20px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 88%, transparent);
  box-shadow: var(--elev-sheet);
}
.ui-viewer__btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--on-surface);
  cursor: pointer;
  transition: background var(--t-fade), transform var(--t-feedback);
}
.ui-viewer__btn:hover { background: var(--surface-container); }
.ui-viewer__btn:active { transform: scale(var(--press-scale)); }
.ui-viewer__btn svg { width: 16px; height: 16px; }
.ui-viewer__pct { min-width: 42px; text-align: center; color: var(--on-surface-variant); font-size: var(--fs-tiny); font-variant-numeric: tabular-nums; }
.ui-viewer__sep { width: 1px; height: 18px; background: var(--outline-variant); margin: 0 3px; }
.ui-viewer-enter-active { transition: opacity var(--t-panel); }
.ui-viewer-leave-active { transition: opacity var(--t-exit); }
.ui-viewer-enter-from,
.ui-viewer-leave-to { opacity: 0; }
</style>
