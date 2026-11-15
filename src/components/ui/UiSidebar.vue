<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: true },
  collapsedWidth: { type: Number, default: 64 },
  width: { type: Number, default: 232 },
  label: { type: String, default: '侧边栏' }
})
const emit = defineEmits(['update:modelValue'])
const style = computed(() => ({ '--w': (props.modelValue ? props.width : props.collapsedWidth) + 'px' }))
</script>
<template>
  <aside class="ui-sidebar" :class="{ 'is-collapsed': !modelValue }" :style="style" :aria-label="label">
    <div class="ui-sidebar__head"><slot name="head" /></div>
    <nav class="ui-sidebar__body"><slot :collapsed="!modelValue" /></nav>
    <div class="ui-sidebar__foot">
      <button type="button" class="ui-sidebar__toggle" :aria-label="modelValue ? '收起侧边栏' : '展开侧边栏'"
        :aria-expanded="modelValue" @click="emit('update:modelValue', !modelValue)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 5h16M4 12h16M4 19h16" />
        </svg>
      </button>
    </div>
  </aside>
</template>
<style scoped>
/* 侧边栏：宽度走 view 弹簧；内容在宽度收拢的同时淡出 / 轻移，
   收起不会像被裁掉一半的文字，展开时再一起回来。 */
.ui-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--w);
  flex-shrink: 0;
  height: 100%;
  border-right: var(--border-w) solid var(--outline-variant);
  background: var(--surface-container-low);
  overflow: hidden;
  transition: width var(--t-panel), background var(--t-fade);
  will-change: width;
}
.ui-sidebar__head {
  padding: 12px 10px;
  min-width: 0;
  transition: opacity var(--t-fade), padding var(--t-panel);
  transition-delay: 40ms;
}
.ui-sidebar__body {
  flex: 1;
  min-height: 0;
  overflow: hidden auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  transition: opacity var(--t-fade), padding var(--t-panel);
}
.ui-sidebar.is-collapsed .ui-sidebar__head,
.ui-sidebar.is-collapsed .ui-sidebar__body { opacity: .58; }
.ui-sidebar.is-collapsed .ui-sidebar__head { padding-inline: 6px; }
.ui-sidebar.is-collapsed .ui-sidebar__body { padding-inline: 4px; }
.ui-sidebar__foot { padding: 8px; border-top: var(--border-w) solid var(--outline-variant); transition: padding var(--t-panel); }
.ui-sidebar.is-collapsed .ui-sidebar__foot { padding-inline: 6px; }
.ui-sidebar__toggle {
  display: grid;
  place-items: center;
  width: 100%;
  height: 32px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-sidebar__toggle:hover { background: var(--surface-container); }
.ui-sidebar__toggle svg { width: 16px; height: 16px; transition: transform var(--t-panel); }
.ui-sidebar.is-collapsed .ui-sidebar__toggle svg { transform: rotate(180deg); }
.ui-sidebar__toggle:active { transform: scale(var(--press-scale)); }
/* 演示里常把侧栏塞进固定高度的盒子：内容按盒子宽度铺开，不撑出横向滚动。 */
.ui-sidebar :deep(*) { min-width: 0; }

@media (prefers-reduced-motion: reduce) {
  .ui-sidebar, .ui-sidebar__head, .ui-sidebar__body, .ui-sidebar__toggle svg { transition-duration: .01ms !important; }
}
</style>
