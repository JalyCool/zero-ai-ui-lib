<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /* [{ label, value, hint?, icon?, keywords? }] */
  items: { type: Array, default: () => [] },
  placeholder: { type: String, default: '输入命令或搜索…' },
  /* 快捷键（如 meta+k），空则只受 v-model 控制 */
  shortcut: { type: String, default: 'meta+k' }
})
const emit = defineEmits(['update:modelValue', 'select'])
const query = ref('')
const active = ref(0)
const inputEl = ref(null)

/* 命令面板：⌘K 唤起，输入过滤，↑↓ 选择，Enter 执行。 */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.items.filter(item => !q || [item.label, item.value, item.keywords].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0, 10)
})
const open = computed(() => props.modelValue)

function close() { emit('update:modelValue', false) }
function choose(item) {
  if (!item) return
  emit('select', item)
  close()
}
watch(open, async value => {
  if (value) {
    query.value = ''
    active.value = 0
    await nextTick()
    inputEl.value && inputEl.value.focus()
  }
})
watch(filtered, () => { active.value = 0 })

function onKey(event) {
  if (!open.value) return
  if (event.key === 'Escape') { event.preventDefault(); close() }
  else if (event.key === 'ArrowDown') { event.preventDefault(); active.value = Math.min(filtered.value.length - 1, active.value + 1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); active.value = Math.max(0, active.value - 1) }
  else if (event.key === 'Enter') { event.preventDefault(); choose(filtered.value[active.value]) }
}
function onGlobalKey(event) {
  if (!props.shortcut) return
  const [mod, key] = props.shortcut.split('+')
  const needMod = mod === 'meta' || mod === 'ctrl'
  if (needMod && !event.metaKey && !event.ctrlKey) return
  if (String(event.key).toLowerCase() !== key) return
  event.preventDefault()
  emit('update:modelValue', !props.modelValue)
}
watch(() => props.shortcut, () => {
  document.removeEventListener('keydown', onGlobalKey)
  if (props.shortcut) document.addEventListener('keydown', onGlobalKey)
}, { immediate: true })
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKey))
</script>
<template>
  <Teleport to="body">
    <Transition name="ui-palette">
      <div v-if="modelValue" class="ui-palette" @pointerdown.self="close">
        <div class="ui-palette__box" role="dialog" aria-modal="true" aria-label="命令面板">
          <div class="ui-palette__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
            <input ref="inputEl" v-model="query" :placeholder="placeholder" @keydown="onKey" />
            <kbd>esc</kbd>
          </div>
          <div class="ui-palette__list" role="listbox">
            <button v-for="(item, index) in filtered" :key="item.value + index" type="button" role="option"
              :class="{ 'is-active': index === active }" :aria-selected="index === active"
              @mousemove="active = index" @click="choose(item)">
              <span v-if="item.icon" class="ui-palette__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
              </span>
              <span class="ui-palette__label">{{ item.label }}</span>
              <small v-if="item.hint">{{ item.hint }}</small>
            </button>
            <p v-if="!filtered.length" class="ui-palette__empty">没有匹配的命令</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
.ui-palette { position: fixed; inset: 0; z-index: 370; display: flex; align-items: flex-start; justify-content: center; padding: 12vh 16px 16px; background: rgba(0, 0, 0, .32); backdrop-filter: blur(6px); }
.ui-palette__box { width: min(560px, 100%); max-height: 60vh; display: flex; flex-direction: column; overflow: hidden; border: var(--border-w) solid var(--outline-variant); border-radius: 18px; background: var(--surface); box-shadow: var(--elev-tip); }
.ui-palette__search { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-bottom: var(--border-w) solid var(--outline-variant); }
.ui-palette__search svg { width: 17px; height: 17px; color: var(--on-surface-variant); }
.ui-palette__search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); outline: none; }
.ui-palette__search kbd { padding: 2px 6px; border-radius: 6px; background: var(--surface-container-high); color: var(--on-surface-variant); font-size: var(--fs-micro); font-family: var(--font-mono); }
.ui-palette__list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.ui-palette__list button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: 0; border-radius: 10px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); text-align: left; cursor: pointer; }
.ui-palette__list button.is-active { background: var(--surface-container); }
.ui-palette__icon { display: grid; place-items: center; width: 17px; height: 17px; flex-shrink: 0; color: var(--on-surface-variant); }
.ui-palette__icon svg { width: 16px; height: 16px; }
.ui-palette__label { flex: 1; min-width: 0; }
.ui-palette__list small { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-palette__empty { margin: 0; padding: 18px; text-align: center; color: var(--on-surface-variant); font-size: var(--fs-tiny); }
.ui-palette-enter-active, .ui-palette-leave-active { transition: opacity var(--t-fade), backdrop-filter var(--t-panel); }
.ui-palette-enter-active .ui-palette__box, .ui-palette-leave-active .ui-palette__box { transition: transform var(--t-pop), filter var(--t-fade); }
.ui-palette-enter-from, .ui-palette-leave-to { opacity: 0; }
.ui-palette-enter-from .ui-palette__box, .ui-palette-leave-to .ui-palette__box { transform: scale(.96) translateY(-8px); filter: blur(8px); }
</style>
