<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* 工具名 */
  name: { type: String, default: '' },
  /* 参数摘要之类的副文本 */
  detail: { type: String, default: '' },
  /* 仅受控：running 开始计时；success 收绿；error 变红并抖动 */
  status: { type: String, default: 'running' },
  /* 预计耗时（秒）：填充条按它走到满 */
  expected: { type: Number, default: 2.4 },
  /* 结束后是否显示耗时 */
  showTime: { type: Boolean, default: true }
})

const emit = defineEmits(['elapsed'])

/* ============================================================
   工具调用胶囊
   运行中：一层进度填充从左侧擦过（fill 宽度 = 已用 / 预计），
   同时右侧计时器实时跳动，看起来像真的在跑。
   结束：填充直接补到 100% 并转绿（成功）或转红 + 抖动（失败），
   计时器定格在最终耗时。状态完全由外部传入，组件不猜。
   ============================================================ */

const startedAt = ref(0)
const elapsed = ref(0)
const finishedAt = ref(null)
let raf = 0

const running = computed(() => props.status === 'running')
const fill = computed(() => {
  if (props.status === 'success') return 1
  if (props.status === 'error') return 1
  const target = Math.max(0.4, props.expected)
  return Math.min(1, elapsed.value / target)
})
const timeText = computed(() => {
  const seconds = finishedAt.value !== null ? finishedAt.value : elapsed.value
  return seconds < 10 ? seconds.toFixed(1) + 's' : Math.round(seconds) + 's'
})

function tick(now) {
  if (!running.value) return
  elapsed.value = (now - startedAt.value) / 1000
  emit('elapsed', elapsed.value)
  raf = requestAnimationFrame(tick)
}

function restart() {
  cancelAnimationFrame(raf)
  startedAt.value = performance.now()
  elapsed.value = 0
  finishedAt.value = null
  if (running.value) raf = requestAnimationFrame(tick)
}

watch(() => props.status, (next, prev) => {
  if (next === 'running') restart()
  else if (prev === 'running') {
    cancelAnimationFrame(raf)
    /* 定格：结束时刻的耗时，保持小数一致。 */
    finishedAt.value = Math.max(elapsed.value, 0) || Math.min(props.expected, elapsed.value)
  }
}, { immediate: true })

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span
    class="ui-tool-call"
    :class="`is-${status}`"
    role="status"
    :aria-label="`${name} ${status === 'running' ? '运行中' : status === 'success' ? '已完成' : '失败'}`"
  >
    <span class="ui-tool-call__fill" :style="{ '--fill': fill }" aria-hidden="true"></span>
    <span class="ui-tool-call__body">
      <span class="ui-tool-call__icon" aria-hidden="true">
        <svg v-if="status === 'running'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 4.5h6M12 4.5V8" /><rect x="5.5" y="8" width="13" height="11.5" rx="2.5" /><path d="M9 12.5l2 2 4-4" opacity=".55" />
        </svg>
        <svg v-else-if="status === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5.5 12.6l4.2 4.2L18.6 7.8" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
          <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />
        </svg>
      </span>
      <span class="ui-tool-call__name">{{ name }}</span>
      <span v-if="detail" class="ui-tool-call__detail">{{ detail }}</span>
    </span>
    <span v-if="showTime" class="ui-tool-call__time">{{ timeText }}</span>
  </span>
</template>

<style scoped>
.ui-tool-call {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 7px 11px;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: var(--fs-tiny);
  line-height: 1.3;
  isolation: isolate;
  transition: border-color var(--t-fade), color var(--t-fade), background var(--t-fade);
}
/* 填充层：从左往右擦过，宽度跟计时走。 */
.ui-tool-call__fill {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  width: calc(var(--fill, 0) * 100%);
  background: color-mix(in oklab, var(--primary) 22%, transparent);
  transition: width var(--t-fade) linear, background var(--t-fade);
  pointer-events: none;
}
.ui-tool-call__body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ui-tool-call__icon { display: grid; place-items: center; width: 15px; height: 15px; flex-shrink: 0; color: currentColor; }
.ui-tool-call__icon svg { width: 15px; height: 15px; }
.ui-tool-call__name { font-weight: var(--w-label); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-tool-call__detail {
  color: var(--on-surface-variant);
  font-family: ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-tool-call__time {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-micro);
}

/* 成功：填充补满并转绿，整体染成成功色。 */
.ui-tool-call.is-success { color: var(--ui-success, #1f9d63); border-color: color-mix(in oklab, var(--ui-success, #1f9d63) 42%, var(--outline-variant)); }
.ui-tool-call.is-success .ui-tool-call__fill { background: color-mix(in oklab, var(--ui-success, #1f9d63) 16%, transparent); }
.ui-tool-call.is-success .ui-tool-call__icon { animation: uiToolCallPop var(--spring-feedback-dur) var(--spring-feedback); }

/* 失败：填充转红并整体抖一下。 */
.ui-tool-call.is-error { color: var(--error); border-color: color-mix(in oklab, var(--error) 46%, var(--outline-variant)); }
.ui-tool-call.is-error .ui-tool-call__fill { background: color-mix(in oklab, var(--error) 18%, transparent); }
.ui-tool-call.is-error { animation: uiToolCallShake 460ms cubic-bezier(.36, .07, .19, .97); }

@keyframes uiToolCallPop {
  from { transform: scale(.6); filter: blur(6px); opacity: 0; }
  to { transform: scale(1); filter: blur(0); opacity: 1; }
}
@keyframes uiToolCallShake {
  0%, 100% { transform: translateX(0); }
  18% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  62% { transform: translateX(-2px); }
  82% { transform: translateX(2px); }
}

@media (prefers-reduced-motion: reduce) {
  .ui-tool-call, .ui-tool-call * { animation: none !important; transition-duration: .01ms !important; }
}
</style>
