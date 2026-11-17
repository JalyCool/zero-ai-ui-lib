<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  /* 列配置：[{ items, value, separator?, label? }]
     items 为原始值或 { value, label }；separator 是该列后面跟的分隔符（可含最后一列，如日期「日」）。 */
  columns: { type: Array, required: true },
  /* 面板未展开时屏蔽列内焦点 */
  interactive: { type: Boolean, default: true },
  /* 高亮块高度（px），默认 30 与数字行高一致 */
  itemHeight: { type: Number, default: 30 },
  /* 离中心越远越模糊（景深），并轻微降低不透明度 */
  distanceBlur: { type: Boolean, default: true },
  /* 最远行的模糊半径上限（px） */
  maxBlur: { type: Number, default: 3.4 }
})

const emit = defineEmits(['change'])

/* ============================================================
   通用波轮（时间 / 日期波轮共用基座）
   · 列数与分隔符由 columns 决定，可任意增删字段；
   · 高亮块固定在正中间不动，点击和滚动移动的是背后的数字层；
   · 每列停止 140ms 后把居中的值吸附并 change 回传 { index, value }；
   · 样式以时间波轮为准：浅底圆角框 + 主色容器高亮块 + 分隔符居中。
   ============================================================ */

const columnEls = ref([])
const timers = []
/* 列还没完成首次定位时不画景深：否则整列都在「离中心很远」的状态，
   展开瞬间看起来就是一片糊。定位完成后 ready = true 才启用距离模糊。 */
const ready = ref(false)

function setColumnEl(el, index) {
  if (el) columnEls.value[index] = el
}

function itemValue(item) {
  if (item && typeof item === 'object') return item.value
  return item
}

function scrollToValue(index, value, behavior = 'smooth') {
  const column = columnEls.value[index]
  if (!column) return
  const target = column.querySelector('[data-value="' + CSS.escape(String(value)) + '"]')
  if (!target) return
  const top = target.offsetTop - (column.clientHeight - target.offsetHeight) / 2
  column.scrollTo({ top: Math.max(0, top), behavior })
}

function centeredValue(index) {
  const column = columnEls.value[index]
  if (!column) return null
  const center = column.scrollTop + column.clientHeight / 2
  let best = null
  let bestDistance = Infinity
  column.querySelectorAll('button[data-value]').forEach(button => {
    const middle = button.offsetTop + button.offsetHeight / 2
    const distance = Math.abs(middle - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = button.dataset.value
    }
  })
  return best
}

/* 按「离高亮块中心几行」给每行写字：模糊 + 淡出，越远越虚。
   直接写内联样式而不是靠 CSS：距离是滚动位置的连续函数，
   CSS 没法表达「第几行离中心多远」。 */
let blurFrame = 0
function paintBlur(index) {
  if (!props.distanceBlur || !ready.value) return
  const column = columnEls.value[index]
  if (!column) return
  const center = column.scrollTop + column.clientHeight / 2
  const unit = Math.max(1, props.itemHeight)
  column.querySelectorAll('button').forEach(button => {
    const middle = button.offsetTop + button.offsetHeight / 2
    const rows = Math.abs(middle - center) / unit
    const blur = Math.min(props.maxBlur, Math.max(0, (rows - 0.6) * 0.9))
    button.style.filter = blur > 0.04 ? 'blur(' + blur.toFixed(2) + 'px)' : ''
    button.style.opacity = String(Math.max(0.26, 1 - Math.max(0, rows - 1.7) * 0.24))
  })
}

function schedulePaint(index) {
  if (blurFrame) cancelAnimationFrame(blurFrame)
  blurFrame = requestAnimationFrame(() => { blurFrame = 0; paintBlur(index) })
}

function onScroll(index) {
  schedulePaint(index)
  clearTimeout(timers[index])
  timers[index] = setTimeout(() => {
    const raw = centeredValue(index)
    if (raw === null) return
    scrollToValue(index, raw)
    const column = props.columns[index]
    const matched = (column?.items || []).find(item => String(itemValue(item)) === String(raw))
    emit('change', { index, value: matched !== undefined ? itemValue(matched) : raw })
  }, 140)
}

