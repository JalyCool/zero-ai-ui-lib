<script setup>
import { nextTick, onBeforeUnmount, ref, watch, computed } from 'vue'
import { useProjectAnimate, getSpringConfig } from '../../composables/useMotion'
import { useEdgeSwipeBack } from '../../core/edgeSwipeBack'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '420px' },
  closeOnEsc: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'close'])

const CLOSE_BUFFER = 80

const panel = ref(null)
const rendered = ref(false)
const open = ref(false)
const closing = ref(false)

let scrollEl = null
let prevOverflow = ''
let closeTimer = null

const [scope, animate] = useProjectAnimate()

function reduceMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function cancelAnimations() {
  if (scope.current) {
    scope.current.animations?.forEach(a => a.stop?.())
  }
}

function close() {
  if (!props.modelValue) return
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue && props.closeOnEsc) {
    event.stopPropagation()
    close()
  }
}

function lockScroll() {
  if (scrollEl) return
  scrollEl = document.getElementById('scrollArea')
  if (!scrollEl) return
  prevOverflow = scrollEl.style.overflow
  scrollEl.style.overflow = 'hidden'
}

function unlockScroll() {
  if (!scrollEl) return
  scrollEl.style.overflow = prevOverflow
  scrollEl = null
}

async function beginOpen() {
  cancelAnimations()
  clearTimeout(closeTimer)
  closeTimer = null

  if (rendered.value && open.value && !closing.value) {
    lockScroll()
    return
  }

  rendered.value = true
  closing.value = false
  open.value = false
  lockScroll()

  nextTick(() => {
    const el = panel.value
    if (!props.modelValue || !el) return
    el.focus({ preventScroll: true })
    void el.offsetHeight

    // Animate open using motion-v
    const config = getSpringConfig('view')
    animate(scope.current, {
      opacity: [0, 1],
      y: [14, 0],
      scale: [0.97, 1]
    }, config).then(() => {
      open.value = true
      paintedOpen.value = true
    })
  })
}

let paintedOpen = ref(false)

function teardown() {
  rendered.value = false
  open.value = false
  closing.value = false
  paintedOpen.value = false
  unlockScroll()
}

async function beginClose() {
  cancelAnimations()
  clearTimeout(closeTimer)
  closeTimer = null

  if (!paintedOpen.value) {
    teardown()
    return
  }

  closing.value = true
  open.value = false

  const config = getSpringConfig('exit')
  await animate(scope.current, {
    opacity: [1, 0],
    y: [0, 12],
    scale: [1, 0.98]
  }, config)

  const exitMs = reduceMotion() ? 0 : 650 // fallback, actual duration from config
  closeTimer = setTimeout(() => {
    closeTimer = null
    teardown()
  }, exitMs + CLOSE_BUFFER)
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value || paintedOpen.value) beginClose()
}, { immediate: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelAnimations()
  unlockScroll()
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-modal" :class="{ 'is-open': open, 'is-closing': closing }">
      <div class="ui-scrim" :class="{ 'is-open': open }" aria-hidden="true" @click="close"></div>

      <div
        ref="panel"
        class="ui-modal__panel"
        :style="{ maxWidth }"
        role="dialog"
        aria-modal="true"
        :aria-label="title || '对话框'"
        tabindex="-1"
      >
        <slot name="header" :close="close">
          <div class="ui-modal__head">
            <slot name="title">
              <div class="ui-modal__title">{{ title }}</div>
            </slot>
            <button type="button" class="ui-modal__close" aria-label="关闭对话框" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </slot>

        <div class="ui-modal__body">
          <slot :close="close" />
        </div>

        <div v-if="$slots.footer" class="ui-modal__footer">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </div>
  </Teleport>
</template>