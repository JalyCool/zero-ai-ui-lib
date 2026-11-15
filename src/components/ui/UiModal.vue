<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/* ============================================================
   对话框
   内部结构全部通过插槽组织：header / title / default / footer，
   插槽作用域里带 close。遮罩与底部面板共用 .ui-scrim：
   压暗 + 背景模糊 0px ↔ 5px。
   模糊半径要连续变化，遮罩就不能待在带 opacity 过渡的父级里
   （opacity 会成为 backdrop 根，模糊会被整段吃掉，看起来像瞬间跳变），
   所以这里和底部面板一样手工驱动打开/关闭，而不是用 <Transition> 包整体。
   ============================================================ */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '420px' },
  /* Esc 关闭：普通对话框默认开启；confirmDialog 显式关掉 */
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
let frameA = 0
let frameB = 0
let paintedOpen = false

function readMotionDuration(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallback
  const amount = parseFloat(raw)
  if (!Number.isFinite(amount)) return fallback
  return raw.endsWith('ms') ? amount : amount * 1000
}

function reduceMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function cancelFrames() {
  if (frameA) cancelAnimationFrame(frameA)
  if (frameB) cancelAnimationFrame(frameB)
  frameA = 0
  frameB = 0
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

function beginOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelFrames()

  if (rendered.value && paintedOpen && !open.value) {
    closing.value = false
    open.value = true
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

    frameA = requestAnimationFrame(() => {
      frameA = 0
      frameB = requestAnimationFrame(() => {
        frameB = 0
        if (!props.modelValue) return
        open.value = true
        paintedOpen = true
      })
    })
  })
}

function teardown() {
  rendered.value = false
  open.value = false
  closing.value = false
  paintedOpen = false
  unlockScroll()
}

function beginClose() {
  cancelFrames()
  clearTimeout(closeTimer)
  closeTimer = null

  if (!paintedOpen) {
    teardown()
    return
  }

  closing.value = true
  open.value = false

  const exitMs = reduceMotion() ? 0 : readMotionDuration('--spring-exit-dur', 650)
  closeTimer = setTimeout(() => {
    closeTimer = null
    teardown()
  }, exitMs + CLOSE_BUFFER)
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value || paintedOpen) beginClose()
}, { immediate: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  closeTimer = null
  cancelFrames()
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
