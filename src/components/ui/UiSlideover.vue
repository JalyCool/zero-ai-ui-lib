<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  /* left | right */
  side: { type: String, default: 'right' },
  width: { type: String, default: 'min(360px, 88vw)' }
})
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const rendered = ref(false)
let timer = 0

/* 滑出抽屉：从指定一侧整体滑入，遮罩压暗模糊；Esc / 点遮罩关闭。 */
watch(() => props.modelValue, value => {
  clearTimeout(timer)
  if (value) { rendered.value = true; nextTick(() => requestAnimationFrame(() => { open.value = true })) }
  else {
    open.value = false
    timer = setTimeout(() => { rendered.value = false }, 320)
  }
}, { immediate: true })

function close() { emit('update:modelValue', false) }
function onKey(event) { if (event.key === 'Escape') close() }
watch(rendered, value => {
  if (value) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('keydown', onKey) })
</script>
<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-slideover" :class="[`is-${side}`, { 'is-open': open }]">
      <div class="ui-slideover__scrim" @click="close"></div>
      <aside class="ui-slideover__panel" :style="{ width }" role="dialog" aria-modal="true" :aria-label="title || '抽屉'">
        <header v-if="title || $slots.header" class="ui-slideover__head">
          <slot name="header"><h3>{{ title }}</h3></slot>
          <button type="button" class="ui-slideover__close" aria-label="关闭" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div class="ui-slideover__body"><slot /></div>
        <footer v-if="$slots.footer" class="ui-slideover__foot"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>
<style scoped>
.ui-slideover { position: fixed; inset: 0; z-index: 350; }
.ui-slideover__scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, .32); opacity: 0; backdrop-filter: blur(0px); transition: opacity var(--t-panel), backdrop-filter var(--t-panel); }
.ui-slideover.is-open .ui-slideover__scrim { opacity: 1; backdrop-filter: blur(4px); }
.ui-slideover__panel { position: absolute; top: 0; bottom: 0; display: flex; flex-direction: column; max-width: 100%; background: var(--surface); box-shadow: var(--elev-sheet); transition: transform var(--t-panel) var(--spring-view); }
.ui-slideover.is-right .ui-slideover__panel { right: 0; border-radius: calc(20px * var(--radius-scale)) 0 0 calc(20px * var(--radius-scale)); transform: translateX(100%); }
.ui-slideover.is-left .ui-slideover__panel { left: 0; border-radius: 0 calc(20px * var(--radius-scale)) calc(20px * var(--radius-scale)) 0; transform: translateX(-100%); }
.ui-slideover.is-open .ui-slideover__panel { transform: none; }
.ui-slideover__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 6px; }
.ui-slideover__head h3 { margin: 0; font-size: var(--fs-body); font-weight: var(--w-heading); }
.ui-slideover__close { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-slideover__close:hover { background: var(--surface-container); }
.ui-slideover__close svg { width: 15px; height: 15px; }
.ui-slideover__body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.ui-slideover__foot { padding: 10px 14px 14px; border-top: var(--border-w) solid var(--outline-variant); display: flex; gap: 8px; justify-content: flex-end; }
</style>
