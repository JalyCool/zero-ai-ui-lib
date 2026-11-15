<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   折叠面板：高度在 0 <-> 自然高度之间连续过渡。
   · 支持 interpolate-size 的浏览器直接靠 CSS 插值 auto；
   · 不支持的（Safari / Firefox）用 JS 测出像素高度补一段过渡，
     过渡结束后再交还给 auto，避免固定 max-height 的空白 / 截断。
   ============================================================ */

const bodyEl = ref(null)
const supportsKeywordInterpolation = ref(true)

function detectSupport() {
  supportsKeywordInterpolation.value =
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('interpolate-size', 'allow-keywords')
}

let transitionEnd = null

function animateFallback(open) {
  const el = bodyEl.value
  if (!el || supportsKeywordInterpolation.value) return
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    el.style.height = open ? 'auto' : '0px'
    return
  }
  /* 起点固定像素 -> 终点固定像素，结束后放开成 auto。 */
  const from = el.scrollHeight * (open ? 0 : 1)
  const to = open ? el.scrollHeight : 0
  el.style.transition = 'none'
  el.style.height = from + 'px'
  void el.offsetHeight
  el.style.transition = ''
  requestAnimationFrame(() => {
    el.style.height = to + 'px'
  })
  clearTimeout(transitionEnd)
  transitionEnd = setTimeout(() => {
    if (open) {
      el.style.height = 'auto'
    }
  }, 660)
}

onMounted(() => {
  detectSupport()
  if (props.modelValue && bodyEl.value && !supportsKeywordInterpolation.value) {
    bodyEl.value.style.height = 'auto'
  }
})

watch(() => props.modelValue, value => {
  nextTick(() => animateFallback(value))
})

onBeforeUnmount(() => clearTimeout(transitionEnd))
</script>

<template>
  <div class="ui-accordion" :class="{ 'is-open': modelValue }">
    <button
      type="button"
      class="ui-accordion__head"
      :aria-expanded="modelValue"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span>{{ title }}</span>
      <svg class="ui-accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div ref="bodyEl" class="ui-accordion__body"><slot /></div>
  </div>
</template>
