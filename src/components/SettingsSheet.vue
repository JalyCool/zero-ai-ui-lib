<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ColorPanel from './ColorPanel.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const closing = ref(false)
const sheetEl = ref(null)
let closeTimer = null
let justOpened = false
let openTimer = null

watch(() => props.open, value => {
  clearTimeout(closeTimer)
  clearTimeout(openTimer)

  if (value) {
    closing.value = false
    justOpened = true
    openTimer = setTimeout(() => { justOpened = false }, 120)
  } else {
    closing.value = true
    closeTimer = setTimeout(() => { closing.value = false }, 600)
  }
})

function onPointerDown(event) {
  if (!props.open) return
  if (document.body.classList.contains('locked')) return
  if (justOpened) return
  if (sheetEl.value && sheetEl.value.contains(event.target)) return
  if (event.target.closest('#themeBtn')) return
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  clearTimeout(openTimer)
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="sheetEl"
    class="sheet"
    :class="{ open, closing }"
    id="settingsSheet"
    role="dialog"
    aria-modal="true"
    aria-label="设置"
    :aria-hidden="open ? 'false' : 'true'"
  >
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <h2>Playground</h2>
      <button class="sheet-close" id="sheetClose" aria-label="关闭" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>

    <div class="sheet-content">
      <ColorPanel />
    </div>
  </div>
</template>
