<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  UiButton, UiChatMessage, UiChatSystemLine, UiChatThread,
  UiChip, UiCodeImage, UiMorphPanel, UiProgressiveBlur,
  UiRotatingText, UiStatusMark, UiTextarea
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
  { id: 'm6', role: 'system', variant: 'activity', icon: '<path d="M4 12l16-8-6 16-3-6z" fill="currentColor"/>', text: '私信了', trailing: 'Gourmet · Planner' }
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

function send() {
  const text = draft.value.trim()
  if (!text) return
  messages.value.push({ id: 'u' + Date.now(), role: 'user', content: text })
  draft.value = ''
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

const thinking = ref(false)
const thinkingLabel = computed(() => (streaming.value ? '正在生成…' : '空闲'))

const quickPrompts = ['把清单发我', '换成别的口味', '路线再近一点']

function usePrompt(text) { draft.value = text }
</script>

<template>
  <section class="view chat-view" data-view="chat">
    <!-- 消息流：自己就是滚动容器，新消息自动贴底 -->
    <UiChatThread ref="threadRef" class="chat-view__thread" :gap="16" padding="0 0 12px" :auto-scroll="true">
      <template v-for="m in messages" :key="m.id">
        <UiChatSystemLine
          v-if="m.role === 'system'"
          :icon="m.icon"
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

    <!-- 顶 / 底渐进模糊：盖在滚动内容上，越靠边越糊 -->
    <UiProgressiveBlur placement="top" :height="72" :max-blur="7" :layers="5" />
    <UiProgressiveBlur placement="bottom" :height="96" :max-blur="8" :layers="5" />

    <!-- 输入区：按钮 ⇄ 文本域的形变容器 -->
    <div class="chat-view__composer">
      <div class="chat-view__quick">
        <UiChip
          v-for="p in quickPrompts"
          :key="p"
          variant="tonal"
          @click="usePrompt(p)"
        >{{ p }}</UiChip>
      </div>

      <div class="chat-view__row">
        <UiMorphPanel class="chat-view__morph">
          <template #trigger>
            <UiButton variant="tonal" block>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>
              </svg>
              写点什么
            </UiButton>
          </template>
          <template #default="{ close }">
            <UiTextarea
              v-model="draft"
              :rows="3"
              placeholder="给 Zero 发消息…（⌘Enter 发送）"
              autofocus
              @keydown.meta.enter.prevent="send(); close()"
              @keydown.ctrl.enter.prevent="send(); close()"
            />
            <div class="chat-view__send">
              <UiButton variant="text" size="sm" @click="close()">收起</UiButton>
              <UiButton variant="primary" size="sm" :disabled="!draft.trim()" @click="send(); close()">发送</UiButton>
            </div>
          </template>
        </UiMorphPanel>

        <UiButton variant="tonal" size="sm" :loading="thinking" @click="playStream">流式回复</UiButton>
      </div>

      <p class="chat-view__hint">{{ thinkingLabel }} · 长按 ⌘K 可打开命令面板</p>
    </div>
  </section>
</template>

<style scoped>
/* 固定为一屏：头部 + 消息流 + 输入条，消息流自己滚 */
.chat-view {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100dvh - 168px);
  min-height: 420px;
  max-height: 720px;
  overflow: hidden;
  border-radius: calc(var(--r-20) * var(--radius-scale));
  background: var(--surface-container-low);
}

.chat-view__thread {
  flex: 1;
  min-height: 0;
  /* 上下留白：给顶 / 底模糊与输入条让位 */
  padding: 56px 14px 104px;
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
}

.chat-view__quick { display: flex; gap: 6px; flex-wrap: wrap; }
.chat-view__row { display: flex; align-items: flex-start; gap: 8px; }
.chat-view__morph { flex: 1; min-width: 0; }

.chat-view__send {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.chat-view__hint {
  margin: 0;
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  opacity: .8;
}
</style>