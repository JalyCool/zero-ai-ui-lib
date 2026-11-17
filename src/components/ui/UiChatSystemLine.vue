<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* 前缀图标：24x24 viewBox 内的 SVG 内部标记（可省） */
  icon: { type: String, default: '' },
  /* start = 左对齐（活动行：提取了 / 私信了）；center = 居中（状态行：关闭了对话 / 已授权） */
  align: { type: String, default: 'start', validator: v => ['start', 'center'].includes(v) },
  /* md = 16px（活动行）；sm = 12px（状态行 / 已授权小字） */
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  /* 整行不透明度：设计稿活动行与状态行都是 0.4 */
  opacity: { type: Number, default: 0.4 }
})

/* ============================================================
   对话系统行（非消息，但属于对话流）
   ------------------------------------------------------------
   设计稿里两类都是它：活动行（图标 + "提取了 xx"，左对齐、随消息流）
   与状态行（"关闭了对话" / "已授权 xx 访问 xx"，居中、字号更小）。
   整行压在 0.4 透明度——它永远不该抢消息的注意力。
   ============================================================ */

const rootStyle = computed(() => ({ opacity: String(props.opacity) }))
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
    <span class="ui-chat-system__text"><slot /></span>
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
}
.ui-chat-system__trailing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>