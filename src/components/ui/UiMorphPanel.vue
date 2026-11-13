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
   这是形变语言的泛用形态 —— 不再局限于「按钮变成输入框」：
   · 外壳只做几何过渡（宽高 / 圆角 / 底色），走 view 弹簧；
   · 收起态 = 一个按钮（#trigger 可换成任意内容）；
   · 展开态 = 默认插槽里的任何组件从模糊中浮现（内容替换语言），
     作用域带 close，点外部 / Esc 收起，收起途中可打断。
   尺寸靠实测：收起量按钮、量内容，所以任何内容都不会被裁。
   ============================================================ */

const rootEl = ref(null)
const triggerEl = ref(null)
const bodyEl = ref(null)
const inner = { w: 0, h: 0 }
const outer = { w: 0, h: 0 }
const size = ref({ w: 0, h: 0 })
const shadow = ref(false)
const localOpen = ref(!!props.open)
const isOpen = () => (props.open === undefined ? localOpen.value : props.open)

let observer = null

function measure() {
  if (!rootEl.value) return
  /* 收起态尺寸：按钮本体。展开态 trigger 被 min-width:100% 拉到外壳宽度，
     那时不能刷新 outer，否则收起时按钮尺寸被外壳污染。 */
  if (!isOpen() && triggerEl.value) {
    outer.w = triggerEl.value.offsetWidth
    outer.h = triggerEl.value.offsetHeight
  }
  /* 内容自然尺寸：body 平时被外壳裁剪，量之前临时放开成 max-content。 */
  const body = bodyEl.value
  if (body) {
    const prevWidth = body.style.width
    const prevHeight = body.style.height
    body.style.width = 'max-content'
    body.style.height = 'max-content'
    inner.w = body.offsetWidth
    inner.h = body.offsetHeight
    body.style.width = prevWidth
    body.style.height = prevHeight
  }
  applySize()
}

function applySize() {
  if (isOpen()) {
    size.value = {
      w: Math.max(outer.w, inner.w, props.minWidth),
      h: Math.max(outer.h, inner.h, props.minHeight)
    }
  } else {
    size.value = { w: outer.w, h: outer.h }
  }
}

/* 内容尺寸变化（例如插槽里是输入框 / 网格）时重新量。 */
function observeBody() {
  if (observer) observer.disconnect()
  if (!bodyEl.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => {
    outer.w = triggerEl.value ? triggerEl.value.offsetWidth : outer.w
    outer.h = triggerEl.value ? triggerEl.value.offsetHeight : outer.h
    /* 内容变化时重新量自然尺寸（量法本身会临时放开宽高）。 */
    const body = bodyEl.value
    if (!body) return
    const prevWidth = body.style.width
    const prevHeight = body.style.height
    body.style.width = 'max-content'
    body.style.height = 'max-content'
    inner.w = body.offsetWidth
    inner.h = body.offsetHeight
    body.style.width = prevWidth
    body.style.height = prevHeight
    applySize()
  })
  observer.observe(bodyEl.value)
  if (triggerEl.value) observer.observe(triggerEl.value)
}

function setOpen(value) {
  if (props.open === undefined) localOpen.value = value
  emit('update:open', value)
  value ? emit('open') : emit('close')
  if (value) {
    nextTick(() => { measure(); observeBody() })
  } else {
    /* 收起：立刻回到按钮自然尺寸（inner 尺寸保留，下次展开免重测）。 */
    applySize()
  }
}

function toggle() {
  if (props.disabled) return
  const next = !isOpen()
  setOpen(next)
  if (next) {
    /* 展开后再量一次：内容刚可见时才有真实尺寸 */
    nextTick(() => { measure(); observeBody() })
  }
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
  if (value) nextTick(() => { measure(); observeBody() })
})

/* 首帧后量一次：收起态尺寸 = 按钮本体。 */
onMounted(() => {
  nextTick(() => {
    measure()
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
  border: var(--border-w) solid var(--outline-variant);
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

.ui-morph-panel__trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  /* 始终按按钮内容取自然尺寸：展开态 trigger 淡出，不需要铺满。 */
  width: max-content;
  height: max-content;
  padding: 8px 14px;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
  font-weight: var(--w-label);
  white-space: nowrap;
  cursor: pointer;
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-feedback);
}
.ui-morph-panel__trigger:hover { background: var(--surface-container-high); }
.ui-morph-panel__trigger:active { transform: scale(var(--press-scale)); }
.ui-morph-panel.is-open .ui-morph-panel__trigger {
  opacity: 0;
  filter: blur(8px);
  pointer-events: none;
}

.ui-morph-panel__body {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.ui-morph-panel__content {
  height: 100%;
  padding: 10px 12px;
  opacity: 0;
  filter: blur(10px);
  transform: translateY(6px);
  pointer-events: none;
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-panel);
}
.ui-morph-panel.is-open .ui-morph-panel__content {
  opacity: 1;
  filter: blur(0);
  transform: none;
  pointer-events: auto;
  transition-delay: 90ms;
}

@media (prefers-reduced-motion: reduce) {
  .ui-morph-panel__content { transition-delay: 0ms; filter: none; }
}
</style>
