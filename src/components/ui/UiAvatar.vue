<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  size: { type: String, default: 'md' },
  status: { type: Boolean, default: false }
})

const initials = computed(() => {
  const value = props.name.trim()
  if (!value) return '?'
  const parts = value.split(/\s+/)
  if (parts.length === 1) return value.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})
</script>

<template>
  <span class="ui-avatar" :class="size !== 'md' ? `ui-avatar--${size}` : ''">
    <img v-if="src" :src="src" :alt="name">
    <template v-else>{{ initials }}</template>
    <span v-if="status" class="ui-avatar__status" aria-label="在线"></span>
  </span>
</template>
