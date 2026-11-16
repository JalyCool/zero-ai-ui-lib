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

/* 画布常量：宽度固定 300（viewBox 单位），高度跟随 viewBoxHeight prop，
   保证数据映射与实际 viewBox 一致；线宽靠 non-scaling-stroke 保持恒定。 */
const CHART_W = 300
const PAD = 8

const svgEl = ref(null)
const showTip = ref(false)
const dotX = ref(0)
const dotY = ref(0)
const tipLeft = ref('0%')
const tipText = ref('')

/* 圆点用百分比覆盖定位：横向按 viewBox 宽 300、纵向按 viewBoxHeight。 */
const dotLeft = computed(() => (dotX.value / CHART_W) * 100 + '%')
const dotTop = computed(() => (dotY.value / props.viewBoxHeight) * 100 + '%')

const geometry = computed(() => {
  const values = props.data
  const height = props.viewBoxHeight
  const min = Math.min.apply(null, values)
  const max = Math.max.apply(null, values)
  const range = max - min || 1
  const stepX = (CHART_W - PAD * 2) / (values.length - 1)

  const points = values.map((value, index) => {
    const x = PAD + index * stepX
    const y = height - PAD - ((value - min) / range) * (height - PAD * 2)
    return [x, y]
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${(CHART_W - PAD).toFixed(1)},${(height - PAD).toFixed(1)} L${PAD},${(height - PAD).toFixed(1)} Z`

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
        vector-effect="non-scaling-stroke"
      />
      <path class="area" fill="url(#heartGrad)" :d="geometry.area" />
      <!-- 图表按容器宽度非等比铺开，描边必须 non-scaling：
           线宽永远是 2.5 CSS 像素，不随组件宽度缩放。 -->
      <path class="line" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" :d="geometry.line" />
    </svg>
    <!-- 悬停圆点：放在 HTML 覆盖层里而不是 SVG 内 ——
         非等比缩放的 SVG 里 circle 会被拉成椭圆。 -->
    <span
      class="chart-dot"
      :class="{ show: showTip }"
      :style="{ left: dotLeft, top: dotTop }"
      aria-hidden="true"
    ></span>
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
  transition: opacity var(--t-fade), transform var(--t-feedback);
}
.chart-tip.show {
  opacity: 1;
  transform: translate(-50%, -100%) scale(1);
}
.chart-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 2px var(--surface);
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-fade);
}
.chart-dot.show {
  opacity: 1;
}
</style>
