<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  rows: { type: Number, default: 3 }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="ui-field">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <span class="ui-field__control ui-field__control--area" :class="{ 'is-error': !!error }">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :rows="rows"
        :aria-invalid="!!error"
        @input="emit('update:modelValue', $event.target.value)"
      ></textarea>
    </span>
    <span v-if="error" class="ui-field__error">{{ error }}</span>
    <span v-else-if="hint" class="ui-field__hint">{{ hint }}</span>
  </label>
</template>
