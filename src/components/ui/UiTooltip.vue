<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
const triggerEl = ref(null)
const bubbleEl = ref(null)
const bubbleStyle = ref({})
let showTimer = 0
let hideTimer = 0

/* 气泡用 fixed 定位：既不会被 overflow 裁掉，也能随页面滚动同步。
   每次显示 / 滚动 / 缩放都按触发元素重算位置。 */
function place() {
  const trigger = triggerEl.value
  const bubble = bubbleEl.value
  if (!trigger || !bubble) return
  const rect = trigger.getBoundingClientRect()
  const bw = bubble.offsetWidth
  const bh = bubble.offsetHeight
  let left = rect.left + rect.width / 2 - bw / 2
  let top = rect.top - bh - 8
  if (props.placement === 'bottom') top = rect.bottom + 8
  else if (props.placement === 'left') { left = rect.left - bw - 8; top = rect.top + rect.height / 2 - bh / 2 }
  else if (props.placement === 'right') { left = rect.right + 8; top = rect.top + rect.height / 2 - bh / 2 }
  bubbleStyle.value = { left: Math.max(6, Math.min(left, window.innerWidth - bw - 6)) + 'px', top: Math.max(6, top) + 'px' }
}

function onViewportChange() {
  if (visible.value) place()
}

function show() {
  if (props.disabled) return
  clearTimeout(hideTimer)
  clearTimeout(showTimer)
  showTimer = window.setTimeout(() => { visible.value = true; place() }, props.wait)
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

onMounted(() => {
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})
onBeforeUnmount(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <span
    ref="triggerEl"
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
    <span ref="bubbleEl" class="ui-tooltip__bubble" role="tooltip" :style="bubbleStyle" :aria-hidden="visible ? 'false' : 'true'">{{ text }}</span>
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
  position: fixed;
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
/* 指向触发元素的小三角 */
.ui-tooltip__bubble::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
}
.ui-tooltip--top .ui-tooltip__bubble::after { left: 50%; bottom: -3px; margin-left: -4px; }
.ui-tooltip--bottom .ui-tooltip__bubble::after { left: 50%; top: -3px; margin-left: -4px; }
.ui-tooltip--left .ui-tooltip__bubble::after { right: -3px; top: 50%; margin-top: -4px; }
.ui-tooltip--right .ui-tooltip__bubble::after { left: -3px; top: 50%; margin-top: -4px; }
.ui-tooltip.is-visible .ui-tooltip__bubble {
  opacity: 1;
  filter: blur(0);
  transform: translate(-50%, 0) scale(1);
}
/* 四个方向：默认在上，位移方向随位置翻转 */








@media (prefers-reduced-motion: reduce) {
  .ui-tooltip__bubble { transition-duration: .01ms; filter: none; }
}
</style>
