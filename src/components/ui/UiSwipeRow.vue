<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* [{ id?, label, tone?: 'neutral'|'danger', icon?: SVG 标记 }] */
  actions: { type: Array, default: () => [] },
  /* 拖过多少像素算「打开」 */
  threshold: { type: Number, default: 0.42 },
  /* 划到底直接执行最后一个操作（往往是删除）——默认关闭，需要显式开启 */
  fullSwipe: { type: Boolean, default: false },
  /* 操作后整行折叠消失 */
  collapseOnAction: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['action', 'commit', 'open-change'])

/* ============================================================
   划开式列表行（按 react-bits 的 SwipeRow 手法移植）
   状态机：idle → committing（松手越过整行阈值）→ collapsing（收起）
   · 位移 x 跟手，越界走橡皮筋；
   · spread 是「抽屉展开度」：打开时执行层整体铺开，关闭时收回；
   · landed 是「提交块落位」：越过整行阈值时，最后一个操作会从轨道
     右端长出来、跟随手指（像把卡片推到终点），松手即提交；
   · committing 后按 collapse 过渡收掉高度 / 外边距 / 透明度，交给父级删数据。
   ============================================================ */

const rootEl = ref(null)
const surfaceEl = ref(null)
const railEl = ref(null)
const phase = ref('idle')
const open = ref(false)
const x = ref(0)
const spread = ref(0)
const landed = ref(0)
const dragging = ref(false)

const actionsWidth = computed(() => props.actions.length * 76)
let pointerId = null
let startX = 0
let startOffset = 0
let hist = []
/* 本次按压是否真的发生了拖动（>4px）——决定松手后浏览器补发的
   click 是吞掉（拖过）还是转发给真正被点的元素（纯点按）。 */
let moved = false

function velocityOf() {
  if (hist.length < 2) return 0
  const first = hist[0]
  const last = hist[hist.length - 1]
  const dt = last.t - first.t
  if (!dt) return 0
  return Math.max(-2.4, Math.min(2.4, (last.x - first.x) / dt))
}

function capture(id) {
  try { surfaceEl.value && surfaceEl.value.setPointerCapture && surfaceEl.value.setPointerCapture(id) } catch (error) { /* 忽略 */ }
}

function onDown(event) {
  if (props.disabled || event.button > 0 || phase.value !== 'idle') return
  pointerId = event.pointerId
  startX = event.clientX
  startOffset = x.value
  moved = false
  hist = [{ x: event.clientX, t: event.timeStamp }]
  dragging.value = true
  capture(pointerId)
  /* 拖动期间关掉过渡，保证跟手。 */
  setStyle(0, false)
}

