<script setup>
import { computed } from 'vue'
const props = defineProps({
  /* 'meta+k' 或 ['meta','k'] */
  keys: { type: [String, Array], default: '' },
  size: { type: String, default: 'md' }
})
/* 键帽：把 'meta+k' 拆成一串小键，Mac 上 meta 显示 ⌘。 */
const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
const list = computed(() => {
  const value = Array.isArray(props.keys) ? props.keys : String(props.keys).split('+')
  return value.filter(Boolean).map(key => {
    const lower = String(key).toLowerCase()
    if (lower === 'meta') return isMac ? '⌘' : 'Ctrl'
    if (lower === 'ctrl') return isMac ? '⌃' : 'Ctrl'
    if (lower === 'alt') return isMac ? '⌥' : 'Alt'
    if (lower === 'shift') return isMac ? '⇧' : 'Shift'
    if (lower === 'enter') return '↵'
    if (lower === 'escape') return 'Esc'
    if (lower === 'space') return 'Space'
    return key
  })
})
</script>
<template>
  <span class="ui-kbd" :class="size !== 'md' ? `ui-kbd--${size}` : ''">
    <kbd v-for="(key, index) in list" :key="key + index">{{ key }}</kbd>
  </span>
</template>
<style scoped>
.ui-kbd { display: inline-flex; align-items: center; gap: 3px; }
.ui-kbd kbd { padding: 1px 5px; border: var(--border-w) solid var(--outline-variant); border-bottom-width: 1.5px; border-radius: 5px; background: var(--surface-container); color: var(--on-surface-variant); font-family: var(--font-mono); font-size: var(--fs-micro); line-height: 1.5; }
.ui-kbd--sm kbd { padding: 0 4px; font-size: calc(var(--fs-micro) * 0.92); }
</style>
