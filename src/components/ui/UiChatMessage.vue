<script setup>
import { computed } from 'vue'
import UiAgentAvatar from './UiAgentAvatar.vue'
import UiAvatar from './UiAvatar.vue'
import MarkdownView from './MarkdownView.vue'

const props = defineProps({
  /* assistant = 纯文本（无气泡，左对齐）
     user      = 黑底白字气泡（右对齐，右上角收窄）
     agent     = 品牌色气泡 + 左侧头像（左对齐，左上角收窄） */
  role: {
    type: String,
    default: 'assistant',
    validator: v => ['assistant', 'user', 'agent'].includes(v)
  },
  /* 正文：Markdown 字符串。@用户名 走 MarkdownView 的 mentions 机制
     （渲染成 UiAvatarTag），不在本组件里另做一套 mention。 */
  content: { type: String, default: '' },
  /* 透传给 MarkdownView：是否解析 @提及 / 用户名解析器 */
  mentions: { type: Boolean, default: true },
  mentionResolver: { type: Function, default: null },
  /* 流式增量进场：content 增长时新词逐个蹦出（透传给 MarkdownView） */
  streaming: { type: Boolean, default: false },
  streamEffect: { type: String, default: 'rise', validator: v => ['rise', 'blur', 'fade'].includes(v) },
  /* agent 气泡品牌色；默认跟随主题主色 */
  color: { type: String, default: '' },
  /* agent 名字（气泡上方一行小字，可省） */
  name: { type: String, default: '' },
  /* 头像与昵称的显示开关：列表里可以只保留气泡，或只去掉头像 */
  showAvatar: { type: Boolean, default: true },
  showName: { type: Boolean, default: true },
  /* agent 头像配置：直接透传给标准头像组件 */
  avatarShape: { type: String, default: 'circle' },
  avatarState: { type: String, default: 'idle' },
  avatarSrc: { type: String, default: '' },
  avatarSize: { type: Number, default: 36 },
  /* 气泡显隐：null = 由 role 决定（assistant 无气泡，其余有） */
  bubble: { type: Boolean, default: null },
  /* md = 库正文（--fs-body）；lg = 1rem（设计稿 16px 原尺寸） */
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) },
  /* 气泡最大宽（CSS 长度）；不传按 role 取默认 */
  maxWidth: { type: String, default: '' },
  /* 时间戳（可选，气泡外侧小字） */
  time: { type: String, default: '' }
})

/* ============================================================
   对话消息
   ------------------------------------------------------------
   三种角色共用一套骨架：外层行对齐 + 可选头像 + 气泡。
   圆角语言是「指向说话人」：用户气泡右上收窄（24/8/24/24），
   agent 气泡左上收窄（8/24/24/24）—— 收窄角把气泡「指向」头像或
   发送者，是设计稿里唯一的形状语义。
   assistant 默认不套气泡：AI 的叙述不该被框住，只有「人说的话」
   和「智能体作为第三方发言」才有容器。

   正文一律走 MarkdownView：@提及 由它的 mentions 机制渲染成
   UiAvatarTag（头像弹出 + 标签展开的入场动画也在那里），消息组件
   不再自己实现 mention。
   头像直接放标准头像组件，不加圆形底、不做圆角裁切（设计稿里
   agent 头像就是裸的）。
   ============================================================ */

const hasBubble = computed(() => (props.bubble === null ? props.role !== 'assistant' : props.bubble))
const tint = computed(() => props.color || 'var(--primary)')

/* ---------- 气泡前景自适应（对比度达标） ----------
   agent 气泡的底色就是 color prop（品牌色），前景原先写死 --on-primary
   （白）。品牌色是浅色（黄 / 青 / 浅紫）时白字对比度不达标。
   品牌色在这里多半是 hex（ChatView 传 #ff9838 这类），解析后按 WCAG
   亮度选黑 / 白里对比度更高的一端；解析不了（var() 形式）保持白。 */