function select(index, item) {
  const value = itemValue(item)
  scrollToValue(index, value)
  requestAnimationFrame(() => paintBlur(index))
  emit('change', { index, value })
}

/* 外部值变化（含切月后日列变化）时把各列重新居中。 */
watch(() => props.columns.map(c => c.value).join('|'), () => {
  props.columns.forEach((column, index) => {
    scrollToValue(index, column.value)
    requestAnimationFrame(() => paintBlur(index))
  })
})

onMounted(() => {
  /* 首帧把景深画上，否则初始状态所有行都是清晰的。 */
  props.columns.forEach((_, index) => requestAnimationFrame(() => paintBlur(index)))
})

onBeforeUnmount(() => {
  timers.forEach(timer => clearTimeout(timer))
  if (blurFrame) cancelAnimationFrame(blurFrame)
})

function scrollAll(behavior = 'smooth') {
  ready.value = false
  props.columns.forEach((column, index) => scrollToValue(index, column.value, behavior))
  /* 定位落地后再启用景深：两帧足够让 scrollTo 生效，
     期间不画模糊，所以展开瞬间不会出现「整列糊住」。 */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ready.value = true
      props.columns.forEach((_, index) => paintBlur(index))
    })
  })
}
defineExpose({ scrollAll, scrollToValue })
</script>

<template>
  <div class="ui-wheel" :style="{ '--wheel-item-h': itemHeight + 'px' }">
    <span class="ui-wheel__highlight" aria-hidden="true"></span>
    <template v-for="(column, index) in columns" :key="index">
      <div
        :ref="el => setColumnEl(el, index)"
        class="ui-wheel__column"
        role="listbox"
        :aria-label="column.label"
        :aria-valuenow="String(column.value)"
        @scroll.passive="onScroll(index)"
      >
        <button
          v-for="(item, i) in column.items"
          :key="i"
          type="button"
          role="option"
          :data-value="String(itemValue(item))"
          :aria-selected="String(itemValue(item)) === String(column.value)"
          :tabindex="interactive ? 0 : -1"
          :class="{ 'is-selected': String(itemValue(item)) === String(column.value) }"
          @click="select(index, item)"
        >
          {{ item && typeof item === 'object' ? String(item.label ?? item.value) : String(item) }}
        </button>
      </div>
      <span
        v-if="column.separator"
        class="ui-wheel__sep"
        aria-hidden="true"
      >{{ column.separator }}</span>
    </template>
  </div>
</template>

<style scoped>
.ui-wheel {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 172px;
  padding: 4px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 13px;
  background: var(--surface-container-low);
}
.ui-wheel__highlight {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 50%;
  height: var(--wheel-item-h);
  transform: translateY(-50%);
  border-radius: 9px;
  background: var(--primary-container);
  pointer-events: none;
  z-index: 0;
}
.ui-wheel__column {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 66px 2px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%);
}
.ui-wheel__column::-webkit-scrollbar { display: none; }
.ui-wheel__column button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--wheel-item-h);
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  cursor: pointer;
  transition: color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-wheel__column button { will-change: filter, opacity; }
.ui-wheel__column button:hover { background: color-mix(in oklab, var(--surface) 46%, transparent); color: var(--on-surface); }
.ui-wheel__column button:active { transform: scale(.96); }
/* 落在高亮块里的那一项：不带底色，只换颜色和字重。 */
.ui-wheel__column button.is-selected {
  background: transparent;
  color: var(--on-primary-container);
  font-weight: var(--w-strong);
}
.ui-wheel__sep {
  align-self: center;
  position: relative;
  z-index: 1;
  color: var(--on-surface-variant);
  font-size: var(--fs-body);
  font-weight: var(--w-strong);
}
</style>
