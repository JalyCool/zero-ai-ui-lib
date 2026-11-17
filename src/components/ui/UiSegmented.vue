<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /* [{ label, value, disabled, icon }]；icon 是 24x24 viewBox 内的 SVG 内部标记 */
  options: { type: Array, default: () => [] },
  /* 左上角标签 */
  label: { type: String, default: '' },
  /* one-line：标签与分段控件同一行；默认上下堆叠 */
  layout: { type: String, default: 'stack' },
  /* 图标位置：
     leading = 放在文字前端（原有布局完全不变，只是多了个图标）；
     top     = 放在文字上方（卡片式，图标即视觉主体）。 */
  iconPlacement: { type: String, default: 'leading' },
  /* false 时只显示图标；无图标的选项仍显示文字。 */
  showLabels: { type: Boolean, default: true },
  /* 单行宽度装不下时自动切成多行网格（不需要图标也会触发）。 */
  autoMultiline: { type: Boolean, default: true },
  /* 多行时单个选项的最小宽度（px）；0 = 按图标位置自动取。 */
  minItemWidth: { type: Number, default: 0 },
  /* 手动指定每行列数（0 = 自动按内容宽度算）。多行能力本身一直保留。 */
  columns: { type: Number, default: 0 },
  /* 多行时最多显示几行（默认 3），超出后在控件内纵向滚动 */
  maxRows: { type: Number, default: 3 }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   分段控件
   · 单行：胶囊轨道 + 滑动指示器（原有外观，一字不改）；
   · 多行：宽度装不下时自动切成网格，指示器让位给「选中项自己填底色」——
     一行里滑动的指示器在换行后会跨行乱跑，不如按卡片着色；
   · 图标两种放法：leading 在文字前端、top 在文字上方。
   ============================================================ */

const rootEl = ref(null)
const columns = ref(1)
const isMultiline = ref(false)
/* 实测：行高、总行数、超行后的最大高度 */
const rowHeight = ref(0)
const rowCount = ref(1)
const scrollMaxHeight = ref(0)

const activeIndex = computed(() => props.options.findIndex(option => option.value === props.modelValue))
const hasIcons = computed(() => props.options.some(option => option.icon))

const indicatorStyle = computed(() => {
  const count = props.options.length
  if (!count || activeIndex.value < 0 || isMultiline.value) return null
  const width = `calc((100% - 6px - ${(count - 1) * 3}px) / ${count})`
  return {
    width,
    transform: `translateX(calc(${activeIndex.value * 100}% + ${activeIndex.value * 3}px))`
  }
})

/* 列数按「每个选项真实内容宽度」算（canvas measureText），
   不用固定最小宽度猜：否则短内容也会被当成宽块，一行只放得下一两个。
   文字宽度与图标宽度分别算，图标在前时是 图标 + 间距 + 文字，
   图标在上时取两者较大值。 */
let measureCtx = null
function textWidth(text, font) {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  if (!measureCtx) return String(text).length * 7
  measureCtx.font = font || '12px system-ui'
  return measureCtx.measureText(String(text)).width
}

const naturalWidths = computed(() => {
  const font = typeof window !== 'undefined'
    ? (() => {
        const el = rootEl.value && rootEl.value.querySelector('button')
        if (!el) return '12px system-ui'
        const cs = getComputedStyle(el)
        return cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
      })()
    : '12px system-ui'
  const padX = 6 + 10            /* 左右内边距 */
  const iconSize = props.iconPlacement === 'top' ? 21 : 18
  const iconGap = 6
  return props.options.map(option => {
    const hasIcon = !!option.icon && props.showLabels !== false
    const showsIconOnly = !props.showLabels && !!option.icon
    const labelW = props.showLabels || !option.icon ? textWidth(option.label || '', font) : 0
    if (showsIconOnly) return iconSize + padX + 8
    if (hasIcon && props.iconPlacement === 'top') return Math.max(iconSize, labelW) + padX
    if (hasIcon) return iconSize + iconGap + labelW + padX
    return labelW + padX
  })
})