function onMove(event) {
  if (pointerId === null || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  if (Math.abs(dx) > 4) moved = true
  if (event.cancelable) event.preventDefault()
  let next = startOffset + dx
  /* 只往左推；往右是橡皮筋。 */
  const limit = actionsWidth.value
  if (next > 0) next = Math.min(16, next * 0.28)
  const fullPoint = limit + 64
  if (next < -fullPoint) next = -fullPoint - Math.min(24, (-next - fullPoint) * 0.3)
  x.value = next
  hist.push({ x: event.clientX, t: event.timeStamp })
  while (hist.length > 2 && event.timeStamp - hist[0].t > 90) hist.shift()
  spread.value = Math.min(1, Math.max(0, -next / Math.max(1, limit)))
  landed.value = props.fullSwipe ? Math.min(1, Math.max(0, (-next - limit) / 64)) : 0
  setStyle(0, false)
}

/* 指针捕获会把松手后浏览器补发的 click 重定向到 surface：
   · 拖过（moved）→ 吞掉，否则刚划开的操作条会被立即收起；
   · 纯点按（!moved）→ 用 elementsFromPoint 找回真正被点的元素，
     把 click 转发回去，行内按钮 / 复选框等不会被捕获吃掉。 */
function handleCapturedClick(clientX, clientY, wasDragged) {
  const surface = surfaceEl.value
  if (!surface) return
  const killer = event => {
    surface.removeEventListener('click', killer, true)
    event.preventDefault()
    event.stopPropagation()
    if (wasDragged || props.disabled) return
    if (typeof document.elementsFromPoint !== 'function') return
    const stack = document.elementsFromPoint(clientX, clientY)
    const rail = railEl.value
    const real = stack.find(el =>
      el !== surface
      && !(rail && rail.contains(el))
      && !(el.closest && el.closest('.ui-swipe-row__commit')))
    if (real) {
      real.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    }
  }
  surface.addEventListener('click', killer, true)
}

function onUp(event) {
  if (pointerId === null) return
  const velocity = velocityOf()
  pointerId = null
  dragging.value = false
  try { surfaceEl.value && surfaceEl.value.releasePointerCapture && surfaceEl.value.releasePointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
  handleCapturedClick(event.clientX, event.clientY, moved)
  const fullPoint = actionsWidth.value + 64

  if (props.fullSwipe && x.value <= -fullPoint + 6) {
    commit(props.actions[props.actions.length - 1], true, velocity)
    return
  }

  const ratio = actionsWidth.value ? -x.value / actionsWidth.value : 0
  const shouldOpen = ratio > props.threshold || (velocity < -0.35 && ratio > 0.12)
  if (shouldOpen) {
    open.value = true
    settle(true, velocity)
  } else {
    open.value = false
    settle(false, velocity)
  }
  landed.value = 0
}

/* 吸附：用过渡到目标，速度作为方向加成。 */
function settle(target, velocity) {
  const limit = actionsWidth.value
  const to = target ? -limit : 0
  x.value = to
  spread.value = target ? 1 : 0
  const el = surfaceEl.value
  if (el) {
    /* 吸附曲线跟气质走：活泼模式会过冲一下。 */
    const spring = getComputedStyle(document.documentElement).getPropertyValue('--spring-pop').trim() || 'cubic-bezier(.22,1.2,.36,1)'
    el.style.transition = 'transform ' + (target ? 360 : 300) + 'ms ' + spring
    el.style.transform = 'translate3d(' + to + 'px,0,0)'
  }
  if (railEl.value) {
    railEl.value.style.transition = 'opacity 200ms ease, transform 260ms cubic-bezier(.22,1.2,.36,1)'
    railEl.value.style.transform = 'translate3d(' + (target ? 0 : limit) + 'px,0,0)'
  }
  emit('open-change', target)
}

function setStyle(_, animate) {
  const el = surfaceEl.value
  if (!el) return
  el.style.transition = animate ? '' : 'none'
  el.style.transform = 'translate3d(' + x.value + 'px,0,0)'
  if (railEl.value) {
    railEl.value.style.transition = 'none'
    railEl.value.style.transform = 'translate3d(' + (actionsWidth.value - Math.max(0, -x.value)) + 'px,0,0)'
    railEl.value.style.opacity = String(0.4 + 0.6 * spread.value)
  }
}

function commit(action, viaFull, velocity = 0) {
  if (!action || phase.value !== 'idle') return
  phase.value = 'committing'
  landed.value = 1
  const limit = actionsWidth.value
  x.value = -(limit + 64)
  const el = surfaceEl.value
  if (el) {
    el.style.transition = 'transform 240ms cubic-bezier(.23,1,.32,1)'
    el.style.transform = 'translate3d(' + x.value + 'px,0,0)'
  }
  emit('commit', { action, full: viaFull })
  emit('action', action)
  if (props.collapseOnAction || viaFull) {
    phase.value = 'collapsing'
    const root = rootEl.value
    if (root) {
      root.style.transition = 'height 220ms cubic-bezier(.23,1,.32,1), margin 220ms cubic-bezier(.23,1,.32,1), opacity 220ms ease'
      root.style.height = root.offsetHeight + 'px'
      requestAnimationFrame(() => {
        root.style.height = '0px'
        root.style.opacity = '0'
        root.style.marginTop = '-10px'
      })
    }
  } else {
    phase.value = 'idle'
  }
}

function onAction(action) {
  if (phase.value !== 'idle' || props.disabled) return
  commit(action, false)
}

/* 点击行内容：打开时先收起，不触发业务点击。 */
function onSurfaceClick(event) {
  if (phase.value !== 'idle') return
  if (open.value) {
    open.value = false
    settle(false, 0)
    event.preventDefault()
    event.stopPropagation()
  }
}

watch(() => props.actions.length, () => { if (!props.actions.length) settle(false, 0) })
onBeforeUnmount(() => { pointerId = null })
</script>

<template>
  <div ref="rootEl" class="ui-swipe-row" :class="[`is-${phase}`, { 'is-open': open, 'is-dragging': dragging }]">
    <div ref="railEl" class="ui-swipe-row__rail" :aria-hidden="open ? 'false' : 'true'">
      <button
        v-for="(action, index) in actions"
        :key="action.label + index"
        type="button"
        class="ui-swipe-row__action"
        :class="[`is-${action.tone || 'neutral'}`, { 'is-landed': landed > 0.6 && index === actions.length - 1 }]"
        :tabindex="open ? 0 : -1"
        @click.stop="onAction(action)"
      >
        <span v-if="action.icon" class="ui-swipe-row__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="action.icon"></svg>
        </span>
        <span class="ui-swipe-row__label">{{ action.label }}</span>
      </button>
      <!-- 划到底的提交块：跟随手指从右端长出来 -->
      <span class="ui-swipe-row__commit" :style="{ width: (landed * 64).toFixed(1) + 'px' }" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.4 4.4L19 7" /></svg>
      </span>
    </div>

    <div
      ref="surfaceEl"
      class="ui-swipe-row__surface"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @click="onSurfaceClick"
    >
      <slot :close="() => { open = false; settle(false, 0) }" />
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
.ui-swipe-row__rail {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  align-items: stretch;
  will-change: transform;
}
.ui-swipe-row__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 76px;
  border: 0;
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-pop);
}
.ui-swipe-row__action:active { transform: scale(.96); }
.ui-swipe-row__action.is-danger { background: var(--error); color: var(--on-error, #fff); }
.ui-swipe-row__action.is-landed { background: color-mix(in oklab, var(--error) 84%, #000); }
.ui-swipe-row__icon { display: grid; place-items: center; }
.ui-swipe-row__icon svg { width: 18px; height: 18px; }
.ui-swipe-row__label { white-space: nowrap; }

/* 提交块：越过整行阈值后从右端展开，越推越宽。 */
.ui-swipe-row__commit {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: color-mix(in oklab, var(--error) 70%, #000);
  color: #fff;
  transition: width 120ms cubic-bezier(.23,1,.32,1);
}
.ui-swipe-row__commit svg { width: 20px; height: 20px; flex-shrink: 0; }

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
.ui-swipe-row.is-dragging .ui-swipe-row__surface { cursor: grabbing; }
.ui-swipe-row.is-open .ui-swipe-row__surface { box-shadow: -10px 0 20px -14px rgba(0, 0, 0, .4); }
.ui-swipe-row.is-collapsing { min-height: 0; }
</style>
