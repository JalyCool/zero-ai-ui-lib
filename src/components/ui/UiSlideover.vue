<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  /* left | right */
  side: { type: String, default: 'right' },
  width: { type: String, default: 'min(360px, 88vw)' }
})
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const closing = ref(false)
const rendered = ref(false)
const panelEl = ref(null)
let timer = 0

/* ============================================================
   滑出抽屉
   收起态面板整体在视口外；展开时从指定一侧整体推入，
   遮罩同步从 0 淡到 1 并模糊。关闭反向播放，播完再卸载。
   首次挂载必须先落一帧「视口外」的样式，否则 transition
   会把初始帧当终态，直接跳进来（没有动画）。
   ============================================================ */
function readDuration(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const amount = parseFloat(value)
  if (!Number.isFinite(amount)) return fallback
  return value.endsWith('ms') ? amount : amount * 1000
}

watch(() => props.modelValue, async value => {
  clearTimeout(timer)
  if (value) {
    closing.value = false
    rendered.value = true
    await nextTick()
    /* 提交「视口外」这一帧，再打开，transition 才有起点。 */
    if (panelEl.value) void panelEl.value.offsetWidth
    requestAnimationFrame(() => { open.value = true })
    return
  }
  if (!rendered.value) return
  open.value = false
  closing.value = true
  const ms = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : readDuration('--spring-exit-dur', 400)
  timer = setTimeout(() => {
    closing.value = false
    rendered.value = false
  }, ms + 40)
}, { immediate: true })

function close() { emit('update:modelValue', false) }
function onKey(event) { if (event.key === 'Escape') close() }
watch(rendered, value => {
  if (value) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('keydown', onKey) })
</script>
<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-slideover" :class="[`is-${side}`, { 'is-open': open, 'is-closing': closing }]">
      <div class="ui-slideover__scrim" @click="close"></div>
      <aside ref="panelEl" class="ui-slideover__panel" :style="{ width }" role="dialog" aria-modal="true" :aria-label="title || '抽屉'">
        <header v-if="title || $slots.header" class="ui-slideover__head">
          <slot name="header"><h3>{{ title }}</h3></slot>
          <button type="button" class="ui-slideover__close" aria-label="关闭" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div class="ui-slideover__body"><slot /></div>
        <footer v-if="$slots.footer" class="ui-slideover__foot"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>
<style scoped>
.ui-slideover { position: fixed; inset: 0; z-index: 350; }
.ui-slideover__scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .32);
  opacity: 0;
  backdrop-filter: blur(0px);
  transition: opacity var(--t-sheet), backdrop-filter var(--t-sheet);
}
.ui-slideover.is-open .ui-slideover__scrim { opacity: 1; backdrop-filter: blur(4px); }
.ui-slideover.is-closing .ui-slideover__scrim { transition: opacity var(--t-exit), backdrop-filter var(--t-exit); }

.ui-slideover__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  background: var(--surface);
  will-change: transform, border-radius;
  /* 收起时是圆角卡片，展开落定后过渡到「贴边容器」的直角（贴边那一侧归零） */
  border-radius: calc(22px * var(--radius-scale));
  transition: transform var(--t-sheet), border-radius var(--t-sheet);
}
.ui-slideover.is-open .ui-slideover__panel.is-left { border-radius: 0 calc(22px * var(--radius-scale)) calc(22px * var(--radius-scale)) 0; }
.ui-slideover.is-open .ui-slideover__panel.is-right { border-radius: calc(22px * var(--radius-scale)) 0 0 calc(22px * var(--radius-scale)); }
.ui-slideover.is-closing .ui-slideover__panel { transition: transform var(--t-exit); }
.ui-slideover.is-right .ui-slideover__panel {
  right: 0;
  border-radius: calc(20px * var(--radius-scale)) 0 0 calc(20px * var(--radius-scale));
  transform: translate3d(100%, 0, 0);
}
.ui-slideover.is-left .ui-slideover__panel {
  left: 0;
  border-radius: 0 calc(20px * var(--radius-scale)) calc(20px * var(--radius-scale)) 0;
  transform: translate3d(-100%, 0, 0);
}
.ui-slideover.is-open .ui-slideover__panel { transform: translate3d(0, 0, 0); }
/* 面板内容稍晚一点浮进来，跟着外壳一起出现，不会先看到一堆文字在滑。 */
.ui-slideover__head, .ui-slideover__body, .ui-slideover__foot {
  opacity: 0;
  transform: translate3d(0, 6px, 0);
  transition: opacity var(--t-fade), transform var(--t-panel);
}
.ui-slideover.is-open .ui-slideover__head,
.ui-slideover.is-open .ui-slideover__body,
.ui-slideover.is-open .ui-slideover__foot { opacity: 1; transform: none; transition-delay: 60ms; }
.ui-slideover.is-closing .ui-slideover__head,
.ui-slideover.is-closing .ui-slideover__body,
.ui-slideover.is-closing .ui-slideover__foot { transition: opacity var(--t-exit), transform var(--t-exit); }

.ui-slideover__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 6px; }
.ui-slideover__head h3 { margin: 0; font-size: var(--fs-body); font-weight: var(--w-heading); }
.ui-slideover__close { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: var(--on-surface-variant); cursor: pointer; transition: background var(--t-fade), transform var(--t-pop); }
.ui-slideover__close:hover { background: var(--surface-container); }
.ui-slideover__close:active { transform: scale(var(--press-scale)); }
.ui-slideover__close svg { width: 15px; height: 15px; }
.ui-slideover__body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.ui-slideover__foot { padding: 10px 14px 14px; border-top: var(--border-w) solid var(--outline-variant); display: flex; gap: 8px; justify-content: flex-end; }

@media (prefers-reduced-motion: reduce) {
  .ui-slideover__panel, .ui-slideover__scrim, .ui-slideover__head, .ui-slideover__body, .ui-slideover__foot { transition-duration: .01ms !important; transition-delay: 0s !important; }
}
</style>
