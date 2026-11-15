<script setup>
defineProps({
  title: { type: String, default: '' },
  tone: { type: String, default: 'info' },
  /* 可关闭 */
  closable: { type: Boolean, default: true },
  icon: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])
</script>
<template>
  <div class="ui-banner" :class="`is-${tone}`" role="status">
    <span v-if="icon" class="ui-banner__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.4v.2" /></svg>
    </span>
    <div class="ui-banner__body">
      <b v-if="title">{{ title }}</b>
      <slot />
    </div>
    <button v-if="closable" type="button" class="ui-banner__close" aria-label="关闭" @click="emit('close')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
</template>
<style scoped>
.ui-banner { display: flex; align-items: flex-start; gap: 10px; padding: 11px 13px; border-radius: calc(14px * var(--radius-scale)); border: var(--border-w) solid var(--outline-variant); background: var(--surface-container-low); color: var(--on-surface); font-size: var(--fs-small); line-height: 1.5; }
.ui-banner__icon { display: grid; place-items: center; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
.ui-banner__icon svg { width: 18px; height: 18px; }
.ui-banner__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ui-banner__body b { font-weight: var(--w-strong); }
.ui-banner__close { display: grid; place-items: center; width: 24px; height: 24px; flex-shrink: 0; border: 0; border-radius: 50%; background: transparent; color: currentColor; opacity: .7; cursor: pointer; }
.ui-banner__close svg { width: 13px; height: 13px; }
.ui-banner.is-warning { background: color-mix(in oklab, var(--ui-warning, #b45309) 10%, var(--surface-container-low)); border-color: color-mix(in oklab, var(--ui-warning, #b45309) 34%, var(--outline-variant)); color: var(--ui-warning, #b45309); }
.ui-banner.is-danger { background: color-mix(in oklab, var(--error) 9%, var(--surface-container-low)); border-color: color-mix(in oklab, var(--error) 34%, var(--outline-variant)); color: var(--error); }
.ui-banner.is-success { background: color-mix(in oklab, var(--ui-success, #15803d) 9%, var(--surface-container-low)); border-color: color-mix(in oklab, var(--ui-success, #15803d) 32%, var(--outline-variant)); color: var(--ui-success, #15803d); }
</style>
