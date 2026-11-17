<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiProgressiveBlur from './UiProgressiveBlur.vue'
import { useScrollEdges } from '../../composables/useScrollEdges'

const props = defineProps({
  /* 消息间距（px）：设计稿三屏都是 18 */
  gap: { type: Number, default: 18 },
  /* 内容不足时贴底（设计稿 justify-end 的效果） */
  alignBottom: { type: Boolean, default: true },
  /* 新内容到达时自动滚到底；用户向上翻看时暂停（滚回底部自动恢复） */
  autoScroll: { type: Boolean, default: true },
  /* 顶部/底部留白：给渐变模糊栏与输入条让位（设计稿 py-[114px]） */
  padding: { type: String, default: '' },
  /* ============================================================
     边缘模糊（统一滚动容器的约定，与 ZeroScroll 同语言）
     ------------------------------------------------------------
     fade = 模糊带高度（px）。默认开启：这一侧还有被裁内容才淡入，
     到顶/到底自动淡出；内容不足一屏两侧都不出现。
     传 0 关闭（外层已有 ZeroApp 包着、或自己想手搭时用）。
     ============================================================ */
  fade: { type: Number, default: 64 },
  fadeBlur: { type: Number, default: 6 },
  fadeLayers: { type: Number, default: 12 },
  fadeTint: { type: String, default: 'transparent' },
  fadeTintStrength: { type: Number, default: 0 }
})

/* ============================================================
   对话流容器
   ------------------------------------------------------------
   滚动容器自己就是 .ui-chat-thread（不是 body），所以内部贴底
   只影响这一块：内容不足时 margin-top:auto 把消息推到最下方，
   内容超出时从底部往上堆 —— 与设计稿 justify-end + py 留白一致。

   贴底策略与 UiTerminalOutput 的 follow 同语言：默认跟随，
   用户主动上滑就暂停；滚回底部附近自动恢复跟随。

   边缘模糊内建：滚动容器的边缘处理是约定（ZeroScroll 同款），
   不该由每个使用方手搭 UiProgressiveBlur —— 手搭会带来两层
   重复模糊（外层 ZeroApp 一层 + 自己一层），高度也对不上。
   ============================================================ */

const scrollEl = ref(null)
const innerEl = ref(null)
const following = ref(true)
let observer = null

const { canScrollUp, canScrollDown } = useScrollEdges(scrollEl)

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
  <div class="ui-chat-thread" :style="{ '--chat-gap': gap + 'px' }">
    <div
      ref="scrollEl"
      class="ui-chat-thread__scroll"
      :style="{ padding }"
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

    <template v-if="fade > 0">
      <UiProgressiveBlur
        placement="top"
        :height="fade"
        :max-blur="fadeBlur"
        :layers="fadeLayers"
        :tint="fadeTint"
        :tint-strength="fadeTintStrength"
        :visible="canScrollUp"
      />
      <UiProgressiveBlur
        placement="bottom"
        :height="fade"
        :max-blur="fadeBlur"
        :layers="fadeLayers"
        :tint="fadeTint"
        :tint-strength="fadeTintStrength"
        :visible="canScrollDown"
      />
    </template>
  </div>
</template>

<style scoped>
/* 外壳只是定位上下文：滚动发生在内层 .ui-chat-thread__scroll，
   模糊层与它同层级、盖在它上面（与 ZeroScroll 同结构）。 */
.ui-chat-thread {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.ui-chat-thread__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.ui-chat-thread__scroll::-webkit-scrollbar { display: none; }

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