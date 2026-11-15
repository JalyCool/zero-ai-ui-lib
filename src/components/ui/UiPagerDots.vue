<script setup>
import { computed } from 'vue'
const props = defineProps({
  /* 总页数 */
  total: { type: Number, default: 0 },
  modelValue: { type: Number, default: 0 },
  /* 是否允许点选跳页 */
  clickable: { type: Boolean, default: true },
  /* sm | md */
  size: { type: String, default: 'md' },
  label: { type: String, default: '翻页' }
})
const emit = defineEmits(['update:modelValue', 'change'])
const count = computed(() => Math.max(0, Math.round(props.total)))
const current = computed(() => Math.min(count.value - 1, Math.max(0, props.modelValue)))
function pick(index) {
  if (!props.clickable || index === current.value) return
  emit('update:modelValue', index)
  emit('change', index)
}
</script>
<template>
  <span class="ui-pager-dots" :class="['ui-pager-dots--' + size]" role="tablist" :aria-label="label">
    <button
      v-for="i in count"
      :key="i - 1"
      type="button"
      class="ui-pager-dots__dot"
      :class="{ 'is-on': i - 1 === current }"
      role="tab"
      :aria-selected="i - 1 === current"
      :aria-label="'第 ' + i + ' 页'"
      :tabindex="clickable ? 0 : -1"
      @click="pick(i - 1)"
    ></button>
  </span>
</template>
<style scoped>
/* 翻页指示器：独立组件，轮播 / 卡片组 / 任何分页视图都能引用。
   当前页是一枚拉长的胶囊，其余是圆点；切换时宽度与底色一起过渡。 */
.ui-pager-dots { display: inline-flex; align-items: center; gap: 5px; }
.ui-pager-dots--sm .ui-pager-dots__dot { width: 5px; height: 5px; }
.ui-pager-dots--md .ui-pager-dots__dot { width: 6px; height: 6px; }
.ui-pager-dots__dot {
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--outline-variant);
  cursor: pointer;
  transition: width var(--t-panel), background var(--t-fade), transform var(--t-feedback);
}
.ui-pager-dots__dot.is-on { background: var(--primary); }
.ui-pager-dots--sm .ui-pager-dots__dot.is-on { width: 14px; }
.ui-pager-dots--md .ui-pager-dots__dot.is-on { width: 18px; }
.ui-pager-dots__dot:active { transform: scale(var(--press-scale)); }
.ui-pager-dots__dot:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 2px; }
</style>
