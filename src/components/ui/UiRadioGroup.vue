<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  name: { type: String, default: 'ui-radio' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="ui-radio-group" role="radiogroup">
    <label v-for="option in options" :key="option.value" class="ui-radio">
      <input
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        @change="emit('update:modelValue', option.value)"
      >
      <span class="ui-radio__dot" aria-hidden="true"></span>
      <span>{{ option.label }}</span>
    </label>
  </div>
</template>
