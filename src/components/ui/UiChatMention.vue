<script setup>
import { computed } from 'vue'
import UiAgentAvatar from './UiAgentAvatar.vue'
import UiAvatar from './UiAvatar.vue'

const props = defineProps({
  /* 显示文字（智能体名） */
  name: { type: String, required: true },
  /* 品牌色：药丸底色 = 它调淡；文字 = 它压暗；默认跟随主题主色 */
  color: { type: String, default: '' },
  /* 头像：agent 形状 / 图片 / SVG 图标三选一（与 UiAvatarTag 同语义） */
  shape: { type: String, default: 'circle' },
  state: { type: String, default: 'idle' },
  src: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconViewBox: { type: String, default: '0 0 24 24' },
  /* 头像盒尺寸（px）：设计稿消息内联为 18，小号 13.5 → 14 */
  size: { type: Number, default: 18 }
})

/* ============================================================
   对话内联智能体药丸（NameTag）
   ------------------------------------------------------------
   设计稿（Figma 37:4075 等）与 UiAvatarTag 的区别只有一处：
   **文字是「下层重影 + 上层实心」两层叠出来**——上层取品牌色压暗版，
   下层是同字形的黑色 20%、下移 4px，像一层薄影，不做模糊。
   药丸底色 = 品牌色 40% 混 surface（等价于设计稿「品牌色 + 白 60%」叠加），
   头像盒左缘探出药丸 1px，与 UiAvatarTag 的骨架一致。
   ============================================================ */

const tint = computed(() => props.color || 'var(--primary)')

const rootStyle = computed(() => ({
  '--mention-tint': tint.value,
  '--mention-h': props.size + 'px'
}))

/* 压暗版品牌色：设计稿三个色的实测目标（#7438ff→#452299、
   #ff9838→#995b22、#00d4d1→#007f7d）都落在「混黑 32%」附近。 */
const textColor = computed(() => `color-mix(in oklab, ${tint.value} 68%, #000)`)
</script>

<template>
  <span class="ui-chat-mention" :style="rootStyle" :title="name">
    <span class="ui-chat-mention__avatar" :class="{ 'is-icon': !!icon, 'is-image': !!src }">
      <slot name="avatar">
        <svg
          v-if="icon"
          class="ui-chat-mention__glyph"
          :viewBox="iconViewBox"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          v-html="icon"
        ></svg>
        <UiAgentAvatar
          v-else-if="!src"
          class="ui-chat-mention__agent"
          :shape="shape"
          :color="tint"
          :size="size"
          :state="state"
          gaze="none"
          :animated="false"
        />
        <UiAvatar v-else class="ui-chat-mention__std" :src="src" :name="name" />
      </slot>
    </span>

    <!-- 双层文字：下层是重影（aria-hidden，不参与读屏与选中） -->
    <span class="ui-chat-mention__label" :style="{ color: textColor }">
      <span class="ui-chat-mention__echo" aria-hidden="true">{{ name }}</span>
      <span class="ui-chat-mention__text">{{ name }}</span>
    </span>
  </span>
</template>

<style scoped>
/* 药丸本体比头像矮 2px：头像上下各探出 1px（与 UiAvatarTag 同骨相）。
   同一视觉中轴用 inline-flex + middle，不靠负 margin 硬拉。 */
.ui-chat-mention {
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin: 0 2px;
  height: calc(var(--mention-h) - 2px);
  padding-right: 6px;
  border-radius: calc(var(--r-8) * var(--radius-scale));
  /* 设计稿等价的药丸底色：品牌色 + 白 60% 叠加 */
  background: color-mix(in oklab, var(--mention-tint) 40%, var(--surface));
  white-space: nowrap;
}

/* 头像：左缘探出药丸 1px，与 UiAvatarTag 同骨相 */
.ui-chat-mention__avatar {
  position: absolute;
  left: -1px;
  top: 50%;
  width: var(--mention-h);
  height: var(--mention-h);
  transform: translateY(-50%);
  overflow: hidden;
  border-radius: 50%;
  flex-shrink: 0;
}
.ui-chat-mention__avatar.is-icon { overflow: visible; border-radius: 0; }
.ui-chat-mention__avatar.is-image { border-radius: 50%; }
.ui-chat-mention__agent { position: absolute; inset: 0; }
.ui-chat-mention__glyph { display: block; width: 100%; height: 100%; overflow: visible; }
.ui-chat-mention__avatar :deep(.ui-avatar) {
  width: 100%;
  height: 100%;
  background: transparent;
  font-size: 9px;
}

/* 文字：占位宽度只由上层实心字决定，下层重影绝对定位不撑宽 */
.ui-chat-mention__label {
  position: relative;
  display: inline-block;
  padding-left: calc(var(--mention-h) - 1px);
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  line-height: 1;
  letter-spacing: .01em;
}
.ui-chat-mention__echo {
  position: absolute;
  left: calc(var(--mention-h) - 1px);
  top: 4px;
  color: rgba(0, 0, 0, .2);
  z-index: 0;
  pointer-events: none;
}
.ui-chat-mention__text {
  position: relative;
  z-index: 1;
}
</style>