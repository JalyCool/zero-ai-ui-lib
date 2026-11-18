<script setup>
import { onMounted, ref, useSlots } from 'vue'
import { useHeadFuse } from '../../composables/useHeadFuse'

const props = defineProps({
  /* 大标题（默认态）；融合条也用它（缩小版） */
  title: { type: String, default: '' },
  /* 副标题（默认态专有）：融合条上不显示 */
  sub: { type: String, default: '' },
  /* 融合条高度（px）：设计稿 102，内容行 24px 贴住模糊带 */
  fuseHeight: { type: Number, default: 84 },
  /* 融合条中间是否显示 #logo（头像/徽标） */
  showLogoInFuse: { type: Boolean, default: true },
  /* 默认态是否也显示 #logo（对应设计稿 46:363：52px 头像 + 32px 名字） */
  showLogo: { type: Boolean, default: false },
  /* 只渲染融合条（固定层）；默认 false = 只渲染流内的默认态。
     外壳一般两个实例成对使用：inline（流内滚走）+ fuse-only（固定在
     模糊带上），由 useHeadFuse 单例保证只有一份固定条。 */
  fuseOnly: { type: Boolean, default: false }
})

const $slots = useSlots()
const defaultEl = ref(null)
const { fused, attach, measureInline } = useHeadFuse(defaultEl)

onMounted(() => {
  attach()
  if (defaultEl.value) measureInline(defaultEl.value)
})
</script>

<template>
  <!-- 融合条（fixed）：只由 fuse-only 实例渲染，滚过头才淡入 -->
  <div
    v-if="fuseOnly"
    class="app-head__fuse"
    :class="{ 'is-visible': fused }"
    :style="{ height: fuseHeight + 'px' }"
  >
    <div class="app-head__row">
      <div class="app-head__side app-head__side--l">
        <slot name="leading" />
      </div>
      <Transition name="app-head-fade">
        <div v-if="fused" class="app-head__center">
          <slot v-if="showLogoInFuse" name="logo" />
          <span class="app-head__mini-title">{{ title }}</span>
          <slot name="badge" />
        </div>
      </Transition>
      <div class="app-head__side app-head__side--r">
        <slot name="actions" />
      </div>
    </div>
  </div>

  <!-- 默认态：在页面流内，随内容滚走 -->
  <div
    v-else
    ref="defaultEl"
    class="app-head__default"
    :class="{ 'is-hidden': fused }"
  >
    <div class="app-head__row">
      <div class="app-head__side app-head__side--l">
        <slot name="leading" />
      </div>
      <div class="app-head__spacer" />
      <div class="app-head__side app-head__side--r">
        <slot name="actions" />
      </div>
    </div>
    <div class="app-head__heading">
      <slot v-if="showLogo" name="logo" />
      <div class="app-head__name">
        <h1 class="app-head__title"><slot name="title">{{ title }}</slot></h1>
        <slot name="badge" />
      </div>
      <p v-if="sub || $slots.sub" class="app-head__sub">
        <slot name="sub">{{ sub }}</slot>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ---------- 行：常驻动作 ---------- */
.app-head__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 24px;
}
.app-head__side { display: flex; align-items: center; gap: 12px; min-width: 0; }
.app-head__spacer { flex: 1; }

/* ---------- 默认态（流内） ---------- */
.app-head__default { padding-bottom: 2px; }
.app-head__default.is-hidden { display: none; }
.app-head__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-left: 2px;
}
.app-head__name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.app-head__title {
  margin: 0;
  font-size: var(--fs-h1, 2rem);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
  line-height: 1.15;
}
.app-head__sub {
  margin: 0;
  padding-left: 2px;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
  opacity: .75;
}

/* ---------- 融合条（fixed，滚过头才出现） ---------- */
.app-head__fuse {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 55;
  display: flex;
  align-items: flex-end;
  visibility: hidden;
  pointer-events: none;
}
.app-head__fuse.is-visible { visibility: visible; pointer-events: auto; }
/* 融合底：与 ZeroScroll 的模糊带叠加的一层极淡竖向渐变（对应设计稿
   上滑态的白→透明带），让常驻按钮像是从页面里长出来而不悬在内容上。 */
.app-head__fuse::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    to bottom,
    color-mix(in oklab, var(--surface) 74%, transparent) 0%,
    color-mix(in oklab, var(--surface) 26%, transparent) 55%,
    transparent 100%
  );
}
.app-head__fuse .app-head__row {
  width: 100%;
  padding: 0 2px;
  margin-bottom: 14px;
}
.app-head__center {
  display: flex;
  align-items: center;
  gap: 6px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  min-width: 0;
}
.app-head__mini-title {
  font-size: 1.25rem;
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 46vw;
}

.app-head-fade-enter-active,
.app-head-fade-leave-active { transition: opacity var(--t-pop), transform var(--t-pop), filter var(--t-pop); }
.app-head-fade-enter-from,
.app-head-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .app-head-fade-enter-active,
  .app-head-fade-leave-active { transition: none; }
}
</style>