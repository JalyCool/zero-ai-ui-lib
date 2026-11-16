<script setup>
import { nextTick, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { usePress } from '../../core/pressFeedback'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '排序' },
  title: { type: String, default: '排序方式' },
  size: { type: String, default: 'md' },
  items: {
    type: Array,
    default: () => [
      { value: 'recent', label: '最近优先', description: '按时间从新到旧' },
      { value: 'calories', label: '消耗最高', description: '优先显示高消耗记录' },
      { value: 'duration', label: '时长最长', description: '优先显示长时间训练' }
    ]
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

/* ============================================================
   浮动菜单
   按下外壳立刻收缩（长按保持收缩），松手后固定定位长成面板；
   按钮内容留在原处模糊淡出，列表从模糊中浮现。
   按住超过 2 秒会直接展开并锁页，手指划到哪一项点亮哪一项，
   松手选中或取消。
   ============================================================ */

const root = ref(null)
const panel = ref(null)
const panelContent = ref(null)

const open = ref(false)
const closing = ref(false)
const pressed = ref(false)
const floating = ref(false)
const surface = ref({})
const viewBox = ref({})

const MARGIN = 12

let placeholder = null
let closeTimer = null
let closedRect = null
let openedBox = null
let restoreFocus = false
let borderX = 0
let borderY = 0

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
  return Math.max(1, Math.min(286, window.innerWidth - MARGIN * 2))
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

/* 面板层始终铺满外壳，量高度时只临时给它目标宽度。 */
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

function mountPlaceholder() {
  if (placeholder || !root.value?.parentNode) return
  placeholder = document.createElement('div')
  placeholder.setAttribute('aria-hidden', 'true')
  placeholder.style.cssText = 'display:inline-flex;flex-shrink:0;visibility:hidden;pointer-events:none;'
  root.value.parentNode.insertBefore(placeholder, root.value)
}

function updatePlaceholder(rect) {
  if (!placeholder) return
  placeholder.style.width = rect.width + 'px'
  placeholder.style.height = rect.height + 'px'
}

function removePlaceholder() {
  if (!placeholder) return
  placeholder.remove()
  placeholder = null
}

function placeholderRect() {
  if (placeholder && placeholder.isConnected) {
    const rect = placeholder.getBoundingClientRect()
    if (rect.width > 0) return rect
  }
  return closedRect
}

const press = usePress({
  // 收起途中也允许按下，才有机会打断收起、重新展开。
  canPress: () => !open.value,
  onPressStart: () => { pressed.value = true },
  onPressEnd: () => { pressed.value = false }
})

async function openMenu() {
  if (open.value) return
  closing.value = false

  const el = root.value
  if (!el) return

  // 视图入场动画的 transform 会改变固定定位的参照系，展开前先收束到终态。
  const viewport = el.closest('.view')
  if (viewport && typeof viewport.getAnimations === 'function') {
    try {
      viewport.getAnimations().forEach(animation => animation.finish())
    } catch (error) {
      // 个别环境无法立即收束视图动画；继续展开即可。
    }
  }

  // 按压时外壳带 scale：按 transform 反解未缩放的小数矩形，
  // 收起后才能与真实布局尺寸完全一致（offsetWidth 取整会差 1px 再跳）。
  const rect = naturalRect(el)
  const closedW = rect.width
  const closedH = rect.height
  const originLeft = rect.left
  const originTop = rect.top

  const computed = getComputedStyle(el)
  borderX = parseFloat(computed.borderLeftWidth) || 0
  borderY = parseFloat(computed.borderTopWidth) || 0
  const innerW = Math.max(1, closedW - borderX * 2)
  const innerH = Math.max(1, closedH - borderY * 2)

  // 外壳描边不参与内容尺寸：量高度与定宽度都按内容盒换算。
  const targetW = Math.max(panelWidth(), closedW)
  const innerTargetW = Math.max(1, Math.round(targetW - borderX * 2))
  const maxH = Math.max(closedH, window.innerHeight - MARGIN * 2)
  const targetH = Math.max(closedH, Math.min(measurePanelHeight(innerTargetW) + borderY * 2, maxH))

  let left = originLeft + closedW - targetW
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - MARGIN - targetW))

  let top = originTop
  top = Math.max(MARGIN, Math.min(top, window.innerHeight - MARGIN - targetH))

  closedRect = { left: originLeft, top: originTop, width: closedW, height: closedH }
  restoreFocus = true
  mountPlaceholder()
  updatePlaceholder(closedRect)

  surface.value = {
    left: originLeft + 'px',
    top: originTop + 'px',
    width: closedW + 'px',
    height: closedH + 'px'
  }
  viewBox.value = {
    position: 'fixed',
    left: originLeft + borderX + 'px',
    top: originTop + borderY + 'px',
    width: innerW + 'px',
    height: innerH + 'px'
  }
  floating.value = true
  pressed.value = false

  await nextTick()
  void el.offsetWidth

  openedBox = {
    left: Math.round(left) + 'px',
    top: Math.round(top) + 'px',
    width: targetW + 'px',
    height: targetH + 'px'
  }

  requestAnimationFrame(() => {
    if (!floating.value) return
    surface.value = { ...openedBox }
    open.value = true
    panel.value?.focus({ preventScroll: true })
  })
}

