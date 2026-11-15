<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  /* 支持 base64 data URL / 在线地址 / 本地资源 */
  src: { type: String, default: '' },
  /* 不写时继承 UiAvatarGroup 的 size */
  size: { type: String, default: '' },
  status: { type: Boolean, default: false }
})

const group = inject('uiAvatarGroup', null)
const resolved = computed(() => props.size || (group && group.value ? group.value.size : '') || 'md')

const initials = computed(() => {
  const value = props.name.trim()
  if (!value) return '?'
  const parts = value.split(/\s+/)
  if (parts.length === 1) return value.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})
</script>

<template>
  <span class="ui-avatar" :class="resolved !== 'md' ? 'ui-avatar--' + resolved : ''">
    <img v-if="src" :src="src" :alt="name">
    <template v-else>{{ initials }}</template>
    <span v-if="status" class="ui-avatar__status" aria-label="在线"></span>
  </span>
</template>
