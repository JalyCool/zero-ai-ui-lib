<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, default: '' },
  data: { type: Array, default: () => [42, 68, 55, 80, 63, 92, 74] },
  labels: { type: Array, default: () => ['一', '二', '三', '四', '五', '六', '日'] },
  height: { type: [String, Number], default: null },
  unit: { type: String, default: '' },
  decimals: { type: Number, default: 1 },
  highlight: { type: Number, default: null },
  ariaLabel: { type: String, default: '柱状图' }
})

const series = computed(() => props.data.length ? props.data : [0])
const max = computed(() => Math.max.apply(null, series.value) || 1)
const styleVars = computed(() => props.height
  ? { height: typeof props.height === 'number' ? `${props.height}px` : props.height }
  : {})

function heightOf(value) {
  return `${((value / max.value) * 100).toFixed(1)}%`
}

function isHighlighted(value) {
  return props.highlight !== null && value >= props.highlight
}

function tipOf(value, index) {
  const label = props.labels[index] || ''
  const suffix = props.unit ? ` ${props.unit}` : ''
  return `${label} · ${Number(value).toFixed(props.decimals)}${suffix}`.trim()
}
</script>

<template>
  <div class="bars" :id="id" :style="styleVars" role="img" :aria-label="ariaLabel">
    <div
      v-for="(value, index) in series"
      :key="index"
      class="bar-col"
    >
      <div
        class="bar"
        :class="{ hi: isHighlighted(value) }"
        :style="{ height: heightOf(value), animationDelay: `${index * 55}ms` }"
        :data-tip="tipOf(value, index)"
      ></div>
      <span>{{ labels[index] || '' }}</span>
    </div>
  </div>
</template>

<style scoped>
.bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 96px;
  padding-top: 6px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  height: 100%;
  justify-content: flex-end;
}
.bar {
  width: 100%;
  max-width: 26px;
  border-radius: calc(8px * var(--radius-scale));
  background: var(--primary-container);
  position: relative;
  transition: background var(--t-fade), border-radius var(--t-panel);
  transform-origin: bottom;
  animation: growBar var(--t-panel) backwards;
}
.bar.hi { background: var(--primary); }
@keyframes growBar {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
.bar::after {
  content: attr(data-tip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, -4px) scale(.9);
  background: var(--on-surface);
  color: var(--surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  padding: 3px 7px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--t-fade), transform var(--t-feedback);
}
.bar:hover::after {
  opacity: 1;
  transform: translate(-50%, -4px) scale(1);
}
.bar-col span {
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
}
</style>
