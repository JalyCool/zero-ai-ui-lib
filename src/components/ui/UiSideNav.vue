<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* ============================================================
   UiSideNav —— 预制的响应式导航（一个组件，两种形态）
   · 桌面端（≥ breakpoint）：常驻侧栏，可折叠（自带折叠按钮）
   · 移动端（< breakpoint）：左侧滑抽屉 + 压暗模糊遮罩，
     选中即收、Esc 关闭、打开时锁 #scrollArea 滚动
   · contain=true：改用 absolute 渲染在父容器内（预览 / 示例用，不锁滚动）
   ============================================================ */

const props = defineProps({
  /* [{ value, label, icon }]，icon 为 24x24 viewBox 的 SVG 内部标记 */
  items: { type: Array, default: () => [] },
  /* 当前选中项 */
  active: { type: String, default: '' },
  /* 移动端抽屉开合 */
  modelValue: { type: Boolean, default: false },
  /* 桌面端折叠（v-model:collapsed） */
  collapsed: { type: Boolean, default: false },
  breakpoint: { type: Number, default: 900 },
  width: { type: String, default: '248px' },
  collapsedWidth: { type: String, default: '72px' },
  title: { type: String, default: '' },
  contain: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'update:collapsed', 'select'])

const isMobile = ref(false)
let mq = null

function applyMq(event) { isMobile.value = event.matches }

/* 抽屉打开时锁 #scrollArea 的滚动（contain 模式在父容器内，不锁） */
let savedOverflow = null
function lock() {
  if (props.contain || savedOverflow !== null) return
  const el = document.getElementById('scrollArea')
  if (!el) return
  savedOverflow = el.style.overflow
  el.style.overflow = 'hidden'
}
function unlock() {
  if (savedOverflow === null) return
  const el = document.getElementById('scrollArea')
  if (el) el.style.overflow = savedOverflow
  savedOverflow = null
}

function onKey(event) {
  if (event.key === 'Escape' && isMobile.value && props.modelValue) {
    emit('update:modelValue', false)
    unlock()
  }
}

onMounted(() => {
  mq = window.matchMedia('(max-width: ' + (props.breakpoint - 0.02) + 'px)')
  applyMq(mq)
  mq.addEventListener('change', applyMq)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (mq) mq.removeEventListener('change', applyMq)
  document.removeEventListener('keydown', onKey)
  unlock()
})

watch(() => props.modelValue, open => { if (open) lock(); else unlock() })

function select(item) {
  emit('select', item.value)
  if (isMobile.value) {
    emit('update:modelValue', false)
    unlock()
  }
}
</script>
<template>
  <!-- 桌面端：常驻侧栏 -->
  <aside
    v-if="!isMobile"
    class="ui-sidenav"
    :class="{ 'is-collapsed': collapsed }"
    :style="{ width: collapsed ? collapsedWidth : width }"
  >
    <div v-if="title || $slots.head" class="ui-sidenav__head">
      <slot name="head">
        <span class="ui-sidenav__title">{{ collapsed ? title.slice(0, 1) : title }}</span>
      </slot>
    </div>
    <nav class="ui-sidenav__list">
      <button
        v-for="it in items"
        :key="it.value"
        type="button"
        class="ui-sidenav__item"
        :class="{ 'is-active': it.value === active }"
        :title="collapsed ? it.label : undefined"
        @click="select(it)"
      >
        <span v-if="it.icon" class="ui-sidenav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="it.icon"></svg>
        </span>
        <span class="ui-sidenav__label">{{ it.label }}</span>
      </button>
    </nav>
    <button
      type="button"
      class="ui-sidenav__toggle"
      :aria-label="collapsed ? '展开导航' : '折叠导航'"
      @click="emit('update:collapsed', !collapsed)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5L9 12l5.5 5.5" /></svg>
    </button>
  </aside>

  <!-- 移动端：侧滑抽屉 -->
  <template v-else>
    <div
      class="ui-sidenav-scrim"
      :class="{ 'is-open': modelValue, 'is-contained': contain }"
      @click="emit('update:modelValue', false)"
    ></div>
    <aside
      class="ui-sidenav is-drawer"
      :class="{ 'is-open': modelValue, 'is-contained': contain }"
      role="dialog"
      aria-modal="true"
      :aria-label="title || '导航菜单'"
      :inert="!modelValue"
    >
      <div v-if="title || $slots.head" class="ui-sidenav__head">
        <slot name="head"><span class="ui-sidenav__title">{{ title }}</span></slot>
      </div>
      <nav class="ui-sidenav__list">
        <button
          v-for="it in items"
          :key="it.value"
          type="button"
          class="ui-sidenav__item"
          :class="{ 'is-active': it.value === active }"
          @click="select(it)"
        >
          <span v-if="it.icon" class="ui-sidenav__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="it.icon"></svg>
          </span>
          <span class="ui-sidenav__label">{{ it.label }}</span>
        </button>
      </nav>
    </aside>
  </template>
