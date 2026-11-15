<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* primary / tonal / outline / text / danger / icon
     动作变体：fuse（烧引线可撤销）/ hold（按住确认）/ slide（滑动确认） */
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },

  /* ---- fuse ---- */
  undoWindow: { type: Number, default: 4000 },
  fusePosition: { type: String, default: 'outline' },   /* outline = 烧一圈边；bottom = 底部引线 */
  doneLabel: { type: String, default: '已完成' },
  undoLabel: { type: String, default: '撤销' },
  settle: { type: String, default: 'reset' },           /* reset = 烧完回 idle；stay = 停在已完成 */

  /* ---- hold ---- */
  holdTime: { type: Number, default: 1200 },
  releaseTime: { type: Number, default: 220 },
  fillDirection: { type: String, default: 'right' },    /* right | up */
  holdLabel: { type: String, default: '' },

  /* ---- slide ---- */
  slideThreshold: { type: Number, default: 64 },
  confirmLabel: { type: String, default: '滑动确认' },
  runningLabel: { type: String, default: '处理中' }
})

const emit = defineEmits(['click', 'confirm', 'commit', 'undo', 'done'])

/* ============================================================
   按钮的动作变体（按 react-bits 的手法移植，不是抄代码）
   · fuse：点一下进入「已完成」，同时开始烧引线（outline 烧一圈边、
     bottom 烧一条线），烧完落定；期间可以撤销。三个状态是三个真实
     可点面（idle / undo / settled）叠在同一处交叉淡入，用 inert 切换
     可交互性 —— 这样每个状态的焦点和 aria 都是对的。
   · hold：按住时填充按需上涨（右侧或底部），时间到才确认；提前松手
     立刻弹回（用 releaseTime 的短过渡），不会留下半格。
   · slide：拖滑块过阈值才确认；确认后把手变转圈，外部 loading 放掉后
     把手展开成一整颗完成药丸（unfurl）。
   ============================================================ */

const isFuse = computed(() => props.variant === 'fuse')
const isHold = computed(() => props.variant === 'hold')
const isSlide = computed(() => props.variant === 'slide')
const actionable = computed(() => isFuse.value || isHold.value || isSlide.value)

/* ---------- fuse：phase = idle | armed | settled ---------- */
const fusePhase = ref('idle')
const fuseGo = phase => {
  fusePhase.value = phase
  if (phase === 'armed') emit('commit')
  if (phase === 'settled') emit('done')
}

function fuseArm() {
  if (props.disabled || fusePhase.value !== 'idle') return
  fuseGo('armed')
}

function fuseUndo() {
  if (fusePhase.value !== 'armed') return
  fusePhase.value = 'idle'
  emit('undo')
}

/* 引线烧完 = 落定。用 transitionend 精确接，不靠定时器估时长。 */
function onFuseEnd(event) {
  if (event.target !== event.currentTarget) return
  if (fusePhase.value !== 'armed') return
  fuseGo(props.settle === 'stay' ? 'settled' : 'idle')
}

/* ---------- hold ---------- */
const holdPhase = ref('idle')
const holding = ref(false)
const holdProgress = ref(0)
let holdTimer = 0
let holdRaf = 0

function holdStart() {
  if (props.disabled || props.loading || holdPhase.value === 'done') return
  holding.value = true
  clearTimeout(holdTimer)
  cancelAnimationFrame(holdRaf)
  const started = performance.now()
  const step = now => {
    const ratio = Math.min(1, (now - started) / Math.max(200, props.holdTime))
    holdProgress.value = ratio
    if (ratio < 1 && holding.value) holdRaf = requestAnimationFrame(step)
    else if (holding.value) {
      holding.value = false
      holdProgress.value = 1
      holdPhase.value = 'done'
      emit('confirm')
      holdTimer = setTimeout(() => {
        holdPhase.value = 'idle'
        holdProgress.value = 0
      }, 1100)
    }
  }
  holdRaf = requestAnimationFrame(step)
}

function holdEnd() {
  if (!holding.value) return
  holding.value = false
  cancelAnimationFrame(holdRaf)
  holdProgress.value = 0
}

/* ---------- slide ---------- */
const slideX = ref(0)
const slidePhase = ref('idle')   /* idle | running | done */
const trackEl = ref(null)
let slideStartX = 0
let slidePointer = null
let slideMax = 200

