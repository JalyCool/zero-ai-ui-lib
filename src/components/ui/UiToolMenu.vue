<script setup>
import { nextTick, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { usePress } from '../../core/pressFeedback'

const props = defineProps({
  label: { type: String, default: '工具' },
  size: { type: String, default: 'md' },
  items: {
    type: Array,
    default: () => [
      { value: 'pin', label: '置顶记录', description: '固定在列表顶部' },
      { value: 'duplicate', label: '复制为草稿', description: '保留本次运动数据' },
      { value: 'archive', label: '归档记录', description: '从本周视图中隐藏' }
    ]
  }
})

const emit = defineEmits(['select'])

/* ============================================================
   工具菜单
   按下外壳就收缩，松手再展开成纵向列表：宽度、高度、圆角、
   底色和描边一起过渡；按钮内容模糊淡出，列表内容从模糊中浮现。
   收起途中再次点击可以打断收起、直接长回展开态。
   ============================================================ */

const root = ref(null)
const panel = ref(null)
const panelContent = ref(null)

const open = ref(false)
const closing = ref(false)
const pressed = ref(false)
const surface = ref({})
const viewBox = ref({})

let closeTimer = null
let closedBox = null
let openedBox = null
let openedViewBox = null
let keyboardOpen = false

const PANEL_MAX = 248
const PANEL_MIN = 184
const VIEWPORT_PAD = 12

/* 还原未缩放的小数矩形：offsetWidth 是取整的，直接用会让收起后的
   尺寸与真实布局尺寸差 1px，收尾时跳一下。这里按当前 transform 反解。 */
function naturalRect(el) {
  const rect = el.getBoundingClientRect()
  let sx = 1
  let sy = 1
  const transform = getComputedStyle(el).transform
  if (transform && transform !== 'none' && typeof DOMMatrixReadOnly === 'function') {
    const m = new DOMMatrixReadOnly(transform)
    sx = m.a || 1
    sy = m.d || 1
  }
  const width = Math.max(1, rect.width / sx)
  const height = Math.max(1, rect.height / sy)
  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height
  }
}

function panelWidth() {
  return Math.min(PANEL_MAX, Math.max(PANEL_MIN, window.innerWidth - 36))
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readDuration(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const amount = parseFloat(value)
  if (!Number.isFinite(amount)) return fallback
  return value.endsWith('ms') ? amount : amount * 1000
}

/* 列表在目标宽度下的自然高度；面板层始终铺满外壳，只临时量一次。 */
function measurePanelHeight(width) {
  const layer = panel.value
  const content = panelContent.value
  if (!layer || !content) return 0

  const previous = layer.style.width
  layer.style.width = width + 'px'
  const height = content.offsetHeight
  layer.style.width = previous
  return Math.ceil(height)
}

const press = usePress({
  // 收起途中也允许按下，才有机会打断收起、重新展开。
  canPress: () => !open.value,
  onPressStart: () => { pressed.value = true },
  onPressEnd: () => { pressed.value = false }
})

async function openMenu(byKeyboard = false) {
  if (open.value) return
  closing.value = false

  const el = root.value
  if (!el) return

  // 按压时外壳带 scale：按 transform 反解出未缩放的小数矩形，
  // 这样收起后能与真实布局尺寸完全一致（offsetWidth 取整会差 1px 再跳）。
  const rect = naturalRect(el)
  const closedW = rect.width
  const closedH = rect.height

  const computed = getComputedStyle(el)
  const borderX = parseFloat(computed.borderLeftWidth) || 0
  const borderY = parseFloat(computed.borderTopWidth) || 0

  const targetW = Math.max(panelWidth(), closedW)
  const innerTargetW = Math.max(1, Math.round(targetW - borderX * 2))
  const maxH = Math.max(closedH, window.innerHeight - VIEWPORT_PAD * 2)
  const targetH = Math.max(closedH, Math.min(measurePanelHeight(innerTargetW) + borderY * 2, maxH))

  const innerClosedW = Math.max(1, closedW - borderX * 2)
  const innerClosedH = Math.max(1, closedH - borderY * 2)

  keyboardOpen = byKeyboard
  closedBox = { width: closedW + 'px', height: closedH + 'px' }
  openedBox = { width: targetW + 'px', height: targetH + 'px' }
  openedViewBox = { width: innerClosedW + 'px', height: innerClosedH + 'px' }

  viewBox.value = { width: innerClosedW + 'px', height: innerClosedH + 'px' }
  surface.value = { width: closedW + 'px', height: closedH + 'px' }
  pressed.value = false

  await nextTick()
  const node = root.value
  if (node) void node.offsetWidth

  requestAnimationFrame(() => {
    if (closing.value) return
    surface.value = { ...openedBox }
    open.value = true
    if (keyboardOpen) panel.value?.focus({ preventScroll: true })
    keyboardOpen = false
  })
}

/* 收起被打断：取消卸载，按展开几何长回去。 */
function interruptOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  pressed.value = false

  if (!openedBox) {
    closing.value = false
    open.value = false
    openMenu()
    return
  }

  closing.value = false
  open.value = true
  viewBox.value = { ...openedViewBox }
  surface.value = { ...openedBox }
  panel.value?.focus({ preventScroll: true })
}

