<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  /* 同时最多显示几条，超出的排队等待 */
  max: { type: Number, default: 3 }
})

const items = ref([])
const queue = []
const timers = new Map()
let nextId = 1

/* ============================================================
   Toast：show/dismiss 之外补语义化 API ——
   success / error / warning / info，支持 duration 与队列：
   超出 max 条自动排队，前一条退场后顶上。
   ============================================================ */

function dismiss(id) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  items.value = items.value.filter(item => item.id !== id)
  /* 队列放行 */
  if (queue.length && items.value.length < props.max) {
    const next = queue.shift()
    show(...next)
  }
}

function show(message, tone = 'info', duration = 2600) {
  if (items.value.length >= props.max) {
    queue.push([message, tone, duration])
    return -1
  }
  const id = nextId++
  items.value.push({ id, message, tone })
  if (duration > 0) {
    const timer = setTimeout(() => dismiss(id), duration)
    timers.set(id, timer)
  }
  return id
}

function success(message, duration) { return show(message, 'success', duration) }
function error(message, duration) { return show(message, 'danger', duration) }
function warning(message, duration) { return show(message, 'warning', duration) }
function info(message, duration) { return show(message, 'info', duration) }
function clear() {
  queue.length = 0
  ;[...items.value].forEach(item => dismiss(item.id))
}

onBeforeUnmount(() => {
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
  queue.length = 0
})

defineExpose({ show, dismiss, success, error, warning, info, clear })
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="ui-toast" tag="div" class="ui-toast-host" aria-live="polite">
      <div v-for="item in items" :key="item.id" class="ui-toast" :class="`ui-toast--${item.tone}`">
        <span class="ui-toast__dot" aria-hidden="true"></span>
        <span>{{ item.message }}</span>
        <button type="button" class="ui-toast__close" aria-label="关闭提示" @click="dismiss(item.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>