function slideDown(event) {
  if (props.disabled || props.loading || slidePhase.value !== 'idle') return
  slidePointer = event.pointerId
  slideStartX = event.clientX
  slideMax = trackEl.value ? Math.max(40, trackEl.value.clientWidth - 46) : 180
  try { trackEl.value && trackEl.value.setPointerCapture && trackEl.value.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
}

function slideMove(event) {
  if (slidePointer === null) return
  slideX.value = Math.min(slideMax, Math.max(0, event.clientX - slideStartX))
}

function slideUp() {
  if (slidePointer === null) return
  slidePointer = null
  if (slideX.value >= Math.min(props.slideThreshold, slideMax * 0.72)) {
    slideX.value = slideMax
    slidePhase.value = 'running'
    emit('confirm')
  } else {
    slideX.value = 0
  }
}

/* 外部把 loading 放掉 = 跑完：转圈展开成完成药丸，停一会儿复位。 */
watch(() => props.loading, (value, prev) => {
  if (!isSlide.value) return
  if (value) { slidePhase.value = 'running'; return }
  if (prev && slidePhase.value === 'running') {
    slidePhase.value = 'done'
    emit('done')
    setTimeout(() => {
      slidePhase.value = 'idle'
      slideX.value = 0
    }, 1400)
  }
})

function slideReset() {
  slidePhase.value = 'idle'
  slideX.value = 0
}

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  cancelAnimationFrame(holdRaf)
})

function onClick(event) {
  if (!actionable.value) { emit('click', event); return }
  if (props.disabled || props.loading) return
  if (isFuse.value && fusePhase.value === 'idle') fuseArm()
  else if (isHold.value) { /* hold 由指针事件驱动，点击不做事 */ }
  else if (isSlide.value && slidePhase.value === 'done') slideReset()
}

const rootStyle = computed(() => ({
  '--undo-window': props.undoWindow + 'ms',
  '--hold-time': props.holdTime + 'ms',
  '--release-time': props.releaseTime + 'ms'
}))

defineExpose({
  reset() {
    fusePhase.value = 'idle'
    holdPhase.value = 'idle'
    holdProgress.value = 0
    slideReset()
  }
})
</script>

<template>
  <button
    :type="type"
    class="ui-btn"
    :class="[
      `ui-btn--${variant}`,
      size !== 'md' ? `ui-btn--${size}` : '',
      { 'ui-btn--block': block },
      actionable ? 'ui-btn--action' : '',
      `is-${isFuse ? fusePhase : isHold ? holdPhase : slidePhase}`,
      { 'is-holding': holding }
    ]"
    :style="rootStyle"
    :disabled="disabled || loading"
    @click="onClick"
    @pointerdown="isHold ? holdStart() : null"
    @pointerup="isHold ? holdEnd() : null"
    @pointerleave="isHold ? holdEnd() : null"
    @pointercancel="isHold ? holdEnd() : null"
    @keydown.enter.space="isHold ? holdStart() : null"
    @keyup.enter.space="isHold ? holdEnd() : null"
    @keydown.esc="isFuse && fusePhase === 'armed' ? fuseUndo() : null"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true"></span>

    <!-- ============ fuse：三个面叠放 + 烧边 / 烧线 ============ -->
    <template v-if="isFuse">
      <span class="ui-btn__face ui-btn__face--idle" :inert="fusePhase !== 'idle' || undefined">
        <span class="ui-btn__label"><slot /></span>
      </span>
      <span
        class="ui-btn__face ui-btn__face--undo"
        :inert="fusePhase !== 'armed' || undefined"
        :aria-label="undoLabel"
        @click.stop="fuseUndo"
      >
        <span class="ui-btn__label">{{ undoLabel }}</span>
      </span>
      <span class="ui-btn__face ui-btn__face--settled" :inert="fusePhase !== 'settled' || undefined">
        <span class="ui-btn__label">{{ doneLabel }}</span>
      </span>

      <svg v-if="fusePosition === 'outline'" class="ui-btn__rim" aria-hidden="true">
        <rect
          x="1" y="1"
          :width="'calc(100% - 2px)'" :height="'calc(100% - 2px)'"
          rx="999"
          pathLength="1"
          @transitionend="onFuseEnd"
        />
      </svg>
      <span
        v-else
        class="ui-btn__fuse-line"
        aria-hidden="true"
        @transitionend="onFuseEnd"
      ></span>
    </template>

    <!-- ============ hold：填充上涨 ============ -->
    <template v-else-if="isHold">
      <span
        class="ui-btn__hold-fill"
        :class="`is-${fillDirection}`"
        :style="{ '--p': holdProgress }"
        aria-hidden="true"
      ></span>
      <span class="ui-btn__label">
        <slot>{{ holdLabel }}</slot>
      </span>
      <span class="ui-btn__hold-hint" aria-hidden="true">{{ holdPhase === 'done' ? doneLabel : '' }}</span>
    </template>

    <!-- ============ slide：轨道 + 把手 ============ -->
    <template v-else-if="isSlide">
      <span
        ref="trackEl"
        class="ui-btn__slide-track"
        @pointerdown="slideDown"
        @pointermove="slideMove"
        @pointerup="slideUp"
        @pointercancel="slideUp"
      >
        <span class="ui-btn__slide-hint">
          {{ slidePhase === 'running' ? runningLabel : slidePhase === 'done' ? doneLabel : confirmLabel }}
        </span>
        <span
          class="ui-btn__slide-handle"
          :style="{ transform: 'translate3d(' + slideX + 'px,0,0)' }"
        >
          <svg v-if="slidePhase === 'running'" class="ui-btn__slide-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4a8 8 0 1 1-8 8" /></svg>
          <svg v-else-if="slidePhase === 'done'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.4 4.4L19 7" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </span>
    </template>

    <!-- ============ 普通按钮 ============ -->
    <template v-else>
      <slot />
    </template>
  </button>
