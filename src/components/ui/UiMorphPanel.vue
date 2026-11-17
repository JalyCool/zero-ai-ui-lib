<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  /* 受控展开（可省，默认内部自管理） */
  open: { type: Boolean, default: undefined },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /* 展开后的最小尺寸（px），0 = 由内容自己决定 */
  minWidth: { type: Number, default: 0 },
  minHeight: { type: Number, default: 0 },
  /* 点击外部是否收起 */
  closeOnOutside: { type: Boolean, default: true }
})

const emit = defineEmits(['update:open', 'open', 'close'])

/* ============================================================
   通用形变容器：「按钮点一下切换成一个组件」。
   · 外壳只做几何过渡（宽高 / 圆角 / 底色），走 view 弹簧；
   · 收起态 = 一个按钮（#trigger 可换成任意内容）；
   · 展开态 = 默认插槽里的任何组件从模糊中浮现（内容替换语言），
     作用域带 close，点外部 / Esc 收起，收起途中可打断。
   尺寸靠实测：收起量按钮、展开量内容。
   关键：**按钮的自然尺寸只在收起态记录**，展开态一律不覆盖，
   否则收起时会拿展开后的宽度当按钮宽度（就是「收不回去」的根因）。
   ============================================================ */

const rootEl = ref(null)
const triggerEl = ref(null)
const bodyEl = ref(null)
/* 按钮自然尺寸（只在收起态更新，且初始化后不再被展开态污染） */
const trigger = { w: 0, h: 0 }
/* 内容自然尺寸（展开态更新） */
const content = { w: 0, h: 0 }
const size = ref({ w: 0, h: 0 })
const localOpen = ref(!!props.open)
const isOpen = () => (props.open === undefined ? localOpen.value : props.open)

let observer = null

/* 量按钮真实尺寸：只在收起态量（展开态按钮被拉伸，量出来是外壳宽度） */
function measureTrigger() {
  const el = triggerEl.value
  if (!el) return
  const prevWidth = el.style.width
  const prevHeight = el.style.height
  /* 展开态按钮被 CSS 拉满，量之前临时还原成内容宽度 */
  el.style.width = 'max-content'
  el.style.height = 'auto'
  trigger.w = el.offsetWidth
  trigger.h = el.offsetHeight
  el.style.width = prevWidth
  el.style.height = prevHeight
}

/* 量内容自然尺寸：平时被外壳裁剪，量之前临时放开 */
function measureContent() {
  const body = bodyEl.value
  if (!body) return
  const prevWidth = body.style.width
  const prevHeight = body.style.height
  body.style.width = 'max-content'
  body.style.height = 'max-content'
  content.w = body.offsetWidth
  content.h = body.offsetHeight
  body.style.width = prevWidth
  body.style.height = prevHeight
}

function applySize() {
  if (isOpen()) {
    size.value = {
      w: Math.max(trigger.w, content.w, props.minWidth),
      h: Math.max(trigger.h, content.h, props.minHeight)
    }
  } else {
    size.value = { w: trigger.w, h: trigger.h }
  }
}

function measure() {
  if (!rootEl.value) return
  if (!isOpen()) measureTrigger()
  measureContent()
  applySize()
}

function observeBody() {
  if (observer) observer.disconnect()
  if (!bodyEl.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => {
    /* 展开态内容变化：只重量内容，不动按钮尺寸 */
    if (isOpen()) {
      measureContent()
      applySize()
    }
  })
  observer.observe(bodyEl.value)
}

function setOpen(value) {
  if (props.open === undefined) localOpen.value = value
  emit('update:open', value)
  if (value) emit('open')
  else emit('close')
  if (value) {
    /* 展开：先量内容，按钮尺寸沿用收起态记录的 */
    nextTick(() => { measureContent(); applySize(); observeBody() })
  } else {
    /* 收起：先量按钮（此时已经回到收起态布局），再缩回按钮尺寸 */
    nextTick(() => { measureTrigger(); applySize() })
  }
}

function toggle() {
  if (props.disabled) return
  setOpen(!isOpen())
}

function close() { setOpen(false) }

const shellStyle = () => ({
  '--mp-w': size.value.w + 'px',
  '--mp-h': size.value.h + 'px'
})

function onDocPointer(event) {
  if (!isOpen() || !props.closeOnOutside) return
  if (rootEl.value && !rootEl.value.contains(event.target)) close()
}
function onKeydown(event) {
  if (event.key === 'Escape' && isOpen()) close()
}
document.addEventListener('pointerdown', onDocPointer)
document.addEventListener('keydown', onKeydown)

watch(() => props.open, value => {
  if (value === undefined) return
  if (value) nextTick(() => { measureContent(); applySize(); observeBody() })
  else nextTick(() => { measureTrigger(); applySize() })
})

/* 首帧：量按钮（收起态尺寸 = 按钮本体） */
onMounted(() => {
  nextTick(() => {
    measureTrigger()
    applySize()
    observeBody()
  })
})

function onWinResize() { measure() }
window.addEventListener('resize', onWinResize)

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onWinResize)
  if (observer) observer.disconnect()
})

defineExpose({ open: () => setOpen(true), close, measure })
</script>

<template>
  <div
    ref="rootEl"
    class="ui-morph-panel"
    :class="{ 'is-open': isOpen(), 'is-disabled': disabled }"
    :style="shellStyle()"
  >
    <!-- 收起态：按钮。展开时淡出并模糊，但保持占位不拦截。 -->
    <button
      ref="triggerEl"
      type="button"
      class="ui-morph-panel__trigger"
      :aria-expanded="isOpen()"
      :disabled="disabled"
      @click="toggle"
    >
      <slot name="trigger">{{ label }}</slot>
    </button>

    <!-- 展开态：任意组件。外壳先动几何，内容从模糊中浮现。 -->
    <div ref="bodyEl" class="ui-morph-panel__body">
      <div class="ui-morph-panel__content">
        <slot :close="close" :open="isOpen()" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-morph-panel {
  position: relative;
  width: var(--mp-w, auto);
  height: var(--mp-h, auto);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container);
  overflow: hidden;
  transition: width var(--t-view), height var(--t-view),
              background var(--t-fade), border-color var(--t-fade),
              border-radius var(--t-panel);
}
.ui-morph-panel.is-open {
  background: var(--surface-container-low);
  border-radius: calc(16px * var(--radius-scale));
}
.ui-morph-panel.is-open:focus-within { border-color: var(--primary); }
.ui-morph-panel.is-disabled { opacity: .42; }

/* 收起态：按钮占满外壳；展开态：按钮淡出、不再吃点击 */
.ui-morph-panel__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: opacity var(--t-fade), filter var(--t-fade);
}
.ui-morph-panel.is-open .ui-morph-panel__trigger {
  opacity: 0;
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
}

/* 展开态内容：从模糊中浮现 */
.ui-morph-panel__body {
  position: absolute;
  left: 0;
  top: 0;
  min-width: 100%;
  pointer-events: none;
  opacity: 0;
  filter: blur(10px);
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-panel);
  transform: scale(.98);
}
.ui-morph-panel.is-open .ui-morph-panel__body {
  pointer-events: auto;
  opacity: 1;
  filter: blur(0);
  transform: none;
}
.ui-morph-panel__content { display: flex; align-items: center; gap: 8px; }
</style>