</template>
<style scoped>
.ui-sidenav {
  display: flex;
  flex-direction: column;
  background: var(--surface-container-low);
  transition: width var(--t-panel), transform var(--t-sheet);
}
.ui-sidenav:not(.is-drawer) { width: var(--sidenav-w, 248px); height: 100%; }
.ui-sidenav:not(.is-drawer).is-collapsed { width: var(--sidenav-cw, 72px); }

.ui-sidenav__head {
  min-height: 40px;
  padding: 14px 14px 4px;
  display: flex;
  align-items: center;
}
.ui-sidenav__title {
  font-size: var(--fs-body);
  font-weight: var(--w-heading);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ui-sidenav__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  overflow-y: auto;
  scrollbar-width: none;
}
.ui-sidenav__list::-webkit-scrollbar { display: none; }

.ui-sidenav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: none;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-small);
  font-weight: var(--w-label);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-sidenav__item:active { transform: scale(var(--press-scale)); }
.ui-sidenav__item.is-active { background: var(--primary-container); color: var(--on-primary-container); }
.ui-sidenav__icon { width: 22px; height: 22px; display: grid; place-items: center; flex-shrink: 0; }
.ui-sidenav__icon svg { width: 19px; height: 19px; }
.ui-sidenav__label { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.ui-sidenav.is-collapsed .ui-sidenav__item { justify-content: center; padding: 9px 8px; }
.ui-sidenav.is-collapsed .ui-sidenav__label { display: none; }
.ui-sidenav.is-collapsed .ui-sidenav__head { justify-content: center; padding-inline: 8px; }

.ui-sidenav__toggle {
  align-self: center;
  width: 30px;
  height: 30px;
  margin: 4px 0 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--on-surface-variant);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-sidenav__toggle:hover { background: var(--surface-container-high); color: var(--on-surface); }
.ui-sidenav__toggle svg { width: 17px; height: 17px; transition: transform var(--t-panel); }
.ui-sidenav.is-collapsed .ui-sidenav__toggle svg { transform: rotate(180deg); }

/* 移动端抽屉 + 遮罩 */
.ui-sidenav-scrim {
  position: fixed;
  inset: 0;
  z-index: 340;
  background: rgba(0, 0, 0, .32);
  backdrop-filter: blur(6px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-fade);
}
.ui-sidenav-scrim.is-open { opacity: 1; pointer-events: auto; }
.ui-sidenav.is-drawer {
  position: fixed;
  z-index: 345;
  top: 0;
  bottom: 0;
  left: 0;
  width: min(320px, 84vw);
  border-radius: 0 20px 20px 0;
  background: var(--surface);
  transform: translateX(-103%);
  pointer-events: none;
}
.ui-sidenav.is-drawer.is-open { transform: translateX(0); pointer-events: auto; }
.ui-sidenav.is-drawer.is-contained { position: absolute; }
.ui-sidenav-scrim.is-contained { position: absolute; }
.ui-sidenav.is-drawer .ui-sidenav__item { padding: 12px 14px; }
.ui-sidenav.is-drawer .ui-sidenav__icon { width: 24px; height: 24px; }
.ui-sidenav.is-drawer .ui-sidenav__icon svg { width: 21px; height: 21px; }
.ui-sidenav.is-drawer .ui-sidenav__head { min-height: 52px; }

@media (prefers-reduced-motion: reduce) {
  .ui-sidenav, .ui-sidenav-scrim, .ui-sidenav__toggle svg { transition-duration: .01ms !important; }
}
</style>
