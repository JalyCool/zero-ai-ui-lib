<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

const props = defineProps({
  /* 展示值：数字或已格式化的字符串（如 "1h03m03s"） */
  value: { type: [Number, String], default: 0 },
  /* 用于比较大小、决定滚动方向的数值键；缺省时用 value 本身 */
  directionKey: { type: Number, default: null },
  /* standard：新值更大 -> 旧值向上；reverse 反向 */
  reverse: { type: Boolean, default: false },
  /* 滚动距离，CSS 长度；缺省时按变化量自动缩放（与步进器同款公式） */
  distance: { type: String, default: '' },
  /* 自动距离公式用：把变化量换算成步数 */
  step: { type: Number, default: 0 },
  /* true 时直接换值、不做滚动动画（拖拽等连续变化场景用） */
  instant: { type: Boolean, default: false }
})

/* ============================================================
   数字滚动（全库统一数字变化动效）
   从步进器里抽出来的「数字上下渐变/滚动」：
   旧值与新值共用同一个数字盒，只是上下错开进出；
   方向随新旧值大小关系走，位移量随变化量缩放，
   变化结束后盒子不残留旧值宽度。
   所有涉及数字大小变化的场景（步进器 / 仪表盘 / 滑块读数 /
   时长读数……）都用它，保证动效统一。
   ============================================================ */

const display = computed(() => {
  const value = props.value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return value
})

const current = ref(display.value)
const prevKey = ref(Number(props.directionKey ?? props.value) || 0)
const rolling = ref(false)
const rollKey = ref(0)
const leaving = shallowRef(display.value)
let rollTimer = null
let frameA = 0

const distance = computed(() => {
  if (props.distance) return props.distance
  const nextKey = Number(props.directionKey ?? props.value)
  const delta = Math.abs(nextKey - prevKey.value)
  if (!Number.isFinite(delta) || delta === 0) return '0.9em'
  const steps = props.step > 0 ? delta / props.step : delta
  return Math.max(0.3, Math.min(2.2, 0.35 + steps * 0.2)) + 'em'
})

const directionClass = computed(() => {
  const nextKey = Number(props.directionKey ?? props.value)
  let grew = nextKey >= prevKey.value
  if (props.reverse) grew = !grew
  return grew ? 'ui-roll--up' : 'ui-roll--down'
})

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateChange() {
  rolling.value = false
  cancelAnimationFrame(frameA)
  clearTimeout(rollTimer)

  nextTick(() => {
    frameA = requestAnimationFrame(() => {
      frameA = 0
      rolling.value = true
      rollKey.value += 1
      rollTimer = setTimeout(() => {
        rollTimer = null
        rolling.value = false
        leaving.value = display.value
      }, reduceMotion() ? 0 : 430)
    })
  })
}

watch(() => [props.value, props.directionKey, props.instant], ([value, key, instant], [oldValue, oldKey]) => {
  if (value === oldValue) return
  /* 方向与位移都以上一次的值为基准：这次变化结束后 prevKey 留在旧值上，
     下一次变化用它参与比较 —— 与步进器原实现一致。 */
  current.value = String(value)
  if (instant) {
    /* 连续变化（拖拽）：直接替换，不滚动；旧值基准同步为新值。 */
    rolling.value = false
    cancelAnimationFrame(frameA)
    clearTimeout(rollTimer)
    leaving.value = String(value)
    prevKey.value = Number(key ?? value)
    return
  }
  leaving.value = String(oldValue)
  prevKey.value = Number(oldKey ?? oldValue)
  animateChange()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameA)
  clearTimeout(rollTimer)
})
</script>

<template>
  <span class="ui-roll" :class="[directionClass, { 'is-rolling': rolling }]">
    <span class="ui-roll__stage" :style="{ '--roll-distance': distance }">
      <!-- 两个值共用这个盒子，滚动时数字不会横向跳动。 -->
      <span class="ui-roll__box">
        <span class="ui-roll__value ui-roll__value--leave" :class="{ 'is-rolling': rolling }" aria-hidden="true">{{ leaving }}</span>
        <span :key="rollKey" class="ui-roll__value ui-roll__value--enter" :class="{ 'is-rolling': rolling }" aria-live="polite">{{ current }}</span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.ui-roll {
  display: inline-flex;
  align-items: flex-end;
  max-width: 100%;
}
.ui-roll__stage {
  position: relative;
  display: inline-block;
  height: 1.15em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12%, #000 88%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 12%, #000 88%, transparent 100%);
}
.ui-roll__box {
  position: relative;
  display: inline-block;
  min-width: 0;
  text-align: center;
}
.ui-roll__value {
  display: block;
  font: inherit;
  color: inherit;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  will-change: transform, opacity, filter;
}
.ui-roll__value--leave {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

/* 方向：新值更大 -> 旧值向上、新值从下；变小则相反。 */
.ui-roll--up .ui-roll__value--leave { --leave-sign: -1; }
.ui-roll--up .ui-roll__value--enter { --enter-sign: 1; }
.ui-roll--down .ui-roll__value--leave { --leave-sign: 1; }
.ui-roll--down .ui-roll__value--enter { --enter-sign: -1; }

.ui-roll__value--leave.is-rolling {
  animation: uiRollOut var(--spring-fade-dur) var(--spring-fade) forwards;
}
.ui-roll__value--enter.is-rolling {
  animation: uiRollIn var(--spring-view-dur) var(--spring-view) forwards;
}

@keyframes uiRollOut {
  from { transform: translate3d(0, 0, 0); opacity: 1; filter: blur(0); }
  to { transform: translate3d(0, calc(var(--leave-sign, -1) * var(--roll-distance, 1em)), 0); opacity: 0; filter: blur(6px); }
}
@keyframes uiRollIn {
  from { transform: translate3d(0, calc(var(--enter-sign, 1) * var(--roll-distance, 1em)), 0); opacity: 0; filter: blur(6px); }
  to { transform: translate3d(0, 0, 0); opacity: 1; filter: blur(0); }
}

@media (prefers-reduced-motion: reduce) {
  .ui-roll__value--leave.is-rolling,
  .ui-roll__value--enter.is-rolling { animation-duration: .01ms; }
}
</style>
