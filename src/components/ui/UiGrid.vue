<script setup>
import { computed } from 'vue'
const props = defineProps({
  /* 最小列宽（px）：按容器宽度自动决定列数 */
  min: { type: Number, default: 200 },
  gap: { type: Number, default: 12 }
})
const style = computed(() => ({ '--min': props.min + 'px', gap: props.gap + 'px' }))
</script>
<template>
  <div class="ui-grid" :style="style"><slot /></div>
</template>
<style scoped>
/* 自动栅格：容器多宽就排几列，不需要断点表。 */
.ui-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--min, 200px)), 1fr)); width: 100%; min-width: 0; }
</style>
