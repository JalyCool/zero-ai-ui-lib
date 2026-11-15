<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import UiSegmented from './UiSegmented.vue'
import UiSelect from './UiSelect.vue'
import UiEmptyState from './UiEmptyState.vue'
import {
  CODE_FORMATS, supports, resolveOptions, renderMode, fallbackCandidates
} from '../../core/codeFormats'

const props = defineProps({
  /* 字符串 = 单码制；数组 = 可切换的码制组 */
  type: { type: [String, Array], required: true },
  /* { qrcode: {...}, ean13: {...} } 按码制传参 */
  options: { type: Object, default: () => ({}) },
  width: { type: Number, default: 0 }
})

/* ============================================================
   CodeImage：把 children 的文本渲染成码。
   · 校验 / 参数 / 图标-文字判断 / 降级候选全部在 core/codeFormats；
   · 所有可用码制一次性预渲染成叠放的层，切换只切可见层，
     不再每次重新生成 -> 无跳变、无重复开销；
   · 切换动画是横向平移 + 模糊渐变，平移方向按目标在选项里的
     相对位置决定（往右的选项向右进，反之向左）。
   ============================================================ */

const slots = useSlots()
const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV

const contentText = ref(readChildren())

function readChildren() {
  const nodes = slots.default ? slots.default() : []
  let text = ''
  const walk = list => {
    for (const node of list) {
      if (typeof node === 'string') text += node
      else if (typeof node.children === 'string') text += node.children
      else if (Array.isArray(node.children)) walk(node.children)
    }
  }
  walk(nodes)
  return text.trim()
}

const requested = computed(() => (Array.isArray(props.type) ? props.type : [props.type])
  .filter(format => CODE_FORMATS[format]))

const optionsList = computed(() => {
  const base = requested.value
  if (!base.length) return []
  if (base.some(format => supports(format, contentText.value))) return base
  return [...base, ...fallbackCandidates(base, contentText.value).filter(f => !base.includes(f))]
})

const items = computed(() => optionsList.value.map(format => ({
  format,
  label: CODE_FORMATS[format]?.label || format,
  usable: supports(format, contentText.value)
})))

const active = ref('')
const anyUsable = computed(() => items.value.some(item => item.usable))

function pickInitial() {
  const current = items.value.find(item => item.format === active.value)
  if (current && current.usable) return
  const firstUsable = items.value.find(item => item.usable)
  active.value = firstUsable ? firstUsable.format : (items.value[0]?.format || '')
}
watch(items, pickInitial, { immediate: true })

const mode = computed(() => renderMode(optionsList.value))
const switcherKind = computed(() => (items.value.length <= 3 ? 'segmented' : 'select'))
const switcherOptions = computed(() => items.value.map(item => ({
  label: item.label, value: item.format, disabled: !item.usable
})))

/* ---------- 预渲染：每个可用码制一个叠放层 ---------- */
const stageEl = ref(null)
const layerEls = new Map()
const renderError = ref('')
/* 切换方向：-1 向左进，1 向右进 */
const panDir = ref(1)
const leavingFormat = ref('')

function setLayerEl(el, format) {
  if (el) layerEls.set(format, el)
  else layerEls.delete(format)
}

async function themeColor() {
  await nextTick()
  const el = stageEl.value
  if (!el) return '#1b1b1f'
  return toHex(getComputedStyle(el).color, '#1b1b1f')
}

function toHex(color, fallback) {
  const value = String(color || '')
  const rgb = /^rgba?\((\d+),(\d+),(\d+)(?:,[\d.]+)?\)$/.exec(value)
  if (rgb) {
    const alpha = Number(rgb[4] ?? 1)
    if (alpha === 0) return fallback
    const hex = n => Number(n).toString(16).padStart(2, '0')
    return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3])
  }
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value
  return fallback
}

async function renderLayer(format) {
  const layer = layerEls.get(format)
  if (!layer) return
  layer.replaceChildren()
  if (!supports(format, contentText.value) || !contentText.value) return
  const meta = CODE_FORMATS[format]
  const opts = resolveOptions(format, props.options, isDev)
  const color = await themeColor()
  const size = props.width || 200
  try {
    if (meta.family === 'qr') {
      const QRCode = (await import('qrcode')).default
      const markup = await QRCode.toString(contentText.value, {
        errorCorrectionLevel: opts.errorCorrectionLevel,
        margin: opts.margin,
        version: opts.version || undefined,
        type: 'svg',
        width: size,
        color: { dark: color, light: '#ffffff00' }
      })
      const holder = document.createElement('div')
      holder.innerHTML = markup.replace(/<\?xml[^>]*\?>/g, '').trim()
      const svg = holder.querySelector('svg')
      if (svg) { svg.classList.add('ui-code-image__svg'); layer.appendChild(svg) }
    } else {
      const JsBarcode = (await import('jsbarcode')).default
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.classList.add('ui-code-image__svg')
      layer.appendChild(svg)
      JsBarcode(svg, contentText.value, {
        format: meta.render,
        flat: !!opts.flat,
        displayValue: opts.showText !== false,
        background: 'transparent',
        lineColor: color,
        margin: 10,
        width: 2,
        height: size - 40
      })
    }
  } catch (error) {
    renderError.value = String(error?.message || error).slice(0, 80)
  }
}

async function renderAll() {
  renderError.value = ''
  if (!stageEl.value) return
  await nextTick()
  for (const item of items.value) {
    if (item.usable) await renderLayer(item.format)
  }
}

