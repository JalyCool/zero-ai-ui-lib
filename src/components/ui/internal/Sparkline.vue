<script setup>
import { computed } from 'vue'

let instance = 0

const props = defineProps({
  values: {
    type: Array,
    default: () => [12, 17, 15, 23, 20, 28, 25, 33]
  },
  label: { type: String, default: '趋势迷你图' }
})

const fillId = `ui-spark-fill-${instance++}`

const series = computed(() => {
  const values = props.values.map(Number).filter(Number.isFinite)
  return values.length ? values : [0]
})

const coordinates = computed(() => {
  const values = series.value
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const step = values.length > 1 ? 300 / (values.length - 1) : 300
  return values.map((value, index) => ({
    x: index * step,
    y: 78 - ((value - min) / span) * 62
  }))
})

const linePath = computed(() => coordinates.value
  .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
  .join(' '))

const areaPath = computed(() => `${linePath.value} L300,84 L0,84 Z`)
</script>

<template>
  <div class="ui-sparkline" role="img" :aria-label="label">
    <svg viewBox="0 0 300 84" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="fillId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" class="ui-sparkline__stop-start" />
          <stop offset="100%" class="ui-sparkline__stop-end" />
        </linearGradient>
      </defs>
      <path class="ui-sparkline__area" :d="areaPath" :fill="`url(#${fillId})`" />
      <path class="ui-sparkline__line" :d="linePath" fill="none" vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>

<style scoped>
.ui-sparkline {
  width: 100%;
  min-width: 0;
}
.ui-sparkline svg {
  display: block;
  width: 100%;
  height: 60px;
  overflow: visible;
}
.ui-sparkline__line {
  stroke: var(--primary);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ui-sparkline__stop-start {
  stop-color: var(--primary);
  stop-opacity: .24;
}
.ui-sparkline__stop-end {
  stop-color: var(--primary);
  stop-opacity: 0;
}
</style>
