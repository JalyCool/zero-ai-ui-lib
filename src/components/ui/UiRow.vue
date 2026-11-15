<script setup>
defineProps({
  gap: { type: Number, default: 12 },
  align: { type: String, default: 'stretch' },
  justify: { type: String, default: 'flex-start' }
})
</script>
<template>
  <div class="ui-row" :style="{ gap: gap + 'px', alignItems: align, justifyContent: justify }"><slot /></div>
</template>
<style scoped>
.ui-row { display: flex; flex-wrap: wrap; width: 100%; min-width: 0; }
</style>
