<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  /* 左上角标签 */
  label: { type: String, default: '' },
  /* one-line：标签与分段控件同一行；默认上下堆叠 */
  layout: { type: String, default: 'stack' }
})

const emit = defineEmits(['update:modelValue'])

const activeIndex = computed(() => props.options.findIndex(option => option.value === props.modelValue))
const indicatorStyle = computed(() => {
  const count = props.options.length
  if (!count || activeIndex.value < 0) return null
  const width = `calc((100% - 6px - ${(count - 1) * 3}px) / ${count})`
  return {
    width,
    transform: `translateX(calc(${activeIndex.value * 100}% + ${activeIndex.value * 3}px))`
  }
})
</script>

<template>
  <div class="ui-segmented-field" :class="`ui-segmented-field--${layout}`">
    <span v-if="label" class="ui-segmented-field__label">{{ label }}</span>

    <div class="ui-segmented" role="group">
      <span
        v-if="indicatorStyle"
        class="ui-segmented__indicator"
        :style="indicatorStyle"
        aria-hidden="true"
      ></span>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="{ 'is-active': modelValue === option.value, 'is-disabled': !!option.disabled }"
        :aria-pressed="modelValue === option.value"
        :aria-disabled="option.disabled ? 'true' : undefined"
        :disabled="!!option.disabled"
        @click="option.disabled || emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
