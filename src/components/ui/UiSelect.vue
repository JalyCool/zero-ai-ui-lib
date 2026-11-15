<script setup>
import { computed, nextTick, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { usePress } from '../../core/pressFeedback'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '请选择' },
  /* 整体禁用：直接无法展开；单个选项禁用：options 里带 disabled: true */
  disabled: { type: Boolean, default: false },
  /* 选项图标位置：leading 在文字前端（列表行布局不变）；
     top 在文字上方（下拉面板变成图标卡片网格）。icon 是 24x24 viewBox 内的 SVG 标记。 */
  iconPlacement: { type: String, default: 'leading' }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   下拉选择（自绘）
   点击输入框后原地展开为下拉框：外壳按下收缩、松手生长，
   列表内容从模糊里浮现；输入框里的内容平移到当前选中项
   所在的那一行再淡出，由列表里真实的高亮项接手。
   收起方式：再次点击输入框、点击外部、Esc、滚动。
   顶部不再放收起热区 —— 当前选中项已经在列表里高亮显示。
   ============================================================ */

const surfaceEl = ref(null)
const panelEl = ref(null)
const panelContentEl = ref(null)

const open = ref(false)
watch(open, value => { if (value) nextTick(resetGlide); else glideIndex.value = -1 })
/* 滑行高亮：跟随悬停项，离开时回到当前选中项 */
const glideIndex = ref(-1)
const glideStyle = ref(null)

function optionEls() {
  const inner = panelContentEl.value
  return inner ? Array.from(inner.querySelectorAll('.ui-select__option')) : []
}

function measureGlide() {
  if (props.iconPlacement === 'top') { glideStyle.value = null; return }
  const buttons = optionEls()
  const index = glideIndex.value
  const el = buttons[index]
  if (!el) { glideStyle.value = null; return }
  glideStyle.value = {
    transform: 'translate3d(0,' + el.offsetTop + 'px,0)',
    height: el.offsetHeight + 'px'
  }
}

function setGlide(index) {
  glideIndex.value = index
  nextTick(measureGlide)
}

function resetGlide() {
  const index = props.options.findIndex(item => item.value === props.modelValue)
  setGlide(index)
}
const closing = ref(false)
const pressed = ref(false)
const floating = ref(false)
const surface = ref({})

const MARGIN = 12

let placeholder = null
let closeTimer = null
let closedBox = null
let openedBox = null
let borderX = 0
let borderY = 0

const selectedOption = computed(() => props.options.find(item => item.value === props.modelValue) || null)
const showFieldIcon = computed(() => props.iconPlacement === 'leading' && !!selectedOption.value?.icon)

const selectedLabel = computed(() => {
  const option = props.options.find(item => item.value === props.modelValue)
  if (option) return option.label
  return props.modelValue === '' || props.modelValue === null || props.modelValue === undefined
    ? props.placeholder
    : String(props.modelValue)
})

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

function mountPlaceholder(rect) {
  if (placeholder || !surfaceEl.value?.parentNode) return
  placeholder = document.createElement('div')
  placeholder.setAttribute('aria-hidden', 'true')
  placeholder.style.cssText = 'display:block;visibility:hidden;pointer-events:none;flex-shrink:0;'
  placeholder.style.height = Math.round(rect.height) + 'px'
  surfaceEl.value.parentNode.insertBefore(placeholder, surfaceEl.value)
}

function removePlaceholder() {
  if (!placeholder) return
  placeholder.remove()
  placeholder = null
}

/* 量列表高度，同时算出「当前选中项」在展开后所处的中心位置：
   原始内容要平移到那里（相对输入框中心的差值）。 */
