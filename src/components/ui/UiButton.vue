<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* primary / tonal / outline / text / danger / icon
     + 三个动作型变体：fuse 熔断撤销 / hold 长按确认 / slide 滑动确认 */
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /* ---- fuse：完成后可撤销的窗口时长（ms） ---- */
  fuseDuration: { type: Number, default: 5000 },
  undoLabel: { type: String, default: '撤销' },
  doneLabel: { type: String, default: '已完成' },
  /* ---- hold：按住多久算确认 ---- */
  holdDuration: { type: Number, default: 1200 },
  /* ---- slide：拖多少像素算确认 ---- */
  slideThreshold: { type: Number, default: 64 }
})

const emit = defineEmits(['click', 'confirm', 'commit', 'undo', 'done'])

/* ============================================================
   动作按钮的三个变体
   · fuse：点一下进入「已完成」，下面一条引线开始烧，烧完就落定；
     期间可以点撤销。引线烧到哪儿，剩余时间就还剩多少。
   · hold：按住时填充从底部涨起来，抬手过早就缩回去（弹簧），
     涨满才确认 —— 防止误触不可逆操作。
   · slide：把滑块拖过阈值才确认；确认后滑块变成转圈，
     跑完展开成一整颗「完成」药丸（unfurl）。
   ============================================================ */

const isFuse = computed(() => props.variant === 'fuse')
const isHold = computed(() => props.variant === 'hold')
const isSlide = computed(() => props.variant === 'slide')
const actionable = computed(() => isFuse.value || isHold.value || isSlide.value)

/* ---------- fuse ---------- */
const fuseArmed = ref(false)
const fuseLeft = ref(1)
let fuseRaf = 0
let fuseStart = 0

function startFuse() {
  fuseArmed.value = true
  fuseLeft.value = 1
  fuseStart = performance.now()
  const step = now => {
    const ratio = Math.min(1, (now - fuseStart) / Math.max(300, props.fuseDuration))
    fuseLeft.value = 1 - ratio
    if (ratio < 1 && fuseArmed.value) fuseRaf = requestAnimationFrame(step)
    else if (fuseArmed.value) {
      fuseArmed.value = false
      fuseLeft.value = 1
      emit('commit')
      emit('done')
    }
  }
  cancelAnimationFrame(fuseRaf)
  fuseRaf = requestAnimationFrame(step)
}

function undo() {
  cancelAnimationFrame(fuseRaf)
  fuseArmed.value = false
  fuseLeft.value = 1
  emit('undo')
}

/* ---------- hold ---------- */
const holding = ref(false)
const holdFill = ref(0)
let holdRaf = 0
let holdStart = 0

function startHold(event) {
  if (props.disabled || props.loading) return
  holding.value = true
  holdStart = performance.now()
  const step = now => {
    const ratio = Math.min(1, (now - holdStart) / Math.max(200, props.holdDuration))
    holdFill.value = ratio
    if (ratio < 1 && holding.value) holdRaf = requestAnimationFrame(step)
    else if (holding.value) {
      holding.value = false
      holdFill.value = 1
      emit('confirm')
      /* 确认后短暂保持满格再收回，给一次「完成」的视觉反馈。 */
      setTimeout(() => { holdFill.value = 0 }, 420)
    }
  }
  cancelAnimationFrame(holdRaf)
  holdRaf = requestAnimationFrame(step)
}

function endHold() {
  if (!holding.value) return
  holding.value = false
  cancelAnimationFrame(holdRaf)
  holdFill.value = 0
}

/* ---------- slide ---------- */
const slideX = ref(0)
const slidePhase = ref('idle')   /* idle | running | done */
const slideWidth = ref(0)
const trackEl = ref(null)
let slidePointer = null
let slideStartX = 0

function onSlideDown(event) {
  if (props.disabled || props.loading || slidePhase.value !== 'idle') return
  slidePointer = event.pointerId
  slideStartX = event.clientX
  slideWidth.value = trackEl.value ? trackEl.value.clientWidth : 240
  try { trackEl.value && trackEl.value.setPointerCapture && trackEl.value.setPointerCapture(event.pointerId) } catch (error) { /* 指针已失效，忽略 */ }
}

function onSlideMove(event) {
  if (slidePointer === null) return
  const max = Math.max(24, slideWidth.value - 44)
  slideX.value = Math.min(max, Math.max(0, event.clientX - slideStartX))
}

function onSlideUp() {
  if (slidePointer === null) return
  slidePointer = null
  const max = Math.max(24, slideWidth.value - 44)
  if (slideX.value >= Math.min(props.slideThreshold, max * 0.7)) {
    slideX.value = max
    slidePhase.value = 'running'
    emit('confirm')
  } else {
    slideX.value = 0
  }
}

/* 受控收尾：外部把 loading 放掉时，转圈变完成药丸。 */
watch(() => props.loading, (value, prev) => {
  if (!isSlide.value) return
  if (value) slidePhase.value = 'running'
  else if (prev && slidePhase.value === 'running') {
    slidePhase.value = 'done'
    emit('done')
    setTimeout(() => {
      slidePhase.value = 'idle'
      slideX.value = 0
    }, 1400)
  }
})

function onClick(event) {
  if (!actionable.value) { emit('click', event); return }
  if (props.disabled || props.loading) return
  if (isFuse.value) {
    if (fuseArmed.value) { undo(); return }
    emit('click', event)
    startFuse()
  }
}

