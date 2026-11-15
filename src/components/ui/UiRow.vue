<script setup>
defineProps({
  gap: { type: Number, default: 12 },
  align: { type: String, default: 'stretch' },
  justify: { type: String, default: 'flex-start' }
})
</script>
<template>
  <div class="ui-row" :style="{ gap: gap + 'px', '--col-gap': gap + 'px', alignItems: align, justifyContent: justify }"><slot /></div>
</template>
<style scoped>
/* 12 栅格：用 grid 的 12 条等宽轨道承载 span，gap 由轨道间距直接吃掉，
   不需要再算「百分比 + gap 溢出」，怎么组合都不会把容器撑宽。 */
.ui-row { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); width: 100%; min-width: 0; }
</style>
