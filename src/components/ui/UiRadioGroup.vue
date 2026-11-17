<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  name: { type: String, default: 'ui-radio' },
  /* 整体禁用 */
  disabled: { type: Boolean, default: false },
  /* 布局：row（默认）/ column */
  direction: { type: String, default: 'column' }
})

const emit = defineEmits(['update:modelValue'])

/* 每项禁用两种写法：option.disabled，或 options.disabled 数组里列出禁用的值 */
const disabledSet = computed(() => {
  const list = props.options
    .filter(o => o && o.disabled)
    .map(o => String(o.value))
  return new Set(list)
})

function isDisabled(option) {
  if (props.disabled) return true
  return disabledSet.value.has(String(option.value))
}

function choose(option) {
  if (isDisabled(option)) return
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="ui-radio-group" :class="'is-' + direction" role="radiogroup" :aria-disabled="disabled || undefined">
    <label
      v-for="option in options"
      :key="option.value"
      class="ui-radio"
      :class="{ 'is-disabled': isDisabled(option), 'is-checked': modelValue === option.value }"
    >
      <input
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="isDisabled(option)"
        @change="choose(option)"
      >
      <span class="ui-radio__dot" aria-hidden="true"></span>
      <span class="ui-radio__label">{{ option.label }}</span>
      <span v-if="option.hint" class="ui-radio__hint">{{ option.hint }}</span>
    </label>
  </div>
</template>

<style scoped>
.ui-radio-group { display: flex; gap: 10px; min-width: 0; }
.ui-radio-group.is-column { flex-direction: column; }
.ui-radio-group.is-row { flex-direction: row; flex-wrap: wrap; }
.ui-radio { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.ui-radio.is-disabled { opacity: .45; cursor: not-allowed; }
.ui-radio__label { font-size: var(--fs-small); color: var(--on-surface); }
.ui-radio__hint { font-size: var(--fs-micro); color: var(--on-surface-variant); }
</style>
