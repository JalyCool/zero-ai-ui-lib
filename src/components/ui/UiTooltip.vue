<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  text: { type: String, default: '提示' },
  placement: { type: String, default: 'top' },
  /* 首次悬停的等待（ms），与 UiTooltipGroup 保持同一节奏 */
  wait: { type: Number, default: 420 },
  disabled: { type: Boolean, default: false }
})

/* ============================================================
   单条悬停提示（与 UiTooltipGroup 同语言，动画参照 React Bits）
   · 冷启动要等 wait，暖态（刚显示过）立刻出；
   · 进场：透明度 + 位移 + 模糊 + 轻微缩放，弹簧曲线；
     退场反向，位移更短，不拖沓；
   · 气泡本身不做 CSS hover 命中，pointer-events: none。
   ============================================================ */

const visible = ref(false)
let showTimer = 0
let hideTimer = 0

function show() {
  if (props.disabled) return
  clearTimeout(hideTimer)
  clearTimeout(showTimer)
  showTimer = window.setTimeout(() => { visible.value = true }, props.wait)
}

function hide() {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  /* 退场稍等一下再藏，移动端触摸后手指移开也不会闪 */
  hideTimer = window.setTimeout(() => { visible.value = false }, 40)
}

function onTouchStart(event) {
  if (props.disabled) return
  event.preventDefault()
  visible.value = true
  clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { visible.value = false }, 1800)
}

onBeforeUnmount(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
})
</script>

<template>
  <span
    class="ui-tooltip"
    :class="['ui-tooltip--' + placement, { 'is-visible': visible }]"
    tabindex="0"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="visible = true"
    @blur="hide"
    @touchstart.passive="onTouchStart"
  >
    <slot />
    <span class="ui-tooltip__bubble" role="tooltip" :aria-hidden="visible ? 'false' : 'true'">{{ text }}</span>
  </span>
</template>

<style scoped>
.ui-tooltip {
  position: relative;
  display: inline-flex;
  border-radius: 8px;
  outline: none;
}
.ui-tooltip__bubble {
  position: absolute;
  z-index: 340;
  max-width: 240px;
  padding: 6px 10px;
  border-radius: calc(var(--r-9) * var(--radius-scale));
  background: var(--inverse-surface, #2f3033);
  color: var(--inverse-on-surface, #f2f1f6);
  font-size: var(--fs-micro);
  line-height: 1.45;
  white-space: pre-line;
  pointer-events: none;
  opacity: 0;
  filter: blur(6px);
  transform: translate(-50%, 4px) scale(.94);
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-pop);
}
.ui-tooltip.is-visible .ui-tooltip__bubble {
  opacity: 1;
  filter: blur(0);
  transform: translate(-50%, 0) scale(1);
}
/* 四个方向：默认在上，位移方向随位置翻转 */
.ui-tooltip--top .ui-tooltip__bubble { left: 50%; bottom: calc(100% + 7px); }
.ui-tooltip--bottom .ui-tooltip__bubble { left: 50%; top: calc(100% + 7px); transform: translate(-50%, -4px) scale(.94); }
.ui-tooltip--bottom.is-visible .ui-tooltip__bubble { transform: translate(-50%, 0) scale(1); }
.ui-tooltip--left .ui-tooltip__bubble { right: calc(100% + 7px); top: 50%; transform: translate(4px, -50%) scale(.94); }
.ui-tooltip--left.is-visible .ui-tooltip__bubble { transform: translate(0, -50%) scale(1); }
.ui-tooltip--right .ui-tooltip__bubble { left: calc(100% + 7px); top: 50%; transform: translate(-4px, -50%) scale(.94); }
.ui-tooltip--right.is-visible .ui-tooltip__bubble { transform: translate(0, -50%) scale(1); }

@media (prefers-reduced-motion: reduce) {
  .ui-tooltip__bubble { transition-duration: .01ms; filter: none; }
}
</style>
