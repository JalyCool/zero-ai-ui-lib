<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="ui-accordion" :class="{ 'is-open': modelValue }">
    <button
      type="button"
      class="ui-accordion__head"
      :aria-expanded="modelValue"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span>{{ title }}</span>
      <svg class="ui-accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div v-show="modelValue" class="ui-accordion__body"><slot /></div>
  </div>
</template>
