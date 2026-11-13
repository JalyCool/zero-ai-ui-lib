<script setup>
defineProps({
  text: { type: String, default: '提示' },
  placement: { type: String, default: 'top' }
})
</script>

<template>
  <span class="ui-tooltip" :class="`ui-tooltip--${placement}`" tabindex="0">
    <slot />
    <span class="ui-tooltip__bubble" role="tooltip">{{ text }}</span>
  </span>
</template>
