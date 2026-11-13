<script setup>
defineProps({
  size: { type: String, default: 'md' },
  label: { type: String, default: '加载中' }
})
</script>

<template>
  <span class="ui-spinner" :class="size !== 'md' ? `ui-spinner--${size}` : ''" role="status" :aria-label="label"></span>
</template>
