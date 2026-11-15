<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /* top | bottom | left | right */
  placement: { type: String, default: 'bottom' },
  /* 锚点元素的选择器或 ref；不传则取 trigger 槽 */
  trigger: { type: String, default: '' },
  offset: { type: Number, default: 8 },
  label: { type: String, default: '弹出层' }
})
const emit = defineEmits(['update:modelValue'])
const rootEl = ref(null)
const panelEl = ref(null)
const style = ref({})

/* 通用弹层：锚定任意元素（选择器 / 自己的 trigger），自动贴边翻转。
   与 Tooltip 的区别：内容可交互、可点外部关闭。 */
const open = computed(() => props.modelValue)

function place() {
  const panel = panelEl.value
  if (!panel) return
  const anchor = props.trigger
    ? document.querySelector(props.trigger)
    : (rootEl.value && rootEl.value.querySelector('[data-popover-trigger]'))
  if (!anchor) return
  const a = anchor.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  const margin = 8
  let left = a.left + a.width / 2 - p.width / 2
  let top = a.bottom + props.offset
  let placement = props.placement
  if (top + p.height > window.innerHeight - margin) placement = 'top'
  if (placement === 'top') top = a.top - p.height - props.offset
  if (placement === 'left') { left = a.left - p.width - props.offset; top = a.top + a.height / 2 - p.height / 2 }
  if (placement === 'right') { left = a.right + props.offset; top = a.top + a.height / 2 - p.height / 2 }
  left = Math.max(margin, Math.min(left, window.innerWidth - margin - p.width))
  top = Math.max(margin, Math.min(top, window.innerHeight - margin - p.height))
  style.value = { left: left + 'px', top: top + 'px', transformOrigin: placement === 'top' ? 'bottom center' : 'top center' }
}

function close() { emit('update:modelValue', false) }
function onDocDown(event) {
  if (!open.value) return
  if (panelEl.value && panelEl.value.contains(event.target)) return
  if (rootEl.value && rootEl.value.contains(event.target)) return
  const anchor = props.trigger ? document.querySelector(props.trigger) : null
  if (anchor && anchor.contains(event.target)) return
  close()
}
function onKey(event) { if (event.key === 'Escape') close() }
watch(open, async value => {
  if (value) {
    await nextTick(); place()
    document.addEventListener('pointerdown', onDocDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
  } else {
    document.removeEventListener('pointerdown', onDocDown, true)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocDown, true)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
})
</script>
<template>
  <span ref="rootEl" class="ui-popover">
    <span data-popover-trigger class="ui-popover__anchor"><slot name="trigger" /></span>
    <Teleport to="body">
      <Transition name="ui-pop">
        <div v-if="modelValue" ref="panelEl" class="ui-popover__panel" :style="style" role="dialog" :aria-label="label">
          <slot :close="close" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>
<style scoped>
.ui-popover { display: inline-flex; min-width: 0; }
.ui-popover__anchor { display: inline-flex; }
.ui-popover__panel { position: fixed; z-index: 340; max-width: min(320px, calc(100vw - 16px)); padding: 12px; border: var(--border-w) solid var(--outline-variant); border-radius: calc(14px * var(--radius-scale)); background: var(--surface); box-shadow: var(--elev-tip); }
.ui-pop-enter-active, .ui-pop-leave-active { transition: opacity var(--t-fade), transform var(--t-pop), filter var(--t-fade); }
.ui-pop-enter-from, .ui-pop-leave-to { opacity: 0; transform: scale(.94) translateY(-4px); filter: blur(8px); }
</style>
