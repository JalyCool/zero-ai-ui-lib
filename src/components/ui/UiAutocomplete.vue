<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toFixedBox } from '../../core/fixedBox'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '输入以筛选' },
  /* [{ label, value, hint? }] */
  options: { type: Array, default: () => [] },
  /* 允许自由输入（不进列表的值也认） */
  free: { type: Boolean, default: true },
  max: { type: Number, default: 8 },
  hint: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'select'])

/* ============================================================
   自动完成（与 UiSelect 同一套形变语言）
   ------------------------------------------------------------
   · 收起态是一个输入框；点击 / 聚焦后外壳原地长成下拉面板。
   · 展开层里重新放一枚输入框（盖住原输入框的位置，原内容淡出），
     用户真正输入的是展开层里的这一枚 —— 即「输入框在展开层中实现」。
   · 面板固定定位 + 占位块，收起时几何连续地缩回字段原位。
   · 过滤、↑↓、Enter、Esc；点外部、页面滚动、窗口尺寸变化都收起。
   ============================================================ */

const open = ref(false)
const closing = ref(false)
const floating = ref(false)
const surface = ref({})
const surfaceEl = ref(null)
const panelEl = ref(null)
const panelInnerEl = ref(null)
const listEl = ref(null)
const panelInput = ref(null)
const fieldInput = ref(null)
const active = ref(-1)
const filtered = computed(() => {
  const q = String(props.modelValue || '').trim().toLowerCase()
  const list = props.options.filter(o => !q || String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
  return list.slice(0, props.max)
})
const hasValue = computed(() => String(props.modelValue || '').length > 0)

const MARGIN = 12
/* 注意：不能叫 placeholder —— 会遮蔽同名 prop，模板里的输入框占位符就变成这个 div。 */
let placeholderEl = null
let closeTimer = 0
let closedBox = null
let openedBox = null
let borderX = 0
let borderY = 0
let openingAt = 0

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
function fixedStyle(box) {
  const fixed = toFixedBox(surfaceEl.value, box)
  return {
    left: fixed.left + 'px',
    top: fixed.top + 'px',
    width: fixed.width + 'px',
    height: fixed.height + 'px'
  }
}
function mountPlaceholder(rect) {
  if (placeholderEl || !surfaceEl.value?.parentNode) return
  placeholderEl = document.createElement('div')
  placeholderEl.setAttribute('aria-hidden', 'true')
  placeholderEl.style.cssText = 'display:block;visibility:hidden;pointer-events:none;flex-shrink:0;'
  placeholderEl.style.height = Math.round(rect.height) + 'px'
  surfaceEl.value.parentNode.insertBefore(placeholderEl, surfaceEl.value)
}
function removePlaceholder() {
  if (!placeholderEl) return
  placeholderEl.remove()
  placeholderEl = null
}

/* 展开高度 = 展开层内的输入行 + 列表自然高度；列表自己封顶后滚动。 */
function measurePanel(width) {
  const inner = panelInnerEl.value
  if (!inner) return 0
  const layer = panelEl.value
  const previous = layer ? layer.style.width : ''
  if (layer) layer.style.width = width + 'px'
  const natural = inner.offsetHeight
  if (layer) layer.style.width = previous
  return natural
}

async function openMenu(byKeyboard = false) {
  if (open.value || props.modelValue === undefined) return
  closing.value = false
  openingAt = performance.now()

  const el = surfaceEl.value
  if (!el) return

  const viewport = el.closest('.view')
  if (viewport && typeof viewport.getAnimations === 'function') {
    try { viewport.getAnimations().forEach(animation => animation.finish()) } catch (error) { /* 忽略 */ }
  }

  const rect = naturalRect(el)
  const computedStyle = getComputedStyle(el)
  borderX = parseFloat(computedStyle.borderLeftWidth) || 0
  borderY = parseFloat(computedStyle.borderTopWidth) || 0

  closedBox = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  openedBox = null
  mountPlaceholder(closedBox)
  surface.value = { ...fixedStyle(closedBox) }
  floating.value = true

  await nextTick()

  const innerW = Math.max(1, rect.width - borderX * 2)
  const vh = window.innerHeight
  const panelH = measurePanel(innerW)
  const targetH = Math.max(rect.height, Math.min(panelH + borderY * 2, vh - MARGIN * 2))

  const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - MARGIN - rect.width))
  const top = Math.max(MARGIN, Math.min(rect.top, vh - MARGIN - targetH))

  void el.offsetWidth

  requestAnimationFrame(() => {
    if (!floating.value) return
    openedBox = fixedStyle({ left: Math.round(left), top: Math.round(top), width: rect.width, height: targetH })
    surface.value = { ...openedBox }
    open.value = true
    active.value = filtered.value.length ? 0 : -1
    nextTick(() => {
      if (panelInput.value) panelInput.value.focus({ preventScroll: true })
      if (byKeyboard) scrollActive()
    })
  })
}

