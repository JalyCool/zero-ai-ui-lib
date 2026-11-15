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
/* 侧边栏：宽度在展开 / 收起之间过渡，内容用 slot 的 collapsed 自己决定精简形态。 */
.ui-sidebar { display: flex; flex-direction: column; width: var(--w); flex-shrink: 0; height: 100%; border-right: var(--border-w) solid var(--outline-variant); background: var(--surface-container-low); overflow: hidden; transition: width var(--t-panel) var(--spring-view); }
.ui-sidebar__head { padding: 12px 10px; }
.ui-sidebar__body { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 3px; }
.ui-sidebar__foot { padding: 8px; border-top: var(--border-w) solid var(--outline-variant); }
.ui-sidebar__toggle { display: grid; place-items: center; width: 100%; height: 32px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-sidebar__toggle:hover { background: var(--surface-container); }
.ui-sidebar__toggle svg { width: 16px; height: 16px; }
</style>
