<script setup>
defineProps({
  variant: { type: String, default: 'filled' },
  selected: { type: Boolean, default: false },
  removable: { type: Boolean, default: false },
  dot: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'remove'])
</script>

<template>
  <button
    type="button"
    class="ui-chip"
    :class="[`ui-chip--${variant}`, { 'is-selected': selected }]"
    @click="emit('select')"
  >
    <span v-if="dot" class="ui-chip__dot" aria-hidden="true"></span>
    <slot />
    <span
      v-if="removable"
      class="ui-chip__close"
      role="button"
      aria-label="移除"
      @click.stop="emit('remove')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </span>
  </button>
</template>