function measure(width, closedH) {
  const layer = panelEl.value
  const content = panelContentEl.value
  if (!layer || !content) return { height: 0, shiftY: 0 }

  const previous = layer.style.width
  layer.style.width = width + 'px'

  const height = content.offsetHeight
  const selected = content.querySelector('.is-selected')
  const shiftY = selected
    ? Math.round(selected.offsetTop + selected.offsetHeight / 2 - closedH / 2)
    : 0

  layer.style.width = previous
  return { height: Math.ceil(height), shiftY }
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

  const el = surfaceEl.value
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
  // 收起后才能与真实布局尺寸完全一致。
  const rect = naturalRect(el)
  const closedW = rect.width
  const closedH = rect.height
  const originLeft = rect.left
  const originTop = rect.top

  const computed = getComputedStyle(el)
  borderX = parseFloat(computed.borderLeftWidth) || 0
  borderY = parseFloat(computed.borderTopWidth) || 0

  closedBox = { left: originLeft, top: originTop, width: closedW, height: closedH }
  openedBox = null
  mountPlaceholder(closedBox)

  surface.value = {
    left: originLeft + 'px',
    top: originTop + 'px',
    width: closedW + 'px',
    height: closedH + 'px',
    '--select-shift': '0px'
  }
  floating.value = true
  pressed.value = false

  await nextTick()

  const innerW = Math.max(1, closedW - borderX * 2)
  const { height, shiftY } = measure(innerW, closedH)
  const naturalH = height + borderY * 2
  const targetH = Math.max(closedH, Math.min(naturalH, window.innerHeight - MARGIN * 2))

  let left = originLeft
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - MARGIN - closedW))

  let top = originTop
  top = Math.max(MARGIN, Math.min(top, window.innerHeight - MARGIN - targetH))

  void el.offsetWidth

  requestAnimationFrame(() => {
    if (!floating.value) return
    openedBox = {
      left: Math.round(left) + 'px',
      top: Math.round(top) + 'px',
      width: closedW + 'px',
      height: targetH + 'px',
      '--select-shift': shiftY + 'px'
    }
    surface.value = { ...openedBox }
    open.value = true
    if (byKeyboard) panelEl.value?.focus({ preventScroll: true })
  })
}

/* 收起被打断：取消卸载，按展开几何长回去。 */
function interruptOpen() {
  clearTimeout(closeTimer)
  closeTimer = null
  pressed.value = false

  if (!floating.value || !openedBox) {
    closing.value = false
    open.value = false
    openMenu()
    return
  }

  closing.value = false
  open.value = true
  // 值可能在收起途中已经改变：重新量一次平移终点，
  // 否则文字仍然飞向旧的选中项位置。
  if (closedBox) {
    const innerW = Math.max(1, closedBox.width - borderX * 2)
    const { shiftY } = measure(innerW, closedBox.height)
    openedBox = { ...openedBox, '--select-shift': shiftY + 'px' }
  }
  surface.value = { ...openedBox }
}

function finishClose() {
  clearTimeout(closeTimer)
  closeTimer = null
  closing.value = false
  open.value = false
  floating.value = false
  pressed.value = false
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

  if (closedBox) {
    surface.value = {
      left: closedBox.left + 'px',
      top: closedBox.top + 'px',
      width: closedBox.width + 'px',
      height: closedBox.height + 'px',
      '--select-shift': '0px'
    }
  }

  const ms = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  closeTimer = setTimeout(finishClose, ms + 80)
}

/* 文字、右侧图标、右侧空白都命中同一个按钮：点哪儿都能展开 / 收起。 */
function onTriggerClick(event) {
  if (props.disabled) return
  if (open.value) {
    close()
    return
  }
  if (closing.value) {
    interruptOpen()
    return
  }
  openMenu(event.detail === 0)
}

function choose(option) {
  /* 单个选项禁用：可见但不可选。 */
  if (option.disabled) return
  if (option.value === props.modelValue) {
    close()
    return
  }
  emit('update:modelValue', option.value)
  close()
}

/* 点击弹窗外部即收起。 */
function onPointerDown(event) {
  if (closing.value || !open.value) return
  if (surfaceEl.value?.contains(event.target)) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && (open.value || closing.value)) {
    event.stopPropagation()
    press.cancelPress()
    close()
  }
}

/* 下拉框固定在视口里，页面一滚动就会与输入框错位：直接收起，
   收起途中滚动则立刻回落到文档流，输入框跟着页面一起滚。 */
function onScroll(event) {
  if (surfaceEl.value?.contains(event.target)) return
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
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
})

