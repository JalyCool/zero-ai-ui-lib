<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ansiToHtml } from '../../core/ansi'

const props = defineProps({
  /* 原始日志文本（可含 ANSI 转义） */
  text: { type: String, default: '' },
  label: { type: String, default: '' },
  height: { type: Number, default: 220 },
  /* 自动跟随到底（流式日志开着，回看历史关掉） */
  follow: { type: Boolean, default: true }
})

/* ============================================================
   终端输出视图：ANSI 颜色解析 + 等宽字体 + 自动跟随底部
   + 复制全部（剪贴板不可用时降级为选中文本复制）。
   ============================================================ */

const bodyEl = ref(null)
const copied = ref(false)
const following = ref(props.follow)
let copyTimer = 0

const html = computed(() => ansiToHtml(props.text))

async function scrollBottom() {
  await nextTick()
  const el = bodyEl.value
  if (el && following.value) el.scrollTop = el.scrollHeight
}

watch(() => props.text, scrollBottom, { flush: 'post' })
watch(() => props.follow, value => { following.value = value; if (value) scrollBottom() })

function onScroll() {
  const el = bodyEl.value
  if (!el) return
  /* 用户向上翻看时暂停跟随；翻回底部自动恢复。 */
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  if (props.follow) following.value = atBottom
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(props.text)
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
</script>

<template>
  <div class="ui-term">
    <div class="ui-term__head">
      <span v-if="label" class="ui-term__label">{{ label }}</span>
      <button type="button" class="ui-term__copy" @click="copyAll">{{ copied ? '已复制' : '复制全部' }}</button>
    </div>
    <div
      ref="bodyEl"
      class="ui-term__body"
      role="log"
      aria-live="polite"
      :style="{ height: height + 'px' }"
      @scroll="onScroll"
    >
      <pre v-if="text" v-html="html"></pre>
      <span v-else class="ui-term__empty">暂无输出</span>
    </div>
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
  border: var(--border-w) solid var(--outline-variant);
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
  overflow: auto;
  padding: 10px 12px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container-low);
  scrollbar-width: thin;
}
.ui-term__body pre {
  margin: 0;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: .7rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--on-surface);
}
.ui-term__body pre :deep(i) { font-style: normal; }
.ui-term__empty { color: var(--on-surface-variant); font-size: var(--fs-tiny); }
</style>
