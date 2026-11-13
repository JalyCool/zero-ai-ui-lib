<script setup>
defineProps({
  tone: { type: String, default: 'info' },
  title: { type: String, default: '' },
  closable: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="ui-alert" :class="`ui-alert--${tone}`" role="alert">
    <svg class="ui-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="tone === 'success'">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </template>
      <template v-else-if="tone === 'warning' || tone === 'danger'">
        <path d="M12 3.5L21 20H3L12 3.5z" />
        <path d="M12 9.5v4.5" />
        <path d="M12 17.2v.1" />
      </template>
      <template v-else>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 7.7v.1" />
      </template>
    </svg>
    <div class="ui-alert__body">
      <div v-if="title" class="ui-alert__title">{{ title }}</div>
      <div class="ui-alert__desc"><slot /></div>
    </div>
    <button
      v-if="closable"
      type="button"
      class="ui-alert__close"
      aria-label="关闭提示"
      @click="emit('close')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
</template>
