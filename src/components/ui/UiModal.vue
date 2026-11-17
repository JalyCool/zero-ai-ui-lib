<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getSpringConfig, motion } from '../../composables/useMotion'

/* ============================================================
   对话框
   内部结构全部通过插槽组织：header / title / default / footer，
   插槽作用域里带 close。遮罩与底部面板共用 .ui-scrim：
   压暗 + 背景模糊 0px ↔ 5px。
   面板动画由 motion 驱动（motion-v 版）：
   · 挂载即从 HIDDEN 弹到 SHOWN（view 场景弹簧）
   · 关闭弹向 EXIT（exit 场景弹簧），播完计时卸载
   · 关闭途中再打开：motion 从当前位置续接回 SHOWN，天然可打断，
     不再需要双 rAF 手工编排
   遮罩继续走 CSS 过渡（backdrop-filter 连续变化不能待在
   opacity 过渡的父级里，这条约束不变）。
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

/* 面板的三个姿态（motion 目标），与 ui.css 已删掉的旧 CSS 过渡对应。 */
const HIDDEN = { opacity: 0, y: 14, scale: 0.97 }
const SHOWN = { opacity: 1, y: 0, scale: 1 }
const EXIT = { opacity: 0, y: 12, scale: 0.98 }

const panel = ref(null)
const rendered = ref(false)
const open = ref(false)

let scrollEl = null
let prevOverflow = ''
let closeTimer = null

function panelNode() {
  /* motion 组件的 ref 是组件实例，取根元素要经 $el。 */
  const node = panel.value
  return node?.$el || node
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

function teardown() {
  rendered.value = false
  open.value = false
  unlockScroll()
}

function beginOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  rendered.value = true
  open.value = true
  lockScroll()
  nextTick(() => panelNode()?.focus?.({ preventScroll: true }))
}

function beginClose() {
  clearTimeout(closeTimer)
  closeTimer = null
  if (!rendered.value) return

  open.value = false
  /* 退出弹簧时长 + 缓冲后卸载；reduced-motion 时 getSpringConfig 已降到瞬时。 */
  const exitMs = getSpringConfig('exit').duration * 1000
  closeTimer = setTimeout(() => {
    closeTimer = null
    teardown()
  }, exitMs + CLOSE_BUFFER)
}

watch(() => props.modelValue, value => {
  if (value) beginOpen()
  else if (rendered.value) beginClose()
}, { immediate: true })

document.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  closeTimer = null
  unlockScroll()
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-modal">
      <div class="ui-scrim" :class="{ 'is-open': open }" aria-hidden="true" @click="close"></div>

      <motion.div
        ref="panel"
        class="ui-modal__panel"
        :style="{ maxWidth }"
        :initial="HIDDEN"
        :animate="open ? SHOWN : EXIT"
        :transition="getSpringConfig(open ? 'view' : 'exit')"
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
      </motion.div>
    </div>
  </Teleport>
</template>