<script setup>
import { computed } from 'vue'
import UiAgentAvatar from './UiAgentAvatar.vue'
import UiAvatar from './UiAvatar.vue'

const props = defineProps({
  /* assistant = 纯文本（无气泡，左对齐）
     user      = 黑底白字气泡（右对齐，右上角收窄）
     agent     = 品牌色气泡 + 左侧头像（左对齐，左上角收窄） */
  role: {
    type: String,
    default: 'assistant',
    validator: v => ['assistant', 'user', 'agent'].includes(v)
  },
  /* agent 气泡品牌色；默认跟随主题主色 */
  color: { type: String, default: '' },
  /* agent 名字（气泡上方一行小字，可省） */
  name: { type: String, default: '' },
  /* agent 头像配置：与 UiAgentAvatar 同语义 */
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
   三种角色共用一套骨架：外层行（对齐方式）+ 可选头像 + 气泡。
   圆角语言是「指向说话人」：用户气泡右上收窄（24/8/24/24），
   agent 气泡左上收窄（8/24/24/24）——收窄角把气泡「指向」头像或
   发送者，是设计稿里唯一的形状语义。
   assistant 默认不套气泡：AI 的叙述不该被框住，只有「人说的话」
   和「智能体作为第三方发言」才有容器。
   ============================================================ */

const hasBubble = computed(() => (props.bubble === null ? props.role !== 'assistant' : props.bubble))
const tint = computed(() => props.color || 'var(--primary)')

const rootStyle = computed(() => {
  const style = {
    '--chat-tint': tint.value,
    '--chat-avatar-size': props.avatarSize + 'px',
    '--chat-font-size': props.size === 'lg'
      ? '1rem'
      : props.size === 'sm' ? 'var(--fs-small)' : 'var(--fs-body)'
  }
  const cap = props.maxWidth || (props.role === 'agent' ? '290px' : props.role === 'user' ? '340px' : '100%')
  style['--chat-max-w'] = cap
  return style
})
</script>

<template>
  <div class="ui-chat-msg" :class="['is-' + role, { 'has-bubble': hasBubble }]" :style="rootStyle">
    <!-- agent：头像固定在左侧，气泡左上收窄指向它 -->
    <span v-if="role === 'agent'" class="ui-chat-msg__avatar">
      <slot name="avatar">
        <svg
          v-if="$slots.avatarIcon"
          class="ui-chat-msg__glyph"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        ><slot name="avatarIcon" /></svg>
        <UiAgentAvatar
          v-else-if="!avatarSrc"
          class="ui-chat-msg__agent"
          :shape="avatarShape"
          :color="tint"
          :size="avatarSize"
          :state="avatarState"
          gaze="none"
          :animated="false"
        />
        <UiAvatar v-else class="ui-chat-msg__std" :src="avatarSrc" :name="name" />
      </slot>
    </span>

    <div class="ui-chat-msg__stack">
      <span v-if="name" class="ui-chat-msg__name">{{ name }}</span>

      <div class="ui-chat-msg__bubble">
        <slot />
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

/* 头像列：固定宽度，不参与气泡收缩 */
.ui-chat-msg__avatar {
  position: relative;
  flex-shrink: 0;
  width: var(--chat-avatar-size);
  height: var(--chat-avatar-size);
  border-radius: calc(var(--r-16) * var(--radius-scale));
  background: color-mix(in oklab, var(--chat-tint) 10%, transparent);
  overflow: hidden;
}
.ui-chat-msg__agent { position: absolute; inset: 0; }
.ui-chat-msg__glyph { display: block; width: 100%; height: 100%; }
.ui-chat-msg__std { width: 100%; height: 100%; }

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
/* 用户：右上收窄 → 指向发送者 */
.ui-chat-msg.is-user.has-bubble .ui-chat-msg__bubble {
  border-top-right-radius: calc(var(--r-8) * var(--radius-scale));
  background: var(--chat-user-surface, var(--on-surface));
  color: var(--chat-user-on, var(--surface));
}
/* agent：左上收窄 → 指向左侧头像 */
.ui-chat-msg.is-agent.has-bubble .ui-chat-msg__bubble {
  border-top-left-radius: calc(var(--r-8) * var(--radius-scale));
  background: var(--chat-tint);
  color: var(--on-primary);
}

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