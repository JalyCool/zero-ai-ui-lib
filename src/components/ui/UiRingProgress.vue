<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  value: { type: Number, default: 78 },
  size: { type: Number, default: 116 },
  stroke: { type: Number, default: 10 },
  label: { type: String, default: '今日目标' }
})

const safeValue = computed(() => {
  const value = Number(props.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
})

const radius = computed(() => props.size / 2 - props.stroke / 2 - 1)
const center = computed(() => props.size / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const animatedValue = ref(0)
const offset = computed(() => circumference.value * (1 - animatedValue.value / 100))

watch(safeValue, value => {
  animatedValue.value = value
})

onMounted(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    animatedValue.value = safeValue.value
    return
  }
  requestAnimationFrame(() => {
    animatedValue.value = safeValue.value
  })
})
</script>

<template>
  <div
    class="ui-ring"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`${label} ${safeValue}%`"
  >
    <svg :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle
        class="ui-ring__track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
      />
      <circle
        class="ui-ring__progress"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${center} ${center})`"
      />
    </svg>
    <div class="ui-ring__center">
      <strong><UiRollNumber class="ui-ring__num" :value="animatedValue" /><span class="ui-ring__pct">%</span></strong>
      <span>{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ui-ring {
  position: relative;
  flex-shrink: 0;
}
.ui-ring svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}
.ui-ring__track {
  stroke: var(--outline-variant);
}
.ui-ring__progress {
  stroke: var(--primary);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--t-panel), stroke var(--t-fade);
}
.ui-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}
.ui-ring__num { line-height: 1; }
.ui-ring__pct { margin-left: 1px; }
.ui-ring__center strong {
  font-size: 1.62rem;
  font-weight: var(--w-heading);
  line-height: 1;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
.ui-ring__center span {
  margin-top: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
</style>
