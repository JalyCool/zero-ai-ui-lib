<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  /* 右侧操作（向左划露出）：[{ id?, label, tone?: 'neutral'|'danger'|'success', icon?: SVG 标记 }] */
  actions: { type: Array, default: () => [] },
  /* 左侧操作（向右划露出）：同样格式。两边都配了就是双向滑动。 */
  leftActions: { type: Array, default: () => [] },
  /* 拖过多少比例算「打开」 */
  threshold: { type: Number, default: 0.42 },
  /* 划到底直接执行该方向最后一个操作——默认关闭 */
  fullSwipe: { type: Boolean, default: false },
  /* 操作后整行折叠消失 */
  collapseOnAction: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['action', 'commit', 'open-change'])

/* ============================================================
   划开式列表行（双侧操作）
   状态机：idle -> committing（划到底）-> collapsing（收起）
   · x < 0 = 向左划，露出右侧操作；x > 0 = 向右划，露出左侧操作；
   · 越界橡皮筋、松手按位移 + 速度吸附；
   · fullSwipe：越过本侧轨道后再推 64px，落定块从该侧长出来，
     松手整行滑出 + 折叠；
   · 指针捕获不吞行内点击（拖过吞 click，纯点按转发）。
   ============================================================ */

const rootEl = ref(null)
const surfaceEl = ref(null)
const railEl = ref(null)
const leftRailEl = ref(null)
const phase = ref('idle')
const open = ref(false)
const side = ref('right')
const x = ref(0)
const landed = ref(0)
const dragging = ref(false)

const rightWidth = computed(() => props.actions.length * 76)
const leftWidth = computed(() => props.leftActions.length * 76)

let pointerId = null
let startX = 0
let startOffset = 0
let hist = []
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
  setStyle(false)
}

