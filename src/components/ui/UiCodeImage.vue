<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import UiSegmented from './UiSegmented.vue'
import UiSelect from './UiSelect.vue'
import UiEmptyState from './UiEmptyState.vue'
import {
  CODE_FORMATS, iconOf, supports, resolveOptions, renderMode, fallbackCandidates
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
  icon: iconOf(format),
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
/* 只有两个可选项、且跨一维 / 二维两族：图标本身已经把族差别说清楚了，
   文字标签纯属冗余，只留图标。 */
const labelsRedundant = computed(() =>
  mode.value === 'icon' && items.value.length === 2)
/* 只有跨族（图标模式）才把图标带进切换控件：同族全是同一种图标，纯属噪音。 */
const switcherOptions = computed(() => items.value.map(item => ({
  label: item.label,
  value: item.format,
  disabled: !item.usable,
  icon: mode.value === 'icon' ? item.icon : ''
})))

/* ---------- 预渲染：每个可用码制一个叠放层 ---------- */
const stageEl = ref(null)
const layerEls = new Map()
const renderError = ref('')
/* 切换方向：横向时 ±1 = 左 / 右，纵向（下拉框）时 ±1 = 上 / 下。
   拆成两个分量写进 CSS 变量，层的基础 transform 只做位移不做过渡，
   因此可以「先按新方向落位、下一帧再进场」—— 滑入方向才会跟着动态切。 */
const panDir = ref(1)
const verticalPan = computed(() => switcherKind.value === 'select')
const panX = computed(() => (verticalPan.value ? 0 : panDir.value))
const panY = computed(() => (verticalPan.value ? panDir.value : 0))
const leavingFormat = ref('')
/* 层真正显示的码制：比 active 晚一帧，保证进场层起点已经是新方向 */
const shownFormat = ref(active.value)

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
        /* 文字用统一的等宽字体变量：条码下方数字必须等宽，否则会宽度跳变 */
        font: 'var(--font-numeric)',
        fontSize: 15,
        textMargin: 2,
        /* EAN-13 第一个数字孤立在左侧时，把它和右侧两组数字靠拢：
           margin 给足左右留白 + textAlign 居中，避免「码距过大、整体偏左」 */
        margin: 6,
        textAlign: 'center',
        width: 2,
        height: size - 40
      })
      /* JsBarcode 不认 CSS 变量，渲染后把 font-family 补到 svg 上 */
      svg.style.fontFamily = 'var(--font-numeric, ui-monospace, monospace)'
      svg.style.fontVariantNumeric = 'tabular-nums'
      svg.style.fontFeatureSettings = 'var(--font-feat-tnum)'
      /* 一维码的宽度由内容长度决定，长内容会直接把 svg 撑出画布：
         把它的固有尺寸转成 viewBox，宽高交给 CSS 自适应。 */
      /* JsBarcode 写的是 "310px" 这类带单位的值，必须 parseFloat。 */
      const intrinsicW = parseFloat(svg.getAttribute('width')) || 0
      const intrinsicH = parseFloat(svg.getAttribute('height')) || 0
      if (intrinsicW > 0 && intrinsicH > 0) {
        svg.setAttribute('viewBox', '0 0 ' + intrinsicW + ' ' + intrinsicH)
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.removeAttribute('style')
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        svg.style.width = '100%'
        svg.style.maxWidth = '100%'
        svg.style.height = 'auto'
        svg.style.display = 'block'
        /* 一维码以「码本身」的视觉重心居中：EAN-13 前导数字在左，纯居中会显得偏左，
           给 svg 一点左内边距补偿 */
        svg.style.marginLeft = '2px'
      }
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

/* 切换：方向按「目标相对当前位置」决定 —— 目标排在后面就往正方向进，
   排在前面就往反方向进；旧层同步向反方向离场。
   新层的进场延后到下一帧：这一帧它先按新方向落位（无过渡），
   下一帧再过渡到原位，滑入方向才是真正的动态方向。 */
let panFrame = 0
watch(active, (next, prev) => {
  const nextIndex = optionsList.value.indexOf(next)
  const prevIndex = optionsList.value.indexOf(prev)
  panDir.value = nextIndex >= prevIndex ? 1 : -1
  if (prev === undefined || prev === '' || reduceNow()) {
    shownFormat.value = next
    leavingFormat.value = ''
    return
  }
  leavingFormat.value = prev
  if (panFrame) cancelAnimationFrame(panFrame)
  panFrame = requestAnimationFrame(() => {
    panFrame = requestAnimationFrame(() => {
      panFrame = 0
      shownFormat.value = next
    })
  })
  if (leavingTimer) clearTimeout(leavingTimer)
  leavingTimer = setTimeout(() => { leavingFormat.value = '' }, 460)
})
let leavingTimer = 0

