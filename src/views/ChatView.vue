<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  UiButton, UiChatComposer, UiChatMessage, UiChatSystemLine, UiChatThread,
  UiChip, UiCodeImage, UiRotatingText, UiStatusMark
} from '../lib'

/* ============================================================
   对话页 —— 把 Chat 组件族放进真实场景
   ------------------------------------------------------------
   · 消息正文一律 Markdown（UiChatMessage 内部转 MarkdownView），
     @提及 由 mentionResolver 解析成 UiAvatarTag（头像弹出 + 标签展开）
   · 顶 / 底各叠一层渐进式模糊：聊天页头部与输入条盖在滚动内容上，
     越靠边越糊 —— 这是设计稿的处理方式，不需要外层页面滚动
   · 流式回复用 streaming + 定时追加，演示增量进场（新词逐个蹦出）
   ============================================================ */

const AGENTS = {
  Guide: { type: 'agent', shape: 'triangle', color: '#7438ff' },
  Gourmet: { type: 'agent', shape: 'circle', color: '#ff9838' },
  Planner: { type: 'agent', shape: 'squircle', color: '#00d4d1' }
}

function resolveMention(username) {
  const hit = AGENTS[username]
  return { username, showname: username, ...(hit || {}) }
}

/* 消息流：role + 正文（Markdown）+ agent 气泡的品牌色 */
const messages = ref([
  {
    id: 'm1',
    role: 'assistant',
    content: '欢迎回来！昨天我们把暑假计划的「出行方式」和「住宿偏好」定下来了。你提过想深度体验当地美食，我让 @Gourmet 整理了一份清单，要看看吗？'
  },
  { id: 'm2', role: 'user', content: '行，你看着办' },
  { id: 'm3', role: 'system', variant: 'activity', icon: '<rect x="7" y="8" width="10" height="8" rx="4" fill="currentColor"/>', text: '提取了 暑假计划' },
  {
    id: 'm4',
    role: 'agent',
    name: 'Gourmet',
    color: '#ff9838',
    shape: 'circle',
    content: '我按评分和人均排了一版，前两家步行 10 分钟内到地铁：\n\n- **巷子口小馆** · 4.8 · 人均 68\n- **老城面馆** · 4.7 · 人均 42\n\n要不要我直接问问 @Planner 排进行程？'
  },
  { id: 'm5', role: 'user', content: '好，顺便把路线也排一下' },
  { id: 'm6', role: 'system', variant: 'activity', icon: '<path d="M4 12l16-8-6 16-3-6z" fill="currentColor"/>', text: '私信了 @Gourmet 和 @Planner' }
])

/* ---------- 流式回复演示 ---------- */
const STREAM_FULL = '路线我排好了：上午先去**巷子口小馆**，吃完步行到地铁 2 号线，两站到老城，下午在 @Guide 推荐的博物馆转一圈。整段行程控制在 6 小时内，晚饭前能回酒店。'
const streaming = ref(false)
const streamText = ref('')
let streamTimer = null

function stopStream() {
  if (streamTimer) { clearInterval(streamTimer); streamTimer = null }
  streaming.value = false
}

function playStream() {
  stopStream()
  streamText.value = ''
  streaming.value = true
  let i = 0
  streamTimer = setInterval(() => {
    /* 每次喂 2~4 个字，模拟 token 逐个到达 */
    i += 2 + Math.floor(Math.random() * 3)
    streamText.value = STREAM_FULL.slice(0, i)
    if (i >= STREAM_FULL.length) {
      streamText.value = STREAM_FULL
      stopStream()
    }
  }, 42)
}

onBeforeUnmount(stopStream)

/* ---------- 输入区 ---------- */
const draft = ref('')
const threadRef = ref(null)

function send({ text, attachments }) {
  const body = (text || '').trim()
  if (!body && !(attachments && attachments.length)) return
  /* 附件转成 Markdown 链接形式进消息正文（真实产品会随消息上传） */
  const extra = (attachments || [])
    .map(a => (a.kind === 'image' ? `![${a.name}](` : `[${a.name}](`) + (a.url || '') + ')')
    .join('\n')
  messages.value.push({ id: 'u' + Date.now(), role: 'user', content: (body + (extra ? '\n\n' + extra : '')).trim() })
  draft.value = ''
  composerAttachments.value = []
  nextTick(() => threadRef.value?.scrollToBottom?.('smooth'))
  /* 回一句占位（真实产品这里是请求） */
  setTimeout(() => {
    messages.value.push({
      id: 'a' + Date.now(),
      role: 'assistant',
      content: '收到，我记下了。需要我把它加进**今天的待办**吗？'
    })
  }, 420)
}
const composerAttachments = ref([])