async function close() {
  if (closing.value || !open.value) return

  clearTimeout(closeTimer)
  const closedW = closedBox?.width || '0px'
  const closedH = closedBox?.height || '0px'

  closing.value = true
  open.value = false

  await nextTick()
  const el = root.value
  if (el) void el.offsetWidth

  surface.value = { width: closedW, height: closedH }

  const ms = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  closeTimer = setTimeout(() => {
    closing.value = false
    surface.value = {}
    viewBox.value = {}
    closedBox = null
    openedBox = null
    openedViewBox = null
    closeTimer = null
  }, ms + 80)
}

/* 点击统一处理：展开就收起，收起中就打断收起。 */
function onTriggerClick() {
  if (open.value) {
    close()
    return
  }
  if (closing.value) {
    interruptOpen()
    return
  }
  openMenu(true)
}

function choose(item) {
  emit('select', item)
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && (open.value || closing.value)) {
    event.stopPropagation()
    press.cancelPress()
    close()
  }
}

function onPointerDown(event) {
  if (!open.value) return
  if (root.value?.contains(event.target)) return
  close()
}

function onResize() {
  if (open.value || closing.value) close()
}

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', onResize)
  document.addEventListener('keydown', onKeydown)
})

/* 视图被 keep-alive 缓存时不会走卸载流程：直接收回到关闭态。 */
onDeactivated(() => {
  clearTimeout(closeTimer)
  closeTimer = null
  press.cancelPress()
  open.value = false
  closing.value = false
  pressed.value = false
  surface.value = {}
  viewBox.value = {}
  closedBox = null
  openedBox = null
  openedViewBox = null
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <div
    ref="root"
    class="ui-tool-menu ui-morph"
    :class="[size !== 'md' ? `is-${size}` : '', {
      'is-open': open,
      'is-closing': closing,
      'is-pressed': pressed
    }]"
    :style="surface"
  >
    <div class="ui-tool-menu__view ui-morph__view" :style="viewBox">
      <button
        type="button"
        class="ui-tool-menu__trigger"
        aria-haspopup="menu"
        :aria-expanded="open"
        @pointerdown="press.onPointerDown"
        @click="onTriggerClick"
        @contextmenu.prevent
      >
        <span class="ui-tool-menu__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
        </span>
        <span class="ui-tool-menu__label">{{ label }}</span>
        <span class="ui-tool-menu__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
    </div>

    <div
      ref="panel"
      class="ui-tool-menu__panel ui-morph__panel"
      role="menu"
      tabindex="-1"
      :aria-hidden="open ? 'false' : 'true'"
      :inert="open ? null : ''"
    >
      <div ref="panelContent" class="ui-tool-menu__inner">
        <button
          v-for="item in items"
          :key="item.value ?? item.label"
          type="button"
          role="menuitem"
          :tabindex="open ? 0 : -1"
          class="ui-tool-menu__item"
          :class="{ 'is-danger': item.tone === 'danger' }"
          @click="choose(item)"
        >
          <span class="ui-tool-menu__item-dot" aria-hidden="true"></span>
          <span class="ui-tool-menu__item-copy">
            <span class="ui-tool-menu__item-label">{{ item.label }}</span>
            <span v-if="item.description" class="ui-tool-menu__item-desc">{{ item.description }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-tool-menu {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  flex-shrink: 0;
  max-width: 100%;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-13) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  overflow: hidden;
  transition: width var(--t-panel), height var(--t-panel),
              border-radius var(--t-panel), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-tool-menu.is-closing {
  transition: width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
/* 按压：按下立刻收缩，松手后随展开一起还原。 */
.ui-tool-menu.is-pressed {
  transform: scale(var(--press-scale));
  transition: transform var(--t-feedback);
}
.ui-tool-menu.is-open {
  border-radius: calc(var(--r-18) * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 30%, var(--outline-variant));
}

/* 按钮原来的内容：留在原位，只缩尺寸，由模糊淡出负责隐藏。 */
.ui-tool-menu__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-tool-menu__trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 38px;
  padding: 8px 10px 8px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
.ui-tool-menu.is-sm .ui-tool-menu__trigger {
  min-height: var(--btn-h-sm);
  padding: var(--btn-pad-sm);
  gap: 6px;
  font-size: var(--btn-fs-sm);
}
.ui-tool-menu.is-sm .ui-tool-menu__icon { width: 15px; height: 15px; }
.ui-tool-menu.is-sm .ui-tool-menu__icon svg { width: 14px; height: 14px; }
.ui-tool-menu.is-lg .ui-tool-menu__trigger {
  min-height: var(--btn-h-lg);
  padding: var(--btn-pad-lg);
  font-size: var(--btn-fs-lg);
}
.ui-tool-menu.is-lg .ui-tool-menu__icon { width: 20px; height: 20px; }
.ui-tool-menu.is-lg .ui-tool-menu__icon svg { width: 18px; height: 18px; }
.ui-tool-menu__icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--primary);
}
.ui-tool-menu__icon svg { width: 16px; height: 16px; }
.ui-tool-menu__label { flex: 1; }
.ui-tool-menu__chevron {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-panel), color var(--t-fade);
}
.ui-tool-menu__chevron svg { width: 13px; height: 13px; }
.ui-tool-menu.is-open .ui-tool-menu__chevron {
  color: var(--primary);
  transform: rotate(180deg);
}

/* 新的内容：铺满外壳，随外壳一起被裁剪。 */
.ui-tool-menu__panel {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.ui-tool-menu__panel::-webkit-scrollbar { display: none; }
.ui-tool-menu__inner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 6px 6px;
}
.ui-tool-menu__item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-radius: calc(var(--r-11) * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), border-radius var(--t-panel);
}
.ui-tool-menu__item:hover { background: var(--surface-container-low); }
.ui-tool-menu__item:active { border-radius: calc(var(--r-8) * var(--radius-scale)); }
.ui-tool-menu__item-dot {
  width: 6px;
  height: 6px;
  margin-top: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--primary);
  opacity: .65;
}
.ui-tool-menu__item-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ui-tool-menu__item-label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  line-height: 1.35;
}
.ui-tool-menu__item-desc {
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  line-height: 1.45;
}
.ui-tool-menu__item.is-danger { color: var(--error); }
.ui-tool-menu__item.is-danger .ui-tool-menu__item-dot { background: var(--error); }
.ui-tool-menu__item.is-danger .ui-tool-menu__item-desc { color: color-mix(in oklab, var(--error) 70%, var(--on-surface-variant)); }
</style>