const reduceNow = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* 内容 / 选项 / 参数变化 -> 全量重渲染（预渲染保证切换时零开销）。
   高度与可见性只靠显示 / 隐藏切换，绝不销毁重建层：
   重建会让描边与图形在重建帧消失，看起来就是「码不见了」。 */
watch([contentText, optionsList, () => props.options, () => props.width], () => {
  nextTick(renderAll)
}, { deep: true })

/* 首帧必须渲染一次：层是空 div，不画就什么都不显示。 */
onMounted(() => { nextTick(renderAll) })

onBeforeUnmount(() => {
  clearTimeout(leavingTimer)
  if (panFrame) cancelAnimationFrame(panFrame)
  layerEls.clear()
})
</script>

<template>
  <div class="ui-code-image">
    <div
      ref="stageEl"
      class="ui-code-image__stage"
      :data-empty="!anyUsable || !contentText ? '' : undefined"
      :style="{ '--pan-x': panX, '--pan-y': panY }"
    >
      <!-- 所有可用码制叠放预渲染，同格堆叠保证尺寸取最大值、切换不跳变。
           层常驻 DOM：可见性只用 is-active 切换，不做 v-if 销毁重建。 -->
      <div
        v-for="item in items"
        :key="item.format"
        :ref="el => setLayerEl(el, item.format)"
        class="ui-code-image__layer"
        :class="{
          'is-active': anyUsable && !!contentText && shownFormat === item.format,
          'is-leaving': leavingFormat === item.format && shownFormat !== item.format
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
      <!-- 2~3 项：分段控件（跨族时图标在上、只留图标）；
           4 项以上：下拉框（列表行里图标在前，紧凑不占高）。 -->
      <UiSegmented
        v-if="switcherKind === 'segmented'"
        :model-value="active"
        :options="switcherOptions"
        :icon-placement="mode === 'icon' ? 'top' : 'leading'"
        :show-labels="!labelsRedundant"
        @update:model-value="active = $event"
      />
      <UiSelect
        v-else
        :model-value="active"
        :options="switcherOptions"
        icon-placement="leading"
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
  border-radius: calc(16px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  /* 切换层是横向滑入的，会临时探出 24%：舞台裁掉它，
     否则探出的那一截会撑出页面横向滚动条。 */
  overflow: hidden;
}
.ui-code-image__stage > * { grid-area: 1 / 1; }
/* 空状态叠在同一格，靠 v-show 控制，不参与尺寸竞争。 */
/* 位移拆成 x / y 两个分量：横向切换（分段 / 图标）只给 x，
   下拉切换只给 y —— 方向由 --pan-x / --pan-y 的符号动态决定。 */
.ui-code-image__layer {
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* 进场层停在「新方向的那一侧」，无过渡：这一帧只落位。 */
  transform: translate(
    calc(var(--pan-x, 1) * 24%),
    calc(var(--pan-y, 1) * 24%)
  );
  filter: blur(10px);
}
/* 下一帧：从那一侧过渡回原位，同时模糊渐清 —— 这才是滑入动画。 */
.ui-code-image__layer.is-active {
  visibility: visible;
  opacity: 1;
  transform: translate(0, 0);
  filter: blur(0);
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
/* 离开层：向进场方向的反侧滑出 + 模糊渐出。 */
.ui-code-image__layer.is-leaving {
  visibility: visible;
  opacity: 0;
  transform: translate(
    calc(var(--pan-x, 1) * -24%),
    calc(var(--pan-y, 1) * -24%)
  );
  filter: blur(8px);
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
.ui-code-image__svg { max-width: 100%; height: auto; display: block; }
.ui-code-image__error { margin: 6px 0 0; color: var(--error); font-size: var(--fs-micro); }
/* 码面内的字符（版本号 / 内嵌文本）一律等宽数字，避免扫码区排版抖动 */
.ui-code-image__stage { font-family: var(--font-numeric); font-variant-numeric: tabular-nums; font-feature-settings: var(--font-feat-tnum); }
.ui-code-image__switcher { width: 100%; display: flex; justify-content: center; }

@media (prefers-reduced-motion: reduce) {
  .ui-code-image__layer,
  .ui-code-image__layer.is-active,
  .ui-code-image__layer.is-leaving { transition-duration: .01ms; filter: none; transform: none; }
}
</style>
