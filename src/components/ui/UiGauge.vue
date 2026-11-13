<script setup>
import { computed } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  value: { type: Number, default: 72 },
  label: { type: String, default: '今日达成' }
})

const safeValue = computed(() => {
  const value = Number(props.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
})

const offset = computed(() => 100 - safeValue.value)

/* ============================================================
   仪表盘
   圆弧比半圆略微多一点（220°，底部留 140° 开口），
   圆心 (100,100) 就是数值所在的位置：数字放大后居中放，
   说明文字挂在数字下方，0 / 100 刻度留在圆弧下方。
   ============================================================ */

/* 220° 圆弧：起点 160°，顺时针扫到 380°，半径 78，圆心 (100,100)。 */
const ARC_PATH = 'M 26.7 126.68 A 78 78 0 1 1 173.3 126.68'
</script>

<template>
  <div class="ui-gauge" role="img" :aria-label="`${label} ${safeValue}%`">
    <div class="ui-gauge__dial">
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <path class="ui-gauge__track" :d="ARC_PATH" pathLength="100" fill="none" />
        <path
          class="ui-gauge__progress"
          :d="ARC_PATH"
          pathLength="100"
          fill="none"
          :style="{ strokeDashoffset: offset }"
        />
      </svg>

      <div class="ui-gauge__center">
        <strong><UiRollNumber class="ui-gauge__roll" :value="safeValue" /><small>%</small></strong>
        <span class="ui-gauge__caption">{{ label }}</span>
      </div>
    </div>

    <div class="ui-gauge__scale" aria-hidden="true">
      <span>0</span>
      <span>100</span>
    </div>
  </div>
</template>

<style scoped>
.ui-gauge {
  width: 100%;
  max-width: 258px;
  margin-inline: auto;
}
.ui-gauge__dial {
  position: relative;
}
.ui-gauge svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.ui-gauge__track {
  stroke: var(--surface-container-high);
  stroke-width: 12;
  stroke-linecap: round;
}
.ui-gauge__progress {
  stroke: var(--primary);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 100;
  transition: stroke-dashoffset var(--t-view);
}

/* 数值放在圆心稍偏上的位置（viewBox 高 140、圆心 y=100 → 71.43%），
   视觉上更靠近圆弧围出的那块空间中心。 */
.ui-gauge__center {
  position: absolute;
  left: 50%;
  top: 65.5%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.ui-gauge__center strong {
  display: block;
  color: var(--on-surface);
  font-size: 2.2rem;
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  letter-spacing: -.012em;
  line-height: 1;
  white-space: nowrap;
}
/* 数字滚动走统一动效；单位 small 紧跟其后，底对齐。 */
.ui-gauge__roll {
  line-height: 1;
}
.ui-gauge__center small {
  margin-left: 2px;
  color: var(--on-surface-variant);
  font-size: 1.02rem;
  font-weight: var(--w-strong);
  letter-spacing: 0;
}
/* 说明文字挂在数字正下方，不参与居中计算，数字本身始终对齐圆心。 */
.ui-gauge__caption {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  letter-spacing: .02em;
}
.ui-gauge__scale {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding: 0 2px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
}
</style>
