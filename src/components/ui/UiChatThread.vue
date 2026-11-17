<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  /* 消息间距（px）：设计稿三屏都是 18 */
  gap: { type: Number, default: 18 },
  /* 内容不足时贴底（设计稿 justify-end 的效果） */
  alignBottom: { type: Boolean, default: true },
  /* 新内容到达时自动滚到底；用户向上翻看时暂停（滚回底部自动恢复） */
  autoScroll: { type: Boolean, default: true },
  /* 顶部/底部留白：给渐变模糊栏与输入条让位（设计稿 py-[114px]） */
  padding: { type: String, default: '' }
})

/* ============================================================
   对话流容器
   ------------------------------------------------------------
   滚动容器自己就是 .ui-chat-thread（不是 body），所以内部贴底
   只影响这一块：内容不足时 margin-top:auto 把消息推到最下方，
   内容超出时从底部往上堆 —— 与设计稿 justify-end + py 留白一致。

   贴底策略与 UiTerminalOutput 的 follow 同语言：默认跟随，
   用户主动上滑就暂停；滚回底部附近自动恢复跟随。
   ============================================================ */

const scrollEl = ref(null)
const innerEl = ref(null)
const following = ref(true)
let observer = null

function atBottom() {
  const el = scrollEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 24
}

function scrollToBottom(behavior = 'auto') {
  const el = scrollEl.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
}

function onScroll() {
  following.value = atBottom()
}

/* 内容变化（新消息 / 流式增长）→ 跟随贴底 */
function observe() {
  if (observer || typeof MutationObserver === 'undefined' || !innerEl.value) return
  observer = new MutationObserver(() => {
    if (!props.autoScroll || !following.value) return
    nextTick(() => scrollToBottom())
  })
  observer.observe(innerEl.value, { childList: true, subtree: true, characterData: true })
}

onMounted(() => {
  scrollToBottom()
  observe()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  observer = null
})

watch(() => props.autoScroll, value => { if (value) { following.value = true; nextTick(() => scrollToBottom()) } })

defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="scrollEl"
    class="ui-chat-thread"
    :style="{ '--chat-gap': gap + 'px', padding }"
    @scroll.passive="onScroll"
  >
    <div
      ref="innerEl"
      class="ui-chat-thread__inner"
      :class="{ 'is-bottom': alignBottom }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ui-chat-thread {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.ui-chat-thread::-webkit-scrollbar { display: none; }

.ui-chat-thread__inner {
  display: flex;
  flex-direction: column;
  gap: var(--chat-gap);
  min-width: 0;
  flex-shrink: 0;
}
/* 内容不足时把消息推到底部（等价设计稿 justify-end） */
.ui-chat-thread__inner.is-bottom { margin-top: auto; }
</style>