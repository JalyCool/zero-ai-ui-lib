<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  label: { type: String, default: '' },
  tone: { type: String, default: 'primary' },
  showValue: { type: Boolean, default: true }
})

const percent = computed(() => Math.max(0, Math.min(100, (props.value / props.max) * 100)))
</script>

<template>
  <div class="ui-progress">
    <div v-if="label || showValue" class="ui-progress__head">
      <span>{{ label }}</span>
      <span v-if="showValue">{{ Math.round(percent) }}%</span>
    </div>
    <div class="ui-progress__track" role="progressbar" :aria-valuenow="value" :aria-valuemin="0" :aria-valuemax="max">
      <div class="ui-progress__bar" :class="tone !== 'primary' ? `ui-progress__bar--${tone}` : ''" :style="{ width: percent + '%' }"></div>
    </div>
  </div>
</template>