function interruptOpen() {
  clearTimeout(closeTimer)
  closeTimer = 0
  if (!floating.value || !openedBox) {
    closing.value = false
    open.value = false
    openMenu()
    return
  }
  closing.value = false
  open.value = true
  surface.value = { ...openedBox }
  nextTick(() => panelInput.value && panelInput.value.focus({ preventScroll: true }))
}

function finishClose() {
  clearTimeout(closeTimer)
  closeTimer = 0
  closing.value = false
  open.value = false
  floating.value = false
  surface.value = {}
  closedBox = null
  openedBox = null
  removePlaceholder()
}

async function close() {
  if (closing.value || !open.value) return
  clearTimeout(closeTimer)
  closing.value = true
  open.value = false

  await nextTick()
  const el = surfaceEl.value
  if (el) void el.offsetWidth
  if (closedBox) surface.value = { ...fixedStyle(closedBox) }

  const ms = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  closeTimer = setTimeout(finishClose, ms + 80)
}

function choose(option) {
  /* 输入框显示的是人读的 label；业务值从 @select 的 option.value 拿。
     这样收起后字段里不会出现 ride 这种内部值。 */
  emit('update:modelValue', String(option.label))
  emit('select', option)
  close()
}
function onInput(event) {
  emit('update:modelValue', event.target.value)
  active.value = 0
  if (!open.value && !closing.value) openMenu()
}
function clearValue() {
  emit('update:modelValue', '')
  active.value = -1
  nextTick(() => panelInput.value && panelInput.value.focus({ preventScroll: true }))
}
function scrollActive() {
  nextTick(() => {
    const list = listEl.value
    const item = list && list.children[active.value]
    if (!item || !list) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  })
}
function moveActive(step) {
  if (!filtered.value.length) return
  active.value = Math.max(0, Math.min(filtered.value.length - 1, active.value + step))
  scrollActive()
}
function onKeydown(event) {
  if (event.key === 'Escape') {
    if (open.value || closing.value) {
      event.stopPropagation()
      close()
    }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) openMenu(true)
    else moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (open.value) moveActive(-1)
    return
  }
  if (event.key === 'Enter') {
    if (open.value && filtered.value[active.value]) {
      event.preventDefault()
      choose(filtered.value[active.value])
    }
    return
  }
}

function onFieldFocus() {
  if (closing.value) interruptOpen()
  else if (!open.value) openMenu()
}
function onFieldClick() {
  if (closing.value) interruptOpen()
  else if (!open.value) openMenu()
}
function onPointerDown(event) {
  if (closing.value || !open.value) return
  if (surfaceEl.value?.contains(event.target)) return
  close()
}
function onDocumentKeydown(event) {
  if (event.key === 'Escape' && (open.value || closing.value)) close()
}
function onScroll(event) {
  if (surfaceEl.value?.contains(event.target)) return
  if (performance.now() - openingAt < 320) return
  if (closing.value || (floating.value && !open.value)) {
    finishClose()
    return
  }
  if (open.value) close()
}
function onResize() {
  if (open.value || closing.value) close()
}

watch(() => props.modelValue, () => {
  if (open.value) active.value = filtered.value.length ? Math.max(0, active.value) : -1
})

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onResize)
  removePlaceholder()
})
</script>

