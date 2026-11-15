<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  separator: { type: String, default: '/' }
})
const emit = defineEmits(['select'])
</script>
<template>
  <nav class="ui-breadcrumb" aria-label="面包屑">
    <template v-for="(item, index) in items" :key="item.label + index">
      <button v-if="index < items.length - 1" type="button" class="ui-breadcrumb__item"
        @click="emit('select', { item, index })">{{ item.label }}</button>
      <span v-else class="ui-breadcrumb__current" aria-current="page">{{ item.label }}</span>
      <span v-if="index < items.length - 1" class="ui-breadcrumb__sep" aria-hidden="true">{{ separator }}</span>
    </template>
  </nav>
</template>
<style scoped>
.ui-breadcrumb { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; font-size: var(--fs-tiny); min-width: 0; }
.ui-breadcrumb__item { padding: 2px 4px; border: 0; border-radius: 6px; background: transparent; color: var(--on-surface-variant); font: inherit; cursor: pointer; transition: color var(--t-fade), background var(--t-fade); }
.ui-breadcrumb__item:hover { color: var(--primary); background: var(--surface-container); }
.ui-breadcrumb__current { padding: 2px 4px; color: var(--on-surface); font-weight: var(--w-label); }
.ui-breadcrumb__sep { color: var(--outline); opacity: .7; }
</style>
