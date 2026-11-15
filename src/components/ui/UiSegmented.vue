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
  minItemWidth: { type: Number, default: 0 }
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

/* 每个选项的期望最小宽度：图标在上时更高一点，纯图标最窄。 */
const itemMinWidth = computed(() => {
  if (props.minItemWidth > 0) return props.minItemWidth
  if (!props.showLabels && hasIcons.value) return 52
  if (props.iconPlacement === 'top') return 78
  return 62
})

/* 用「可用宽度能放下几列」算列数，而不是先布局再检测换行：
   检测换行会在「切到网格后又能放下」之间来回抖。 */
function measure() {
  const el = rootEl.value
  if (!el || !props.autoMultiline) {
    columns.value = props.options.length || 1
    isMultiline.value = false
    return
  }
  const available = el.clientWidth
  const count = props.options.length || 1
  const gap = 4
  /* 单行有 3px padding * 2 + 3px gap；网格用 gap 4px、无 padding。 */
  const usable = Math.max(0, available - 6 - (count - 1) * 3)
  const fits = Math.max(1, Math.floor((usable + 3) / (itemMinWidth.value + 3)))
  const cols = Math.min(count, Math.max(1, fits))
  columns.value = cols
  isMultiline.value = cols < count
}

let observer = null

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(rootEl.value)
  }
})

watch([() => props.options, () => props.showLabels, () => props.iconPlacement, () => props.minItemWidth], () => {
  nextTick(measure)
}, { deep: true })

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
      :style="{ '--seg-cols': columns }"
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
        <span v-if="option.icon" class="ui-segmented__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="option.icon"></svg>
        </span>
        <span v-if="showLabels || !option.icon" class="ui-segmented__text">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
