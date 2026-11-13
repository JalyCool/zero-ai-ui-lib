<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '14px' },
  radius: { type: String, default: '10px' }
})
</script>

<template>
  <span class="ui-skeleton" :style="{ width, height, borderRadius: radius }" aria-hidden="true"></span>
</template>
