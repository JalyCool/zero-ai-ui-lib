<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/* 指针捕获在指针已失效时会抛 NotFoundError，包一层避免打断手势。 */
function safeCapture(el, id) {
  try { el && el.setPointerCapture && el.setPointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}
function safeRelease(el, id) {
  try { el && el.releasePointerCapture && el.releasePointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}

const props = defineProps({
  /* 划开后露出的操作：[{ label, tone?: 'neutral'|'danger', icon?: SVG 标记 }] */
  actions: { type: Array, default: () => [] },
  /* 打开 / 关闭阈值（占露出宽度的比例） */
  threshold: { type: Number, default: 0.42 },
  /* 整行划到底时自动触发最后一个操作 */
  fullSwipeAction: { type: Boolean, default: true },
  /* 一次性操作（触发后行自动收回） */
  once: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /* 是否展开（可选受控） */
  open: { type: Boolean, default: null }
})

const emit = defineEmits(['action', 'update:open', 'swipe'])

/* ============================================================
   划开式列表行
   默认槽是行内容，操作按钮压在右侧下面，行本身向左推开才露出来。
   · 拖动跟手：位移跟手指 1:1，越界走橡皮筋；
   · 松手按「位移比例 + 速度」决定吸到打开还是收回；
   · 继续往左划超过 full 阈值：直接触发最后一个操作（通常是删除），
     并给一次明显的回弹，让用户知道「到底了」。
   ============================================================ */

const ACTION_W = 76
const rootEl = ref(null)
const offset = ref(0)
const dragging = ref(false)
const armed = ref(false)

let pointerId = null
let startX = 0
let startY = 0
let startOffset = 0
let lastX = 0
let lastT = 0
let velocity = 0
let axis = ''

const actionsWidth = computed(() => Math.max(0, props.actions.length) * ACTION_W)
const fullWidth = computed(() => actionsWidth.value + 72)
const openWidth = computed(() => actionsWidth.value)
const isOpen = computed(() => offset.value <= -openWidth.value * 0.9)
const progress = computed(() => (openWidth.value ? Math.min(1, -offset.value / openWidth.value) : 0))

function setOffset(value, animate = true) {
  offset.value = value
  const el = rootEl.value
  if (!el) return
  el.style.transition = animate ? 'transform var(--t-panel) var(--t-panel)' : 'none'
  el.style.transform = 'translate3d(' + value + 'px, 0, 0)'
}

function snapTo(target) {
  setOffset(target, true)
  const opened = target !== 0
  if (props.open === null) return
  emit('update:open', opened)
}

function close() { snapTo(0) }
function openRow() { snapTo(-openWidth.value) }

function onPointerDown(event) {
  if (props.disabled || event.button > 0) return
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  startOffset = offset.value
  lastX = event.clientX
  lastT = event.timeStamp
  velocity = 0
  axis = ''
  dragging.value = false
  rootEl.value && rootEl.value.setPointerCapture && safeCapture(rootEl.value, event.pointerId)
}

function onPointerMove(event) {
  if (pointerId === null || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!axis) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (axis === 'y') { pointerId = null; return }
    dragging.value = true
    setOffset(startOffset, false)
  }
  if (event.cancelable) event.preventDefault()
  velocity = (event.clientX - lastX) / Math.max(1, event.timeStamp - lastT)
  lastX = event.clientX
  lastT = event.timeStamp

  let next = startOffset + dx
  /* 只往左推开；往右越界给一点橡皮筋。 */
  if (next > 0) next = Math.min(18, next * 0.3)
  if (next < -fullWidth.value) next = -fullWidth.value - Math.min(26, (-next - fullWidth.value) * 0.32)
  armed.value = props.fullSwipeAction && next <= -fullWidth.value + 6
  setOffset(next, false)
  emit('swipe', { offset: next, progress: Math.min(1, -next / Math.max(1, fullWidth.value)) })
}

function onPointerUp(event) {
  if (pointerId === null) return
  const wasDragging = dragging.value
  const travelled = offset.value
  pointerId = null
  dragging.value = false
  rootEl.value && rootEl.value.releasePointerCapture && safeRelease(rootEl.value, event.pointerId)
  if (!wasDragging) return

  /* 整行划到底：触发最后一个操作并回弹。 */
  if (props.fullSwipeAction && travelled <= -fullWidth.value + 8) {
    armed.value = false
    const action = props.actions[props.actions.length - 1]
    setOffset(-fullWidth.value, false)
    /* 先给一下「到底」的反馈，再执行。 */
    requestAnimationFrame(() => {
      if (action) emit('action', { action, index: props.actions.length - 1, full: true })
      if (props.once) close()
      else openRow()
    })
    return
  }

  armed.value = false
  const ratio = openWidth.value ? -travelled / openWidth.value : 0
  const shouldOpen = ratio > props.threshold || (velocity < -0.5 && ratio > 0.16)
  if (shouldOpen) openRow()
  else {
    const flickBack = velocity > 0.5 && ratio > 0.16
    close()
    if (flickBack) close()
  }
}

function onAction(action, index) {
  emit('action', { action, index, full: false })
  if (props.once) close()
  else close()
}

watch(() => props.open, value => {
  if (value === null || value === undefined || dragging.value) return
  if (value) openRow()
  else close()
}, { immediate: true })

watch(() => props.actions.length, () => { if (!isOpen.value) close() })

onBeforeUnmount(() => { pointerId = null })

defineExpose({ close, open: openRow })
</script>

<template>
  <div class="ui-swipe-row" :class="{ 'is-open': isOpen, 'is-armed': armed, 'is-disabled': disabled }">
    <!-- 操作层压在行下面，行推开后露出。 -->
    <div class="ui-swipe-row__actions" aria-hidden="false">
      <button
        v-for="(action, index) in actions"
        :key="action.label + index"
        type="button"
        class="ui-swipe-row__action"
        :class="[`is-${action.tone || 'neutral'}`, { 'is-armed': armed && index === actions.length - 1 }]"
        :tabindex="isOpen ? 0 : -1"
        @click="onAction(action, index)"
      >
        <span v-if="action.icon" class="ui-swipe-row__action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="action.icon"></svg>
        </span>
        <span class="ui-swipe-row__action-label">{{ action.label }}</span>
      </button>
    </div>

    <!-- 行本体：跟手位移由 JS 写 transform。 -->
    <div
      ref="rootEl"
      class="ui-swipe-row__surface"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <slot :close="close" :progress="progress">
        <span class="ui-swipe-row__fallback">列表行</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ui-swipe-row {
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--r-list, 16px) * var(--radius-scale));
  background: var(--surface-container-low);
  isolation: isolate;
}
.ui-swipe-row__actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  align-items: stretch;
  z-index: 0;
}
.ui-swipe-row__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 76px;
  padding: 0 6px;
  border: 0;
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-swipe-row__action:active { transform: scale(.96); }
.ui-swipe-row__action.is-danger { background: var(--error); color: var(--on-error, #fff); }
.ui-swipe-row__action.is-neutral { background: var(--surface-container-high); }
.ui-swipe-row__action-icon { display: grid; place-items: center; }
.ui-swipe-row__action-icon svg { width: 18px; height: 18px; }
.ui-swipe-row__action-label { white-space: nowrap; }
/* 划到底时的最后一个操作：整块亮起来提示「松手就执行」。 */
.ui-swipe-row__action.is-armed { background: color-mix(in oklab, var(--error) 82%, #000); }

.ui-swipe-row__surface {
  position: relative;
  z-index: 1;
  background: var(--surface-container-low);
  border: var(--border-w) solid var(--outline-variant);
  border-radius: inherit;
  will-change: transform;
  touch-action: pan-y;
  cursor: grab;
}
.ui-swipe-row.is-disabled .ui-swipe-row__surface { cursor: default; }
.ui-swipe-row__surface:active { cursor: grabbing; }
/* 打开后行与操作层之间加一道细阴影，表明「下面还有东西」。 */
.ui-swipe-row.is-open .ui-swipe-row__surface { box-shadow: -8px 0 18px -12px rgba(0, 0, 0, .35); }
.ui-swipe-row__fallback { display: block; padding: 14px 14px; font-size: var(--fs-small); }
.ui-swipe-row.is-disabled .ui-swipe-row__actions { opacity: .42; }
</style>
