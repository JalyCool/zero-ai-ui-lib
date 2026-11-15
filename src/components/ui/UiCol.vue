<script setup>
import { computed } from 'vue'
const props = defineProps({
  span: { type: Number, default: 12 },
  sm: { type: Number, default: 0 },
  md: { type: Number, default: 0 },
  lg: { type: Number, default: 0 },
  offset: { type: Number, default: 0 }
})
/* 12 栅格：基础 span + sm/md/lg 断点覆盖（0 = 不覆盖）。
   offset 只在基础档生效：显式指定起始轨道，后续列自动排到它之后。 */
const style = computed(() => {
  const next = {
    '--span': String(props.span),
    '--span-sm': String(props.sm || props.span),
    '--span-md': String(props.md || props.sm || props.span),
    '--span-lg': String(props.lg || props.md || props.sm || props.span)
  }
  if (props.offset > 0) next.gridColumn = String(props.offset + 1) + ' / span ' + props.span
  return next
})
</script>
<template>
  <div class="ui-col" :style="style"><slot /></div>
</template>
<style scoped>
.ui-col { grid-column: span var(--span); min-width: 0; }
@media (min-width: 600px) { .ui-col { grid-column: span var(--span-sm); } }
@media (min-width: 900px) { .ui-col { grid-column: span var(--span-md); } }
@media (min-width: 1200px) { .ui-col { grid-column: span var(--span-lg); } }
</style>
