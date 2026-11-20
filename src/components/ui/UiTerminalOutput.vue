<script setup>
/* ============================================================
   UiTerminalOutput —— 基于 xterm.js（成熟开源终端）
   ------------------------------------------------------------
   · 渲染 / ANSI 解析 / 换行 / 滚动全部交给 xterm，不再自绘；
   · 只读模式：text 增量写入 + 自动跟随（上滑暂停、回底恢复）；
   · interactive：开放键盘输入，逐字符回传 @data，并暴露 write()，
     应用可以把命令结果写回同一个终端（交互式终端的完整循环）。
   ============================================================ */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  /* 原始日志文本（可含 ANSI 转义） */
  text: { type: String, default: '' },
  label: { type: String, default: '' },
  height: { type: Number, default: 220 },
  /* 自动跟随到底（流式日志开着，回看历史关掉） */
  follow: { type: Boolean, default: true },
  /* 交互式终端：开放输入，按键回传 */
  interactive: { type: Boolean, default: false },
  /* 交互模式下的提示符 */
  prompt: { type: String, default: '$ ' }
})

const emit = defineEmits(['data'])

const bodyEl = ref(null)
const copied = ref(false)
const following = ref(props.follow)
let term = null
let fit = null
let copyTimer = 0

function scrollBottom() {
  if (term && following.value) term.scrollToBottom()
}

function onScroll() {
  if (!term) return
  const atBottom = term.buffer.active.baseY + term.buffer.active.cursorY
    >= term.buffer.active.length - 2
  if (props.follow) following.value = atBottom
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(term ? term.buffer.active.toString() : props.text)
  } catch {
    const range = document.createRange()
    range.selectNodeContents(bodyEl.value)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    document.execCommand('copy')
    selection.removeAllRanges()
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 1600)
}

/* 暴露给父组件：向终端写入内容（交互式回显命令结果） */
function write(chunk) {
  if (term) term.write(String(chunk))
}
function clear() {
  if (term) term.clear()
}
defineExpose({ write, clear })

onMounted(async () => {
  term = new Terminal({
    fontFamily: 'var(--font-mono), ui-monospace, monospace',
    fontSize: 12,
    lineHeight: 1.35,
    convertEol: true,
    cursorBlink: true,
    disableStdin: !props.interactive,
    theme: {
      background: 'transparent',
      foreground: 'var(--on-surface)',
      cursor: 'var(--primary)',
      selectionBackground: 'color-mix(in oklab, var(--primary) 30%, transparent)'
    }
  })
  fit = new FitAddon()
  term.loadAddon(fit)
  term.open(bodyEl.value)
  await nextTick()
  try { fit.fit() } catch { /* 尺寸未就绪时忽略 */ }
  if (props.interactive) {
    term.write(props.prompt)
    term.onData(data => emit('data', data))
  }
  if (props.text) term.write(props.text)
  scrollBottom()
})

/* 增量写入：只补新增的一段，避免整屏重刷 */
watch(() => props.text, (value, oldValue) => {
  if (!term || !value) return
  if (value.length > oldValue.length && value.startsWith(oldValue)) {
    term.write(value.slice(oldValue.length))
  } else if (value !== oldValue) {
    term.write('\r\x1b[K' + value)
  }
  scrollBottom()
})
watch(() => props.follow, value => { following.value = value; if (value) scrollBottom() })

onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  if (term) { term.dispose(); term = null }
})
</script>

<template>
  <div class="ui-term">
    <div class="ui-term__head">
      <span v-if="label" class="ui-term__label">{{ label }}</span>
      <button type="button" class="ui-term__copy" @click="copyAll">{{ copied ? '已复制' : '复制全部' }}</button>
    </div>
    <!-- xterm 挂载点：高度固定，内部滚动由终端自己管理 -->
    <div ref="bodyEl" class="ui-term__body" role="log" aria-live="polite" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<style scoped>
.ui-term { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-term__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ui-term__head:empty { display: none; }
.ui-term__label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); }
.ui-term__copy {
  margin-left: auto;
  padding: 3px 9px;
  border-radius: 999px;
  background: transparent;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-term__copy:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-term__copy:active { transform: scale(var(--press-scale)); }
.ui-term__body {
  overflow: hidden;
  padding: 10px 12px;
  border-radius: calc(var(--r-13) * var(--radius-scale));
  background: var(--surface-container-low);
}
</style>
