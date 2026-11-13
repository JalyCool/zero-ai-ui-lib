<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/* ============================================================
   置底面板
   动效与设置面板（SettingsSheet / .sheet）保持一致：
   面板只做 transform 位移（打开 --t-sheet、关闭 --t-exit），
   不做整体透明度淡入淡出；遮罩用全局 .ui-scrim（压暗 + 模糊 0px ↔ 15px）。
   组件内部用 is-open / is-closing 驱动，关闭时保留挂载到退场结束后再卸载。
   ============================================================ */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '面板' },
  maxHeight: { type: String, default: '90dvh' },
  closeOnBackdrop: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const CLOSE_BUFFER = 80
// .ui-scrim 的背景模糊过渡固定为 420ms（见 ui.css），
// 遮罩必须先跑完这段过渡，卸载才不会把模糊半径截断在半途。
const SCRIM_FADE = 420

const panel = ref(null)
const rendered = ref(false)
const open = ref(false)
const closing = ref(false)

let scrollEl = null
let previousOverflow = ''
let closeTimer = null
let frameA = 0
let frameB = 0
// 本次挂载是否真的露出过面板；只影响「打开后立刻关闭」是否可以免动画卸载。
let paintedOpen = false

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

function cancelFrames() {
  if (frameA) cancelAnimationFrame(frameA)
  if (frameB) cancelAnimationFrame(frameB)
  frameA = 0
  frameB = 0
}

function close() {
  if (!props.modelValue || closing.value) return
  emit('update:modelValue', false)
}

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

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) {
    event.preventDefault()
    close()
  }
}

function beginOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelFrames()

  // 退场途中重新打开：面板已经在屏幕上，直接把目标交回 is-open，
  // 过渡会从当前位置反向续上，不再重走一遍首帧流程。
  if (rendered.value && paintedOpen && !open.value) {
    closing.value = false
    open.value = true
    lockPage()
    return
  }

  rendered.value = true
  closing.value = false
  // 先以 translateY(105%) 渲染，等浏览器提交这一帧后再加 is-open。
  open.value = false
  lockPage()

  nextTick(() => {
    const el = panel.value
    if (!props.modelValue || !el) return
    el.focus({ preventScroll: true })

    // 强制一帧，确保起始位移已经生效，随后的 is-open 一定产生过渡。
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
  unlockPage()
}

function beginClose() {
  cancelFrames()
  clearTimeout(closeTimer)
  closeTimer = null

  if (!paintedOpen) {
    // 例如刚打开就在首帧前被关掉：面板从未露出过，不需要退场。
    teardown()
    return
  }

  // is-closing 把过渡切换为 --t-exit，同时移除 is-open 让面板继续下滑；
  // 遮罩同步移除 is-open，模糊半径 15px → 0。
  closing.value = true
  open.value = false

  const exitMs = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 650)
  const scrimMs = reduceMotion() ? 0 : SCRIM_FADE
  const holdMs = reduceMotion() ? 0 : Math.max(exitMs, scrimMs) + CLOSE_BUFFER

  closeTimer = setTimeout(() => {
    closeTimer = null
    teardown()
  }, holdMs)
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value || paintedOpen) beginClose()
}, { immediate: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelFrames()
  unlockPage()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-sheet-root">
      <div
        class="ui-scrim ui-sheet-scrim"
        :class="{ 'is-open': open, 'is-static': !closeOnBackdrop }"
        aria-hidden="true"
        @click="closeOnBackdrop && close()"
      ></div>
      <section
        ref="panel"
        class="ui-sheet-panel"
        :class="{ 'is-open': open, 'is-closing': closing }"
        :style="{ maxHeight }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <div class="ui-sheet-handle" aria-hidden="true"></div>
        <header class="ui-sheet-head">
          <h2>{{ title }}</h2>
          <button type="button" class="ui-sheet-close" aria-label="关闭面板" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div class="ui-sheet-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="ui-sheet-footer">
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
/* 压暗与背景模糊全部来自全局 .ui-scrim，这里只保证遮罩在面板之下。 */
.ui-sheet-scrim { z-index: 0; }
.ui-sheet-scrim.is-static { pointer-events: none; }
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
  transition: transform var(--t-sheet), box-shadow var(--t-fade);
}
/* 展开态彻底去掉 transform 与 will-change：它们会变成固定定位子元素的
   包含块，让面板里的日期/时间选择窗口被困在面板里并被裁剪。 */
.ui-sheet-panel.is-open { transform: none; will-change: auto; }
.ui-sheet-panel.is-closing {
  will-change: transform;
  transition: transform var(--t-exit);
}
.ui-sheet-handle {
  padding: 10px 0 4px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.ui-sheet-handle::after {
  content: '';
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--outline-variant);
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
