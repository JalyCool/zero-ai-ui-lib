<script setup>
import { computed, useSlots } from 'vue'
import UiAgentAvatar from './UiAgentAvatar.vue'

const props = defineProps({
  /* 前缀图标：24x24 viewBox 内的 SVG 内部标记（可省） */
  icon: { type: String, default: '' },
  /* start = 左对齐（活动行：提取了 / 私信了）；center = 居中（状态行：关闭了对话 / 已授权） */
  align: { type: String, default: 'start', validator: v => ['start', 'center'].includes(v) },
  /* md = 16px（活动行）；sm = 12px（状态行 / 已授权小字） */
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  /* 整行不透明度：设计稿活动行与状态行都是 0.4 */
  opacity: { type: Number, default: 0.4 },
  /* ============================================================
     @提及：正文里的 @名字 渲染成 AgentAvatar 本体（不是 AvatarTag
     药丸 —— 系统行是 0.4 透明度的弱化行，药丸底色太重）。
     agents: { 名字 -> { shape, color } } 的映射；正文里写
     「私信了 @Gourmet 和 @Planner」即可，名字必须能在映射里查到，
     查不到的原样输出文本。
     ============================================================ */
  agents: { type: Object, default: () => ({}) },
  /* 头像尺寸（px）：跟随行字号，md=18 / sm=14 */
  avatarSize: { type: Number, default: 0 }
})

/* ============================================================
   对话系统行（非消息，但属于对话流）
   ------------------------------------------------------------
   设计稿里两类都是它：活动行（图标 + "提取了 xx"，左对齐、随消息流）
   与状态行（"关闭了对话" / "已授权 xx 访问 xx"，居中、字号更小）。
   整行压在 0.4 透明度——它永远不该抢消息的注意力。

   正文支持 @名字：命中 agents 映射时渲染为 AgentAvatar 本体
   （带眼睛的小头像，行内对齐），没命中就原样输出。
   ============================================================ */

const rootStyle = computed(() => ({ opacity: String(props.opacity) }))

const avatarSize = computed(() => props.avatarSize || (props.size === 'sm' ? 14 : 18))

/* ---------- 插槽文本 -> @提及片段 ----------
   系统行的正文走 default 插槽；要把 @名字 拆成 AgentAvatar，
   先把插槽内容收敛成纯文本（只认文本节点），再按 @切。
   没命中 agents 映射的 @名字 原样保留为文本。 */
const slots = useSlots()
const slotText = computed(() => {
  const fn = slots.default
  if (!fn) return ''
  const vnodes = fn()
  let text = ''
  const walk = list => {
    for (const n of list) {
      if (typeof n === 'string' || typeof n === 'number') text += String(n)
      else if (Array.isArray(n)) walk(n)
      else if (n && typeof n.children === 'string') text += n.children
      else if (n && Array.isArray(n.children)) walk(n.children)
    }
  }
  walk(vnodes)
  return text
})

const resolvedParts = computed(() => {
  const raw = slotText.value
  const out = []
  const re = /@([\w\u4e00-\u9fa5-]+)/g
  let last = 0
  let m
  while ((m = re.exec(raw)) !== null) {
    const name = m[1]
    if (props.agents[name]) {
      if (m.index > last) out.push({ t: 'text', v: raw.slice(last, m.index) })
      out.push({ t: 'agent', v: name })
      last = m.index + m[0].length
    }
  }
  if (last < raw.length) out.push({ t: 'text', v: raw.slice(last) })
  return out
})
const hasAgentParts = computed(() => resolvedParts.value.some(p => p.t === 'agent'))
</script>

<template>
  <div
    class="ui-chat-system"
    :class="['is-' + align, 'is-' + size]"
    :style="rootStyle"
  >
    <span v-if="icon" class="ui-chat-system__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="icon"></svg>
    </span>
    <span class="ui-chat-system__text">
      <template v-if="hasAgentParts">
        <template v-for="(p, i) in resolvedParts" :key="i">
          <UiAgentAvatar
            v-if="p.t === 'agent'"
            class="ui-chat-system__agent"
            :shape="agents[p.v].shape || 'circle'"
            :color="agents[p.v].color || ''"
            :size="avatarSize"
            state="idle"
            gaze="none"
            :animated="false"
          />
          <template v-else>{{ p.v }}</template>
        </template>
      </template>
      <slot v-else />
    </span>
    <span v-if="$slots.trailing" class="ui-chat-system__trailing"><slot name="trailing" /></span>
  </div>
</template>

<style scoped>
.ui-chat-system {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  color: inherit;
  font-size: var(--fs-body);
  line-height: 1.5;
}
.ui-chat-system.is-center { justify-content: center; }
.ui-chat-system.is-start { justify-content: flex-start; }

.ui-chat-system.is-sm { font-size: var(--fs-micro); gap: 6px; }

.ui-chat-system__icon {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.ui-chat-system.is-sm .ui-chat-system__icon { width: 12px; height: 12px; }
.ui-chat-system__icon svg { width: 100%; height: 100%; }

.ui-chat-system__text {
  min-width: 0;
  overflow-wrap: anywhere;
  /* 行内 agent 头像与文字的中轴对齐 */
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 3px;
}
.ui-chat-system__agent { flex-shrink: 0; }

.ui-chat-system__trailing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>