/* 收起被打断：取消卸载，按记录的展开几何反向长回去。
   这样点得快时不会出现「必须等收起跑完才能再点」的顿挫。 */
function interruptOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  closing.value = false
  pressed.value = false

  if (!floating.value || !openedBox) {
    // 已经完全收起：走正常展开流程。
    open.value = false
    openMenu()
    return
  }

  open.value = true
  restoreFocus = true
  surface.value = { ...openedBox }
  viewBox.value = {
    position: 'fixed',
    left: parseFloat(openedBox.left) + borderX + 'px',
    top: parseFloat(openedBox.top) + borderY + 'px',
    width: Math.max(1, Math.round(parseFloat(openedBox.width) - borderX * 2)) + 'px',
    height: Math.max(1, Math.round(parseFloat(openedBox.height) - borderY * 2)) + 'px'
  }
  panel.value?.focus({ preventScroll: true })
}

function finishClose() {
  clearTimeout(closeTimer)
  closeTimer = null
  closing.value = false
  open.value = false
  floating.value = false
  pressed.value = false
  surface.value = {}
  viewBox.value = {}
  closedRect = null
  openedBox = null
  removePlaceholder()
}

async function close() {
  if (closing.value || !open.value) return

  clearTimeout(closeTimer)
  const target = placeholderRect()

  closing.value = true
  open.value = false

  await nextTick()
  void root.value?.offsetWidth

  if (target) {
    surface.value = {
      left: target.left + 'px',
      top: target.top + 'px',
      width: target.width + 'px',
      height: target.height + 'px'
    }
    viewBox.value = {
      position: 'fixed',
      left: target.left + borderX + 'px',
      top: target.top + borderY + 'px',
      width: Math.max(1, target.width - borderX * 2) + 'px',
      height: Math.max(1, target.height - borderY * 2) + 'px'
    }
  }

  const ms = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  closeTimer = setTimeout(() => {
    closeTimer = null
    const shouldRestore = restoreFocus
    restoreFocus = false
    finishClose()
    if (shouldRestore) root.value?.querySelector('button')?.focus({ preventScroll: true })
  }, ms + 80)
}

/* 点击统一处理：展开就收起，收起中就打断收起重新展开。 */
function onTriggerClick() {
  if (open.value) {
    close()
    return
  }
  if (closing.value) {
    interruptOpen()
    return
  }
  openMenu()
}

function choose(item) {
  emit('update:modelValue', item.value)
  emit('select', item)
  close()
}

function onPointerDown(event) {
  if (closing.value || !open.value) return
  if (root.value?.contains(event.target)) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && (open.value || closing.value)) {
    event.stopPropagation()
    press.cancelPress()
    close()
  }
}

/* 面板固定在视口里，页面一滚动就会与按钮错位：直接收起更可预期。
   收起过程中滚动则立刻回落到文档流，按钮跟着页面一起滚。
   列表内部自己的滚动不算。 */
function onScroll(event) {
  if (root.value?.contains(event.target)) return
  if (closing.value || (floating.value && !open.value)) {
    finishClose()
    return
  }
  if (open.value) close()
}

function onResize() {
  if (open.value || closing.value) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, true)
})

/* 视图被 keep-alive 缓存时不会走卸载流程：直接复位，避免固定定位的面板留在别的页面。 */
onDeactivated(() => {
  press.cancelPress()
  restoreFocus = false
  finishClose()
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  press.cancelPress()
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, true)
  removePlaceholder()
})
</script>

