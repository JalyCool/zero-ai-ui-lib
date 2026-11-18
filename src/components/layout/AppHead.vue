<script setup>
import { onBeforeUnmount, onMounted, ref, useSlots } from 'vue'

const props = defineProps({
  /* 大标题（默认态）；融合条也用它（缩小版） */
  title: { type: String, default: '' },
  /* 副标题（默认态专有）：融合条上不显示 */
  sub: { type: String, default: '' },
  /* 融合条高度（px）：设计稿 102，内容行 24px 垂直居中于模糊带 */
  fuseHeight: { type: Number, default: 84 },
  /* 融合条中间是否显示 #logo 插槽位（头像 / 徽标） */
  showLogoInFuse: { type: Boolean, default: true },
  /* 只渲染融合条（默认态由页面单独排）——分开放时用 */
  fuseOnly: { type: Boolean, default: false }
})

const $slots = useSlots()

/* ============================================================
   AppHead —— 页面头部（默认大标题态 ⇄ 上滑融合条）
   ------------------------------------------------------------
   对应设计稿 46:451（默认）与 46:473（上滑后）。

   · 默认态：32px 大标题 + 12px 副标题（40% 透明度）+ 动作按钮行。
   · 融合态：原 head 随内容滚出视口后，一个固定条淡入——它的底就是
     顶部渐变模糊带（不再另画底色），中间一行迷你标题（20px，
     可带 #logo 头像），左右仍是同一组按钮。

   两种摆放方式：
   1) 整块放进 ZeroScroll 的 #edge-top：
        <ZeroScroll>
          <template #edge-top>
            <AppHead title="运动记录" sub="4 条记录">…</AppHead>
          </template>
          …页面内容…
        </ZeroScroll>
      默认态此时也在 edge-top 里（absolute 定位到顶），视觉上仍占顶部。

   2) 分开放（推荐，默认态真正在页面流内）：
        <ZeroScroll>
          <template #edge-top>
            <AppHead fuse-only title="运动记录">…</AppHead>
          </template>
          <AppHead title="运动记录" sub="4 条记录">…</AppHead>
          …页面内容…
        </ZeroScroll>

   滚动容器不用 provide/inject（插槽内容的作用域链拿不到子组件的注入，
   跨层实测易白屏），而是**向上找最近的可滚动祖先** —— AppHead 放哪都能用。
   scrollTop 超过默认态完全离场的阈值即切换融合态。
   ============================================================ */

const scrollEl = ref(null)
const defaultEl = ref(null)
const fused = ref(false)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const el = scrollEl.value
    if (!el) return
    /* 阈值 = 默认态完全离开容器顶部的位置（不只是它的高度），
       这样不同内边距下触发点都对。 */
    const def = defaultEl.value
    const threshold = def ? def.offsetTop + def.offsetHeight : 80
    fused.value = el.scrollTop > threshold
  })
}

function bindScroll(el) {
  if (scrollEl.value === el) return
  if (scrollEl.value) scrollEl.value.removeEventListener('scroll', onScroll)
  scrollEl.value = el
  if (el) el.addEventListener('scroll', onScroll, { passive: true })
}

/* 滚动容器：向上找最近的可滚动祖先（ZeroScroll 的 __view 或 #scrollArea）。
   不用 provide/inject —— 插槽内容的作用域链继承父组件的 provide，
   子组件（ZeroScroll）的 provide 到不了页面组件，跨层注入实测易出错；
   DOM 上溯一步到位，AppHead 放哪都能用。 */
function findScrollHost(el) {
  let node = el?.parentElement
  while (node && node !== document.documentElement) {
    const oy = getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll') return node
    node = node.parentElement
  }
  return null
}

onMounted(() => {
  const host = findScrollHost(defaultEl.value || document.querySelector('.app-head__fuse'))
  if (host) bindScroll(host)
  /* 字体加载后默认态高度会变，阈值要重算 */
  if (document.fonts?.ready) document.fonts.ready.then(() => onScroll())
})

onBeforeUnmount(() => {
  if (scrollEl.value) scrollEl.value.removeEventListener('scroll', onScroll)
})

const hasActions = computed(() => !!$slots.actions)
</script>

<template>
  <!-- 融合条（fixed）：滚过头才淡入。放在 #edge-top 插槽里 -->
  <div
    class="app-head__fuse"
    :class="{ 'is-visible': fused }"
    :style="{ height: fuseHeight + 'px' }"
  >
    <div class="app-head__fuse-row">
      <div class="app-head__side app-head__side--l">
        <slot name="actions-left" />
      </div>
      <Transition name="app-head-fade">
        <div v-if="fused" class="app-head__mini">
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

  <!-- 默认态大标题：放在页面流内，随内容滚走 -->
  <div
    v-if="!fuseOnly"
    ref="defaultEl"
    class="app-head__default"
    :class="{ 'is-hidden': fused }"
  >
    <div class="app-head__btns">
      <div class="app-head__side app-head__side--l">
        <slot name="actions-left" />
      </div>
      <div class="app-head__side app-head__side--r">
        <slot name="actions" />
      </div>
    </div>
    <h1 class="app-head__title">
      <slot name="title">{{ title }}</slot>
    </h1>
    <p v-if="sub || $slots.sub" class="app-head__sub">
      <slot name="sub">{{ sub }}</slot>
    </p>
  </div>
</template>

<style scoped>
/* ---------- 默认态（流内，随内容滚走） ---------- */
.app-head__default { padding-bottom: 2px; }
.app-head__default.is-hidden { display: none; }
.app-head__btns {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  margin-bottom: 10px;
}
.app-head__side { display: flex; align-items: center; gap: 12px; min-width: 0; }
.app-head__title {
  margin: 0;
  font-size: var(--fs-h1, 2rem);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
  line-height: 1.15;
}
.app-head__sub {
  margin: 6px 0 0;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
  opacity: .75;
}

/* ---------- 融合条（fixed，滚过头才出现） ----------
   背景透明：它的底就是 ZeroScroll #edge-top 里的渐变模糊层，
   不再自己画底色 —— 与模糊带「融合」。 */
.app-head__fuse {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 55; /* 模糊层 z-50 之上、TabBar 层 z-60 之下 */
  display: flex;
  align-items: flex-end;
  visibility: hidden;
  pointer-events: none;
}
.app-head__fuse.is-visible {
  visibility: visible;
  pointer-events: auto;
}
.app-head__fuse-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0 2px;
  min-height: 24px;
  margin-bottom: 14px;
}
.app-head__mini {
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

/* 迷你条内容淡入：标题从下方 6px + 模糊里浮现 */
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