<template>
  <div class="ui-auto" :class="{ 'is-open': open, 'is-closing': closing }">
    <span v-if="label" class="ui-field__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-auto__surface"
      :class="{ 'is-open': open, 'is-closing': closing, 'is-floating': floating }"
      :style="surface"
    >
      <div class="ui-auto__view">
        <svg class="ui-auto__lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />
        </svg>
        <input
          ref="fieldInput"
          class="ui-auto__field"
          :value="modelValue"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          @focus="onFieldFocus"
          @click="onFieldClick"
          @input="onInput"
          @keydown="onKeydown"
        />
        <span class="ui-auto__chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>

      <div ref="panelEl" class="ui-auto__panel" :inert="open ? null : ''">
        <div ref="panelInnerEl" class="ui-auto__panel-inner">
          <div class="ui-auto__search">
            <svg class="ui-auto__lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />
            </svg>
            <input
              ref="panelInput"
              class="ui-auto__field"
              :value="modelValue"
              :placeholder="placeholder"
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="open ? 'true' : 'false'"
              @input="onInput"
              @keydown="onKeydown"
            />
            <button v-if="hasValue" type="button" class="ui-auto__clear" aria-label="清空" @click="clearValue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div ref="listEl" class="ui-auto__list" role="listbox">
            <button
              v-for="(option, index) in filtered"
              :key="option.value"
              type="button"
              role="option"
              :aria-selected="index === active"
              :class="{ 'is-active': index === active }"
              @mousedown.prevent="choose(option)"
              @mouseenter="active = index"
            >
              <span class="ui-auto__option-label">{{ option.label }}</span>
              <small v-if="option.hint">{{ option.hint }}</small>
            </button>
            <span v-if="!filtered.length" class="ui-auto__empty">没有匹配项</span>
          </div>
        </div>
      </div>
    </div>

    <span v-if="hint" class="ui-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.ui-auto { display: flex; flex-direction: column; gap: 7px; min-width: 0; }

/* 外壳：收起是输入框，展开后固定定位长成面板。 */
.ui-auto__surface {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container-low);
  transition: left var(--t-panel), top var(--t-panel),
              width var(--t-panel), height var(--t-panel),
              border-radius var(--t-panel), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-auto__surface.is-floating { position: fixed; z-index: 320; }
.ui-auto__surface.is-open {
  border-radius: calc(18px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
}
.ui-auto__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-auto__surface:not(.is-floating):has(.ui-auto__field:focus) { border-color: var(--primary); }
.ui-auto__surface:has(.ui-auto__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

/* 收起态原始输入：展开时留在原位淡出，位置正好被展开层里的输入行接手。 */
.ui-auto__view {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 44px;
  transition: opacity var(--t-fade), filter var(--t-fade);
}
.ui-auto.is-open .ui-auto__view {
  opacity: 0;
  pointer-events: none;
  filter: blur(8px);
  transition: opacity var(--t-fade) 120ms, filter var(--t-fade) 200ms;
}
.ui-auto.is-closing .ui-auto__view {
  opacity: 1;
  filter: blur(0);
  transition: opacity var(--t-fade) 90ms, filter var(--t-fade) 90ms;
}

.ui-auto__lead {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: 12px;
  color: var(--on-surface-variant);
}
.ui-auto__field {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  outline: none;
}
.ui-auto__field::placeholder { color: var(--on-surface-variant); opacity: .78; }
.ui-auto__chev {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  margin-right: 12px;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback), color var(--t-fade);
}
.ui-auto__chev svg { width: 15px; height: 15px; }
.ui-auto.is-open .ui-auto__chev { transform: rotate(180deg); color: var(--primary); }

/* 展开层：铺满外壳，随外壳一起裁剪。 */
.ui-auto__panel {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
  opacity: 0;
  filter: blur(10px);
  transform: translate3d(0, 8px, 0) scale(.985);
  transform-origin: 50% 0;
  pointer-events: none;
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-fade);
}
.ui-auto.is-open .ui-auto__panel {
  opacity: 1;
  filter: blur(0);
  transform: none;
  pointer-events: auto;
  transition: opacity var(--t-fade) 90ms, filter var(--t-fade) 90ms,
              transform var(--t-panel) 90ms;
}
.ui-auto.is-closing .ui-auto__panel {
  opacity: 0;
  filter: blur(8px);
  transform: translate3d(0, 6px, 0) scale(.99);
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-exit);
}
.ui-auto__panel-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}

/* 展开层里的输入行：与收起态输入框同高同起点，视觉上就是同一个输入框。 */
.ui-auto__search {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 44px;
  border-bottom: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 60%, transparent);
}
.ui-auto__search .ui-auto__field { padding: 0 8px; }
.ui-auto__clear {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-right: 8px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: transform var(--t-pop), background var(--t-fade);
}
.ui-auto__clear:active { transform: scale(var(--press-scale)); }
.ui-auto__clear svg { width: 12px; height: 12px; }

.ui-auto__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  max-height: min(304px, 44vh);
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.ui-auto__list::-webkit-scrollbar { display: none; }
.ui-auto__list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-auto__list button.is-active { background: var(--surface-container-low); color: var(--primary); }
.ui-auto__option-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-auto__list small { flex-shrink: 0; color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-auto__empty { padding: 12px 10px; color: var(--on-surface-variant); font-size: var(--fs-tiny); text-align: center; }
</style>