</template>

<style scoped>
/* ---------- fuse ---------- */
.ui-btn--fuse { position: relative; overflow: hidden; }
.ui-btn__face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity var(--t-fade), transform var(--t-panel) var(--spring-view);
}
/* 三个面叠在同一格：同一时间只有一个是可见可交互的。 */
.ui-btn__face--undo,
.ui-btn__face--settled {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(.96);
  pointer-events: none;
}
.ui-btn--fuse.is-armed .ui-btn__face--idle { opacity: 0; transform: scale(1.04); }
.ui-btn--fuse.is-armed .ui-btn__face--undo { opacity: 1; transform: none; pointer-events: auto; }
.ui-btn--fuse.is-settled .ui-btn__face--idle { opacity: 0; }
.ui-btn--fuse.is-settled .ui-btn__face--settled { opacity: 1; transform: none; }

/* 烧边：outline 用 pathLength=1 的 rect，dashoffset 0 → -1 烧一整圈。
   时长直接等于撤销窗口，所以「边烧完」与「可撤销结束」是同一刻。 */
.ui-btn__rim {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}
.ui-btn__rim rect {
  fill: none;
  stroke: var(--ui-warning, #b45309);
  stroke-width: 1.6;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}
.ui-btn--fuse.is-armed .ui-btn__rim rect {
  stroke-dashoffset: -1;
  transition: stroke-dashoffset var(--undo-window) linear;
}
/* bottom 位置：一条底部引线，宽度从 100% 烧到 0。 */
.ui-btn__fuse-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--ui-warning, #b45309), var(--error));
  transform-origin: left center;
  transform: scaleX(1);
  pointer-events: none;
}
.ui-btn--fuse.is-armed .ui-btn__fuse-line {
  transform: scaleX(0);
  transition: transform var(--undo-window) linear;
}

/* ---------- hold ---------- */
.ui-btn--hold { position: relative; overflow: hidden; }
.ui-btn__hold-fill {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, currentColor 22%, transparent);
  pointer-events: none;
}
.ui-btn__hold-fill.is-right { transform-origin: left center; transform: scaleX(var(--p, 0)); }
.ui-btn__hold-fill.is-up { transform-origin: bottom center; transform: scaleY(var(--p, 0)); }
/* 松手回弹比按住时更短、更软：按住是线性的，回弹是减速的。 */
.ui-btn--hold:not(.is-holding) .ui-btn__hold-fill { transition: transform var(--release-time) cubic-bezier(.25,.1,.25,1); }
.ui-btn--hold.is-holding .ui-btn__hold-fill { transition: none; }
.ui-btn--hold .ui-btn__label { position: relative; }
.ui-btn__hold-hint { position: relative; margin-left: 6px; font-size: var(--fs-micro); opacity: .7; }

/* ---------- slide ---------- */
.ui-btn--slide {
  padding: 0;
  background: var(--surface-container-high);
  color: var(--on-surface);
  border-color: var(--outline-variant);
  overflow: hidden;
}
.ui-btn__slide-track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 200px;
  height: 100%;
  min-height: 42px;
  padding: 0 4px;
  touch-action: none;
  cursor: grab;
}
.ui-btn__slide-track:active { cursor: grabbing; }
.ui-btn__slide-hint {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
  transition: opacity var(--t-fade);
}
.ui-btn__slide-handle {
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  display: grid;
  place-items: center;
  width: 38px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  transition: transform var(--t-panel) var(--spring-view), width var(--t-panel), background var(--t-fade);
}
.ui-btn__slide-handle svg { width: 16px; height: 16px; }
.ui-btn__slide-spin { animation: uiBtnSpin 900ms linear infinite; }
.ui-btn--slide.is-running .ui-btn__slide-hint { opacity: .5; }
/* 跑完：把手展开成整颗药丸。 */
.ui-btn--slide.is-done .ui-btn__slide-handle { width: calc(100% - 8px); background: var(--ui-success, #15803d); }
.ui-btn--slide.is-done .ui-btn__slide-hint { opacity: 0; }

@keyframes uiBtnSpin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .ui-btn__face,
  .ui-btn__slide-handle,
  .ui-btn__hold-fill { transition-duration: .01ms !important; }
  .ui-btn--fuse.is-armed .ui-btn__rim rect,
  .ui-btn--fuse.is-armed .ui-btn__fuse-line { transition-duration: var(--undo-window) linear !important; }
  .ui-btn__slide-spin { animation: none; }
}
</style>