/* 切换：先算方向，再触发旧层离开。 */
watch(active, (next, prev) => {
  const nextIndex = optionsList.value.indexOf(next)
  const prevIndex = optionsList.value.indexOf(prev)
  panDir.value = nextIndex >= prevIndex ? 1 : -1
  leavingFormat.value = prev || ''
  if (leavingTimer) clearTimeout(leavingTimer)
  leavingTimer = setTimeout(() => { leavingFormat.value = '' }, 460)
})
let leavingTimer = 0

/* 内容 / 选项 / 参数变化 -> 全量重渲染（预渲染保证切换时零开销）。
   高度与可见性只靠显示 / 隐藏切换，绝不销毁重建层：
   重建会让描边与图形在重建帧消失，看起来就是「码不见了」。 */
watch([contentText, optionsList, () => props.options, () => props.width], () => {
  nextTick(renderAll)
}, { deep: true })

/* 首帧必须渲染一次：层是空 div，不画就什么都不显示。 */
onMounted(() => { nextTick(renderAll) })

onBeforeUnmount(() => { clearTimeout(leavingTimer); layerEls.clear() })
</script>

<template>
  <div class="ui-code-image">
    <div
      ref="stageEl"
      class="ui-code-image__stage"
      :data-empty="!anyUsable || !contentText ? '' : undefined"
      :style="{ '--pan-dir': panDir }"
    >
      <!-- 所有可用码制叠放预渲染，同格堆叠保证尺寸取最大值、切换不跳变。
           层常驻 DOM：可见性只用 is-active 切换，不做 v-if 销毁重建。 -->
      <div
        v-for="item in items"
        :key="item.format"
        :ref="el => setLayerEl(el, item.format)"
        class="ui-code-image__layer"
        :class="{
          'is-active': anyUsable && !!contentText && active === item.format,
          'is-leaving': leavingFormat === item.format
        }"
        aria-hidden="true"
      ></div>
      <UiEmptyState
        v-show="!anyUsable || !contentText"
        :title="contentText ? '无法生成' : '暂无内容'"
        :description="contentText ? '当前内容不符合任何可选码制，请调整内容或码制' : '请在 children 里传入要编码的文本'"
      />
      <p v-if="renderError" class="ui-code-image__error">渲染失败：{{ renderError }}</p>
    </div>

    <div v-if="items.length > 1" class="ui-code-image__switcher">
      <div v-if="mode === 'icon'" class="ui-code-image__icon-row" role="tablist">
        <button
          v-for="item in items"
          :key="item.format"
          type="button"
          role="tab"
          class="ui-code-image__icon-btn"
          :class="{ 'is-active': active === item.format, 'is-disabled': !item.usable }"
          :aria-selected="active === item.format"
          :disabled="!item.usable"
          :title="item.usable ? item.label : item.label + '（当前内容不适用）'"
          @click="active = item.format"
        >
          <svg v-if="CODE_FORMATS[item.format]?.family === 'qr'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M19 5v14" />
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <UiSegmented
        v-else-if="switcherKind === 'segmented'"
        :model-value="active"
        :options="switcherOptions"
        @update:model-value="active = $event"
      />
      <UiSelect
        v-else
        :model-value="active"
        :options="switcherOptions"
        @update:model-value="active = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.ui-code-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.ui-code-image__stage {
  /* 所有层同格堆叠：stage 尺寸 = 最大层，切换不改变占位。 */
  display: grid;
  place-items: center;
  min-height: 120px;
  width: 100%;
  padding: 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(16px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
}
.ui-code-image__stage > * { grid-area: 1 / 1; }
/* 空状态叠在同一格，靠 v-show 控制，不参与尺寸竞争。 */
.ui-code-image__layer {
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* 进入层从目标相对位置那一侧平移进来，并带模糊渐变。 */
  transform: translateX(calc(var(--pan-dir, 1) * 24%));
  filter: blur(10px);
}
.ui-code-image__layer.is-active {
  opacity: 1;
  visibility: visible;
  transform: none;
  filter: blur(0);
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
/* 离开层：向进入方向的反侧平移 + 模糊渐出。 */
.ui-code-image__layer.is-leaving {
  visibility: visible;
  opacity: 0;
  transform: translateX(calc(var(--pan-dir, 1) * -24%));
  filter: blur(8px);
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
.ui-code-image__svg { max-width: 100%; height: auto; display: block; }
.ui-code-image__error { margin: 6px 0 0; color: var(--error); font-size: var(--fs-micro); }
.ui-code-image__switcher { width: 100%; display: flex; justify-content: center; }
.ui-code-image__icon-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.ui-code-image__icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 12px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(12px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), border-color var(--t-fade), transform var(--t-feedback);
}
.ui-code-image__icon-btn svg { width: 20px; height: 20px; }
.ui-code-image__icon-btn:hover:not(.is-disabled) { border-color: var(--primary); color: var(--primary); }
.ui-code-image__icon-btn:active:not(.is-disabled) { transform: scale(var(--press-scale)); }
.ui-code-image__icon-btn.is-active {
  border-color: var(--primary);
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.ui-code-image__icon-btn.is-disabled { opacity: .42; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .ui-code-image__layer,
  .ui-code-image__layer.is-active,
  .ui-code-image__layer.is-leaving { transition-duration: .01ms; filter: none; transform: none; }
}
</style>
