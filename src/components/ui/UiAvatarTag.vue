<script setup>
import { computed } from 'vue'

/* ============================================================
   AvatarTag（参考 Figma NameTag 5:52）
   ------------------------------------------------------------
   · 一枚小药丸 + 左侧探出的头像；头像可以是任意形状遮罩的图片，
     也可以直接是一枚 SVG 图标 —— 图标模式不做任何遮罩 / 裁切，
     保留 SVG 原本形状。
   · shape 只作用于图片：circle / squircle / square / hexagon /
     diamond / blob；图标模式会忽略 shape（无遮罩）。
   ============================================================ */

const props = defineProps({
  name: { type: String, default: '' },
  /* 图片地址：按 shape 裁切成不同形状 */
  src: { type: String, default: '' },
  /* 24x24（或自定义 viewBox）内的 SVG 内部标记；无遮罩直接显示 */
  icon: { type: String, default: '' },
  iconViewBox: { type: String, default: '0 0 24 24' },
  /* circle | squircle | square | hexagon | diamond | blob */
  shape: { type: String, default: 'circle' },
  /* sm | md | lg */
  size: { type: String, default: 'sm' }
})

const initial = computed(() => (props.name || '?').trim().slice(0, 1).toUpperCase())
</script>

<template>
  <span class="ui-avatar-tag" :class="['ui-avatar-tag--' + size]">
    <span
      class="ui-avatar-tag__avatar"
      :class="['is-' + shape, { 'is-icon': !!icon, 'is-image': !!src }]"
    >
      <slot name="avatar">
        <svg
          v-if="icon"
          class="ui-avatar-tag__glyph"
          :viewBox="iconViewBox"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          v-html="icon"
        ></svg>
        <img v-else-if="src" :src="src" alt="" draggable="false" />
        <span v-else class="ui-avatar-tag__initial">{{ initial }}</span>
      </slot>
    </span>
    <span class="ui-avatar-tag__label"><slot>{{ name }}</slot></span>
  </span>
</template>

<style scoped>
.ui-avatar-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 8px 0 19px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--on-surface) 10%, transparent);
  color: var(--on-surface);
  font-weight: var(--w-strong);
  white-space: nowrap;
}
.ui-avatar-tag--sm { height: 18px; padding: 0 8px 0 19px; font-size: var(--fs-micro); letter-spacing: .04em; }
.ui-avatar-tag--md { height: 24px; padding: 0 9px 0 26px; font-size: var(--fs-tiny); }
.ui-avatar-tag--lg { height: 30px; padding: 0 11px 0 33px; font-size: var(--fs-small); }

.ui-avatar-tag__avatar {
  position: absolute;
  left: -1px;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
  overflow: hidden;
  background: var(--surface-container-highest);
  border: 1px solid color-mix(in oklab, var(--surface) 70%, transparent);
  box-shadow: 0 1px 2px color-mix(in oklab, var(--on-surface) 18%, transparent);
}
.ui-avatar-tag--md .ui-avatar-tag__avatar { width: 24px; height: 24px; }
.ui-avatar-tag--lg .ui-avatar-tag__avatar { width: 30px; height: 30px; }

.ui-avatar-tag__avatar img,
.ui-avatar-tag__glyph,
.ui-avatar-tag__initial { display: block; width: 100%; height: 100%; object-fit: cover; }
.ui-avatar-tag__glyph { overflow: visible; }
.ui-avatar-tag__initial {
  display: grid;
  place-items: center;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font-size: 10px;
  font-weight: var(--w-strong);
}

/* 图片：不同遮罩形状 */
.ui-avatar-tag__avatar.is-circle { border-radius: 50%; }
.ui-avatar-tag__avatar.is-squircle { border-radius: 36%; }
.ui-avatar-tag__avatar.is-square { border-radius: 18%; }
.ui-avatar-tag__avatar.is-hexagon {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
}
.ui-avatar-tag__avatar.is-diamond {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.ui-avatar-tag__avatar.is-blob {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 2%, 72% 7%, 88% 22%, 98% 45%, 92% 70%, 74% 88%, 50% 98%, 26% 88%, 8% 70%, 2% 45%, 12% 22%, 28% 7%);
}

/* 图标：无遮罩 —— 背景、描边、裁切全部去掉，保留 SVG 自身形状 */
.ui-avatar-tag__avatar.is-icon {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  overflow: visible;
  border-radius: 0;
  clip-path: none;
}
.ui-avatar-tag__avatar.is-icon .ui-avatar-tag__glyph { overflow: visible; }
</style>