function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function lum({ r, g, b }) {
  const lin = v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const bubbleInk = computed(() => {
  if (props.role !== 'agent') return ''
  const rgb = parseHex(props.color)
  if (!rgb) return ''
  const onBlack = (lum(rgb) + 0.05) / 0.05
  const onWhite = 1.05 / (lum(rgb) + 0.05)
  return onBlack >= onWhite ? '#111111' : '#ffffff'
})

const rootStyle = computed(() => {
  const style = {
    '--chat-tint': tint.value,
    '--chat-avatar-size': props.avatarSize + 'px',
    '--chat-font-size': props.size === 'lg'
      ? '1rem'
      : props.size === 'sm' ? 'var(--fs-small)' : 'var(--fs-body)'
  }
  if (bubbleInk.value) style['--chat-bubble-ink'] = bubbleInk.value
  const cap = props.maxWidth || (props.role === 'agent' ? '290px' : props.role === 'user' ? '340px' : '100%')
  style['--chat-max-w'] = cap
  return style
})

/* Markdown 里的 tag 尺寸跟着消息字号走 */
const tagSize = computed(() => (props.size === 'lg' ? 'md' : 'sm'))
</script>

<template>
  <div class="ui-chat-msg" :class="['is-' + role, { 'has-bubble': hasBubble }]" :style="rootStyle">
    <!-- agent：头像固定在左侧，气泡左上收窄指向它。
         头像就是标准头像本体，没有底、没有裁切。 -->
    <span v-if="role === 'agent' && showAvatar" class="ui-chat-msg__avatar">
      <slot name="avatar">
        <UiAgentAvatar
          v-if="!avatarSrc"
          :shape="avatarShape"
          :color="tint"
          :size="avatarSize"
          :state="avatarState"
          gaze="none"
          :animated="false"
        />
        <UiAvatar v-else :src="avatarSrc" :name="name" />
      </slot>
    </span>

    <div class="ui-chat-msg__stack">
      <span v-if="name && showName" class="ui-chat-msg__name">{{ name }}</span>

      <div class="ui-chat-msg__bubble">
        <MarkdownView
          v-if="content"
          class="ui-chat-msg__md"
          :content="content"
          :mentions="mentions"
          :mention-resolver="mentionResolver"
          :tag-size="tagSize"
          :streaming="streaming"
          :stream-effect="streamEffect"
        />
        <slot v-else />
      </div>

      <div v-if="time || $slots.footer" class="ui-chat-msg__footer">
        <slot name="footer">
          <span class="ui-chat-msg__time">{{ time }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-chat-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  font-size: var(--chat-font-size);
  line-height: 1.55;
  color: var(--on-surface);
}
.ui-chat-msg.is-user { justify-content: flex-end; }
.ui-chat-msg.is-assistant,
.ui-chat-msg.is-agent { justify-content: flex-start; }

/* 头像列：只负责占位与对齐。不加底色、不加圆角、不裁剪 ——
   头像组件自己就是最终形状（设计稿里 agent 头像不带底）。 */
.ui-chat-msg__avatar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  width: var(--chat-avatar-size);
  height: var(--chat-avatar-size);
}

.ui-chat-msg__stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: var(--chat-max-w);
}
.ui-chat-msg.is-user .ui-chat-msg__stack { align-items: flex-end; }

.ui-chat-msg__name {
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
  letter-spacing: .02em;
}

/* 正文容器：assistant 无气泡时就是纯文本块 */
.ui-chat-msg__bubble {
  min-width: 0;
  overflow-wrap: anywhere;
}
.ui-chat-msg.is-assistant .ui-chat-msg__bubble {
  max-width: var(--chat-max-w);
}
.ui-chat-msg.has-bubble .ui-chat-msg__bubble {
  padding: 12px 20px;
  border-radius: calc(var(--r-24) * var(--radius-scale));
}
/* 用户：右上收窄 → 指向发送者。
   ⚠️ fallback 不能引用 var(--on-surface)：下面一行会在**同一元素**上
   把 --on-surface 重定义为浅色，自定义属性的 fallback 是在同一元素上
   解析的，循环引用后 background 变成浅色 → 白底白字（气泡隐形）。
   直接写具体令牌。 */
.ui-chat-msg.is-user.has-bubble .ui-chat-msg__bubble {
  border-top-right-radius: calc(var(--r-8) * var(--radius-scale));
  background: var(--chat-user-surface, #1b1b1f);
  color: var(--chat-user-on, #faf9fd);
  /* 在气泡里重定义色板变量：MarkdownView 的 .ui-md 写的是
     color: var(--on-surface)，变量在气泡内被改成前景色后，
     标题 / 引用 / 行内代码 / 内联 AvatarTag 全部自动跟随。 */
  --on-surface: var(--chat-user-on, #faf9fd);
  --on-surface-variant: color-mix(in oklab, var(--chat-user-on, #faf9fd) 74%, transparent);
}
/* agent：左上收窄 → 指向左侧头像。
   前景色由 JS 按 WCAG 对比度选黑 / 白（--chat-bubble-ink），
   浅色品牌色自动配黑字，深色配白字；未解析（var() 形式）保持白。 */
.ui-chat-msg.is-agent.has-bubble .ui-chat-msg__bubble {
  border-top-left-radius: calc(var(--r-8) * var(--radius-scale));
  background: var(--chat-tint);
  color: var(--chat-bubble-ink, var(--on-primary));
  --on-surface: var(--chat-bubble-ink, var(--on-primary));
  --on-surface-variant: color-mix(in oklab, var(--chat-bubble-ink, var(--on-primary)) 74%, transparent);
}

/* ---------- 气泡内的 Markdown ----------
   MarkdownView 自带 --on-surface 文字色与段落外边距，在气泡里要改成
   继承气泡前景色（黑底白字 / 品牌色底白字），并把首尾段落的外边距收掉，
   否则气泡会多出一圈莫名其妙的上下留白。 */
.ui-chat-msg__md :deep(.ui-md) {
  color: inherit;
  font-size: inherit;
  line-height: inherit;
}
.ui-chat-msg__md :deep(.ui-md > :first-child) { margin-top: 0; }
.ui-chat-msg__md :deep(.ui-md > :last-child) { margin-bottom: 0; }
.ui-chat-msg__md :deep(.ui-md-p) { margin: .35em 0; }
.ui-chat-msg__md :deep(.ui-md-quote) {
  color: inherit;
  background: color-mix(in oklab, currentColor 12%, transparent);
  border-left-color: currentColor;
}
.ui-chat-msg__md :deep(.ui-md-code) {
  background: color-mix(in oklab, currentColor 14%, transparent);
  color: inherit;
}
.ui-chat-msg__md :deep(.ui-md-a) { color: inherit; text-decoration: underline; }

.ui-chat-msg__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
}
.ui-chat-msg__time {
  font-family: var(--font-numeric);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  opacity: .7;
}
</style>