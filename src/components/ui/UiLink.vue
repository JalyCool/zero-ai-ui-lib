<script setup>
import { computed } from 'vue'

/* ============================================================
   UiLink —— 文字链接（参照 Nuxt UI 的 link 变体）
   · 默认 primary 色、无下划线，悬停才出下划线；按下轻微收缩
   · 外链自动带 ↗ 角标并 target=_blank rel=noopener
   · 危险链接用 tone="danger"，弱化用 tone="muted"
   ============================================================ */

const props = defineProps({
  href: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  /* primary | muted | danger */
  tone: { type: String, default: 'primary' },
  /* 是否显示外链角标（默认外链自动显示） */
  external: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const isExternal = computed(() => {
  if (props.external) return true
  const h = props.href
  if (!h) return false
  return /^https?:\/\//i.test(h) && !h.startsWith(window.location.origin)
})

const tag = computed(() => (props.to ? 'a' : (props.href ? 'a' : 'span')))

const attrs = computed(() => {
  if (props.to) return { href: typeof props.to === 'string' ? props.to : '#' }
  if (!props.href) return {}
  return isExternal.value
    ? { href: props.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: props.href }
})

function onClick(event) {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="tag"
    class="ui-link"
    :class="['ui-link--' + tone, { 'is-disabled': disabled, 'is-underline': underline }]"
    v-bind="attrs"
    @click="onClick"
  >
    <slot />
    <svg v-if="isExternal" class="ui-link__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  </component>
</template>

<style scoped>
.ui-link {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--primary);
  text-decoration: none;
  border-radius: 3px;
  cursor: pointer;
  transition: color var(--t-fade), text-decoration-color var(--t-fade), opacity var(--t-fade);
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}
.ui-link:hover { text-decoration: underline; }
.ui-link.is-underline { text-decoration: underline; }
.ui-link--muted { color: var(--on-surface-variant); }
.ui-link--danger { color: var(--error); }
.ui-link.is-disabled { color: var(--on-surface-variant); opacity: .55; cursor: not-allowed; text-decoration: none; }
.ui-link:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 2px; }
.ui-link__arrow {
  width: .82em;
  height: .82em;
  flex-shrink: 0;
  align-self: center;
  opacity: .8;
  transition: transform var(--t-pop);
}
.ui-link:hover .ui-link__arrow { transform: translate(1px, -1px); opacity: 1; }
</style>