<template>
  <div
    ref="root"
    class="ui-floating-menu ui-morph"
    :class="[size !== 'md' ? `is-${size}` : '', {
      'is-open': open,
      'is-closing': closing,
      'is-floating': floating,
      'is-pressed': pressed
    }]"
    :style="surface"
  >
    <div class="ui-floating-menu__view ui-morph__view" :style="viewBox">
      <button
        type="button"
        class="ui-floating-menu__trigger"
        aria-haspopup="menu"
        :aria-expanded="open"
        @pointerdown="press.onPointerDown"
        @click="onTriggerClick"
        @contextmenu.prevent
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 7h13M4 12h9M4 17h5" />
          <path d="M18 15l3 3 3-3" transform="translate(-2 -2)" />
        </svg>
        <span>{{ label }}</span>
        <span class="ui-floating-menu__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
    </div>

    <section
      ref="panel"
      class="ui-floating-menu__panel ui-morph__panel"
      role="menu"
      :aria-label="title"
      :aria-hidden="open ? 'false' : 'true'"
      :inert="open ? null : ''"
      tabindex="-1"
    >
      <div ref="panelContent" class="ui-floating-menu__panel-inner">
        <div class="ui-floating-menu__head" role="presentation">{{ title }}</div>
        <button
          v-for="item in items"
          :key="item.value ?? item.label"
          type="button"
          role="menuitemradio"
          :aria-checked="modelValue === item.value"
          :tabindex="open ? 0 : -1"
          class="ui-floating-menu__item"
          :class="{ 'is-active': modelValue === item.value, 'is-danger': item.tone === 'danger' }"
          @click="choose(item)"
        >
          <span class="ui-floating-menu__copy">
            <span class="ui-floating-menu__label">{{ item.label }}</span>
            <span v-if="item.description" class="ui-floating-menu__desc">{{ item.description }}</span>
          </span>
          <svg v-if="modelValue === item.value" class="ui-floating-menu__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.2 4.2L19 7" />
          </svg>
          <span v-else class="ui-floating-menu__dot" aria-hidden="true"></span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ui-floating-menu {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(11px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  transition: left var(--t-panel), top var(--t-panel),
              width var(--t-panel), height var(--t-panel),
              border-radius var(--t-panel), background var(--t-fade),
              border-color var(--t-fade), color var(--t-fade),
              box-shadow var(--t-fade);
}
/* 按压：按下立刻收缩，长按也保持；松手后随展开一起还原。 */
.ui-floating-menu.is-pressed {
  transform: scale(var(--press-scale));
  transition: transform var(--t-feedback);
}
.ui-floating-menu.is-floating {
  position: fixed;
  z-index: 280;
}
.ui-floating-menu.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), color var(--t-fade),
              box-shadow var(--t-fade);
}
.ui-floating-menu.is-open {
  border-radius: calc(18px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 30%, var(--outline-variant));
  color: var(--on-surface);
}

/* 按钮原来的内容：形变期间钉在原位置，只负责模糊淡出。 */
.ui-floating-menu__view {
  position: relative;
  display: flex;
  flex-shrink: 0;
}
.ui-floating-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--btn-h-md);
  padding: var(--btn-pad-md);
  border: 0;
  background: transparent;
  color: inherit;
  font-size: var(--btn-fs-md);
  font-weight: var(--w-label);
  white-space: nowrap;
  cursor: pointer;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  transition: color var(--t-fade);
}
.ui-floating-menu.is-sm .ui-floating-menu__trigger {
  min-height: var(--btn-h-sm);
  padding: var(--btn-pad-sm);
  font-size: var(--btn-fs-sm);
}
.ui-floating-menu.is-lg .ui-floating-menu__trigger {
  min-height: var(--btn-h-lg);
  padding: var(--btn-pad-lg);
  font-size: var(--btn-fs-lg);
}
.ui-floating-menu__trigger:hover { color: var(--primary); }
.ui-floating-menu:not(.is-open):not(.is-closing):not(.is-floating):has(.ui-floating-menu__trigger:hover) {
  border-color: var(--primary);
}
.ui-floating-menu__trigger > svg { width: 15px; height: 15px; }
.ui-floating-menu__chevron {
  display: grid;
  place-items: center;
  width: 13px;
  height: 13px;
  transition: transform var(--t-feedback);
}
.ui-floating-menu__chevron svg { width: 12px; height: 12px; }
.ui-floating-menu.is-open .ui-floating-menu__chevron { transform: rotate(180deg); }

/* 新的内容：铺满外壳，随外壳一起被裁剪与滚动。 */
.ui-floating-menu__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  scrollbar-width: none;
}
.ui-floating-menu__panel::-webkit-scrollbar { display: none; }
.ui-floating-menu__panel-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 3px;
  padding: 8px;
}
.ui-floating-menu__head {
  padding: 4px 8px 7px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  letter-spacing: .05em;
}
.ui-floating-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 8px;
  border: 0;
  border-radius: calc(11px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), border-radius var(--t-panel);
}
.ui-floating-menu__item:hover { background: var(--surface-container-low); }
.ui-floating-menu__item.is-active {
  background: color-mix(in oklab, var(--primary-container) 46%, transparent);
  color: var(--on-primary-container);
}
.ui-floating-menu__item.is-danger { color: var(--error); }
.ui-floating-menu__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.ui-floating-menu__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  line-height: 1.35;
}
.ui-floating-menu__desc {
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  line-height: 1.45;
}
.ui-floating-menu__item.is-active .ui-floating-menu__desc { color: color-mix(in oklab, var(--on-primary-container) 72%, var(--on-surface-variant)); }
.ui-floating-menu__check { width: 15px; height: 15px; flex-shrink: 0; color: var(--primary); }
.ui-floating-menu__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--outline);
  opacity: .34;
}
</style>
