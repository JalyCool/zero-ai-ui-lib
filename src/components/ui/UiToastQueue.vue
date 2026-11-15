<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
const props = defineProps({
  max: { type: Number, default: 3 },
  /* 默认停留时长（ms） */
  duration: { type: Number, default: 3200 }
})

/* 通知队列：push 进队列，同时最多 max 条，悬停暂停计时，可带一个动作。 */
const list = reactive([])
let seq = 0
const hovered = ref(false)

function push(options) {
  const item = {
    id: ++seq,
    title: options.title || '',
    text: options.text || options.message || '',
    tone: options.tone || 'info',
    action: options.action || null,
    duration: options.duration === undefined ? props.duration : options.duration,
    left: options.duration === undefined ? props.duration : options.duration,
    created: Date.now()
  }
  list.push(item)
  trim()
  tick()
  return item.id
}
function dismiss(id) { const at = list.findIndex(item => item.id === id); if (at >= 0) list.splice(at, 1) }
function trim() { while (list.length > props.max) list.shift() }

let raf = 0
let last = 0
function tick() {
  if (raf) return
  last = performance.now()
  const loop = now => {
    const dt = now - last
    last = now
    if (!hovered.value) {
      for (const item of list) {
        item.left -= dt
        if (item.left <= 0) dismiss(item.id)
      }
    }
    if (list.length) raf = requestAnimationFrame(loop)
    else { raf = 0 }
  }
  raf = requestAnimationFrame(loop)
}
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })

function progressOf(item) {
  return Math.max(0, Math.min(1, item.left / Math.max(1, item.duration)))
}

defineExpose({ push, dismiss, success: (text, extra = {}) => push({ text, tone: 'success', ...extra }), error: (text, extra = {}) => push({ text, tone: 'danger', ...extra }), warning: (text, extra = {}) => push({ text, tone: 'warning', ...extra }), info: (text, extra = {}) => push({ text, tone: 'info', ...extra }) })
</script>
<template>
  <div class="ui-toastq" @mouseenter="hovered = true" @mouseleave="hovered = false" role="region" aria-live="polite">
    <TransitionGroup name="toastq">
      <div v-for="item in list" :key="item.id" class="ui-toastq__item" :class="`is-${item.tone}`">
        <div class="ui-toastq__body">
          <b v-if="item.title">{{ item.title }}</b>
          <span>{{ item.text }}</span>
        </div>
        <button v-if="item.action" type="button" class="ui-toastq__action" @click="item.action.onClick && item.action.onClick(); dismiss(item.id)">
          {{ item.action.label }}
        </button>
        <button type="button" class="ui-toastq__close" aria-label="关闭" @click="dismiss(item.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span class="ui-toastq__bar" aria-hidden="true"><i :style="{ transform: 'scaleX(' + progressOf(item) + ')' }"></i></span>
      </div>
    </TransitionGroup>
  </div>
</template>
<style scoped>
.ui-toastq { position: fixed; left: 50%; bottom: calc(74px + env(safe-area-inset-bottom)); z-index: 390; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; width: min(420px, calc(100vw - 24px)); pointer-events: none; }
.ui-toastq__item { position: relative; display: flex; align-items: center; gap: 10px; padding: 11px 13px; overflow: hidden; border-radius: 14px; border: var(--border-w) solid var(--outline-variant); background: var(--inverse-surface, #2f3033); color: var(--inverse-on-surface, #f2f1f6); font-size: var(--fs-tiny); pointer-events: auto; box-shadow: var(--elev-tip); }
.ui-toastq__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ui-toastq__body b { font-weight: var(--w-label); }
.ui-toastq__action { padding: 4px 9px; border: 0; border-radius: 999px; background: color-mix(in oklab, currentColor 18%, transparent); color: inherit; font: inherit; font-size: var(--fs-micro); font-weight: var(--w-label); cursor: pointer; }
.ui-toastq__close { display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 50%; background: transparent; color: inherit; opacity: .66; cursor: pointer; }
.ui-toastq__close svg { width: 13px; height: 13px; }
.ui-toastq__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: color-mix(in oklab, currentColor 24%, transparent); }
.ui-toastq__bar i { display: block; height: 100%; background: currentColor; transform-origin: left center; }
.ui-toastq__item.is-success { color: #d7f5e2; }
.ui-toastq__item.is-danger { color: #ffdad6; }
.ui-toastq__item.is-warning { color: #ffe9c7; }
.toastq-enter-active, .toastq-leave-active { transition: opacity var(--t-fade), transform var(--t-pop), filter var(--t-fade); }
.toastq-enter-from, .toastq-leave-to { opacity: 0; transform: translateY(12px) scale(.96); filter: blur(8px); }
</style>