const thinking = ref(false)
const thinkingLabel = computed(() => (streaming.value ? '正在生成…' : '空闲'))

const quickPrompts = ['把清单发我', '换成别的口味', '路线再近一点']

function usePrompt(text) { draft.value = text }
</script>

<template>
  <section class="view chat-view" data-view="chat">
    <!-- 消息流：自己就是滚动容器，新消息自动贴底 -->
    <UiChatThread
      ref="threadRef"
      class="chat-view__thread"
      :gap="16"
      padding="10px 14px 12px"
      :auto-scroll="true"
      :fade="64"
      :fade-blur="6"
      :fade-layers="12"
    >
      <template v-for="m in messages" :key="m.id">
        <UiChatSystemLine
          v-if="m.role === 'system'"
          :icon="m.icon"
          :agents="AGENTS"
          :align="m.variant === 'status' ? 'center' : 'start'"
          :size="m.variant === 'status' ? 'sm' : 'md'"
        >
          {{ m.text }}
          <template v-if="m.trailing" #trailing>{{ m.trailing }}</template>
        </UiChatSystemLine>

        <UiChatMessage
          v-else
          :role="m.role"
          :content="m.content"
          :mention-resolver="resolveMention"
          :name="m.name"
          :color="m.color"
          :avatar-shape="m.shape || 'circle'"
          :max-width="m.role === 'user' ? '78%' : '86%'"
        />
      </template>

      <!-- 流式回复：content 持续增长时只有新增片段播入场 -->
      <UiChatMessage
        v-if="streaming || streamText"
        role="assistant"
        :content="streamText"
        :streaming="true"
        stream-effect="rise"
        :mention-resolver="resolveMention"
        max-width="86%"
      />

      <!-- 思考中：状态标记 + 循环短语 -->
      <div v-if="streaming" class="chat-view__thinking">
        <UiStatusMark status="progress" :progress="null" :size="16" />
        <UiRotatingText
          :phrases="['正在检索附近的餐馆…', '正在核对营业时间…', '正在排路线…']"
          transition="slide"
        />
      </div>
    </UiChatThread>

    <!-- 输入区：UiChatComposer —— 输入框 + 附件（图/视频/文件，长文本粘贴转附件）
         + 左下/右下插槽。附件入口面板由加号展开。 -->
    <div class="chat-view__composer">
      <div class="chat-view__quick">
        <UiChip
          v-for="p in quickPrompts"
          :key="p"
          variant="tonal"
          @select="usePrompt(p)"
        >{{ p }}</UiChip>
      </div>

      <UiChatComposer
        v-model="draft"
        v-model:attachments="composerAttachments"
        placeholder="给 Zero 发消息…（⌘Enter 发送）"
        @send="send"
      >
        <!-- 左下：演示功能开关（真实产品接深度思考 / 联网搜索） -->
        <template #left-start>
          <button type="button" class="chat-view__toggle">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18M3 12h18"/>
            </svg>
            联网
          </button>
        </template>
        <!-- 右下：流式回复演示按钮 -->
        <template #right-start>
          <UiButton variant="text" size="sm" :loading="thinking" @click="playStream">流式回复</UiButton>
        </template>
      </UiChatComposer>

      <p class="chat-view__hint">{{ thinkingLabel }} · ⌘K 打开命令面板</p>
    </div>
  </section>
</template>

<style scoped>
/* 一屏布局：消息流占满剩余高度并自己滚，输入区是流内固定块 ——
   不用 absolute 叠（absolute 会让底部模糊带与 chip 行重叠）。 */
.chat-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100dvh - 190px);
  min-height: 440px;
  max-height: 780px;
}

.chat-view__thread {
  flex: 1;
  min-height: 0;
  background: var(--surface-container-low);
  border-radius: calc(var(--r-20) * var(--radius-scale));
}

.chat-view__thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
}

.chat-view__composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 6px;
}

.chat-view__quick { display: flex; gap: 6px; flex-wrap: wrap; }
.chat-view__row { display: flex; align-items: flex-start; gap: 8px; }

.chat-view__toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-tiny);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.chat-view__toggle:active { transform: scale(var(--press-scale)); }
@media (hover: hover) {
  .chat-view__toggle:hover { background: var(--surface-container-high); color: var(--on-surface); }
}

.chat-view__hint {
  margin: 0;
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  opacity: .8;
}
</style>