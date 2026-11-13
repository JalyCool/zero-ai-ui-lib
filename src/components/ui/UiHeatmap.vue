<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: {
    type: Array,
    default: () => Array.from({ length: 84 }, (_, index) => {
      const wave = Math.sin(index * 0.62) * 1.8 + Math.cos(index * 0.19) * 1.1 + 2
      return Math.max(0, Math.min(4, Math.round(wave)))
    })
  },
  weeks: { type: Number, default: 12 },
  label: { type: String, default: '活动热力图' }
})

const cells = computed(() => {
  const total = Math.max(1, props.weeks) * 7
  const values = props.values.slice(0, total).map(value => {
    const level = Number(value)
    if (!Number.isFinite(level)) return 0
    return Math.min(4, Math.max(0, Math.round(level)))
  })
  while (values.length < total) values.push(0)
  return values.map((level, index) => ({
    level,
    title: `第 ${Math.floor(index / 7) + 1} 周 · 第 ${(index % 7) + 1} 天 · 等级 ${level}`
  }))
})
</script>

<template>
  <div class="ui-heatmap">
    <div class="ui-heatmap__head">
      <span>{{ label }}</span>
      <span>近 {{ weeks }} 周</span>
    </div>
    <div class="ui-heatmap__body">
      <div class="ui-heatmap__grid" role="img" :aria-label="label">
        <span
          v-for="(cell, index) in cells"
          :key="index"
          class="ui-heatmap__cell"
          :data-level="cell.level"
          :title="cell.title"
        ></span>
      </div>
    </div>
    <div class="ui-heatmap__legend" aria-hidden="true">
      <span>少</span>
      <i v-for="level in 5" :key="level" :data-level="level - 1"></i>
      <span>多</span>
    </div>
  </div>
</template>

<style scoped>
.ui-heatmap {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
}
.ui-heatmap__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-heatmap__head span:first-child { font-weight: var(--w-label); }
.ui-heatmap__body {
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.ui-heatmap__body::-webkit-scrollbar { display: none; }
.ui-heatmap__grid {
  display: grid;
  grid-template-rows: repeat(7, 10px);
  grid-auto-flow: column;
  grid-auto-columns: 10px;
  gap: 3px;
  width: max-content;
}
.ui-heatmap__cell {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--surface-container-high);
  transition: transform var(--t-feedback), filter var(--t-fade);
}
.ui-heatmap__cell:hover { transform: scale(1.25); filter: brightness(1.08); }
.ui-heatmap__cell[data-level="1"] { background: color-mix(in oklab, var(--primary) 16%, var(--surface-container-high)); }
.ui-heatmap__cell[data-level="2"] { background: color-mix(in oklab, var(--primary) 34%, var(--surface-container-high)); }
.ui-heatmap__cell[data-level="3"] { background: color-mix(in oklab, var(--primary) 62%, var(--surface-container-high)); }
.ui-heatmap__cell[data-level="4"] { background: var(--primary); }
.ui-heatmap__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-heatmap__legend i {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: var(--surface-container-high);
}
.ui-heatmap__legend i[data-level="1"] { background: color-mix(in oklab, var(--primary) 16%, var(--surface-container-high)); }
.ui-heatmap__legend i[data-level="2"] { background: color-mix(in oklab, var(--primary) 34%, var(--surface-container-high)); }
.ui-heatmap__legend i[data-level="3"] { background: color-mix(in oklab, var(--primary) 62%, var(--surface-container-high)); }
.ui-heatmap__legend i[data-level="4"] { background: var(--primary); }
</style>