function onMove(event) {
  if (pointerId === null || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  if (Math.abs(dx) > 4) moved = true
  if (event.cancelable) event.preventDefault()
  let next = startOffset + dx
  const towardRight = next < 0
  const limit = towardRight ? rightWidth.value : leftWidth.value
  if (Math.abs(next) > limit) {
    const over = Math.abs(next) - limit
    if (props.fullSwipe && limit > 0) {
      /* 越过本侧轨道：fullSwipe 下最多再推 64px，之后橡皮筋 */
      const capped = Math.min(over, 64 + Math.max(0, over - 64) * 0.3)
      next = (towardRight ? -1 : 1) * (limit + capped)
    } else {
      next = (towardRight ? -1 : 1) * (limit + Math.min(16, over * 0.28))
    }
  }
  x.value = next
  hist.push({ x: event.clientX, t: event.timeStamp })
  while (hist.length > 2 && event.timeStamp - hist[0].t > 90) hist.shift()
  side.value = next < 0 ? 'right' : 'left'
  const activeLimit = next < 0 ? rightWidth.value : leftWidth.value
  landed.value = props.fullSwipe ? Math.min(1, Math.max(0, (Math.abs(next) - activeLimit) / 64)) : 0
  setStyle(false)
}

/* 指针捕获会把松手后浏览器补发的 click 重定向到 surface：
   拖过 -> 吞掉；纯点按 -> elementsFromPoint 找回真正被点的元素转发。 */
function handleCapturedClick(clientX, clientY, wasDragged) {
  const surface = surfaceEl.value
  if (!surface) return
  const killer = event => {
    surface.removeEventListener('click', killer, true)
    event.preventDefault()
    event.stopPropagation()
    /* 打开状态下的这次点按语义是「收起」；同时转发给行内容会触发展开，
       两个动作叠在一起就是一次跳动。 */
    if (wasDragged || props.disabled || open.value) return
    if (typeof document.elementsFromPoint !== 'function') return
    const stack = document.elementsFromPoint(clientX, clientY)
    const rails = [railEl.value, leftRailEl.value].filter(Boolean)
    const real = stack.find(el =>
      el !== surface
      && !rails.some(rail => rail.contains(el))
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
  const towardRight = x.value < 0
  const activeLimit = towardRight ? rightWidth.value : leftWidth.value

  /* 划到底：越过本侧轨道 + 64px，执行该方向最后一个操作 */
  if (props.fullSwipe && activeLimit > 0 && Math.abs(x.value) >= activeLimit + 64 - 6) {
    const list = towardRight ? props.actions : props.leftActions
    commit(list[list.length - 1], true, velocity)
    return
  }

  const ratio = activeLimit ? Math.abs(x.value) / activeLimit : 0
  const flick = towardRight ? velocity < -0.35 : velocity > 0.35
  const shouldOpen = activeLimit > 0 && (ratio > props.threshold || (flick && ratio > 0.12))
  if (shouldOpen) {
    open.value = true
    settle(true, velocity)
  } else {
    open.value = false
    settle(false, velocity)
  }
  landed.value = 0
}

function settle(target, velocity) {
  const to = target ? (side.value === 'right' ? -rightWidth.value : leftWidth.value) : 0
  x.value = to
  const el = surfaceEl.value
  if (el) {
    const spring = getComputedStyle(document.documentElement).getPropertyValue('--spring-pop').trim() || 'cubic-bezier(.34,1.4,.64,1)'
    el.style.transition = 'transform ' + (target ? 360 : 300) + 'ms ' + spring
    el.style.transform = 'translate3d(' + to + 'px,0,0)'
  }
  applyRails(true)
  emit('open-change', target ? side.value : false)
}

/* 双侧轨道：按当前位移算各自露出量 */
function applyRails(animate) {
  const shownRight = Math.max(0, -x.value)
  const shownLeft = Math.max(0, x.value)
  const right = railEl.value
  const left = leftRailEl.value
  if (right) {
    right.style.transition = animate ? 'transform 260ms cubic-bezier(.22,1.2,.36,1), opacity 200ms ease' : 'none'
    right.style.transform = 'translate3d(' + (rightWidth.value - shownRight) + 'px,0,0)'
    right.style.opacity = String(rightWidth.value ? Math.min(1, shownRight / rightWidth.value) : 0)
  }
  if (left) {
    left.style.transition = animate ? 'transform 260ms cubic-bezier(.22,1.2,.36,1), opacity 200ms ease' : 'none'
    left.style.transform = 'translate3d(' + (shownLeft - leftWidth.value) + 'px,0,0)'
    left.style.opacity = String(leftWidth.value ? Math.min(1, shownLeft / leftWidth.value) : 0)
  }
}

function setStyle(animate) {
  const el = surfaceEl.value
  if (!el) return
  el.style.transition = animate ? '' : 'none'
  el.style.transform = 'translate3d(' + x.value + 'px,0,0)'
  applyRails(animate)
}

function commit(action, viaFull, velocity = 0) {
  if (!action || phase.value !== 'idle') return
  phase.value = 'committing'
  landed.value = 1
  const towardRight = x.value <= 0
  const limit = towardRight ? rightWidth.value : leftWidth.value
  const full = limit + 64
  x.value = towardRight ? -full : full
  const el = surfaceEl.value
  if (el) {
    el.style.transition = 'transform 240ms cubic-bezier(.23,1,.32,1)'
    el.style.transform = 'translate3d(' + x.value + 'px,0,0)'
  }
  applyRails(true)
  emit('commit', { action, full: viaFull })
  emit('action', action)
  if (props.collapseOnAction || viaFull) {
    phase.value = 'collapsing'
    const root = rootEl.value
    if (root) {
      /* 先提交当前高度再动画：直接写 0 会被浏览器当成「本来就没高度」，
         折叠就变成瞬没 —— 行在列表底部时尤其明显。 */
      const fromHeight = root.offsetHeight
      root.style.transition = 'none'
      root.style.height = fromHeight + 'px'
      root.style.opacity = '1'
      void root.offsetWidth
      requestAnimationFrame(() => {
        root.style.transition = 'height 240ms cubic-bezier(.23,1,.32,1) 60ms, opacity 180ms ease 60ms'
        root.style.height = '0px'
        root.style.opacity = '0'
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

function onSurfaceClick(event) {
  if (phase.value !== 'idle') return
  if (open.value) {
    open.value = false
    landed.value = 0
    settle(false, 0)
    event.preventDefault()
    event.stopPropagation()
  }
}

function close() {
  if (!open.value && x.value === 0) return
  open.value = false
  landed.value = 0
  settle(false, 0)
}
defineExpose({ close })

onBeforeUnmount(() => { pointerId = null })
</script>
<template>
  <div ref="rootEl" class="ui-swipe-row" :class="['is-' + phase, { 'is-open': open, 'is-dragging': dragging }]">
    <!-- 左侧轨道：向右划露出 -->
    <div v-if="leftActions.length" ref="leftRailEl" class="ui-swipe-row__rail ui-swipe-row__rail--left" :aria-hidden="open && side === 'left' ? 'false' : 'true'">
      <button
        v-for="(action, index) in leftActions"
        :key="'l' + action.label + index"
        type="button"
        class="ui-swipe-row__action"
        :class="['is-' + (action.tone || 'neutral'), { 'is-landed': landed > 0.6 && index === leftActions.length - 1 }]"
        :tabindex="open && side === 'left' ? 0 : -1"
        @click.stop="onAction(action)"
      >
        <span v-if="action.icon" class="ui-swipe-row__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="action.icon"></svg>
        </span>
        <span class="ui-swipe-row__label">{{ action.label }}</span>
      </button>
    </div>

    <!-- 右侧轨道：向左划露出 -->
    <div v-if="actions.length" ref="railEl" class="ui-swipe-row__rail" :aria-hidden="open && side === 'right' ? 'false' : 'true'">
      <button
        v-for="(action, index) in actions"
        :key="action.label + index"
        type="button"
        class="ui-swipe-row__action"
        :class="['is-' + (action.tone || 'neutral'), { 'is-landed': landed > 0.6 && index === actions.length - 1 }]"
        :tabindex="open && side === 'right' ? 0 : -1"
        @click.stop="onAction(action)"
      >
        <span v-if="action.icon" class="ui-swipe-row__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="action.icon"></svg>
        </span>
        <span class="ui-swipe-row__label">{{ action.label }}</span>
      </button>
      <span v-if="fullSwipe && side === 'right'" class="ui-swipe-row__commit" :style="{ width: (landed * 64).toFixed(1) + 'px' }" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
      </span>
    </div>

    <!-- 左侧提交块 -->
    <div v-if="fullSwipe && leftActions.length" class="ui-swipe-row__commit ui-swipe-row__commit--left" :style="{ width: (side === 'left' ? landed * 64 : 0).toFixed(1) + 'px' }" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
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
      <slot :close="close" />
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
  will-change: transform, opacity;
}
.ui-swipe-row__rail--left { inset: 0 auto 0 0; }
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
.ui-swipe-row__action.is-success { background: var(--ui-success, #15803d); color: #fff; }
.ui-swipe-row__action.is-landed { background: color-mix(in oklab, var(--error) 84%, #000); }
.ui-swipe-row__icon { display: grid; place-items: center; }
.ui-swipe-row__icon svg { width: 18px; height: 18px; }
.ui-swipe-row__label { white-space: nowrap; }
.ui-swipe-row__commit {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: color-mix(in oklab, var(--error) 70%, #000);
  color: #fff;
  transition: width 120ms cubic-bezier(.23,1,.32,1);
}
.ui-swipe-row__commit--left {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  z-index: 2;
  background: color-mix(in oklab, var(--ui-success, #15803d) 70%, #000);
}
.ui-swipe-row__commit svg { width: 20px; height: 20px; flex-shrink: 0; }
.ui-swipe-row__surface {
  position: relative;
  z-index: 1;
  background: var(--surface-container-low);
  border-radius: inherit;
  will-change: transform;
  touch-action: pan-y;
  cursor: grab;
}
.ui-swipe-row.is-dragging .ui-swipe-row__surface { cursor: grabbing; }
.ui-swipe-row.is-collapsing { min-height: 0; }
</style>