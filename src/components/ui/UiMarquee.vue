<script setup>
import { computed } from 'vue'
const props = defineProps({
  /* 滚动内容（文本或任意插槽） */
  text: { type: String, default: '' },
  /* 每秒移动像素 */
  speed: { type: Number, default: 60 },
  direction: { type: String, default: 'left' },
  gap: { type: Number, default: 48 },
  pauseOnHover: { type: Boolean, default: true }
})
/* 滚动字幕：复制一份内容无缝首尾相接，动画用 --marquee-dur 由速度算出来。 */
const style = computed(() => ({ '--gap': props.gap + 'px', '--dur': Math.max(6, 400 / Math.max(10, props.speed)) + 's', '--dir': props.direction === 'right' ? 'reverse' : 'normal' }))
</script>
<template>
  <div class="ui-marquee" :class="{ 'pause-on-hover': pauseOnHover }" :style="style">
    <div class="ui-marquee__track">
      <span class="ui-marquee__group"><slot>{{ text }}</slot></span>
      <span class="ui-marquee__group" aria-hidden="true"><slot>{{ text }}</slot></span>
    </div>
  </div>
</template>
<style scoped>
.ui-marquee { overflow: hidden; mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent); }
.ui-marquee__track { display: flex; width: max-content; animation: uiMarquee var(--dur, 8s) linear infinite var(--dir, normal); }
.ui-marquee__group { display: inline-flex; align-items: center; padding-right: var(--gap, 48px); white-space: nowrap; }
.ui-marquee.pause-on-hover:hover .ui-marquee__track { animation-play-state: paused; }
@keyframes uiMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .ui-marquee__track { animation: none; } }
</style>
