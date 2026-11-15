<script setup>
import { computed } from 'vue'
const props = defineProps({
  span: { type: Number, default: 12 },
  sm: { type: Number, default: 0 },
  md: { type: Number, default: 0 },
  lg: { type: Number, default: 0 },
  offset: { type: Number, default: 0 }
})
/* 12 栅格：基础 span + sm/md/lg 断点覆盖（0 = 不覆盖）。 */
const style = computed(() => ({
  '--span': String(props.span),
  '--span-sm': String(props.sm || props.span),
  '--span-md': String(props.md || props.sm || props.span),
  '--span-lg': String(props.lg || props.md || props.sm || props.span),
  '--offset': String(props.offset)
}))
</script>
<template>
  <div class="ui-col" :style="style"><slot /></div>
</template>
<style scoped>
.ui-col { flex: 0 0 calc(var(--span) / 12 * 100%); max-width: calc(var(--span) / 12 * 100%); margin-left: calc(var(--offset) / 12 * 100%); min-width: 0; }
@media (min-width: 600px) { .ui-col { flex-basis: calc(var(--span-sm) / 12 * 100%); max-width: calc(var(--span-sm) / 12 * 100%); margin-left: 0; } }
@media (min-width: 900px) { .ui-col { flex-basis: calc(var(--span-md) / 12 * 100%); max-width: calc(var(--span-md) / 12 * 100%); } }
@media (min-width: 1200px) { .ui-col { flex-basis: calc(var(--span-lg) / 12 * 100%); max-width: calc(var(--span-lg) / 12 * 100%); } }
</style>