onBeforeUnmount(() => {
  cancelAnimationFrame(fuseRaf)
  cancelAnimationFrame(holdRaf)
  clearTimeout(slideTimer)
})
let slideTimer = 0

defineExpose({
  reset: () => {
    fuseArmed.value = false
    fuseLeft.value = 1
    holdFill.value = 0
    slidePhase.value = 'idle'
    slideX.value = 0
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
      { 'is-armed': fuseArmed, 'is-holding': holding, 'is-running': slidePhase === 'running', 'is-done': slidePhase === 'done' }
    ]"
    :disabled="disabled || loading"
    :aria-pressed="fuseArmed || undefined"
    @click="onClick"
    @pointerdown="isHold ? startHold($event) : null"
    @pointerup="isHold ? endHold() : null"
    @pointerleave="isHold ? endHold() : null"
    @pointercancel="isHold ? endHold() : null"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true"></span>

    <!-- fuse：烧掉的引线（宽度 = 剩余时间） -->
    <span v-if="isFuse && fuseArmed" class="ui-btn__fuse" aria-hidden="true">
      <span class="ui-btn__fuse-line" :style="{ transform: 'scaleX(' + fuseLeft + ')' }"></span>
      <span class="ui-btn__fuse-spark" :style="{ left: (fuseLeft * 100) + '%' }"></span>
    </span>
    <!-- hold：从底部涨起来的填充 -->
    <span v-if="isHold" class="ui-btn__hold-fill" :style="{ transform: 'scaleY(' + holdFill + ')' }" aria-hidden="true"></span>

    <span class="ui-btn__label">
      <template v-if="isFuse && fuseArmed">{{ doneLabel }}</template>
      <slot v-else />
    </span>

    <span v-if="isFuse && fuseArmed" class="ui-btn__undo" role="button" tabindex="0" @click.stop="undo" @keydown.enter.stop.prevent="undo">{{ undoLabel }}</span>

    <!-- slide：轨道 + 滑块 -->
    <template v-if="isSlide">
      <span
        ref="trackEl"
        class="ui-btn__slide-track"
        aria-hidden="true"
        @pointerdown="onSlideDown"
        @pointermove="onSlideMove"
        @pointerup="onSlideUp"
        @pointercancel="onSlideUp"
      >
        <span class="ui-btn__slide-hint"><slot name="slide-hint">滑动确认</slot></span>
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
  </button>
</template>

<style scoped>
/* 三个动作变体共用的定位上下文；基础外观仍由 .ui-btn 提供。 */
.ui-btn--action { position: relative; overflow: hidden; }

/* ---------- fuse ---------- */
.ui-btn--fuse.is-armed { background: color-mix(in oklab, var(--ui-success, #1f9d63) 18%, var(--surface-container-low)); color: var(--on-surface); }
.ui-btn__fuse { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; overflow: hidden; pointer-events: none; }
.ui-btn__fuse-line {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--ui-warning, #c8862a), var(--error));
  transform-origin: left center;
  transition: transform 80ms linear;
}
.ui-btn__fuse-spark {
  position: absolute;
  top: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd27a;
  box-shadow: 0 0 8px 2px rgba(255, 180, 60, .7);
  transform: translateX(-50%);
  transition: left 80ms linear;
}
.ui-btn__undo {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--on-surface) 10%, transparent);
  color: var(--on-surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
}
.ui-btn__undo:active { transform: scale(var(--press-scale)); }

/* ---------- hold ---------- */
.ui-btn__hold-fill {
  position: absolute;
  inset: 0;
  transform-origin: bottom center;
  background: color-mix(in oklab, var(--on-primary) 22%, transparent);
  pointer-events: none;
  transition: transform var(--t-feedback);
}
.ui-btn--hold.is-holding .ui-btn__hold-fill { transition: none; }
.ui-btn--hold:not(.is-holding) .ui-btn__hold-fill { transition: transform var(--t-panel) var(--spring-feedback); }
.ui-btn--hold .ui-btn__label { position: relative; }

/* ---------- slide ---------- */
.ui-btn--slide { padding: 0; background: var(--surface-container-high); color: var(--on-surface); border-color: var(--outline-variant); }
.ui-btn--slide .ui-btn__label { display: none; }
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
  opacity: 1;
  transition: opacity var(--t-fade);
}
.ui-btn.is-running .ui-btn__slide-hint,
.ui-btn.is-done .ui-btn__slide-hint { opacity: 0; }
.ui-btn__slide-handle {
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  display: grid;
  place-items: center;
  width: 36px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  transition: transform var(--t-panel) var(--spring-view), width var(--t-panel), background var(--t-fade);
}
.ui-btn__slide-handle svg { width: 16px; height: 16px; }
.ui-btn__slide-spin { animation: uiBtnSlideSpin 900ms linear infinite; }
/* 跑完展开成一颗完整药丸（unfurl）。 */
.ui-btn.is-done .ui-btn__slide-handle { width: calc(100% - 8px); background: var(--ui-success, #1f9d63); }
@keyframes uiBtnSlideSpin { to { transform: rotate(360deg); } }
.ui-btn--slide:disabled { opacity: .42; }

@media (prefers-reduced-motion: reduce) {
  .ui-btn__slide-handle, .ui-btn__fuse-line, .ui-btn__fuse-spark { transition-duration: .01ms; }
  .ui-btn__slide-spin { animation: none; }
}
</style>