onDeactivated(() => {
  press.cancelPress()
  finishClose()
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  press.cancelPress()
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onResize)
  removePlaceholder()
})
</script>

<template>
  <div class="ui-field ui-select" :class="{ 'is-open': open, 'is-closing': closing, 'is-disabled': disabled }">
    <span v-if="label" class="ui-field__label">{{ label }}</span>

    <div
      ref="surfaceEl"
      class="ui-select__surface"
      :class="{
        'is-open': open,
        'is-closing': closing,
        'is-floating': floating,
        'is-pressed': pressed
      }"
      :style="surface"
    >
      <div class="ui-select__view">
        <button
          type="button"
          class="ui-select__field"
          aria-haspopup="listbox"
          :aria-expanded="open"
          :aria-disabled="disabled ? 'true' : undefined"
          :disabled="disabled"
          @pointerdown="press.onPointerDown"
          @click="onTriggerClick"
          @contextmenu.prevent
        >
          <span v-if="showFieldIcon" class="ui-select__icon ui-select__icon--field" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="selectedOption.icon"></svg>
          </span>
          <span class="ui-select__value" :class="{ 'is-placeholder': selectedLabel === placeholder }">{{ selectedLabel }}</span>
          <span class="ui-select__chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        ref="panelEl"
        class="ui-select__panel"
        role="listbox"
        :aria-label="label || '选项'"
        :aria-hidden="open ? 'false' : 'true'"
        :inert="open ? null : ''"
        tabindex="-1"
      >
        <div
          ref="panelContentEl"
          class="ui-select__panel-inner"
          :class="{ 'is-icon-top': iconPlacement === 'top' }"
        >
          <!-- 滑行高亮：一个圆角块在行之间滑过去，代替每行各自变色 -->
          <span v-if="glideStyle" class="ui-select__glide" :style="glideStyle" aria-hidden="true"></span>
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            role="option"
            :aria-selected="option.value === modelValue"
            :aria-disabled="option.disabled ? 'true' : undefined"
            :tabindex="open && !option.disabled ? 0 : -1"
            class="ui-select__option"
            :class="{ 'is-selected': option.value === modelValue, 'is-disabled': !!option.disabled }"
            @mouseenter="!option.disabled && setGlide(options.indexOf(option))"
            @mouseleave="resetGlide"
            @focus="!option.disabled && setGlide(options.indexOf(option))"
            @click="choose(option)"
          >
            <span v-if="option.icon" class="ui-select__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="option.icon"></svg>
            </span>
            <span class="ui-select__option-label">{{ option.label }}</span>
            <svg v-if="option.value === modelValue" class="ui-select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.2 4.2L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <span v-if="hint" class="ui-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.ui-select {
  position: relative;
  min-width: 0;
}

