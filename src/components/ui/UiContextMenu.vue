<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  /* [{ label, value?, disabled?, tone?, icon?, divider?, shortcut? }] */
  items: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['select'])

/* 右键 / 长按菜单：在指针位置弹出，点外部 / Esc / 滚动关闭。 */
const open = ref(false)
const pos = ref({ x: 0, y: 0 })
const menuEl = ref(null)
const style = computed(() => ({ left: pos.value.x + 'px', top: pos.value.y + 'px' }))

async function show(x, y) {
  if (props.disabled || !props.items.length) return
  pos.value = { x, y }
  open.value = true
  await nextTick()
  const el = menuEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = 8
  if (rect.right > window.innerWidth - margin) pos.value.x = Math.max(8, window.innerWidth - rect.width - margin)
  if (rect.bottom > window.innerHeight - margin) pos.value.y = Math.max(8, window.innerHeight - rect.height - margin)
}
function onContext(event) {
  event.preventDefault()
  show(event.clientX, event.clientY)
}
let holdTimer = 0
function onTouchDown(event) {
  const touch = event.touches && event.touches[0]
  if (!touch) return
  holdTimer = setTimeout(() => show(touch.clientX, touch.clientY), 480)
}
function onTouchEnd() { clearTimeout(holdTimer) }

function pick(item) {
  if (item.disabled || item.divider) return
  open.value = false
  emit('select', item)
}
function close() { open.value = false }
function onDocDown(event) { if (menuEl.value && !menuEl.value.contains(event.target)) close() }
function onKey(event) { if (event.key === 'Escape') close() }
watch(open, value => {
  if (value) {
    document.addEventListener('pointerdown', onDocDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
  } else {
    document.removeEventListener('pointerdown', onDocDown, true)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', close, true)
  }
})
onBeforeUnmount(() => { clearTimeout(holdTimer); close() })
</script>
<template>
  <div class="ui-context-menu" @contextmenu="onContext" @touchstart.passive="onTouchDown" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
    <slot />
    <Teleport to="body">
      <Transition name="ui-ctx">
        <div v-if="open" ref="menuEl" class="ui-context-menu__panel" :style="style" role="menu">
          <template v-for="(item, index) in items" :key="item.label + index">
            <span v-if="item.divider" class="ui-context-menu__divider" role="separator"></span>
            <button v-else type="button" role="menuitem" class="ui-context-menu__item"
              :class="[`is-${item.tone || 'neutral'}`, { 'is-disabled': item.disabled }]"
              :disabled="item.disabled" @click="pick(item)">
              <span v-if="item.icon" class="ui-context-menu__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
              </span>
              <span class="ui-context-menu__label">{{ item.label }}</span>
              <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
<style scoped>
.ui-context-menu { position: relative; display: contents; }
.ui-context-menu__panel { position: fixed; z-index: 345; min-width: 176px; padding: 5px; border: var(--border-w) solid var(--outline-variant); border-radius: 13px; background: var(--surface); box-shadow: var(--elev-tip); }
.ui-context-menu__item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 9px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); text-align: left; cursor: pointer; }
.ui-context-menu__item:hover:not(.is-disabled) { background: var(--surface-container); }
.ui-context-menu__item.is-danger { color: var(--error); }
.ui-context-menu__item.is-disabled { opacity: .4; cursor: not-allowed; }
.ui-context-menu__icon { display: grid; place-items: center; width: 16px; height: 16px; flex-shrink: 0; }
.ui-context-menu__icon svg { width: 15px; height: 15px; }
.ui-context-menu__label { flex: 1; min-width: 0; }
.ui-context-menu__item kbd { padding: 1px 5px; border-radius: 5px; background: var(--surface-container-high); color: var(--on-surface-variant); font-size: var(--fs-micro); font-family: ui-monospace, monospace; }
.ui-context-menu__divider { display: block; height: 1px; margin: 4px 6px; background: var(--outline-variant); }
.ui-ctx-enter-active, .ui-ctx-leave-active { transition: opacity var(--t-fade), transform var(--t-pop), filter var(--t-fade); }
.ui-ctx-enter-from, .ui-ctx-leave-to { opacity: 0; transform: scale(.94); filter: blur(6px); }
</style>
