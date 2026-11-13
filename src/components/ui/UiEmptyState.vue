<script setup>
defineProps({
  title: { type: String, default: '暂无内容' },
  description: { type: String, default: '' }
})
</script>

<template>
  <div class="ui-empty">
    <div class="ui-empty__icon">
      <slot name="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 7.5h16v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5v-11z" />
          <path d="M4 9l8 5 8-5" />
          <path d="M9 4h6" />
        </svg>
      </slot>
    </div>
    <div class="ui-empty__title">{{ title }}</div>
    <div v-if="description" class="ui-empty__desc">{{ description }}</div>
    <div v-if="$slots.action" class="ui-empty__action"><slot name="action" /></div>
  </div>
</template>