function measure() {
  const el = rootEl.value
  const count = props.options.length || 1
  /* 调用方显式给了列数：直接用它，不再量宽度。 */
  if (props.columns > 0) {
    const forced = Math.max(1, Math.min(count, props.columns))
    columns.value = forced
    isMultiline.value = forced < count
    return
  }
  if (!el || !props.autoMultiline) {
    columns.value = count
    isMultiline.value = false
    return
  }
  const available = el.clientWidth
  if (!available) { columns.value = count; isMultiline.value = false; return }
  const gap = 3
  const inner = Math.max(0, available - 6 - (count - 1) * gap)
  /* 列数按「中位数宽度」而不是最宽标签算：
     一个超长标签会把整排挤成 2 列巨格（图标巨大、文字被截），
     中位数让多数格子保持第一行那种密度，个别长标签省略号截断。 */
  const sorted = naturalWidths.value.slice().sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 64
  const cap = Math.max(props.minItemWidth || 0, available * 0.46)
  /* 密度下限：格子最窄也不窄于「容器 6 等分」——
     长标签在这个宽度里省略号截断，而不是把整排挤成 2 个巨格。
     （单行短标签布局不受影响：fits 本来就到 count 就封顶。） */
  const minDensity = available / 6 - gap
  const unit = Math.min(cap, Math.max(minDensity, median))
  const fits = Math.max(1, Math.floor((inner + gap) / (unit + gap)))
  const cols = Math.min(count, Math.max(1, fits))
  columns.value = cols
  isMultiline.value = cols < count
  nextTick(measureRows)
}

/* 多行时量真实行高与行数：max-height 必须按实测算，' */
function measureRows() {
  const el = rootEl.value
  if (!el) return
  const buttons = Array.from(el.querySelectorAll(":scope > button"))
  if (!buttons.length) return
  const first = buttons[0]
  rowHeight.value = first.offsetHeight
  const tops = new Set(buttons.map(b => b.offsetTop))
  rowCount.value = tops.size
  const gap = 4
  const rows = Math.max(1, Math.round(props.maxRows))
  /* 只有真的超过 maxRows 才限高；否则不设上限，避免留白 */
  scrollMaxHeight.value = rowCount.value > rows
    ? rows * first.offsetHeight + (rows - 1) * gap
    : 0
  el.style.setProperty("--seg-max-h", scrollMaxHeight.value ? scrollMaxHeight.value + "px" : "none")
  el.style.setProperty("--seg-scroll", scrollMaxHeight.value ? "auto" : "hidden")
}

let observer = null

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(rootEl.value)
  }
})

watch([() => props.options, () => props.showLabels, () => props.iconPlacement, () => props.minItemWidth, () => props.columns], () => {
  nextTick(measure)
}, { deep: true })

/* 字体加载完再量一次：避免用回退字体算出的宽度定列数。 */
onMounted(() => {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure())
})

onBeforeUnmount(() => { if (observer) observer.disconnect() })

function pick(option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="ui-segmented-field" :class="`ui-segmented-field--${layout}`">
    <span v-if="label" class="ui-segmented-field__label">{{ label }}</span>

    <div
      ref="rootEl"
      class="ui-segmented"
      :class="{
        'is-multiline': isMultiline,
        'is-icon-top': iconPlacement === 'top',
        'is-icon-only': !showLabels && hasIcons
      }"
      :style="{ '--seg-cols': columns, '--seg-max-rows': maxRows, '--seg-max-h': scrollMaxHeight ? scrollMaxHeight + 'px' : 'none', '--seg-scroll': scrollMaxHeight ? 'auto' : 'hidden' }"
      role="group"
    >
      <span
        v-if="indicatorStyle"
        class="ui-segmented__indicator"
        :style="indicatorStyle"
        aria-hidden="true"
      ></span>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="{ 'is-active': modelValue === option.value, 'is-disabled': !!option.disabled }"
        :aria-pressed="modelValue === option.value"
        :aria-disabled="option.disabled ? 'true' : undefined"
        :aria-label="!showLabels && option.icon ? option.label : undefined"
        :title="!showLabels && option.icon ? option.label : undefined"
        :disabled="!!option.disabled"
        @click="pick(option)"
      >
        <!-- 图标统一套一层容器（leading 也进容器）：圆角底 + 平滑过渡，
             不再让原始 SVG 裸露在按钮里 -->
        <span v-if="option.icon" class="ui-segmented__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="option.icon"></svg>
        </span>
        <span v-if="showLabels || !option.icon" class="ui-segmented__text">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
