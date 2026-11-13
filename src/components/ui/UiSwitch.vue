<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    class="ui-switch"
    :class="{ 'is-on': modelValue }"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || '开关'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="ui-switch__thumb"></span>
  </button>
</template>