/* 外壳：关闭时是输入框本身，展开时固定定位长成下拉框。 */
.ui-select__surface {
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
/* 按压：按下立刻收缩，松手后随展开一起还原。 */
.ui-select__surface.is-pressed {
  transform: scale(var(--press-scale));
  transition: transform var(--t-feedback);
}
.ui-select__surface.is-floating {
  position: fixed;
  z-index: 320;
}
.ui-select__surface.is-open {
  border-radius: calc(18px * var(--radius-scale));
  background: var(--surface);
  border-color: color-mix(in oklab, var(--primary) 28%, var(--outline-variant));
  box-shadow: var(--elev-tip);
}
.ui-select__surface.is-closing {
  transition: left var(--t-exit), top var(--t-exit),
              width var(--t-exit), height var(--t-exit),
              border-radius var(--t-exit), background var(--t-fade),
              border-color var(--t-fade), box-shadow var(--t-fade);
}
.ui-select__surface:not(.is-floating):has(.ui-select__field:hover) {
  border-color: color-mix(in oklab, var(--primary) 36%, var(--outline-variant));
}
.ui-select__surface:has(.ui-select__field:focus-visible) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

/* 原始内容：展开时平移到「选中项」的中心再淡出。 */
.ui-select__view {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  transform: translate3d(0, 0, 0);
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
.ui-select.is-open .ui-select__view {
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, var(--select-shift, 0px), 0);
  filter: blur(8px);
  transition: opacity var(--t-fade) 330ms, transform var(--t-panel), filter var(--t-fade) 260ms;
}
.ui-select.is-closing .ui-select__view {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  filter: blur(0);
  transition: opacity var(--t-fade) 90ms, transform var(--t-exit), filter var(--t-fade) 90ms;
}

.ui-select__field {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
.ui-select__field:focus-visible { outline: none; }
.ui-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-select__value.is-placeholder { color: var(--on-surface-variant); opacity: .78; }
.ui-select__chevron {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-feedback), color var(--t-fade);
}
.ui-select__chevron svg { width: 15px; height: 15px; }
.ui-select.is-open .ui-select__chevron { transform: rotate(180deg); color: var(--primary); }

/* 下拉列表：铺满外壳，随外壳一起被裁剪与滚动。 */
.ui-select__panel {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  scrollbar-width: none;
  opacity: 0;
  filter: blur(10px);
  transform: translate3d(0, 8px, 0) scale(.985);
  transform-origin: 50% 0;
  pointer-events: none;
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-fade);
}
.ui-select__panel::-webkit-scrollbar { display: none; }
.ui-select.is-open .ui-select__panel {
  opacity: 1;
  filter: blur(0);
  transform: none;
  pointer-events: auto;
  transition: opacity var(--t-fade) 90ms, filter var(--t-fade) 90ms,
              transform var(--t-panel) 90ms;
}
.ui-select.is-closing .ui-select__panel {
  opacity: 0;
  filter: blur(8px);
  transform: translate3d(0, 6px, 0) scale(.99);
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-exit);
}
.ui-select__panel-inner {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 2px;
  padding: 6px;
}
.ui-select__panel-inner { position: relative; }
/* 高亮块：位置与高度由 JS 量出来，过渡用面板弹簧。 */
.ui-select__glide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container-low);
  pointer-events: none;
  transition: transform var(--t-panel) var(--spring-view), height var(--t-panel) var(--spring-view);
}
.ui-select__option {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 11px;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), border-radius var(--t-panel);
}
/* 行不再自己变底色：滑行高亮块负责「跟着指针走」。 */
.ui-select__option:hover { background: transparent; }
.ui-select__panel-inner.is-icon-top .ui-select__option:hover { background: var(--surface-container); }
.ui-select__option.is-selected {
  color: var(--primary);
  font-weight: var(--w-label);
}
/* ---------- 选项图标 ---------- */
.ui-select__icon { display: grid; place-items: center; flex-shrink: 0; color: currentColor; }
.ui-select__icon svg { width: 18px; height: 18px; }
.ui-select__icon--field { color: var(--on-surface-variant); }
/* 图标在文字上方：面板变成卡片网格（选中项自己填底色，勾号让位）。 */
.ui-select__panel-inner.is-icon-top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 4px;
}
.ui-select__panel-inner.is-icon-top .ui-select__option {
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-height: 62px;
  padding: 9px 6px;
  text-align: center;
  border: var(--border-w) solid transparent;
  background: var(--surface-container);
}
.ui-select__panel-inner.is-icon-top .ui-select__option .ui-select__icon svg { width: 21px; height: 21px; }
.ui-select__panel-inner.is-icon-top .ui-select__option-label { max-width: 100%; }
.ui-select__panel-inner.is-icon-top .ui-select__option.is-selected {
  background: var(--primary);
  color: var(--on-primary);
}
.ui-select__panel-inner.is-icon-top .ui-select__check { display: none; }
.ui-select__option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-select__check { width: 15px; height: 15px; flex-shrink: 0; }
.ui-select.is-disabled .ui-select__surface { opacity: .42; cursor: not-allowed; }
.ui-select__field:disabled { cursor: not-allowed; }
/* 单个禁用选项：可见但不可选，弱化而不是隐藏。 */
.ui-select__option.is-disabled {
  opacity: .4;
  cursor: not-allowed;
}
.ui-select__option.is-disabled:hover { background: transparent; }
</style>
