<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  id: { type: String, default: '' },
  data: {
    type: Array,
    default: () => [58, 62, 60, 66, 72, 68, 74, 70, 64, 61, 63, 59]
  },
  labels: {
    type: Array,
    default: () => ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
  },
  viewBoxHeight: { type: Number, default: 92 },
  gridY: { type: Array, default: () => [23, 46, 69] },
  ariaLabel: { type: String, default: '趋势曲线' }
})

const CHART_W = 300
const PAD = 8
const HEIGHT = 92

const svgEl = ref(null)
const showTip = ref(false)
const dotX = ref(0)
const dotY = ref(0)
const tipLeft = ref('0%')
const tipText = ref('')

const geometry = computed(() => {
  const values = props.data
  const min = Math.min.apply(null, values)
  const max = Math.max.apply(null, values)
  const range = max - min || 1
  const stepX = (CHART_W - PAD * 2) / (values.length - 1)

  const points = values.map((value, index) => {
    const x = PAD + index * stepX
    const y = HEIGHT - PAD - ((value - min) / range) * (HEIGHT - PAD * 2)
    return [x, y]
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${(CHART_W - PAD).toFixed(1)},${(HEIGHT - PAD).toFixed(1)} L${PAD},${(HEIGHT - PAD).toFixed(1)} Z`

  return { points, line, area, stepX }
})

function showAt(clientX) {
  const svg = svgEl.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const xRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const xInView = xRatio * CHART_W
  let index = Math.round((xInView - PAD) / geometry.value.stepX)
  index = Math.max(0, Math.min(props.data.length - 1, index))

  const point = geometry.value.points[index]
  dotX.value = point[0]
  dotY.value = point[1]
  showTip.value = true
  tipLeft.value = `${(point[0] / CHART_W) * 100}%`
  tipText.value = `${props.labels[index] || ''} · ${props.data[index]}`
}

function hide() {
  showTip.value = false
}
</script>

<template>
  <div class="chart-wrap">
    <svg
      ref="svgEl"
      class="chart"
      :id="id"
      :viewBox="`0 0 300 ${viewBoxHeight}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="showAt($event.clientX)"
      @pointerdown="showAt($event.clientX)"
      @pointerleave="hide"
    >
      <line
        v-for="y in gridY"
        :key="y"
        class="grid-line"
        x1="6"
        :y1="y"
        x2="294"
        :y2="y"
      />
      <path class="area" fill="url(#heartGrad)" :d="geometry.area" />
      <path class="line" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :d="geometry.line" />
      <circle class="chart-dot" :class="{ show: showTip }" :cx="dotX" :cy="dotY" r="4" />
    </svg>
    <div class="chart-tip" :class="{ show: showTip }" :style="{ left: tipLeft }">{{ tipText }}</div>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
}
.chart {
  width: 100%;
  display: block;
  overflow: visible;
  cursor: crosshair;
}
.chart .grid-line {
  stroke: var(--outline-variant);
  stroke-width: 1;
  opacity: .5;
}
.chart .line {
  transition: stroke var(--t-fade);
}
.chart-tip {
  position: absolute;
  top: -6px;
  left: 0;
  transform: translate(-50%, -100%) scale(.9);
  background: var(--on-surface);
  color: var(--surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  padding: 4px 9px;
  border-radius: 7px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  box-shadow: var(--elev-tip);
  transition: opacity var(--t-fade), transform var(--t-feedback);
}
.chart-tip.show {
  opacity: 1;
  transform: translate(-50%, -100%) scale(1);
}
.chart-dot {
  fill: var(--primary);
  stroke: var(--surface);
  stroke-width: 2;
  opacity: 0;
  transition: opacity var(--t-fade);
}
.chart-dot.show {
  opacity: 1;
}
</style>
