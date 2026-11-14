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
   校验 / 参数 / 图标-文字判断 / 降级候选全部在 core/codeFormats，
   组件只负责：读一次内容、组织选项、切换控件、把码画进容器。
   · 不合规选项可见但禁用；当前项不可用时自动切到可用项；
   · 全部不可用走降级候选（真实出现在控件里）；仍无解则空状态。
   ============================================================ */

const slots = useSlots()
const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV

/* children 文本只读一次：切换类型不重读，只换渲染的码和参数。 */
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

/* 请求项有任一可用 -> 只用请求项；全不可用 -> 追加真实降级候选。 */
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

/* 当前项不可用时自动切到第一个可用项。 */
function pickInitial() {
  const current = items.value.find(item => item.format === active.value)
  if (current && current.usable) return
  const firstUsable = items.value.find(item => item.usable)
  active.value = firstUsable ? firstUsable.format : (items.value[0]?.format || '')
}
watch(items, pickInitial, { immediate: true })

/* 切换控件：跨族用图标（差异大），同族用文字；文字里 <=3 Segmented、>3 下拉。 */
const mode = computed(() => renderMode(optionsList.value))
const switcherKind = computed(() => (items.value.length <= 3 ? 'segmented' : 'select'))
const switcherOptions = computed(() => items.value.map(item => ({
  label: item.label, value: item.format, disabled: !item.usable
})))

/* ---------- 渲染 ---------- */
const stageEl = ref(null)
const renderError = ref('')

/* qrcode 库只认 hex；getComputedStyle 给 rgb()，统一转成 #rrggbb。 */
function toHex(color, fallback) {
  const value = String(color || '')
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value)
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4])
    if (alpha === 0) return fallback
    const hex = n => Number(n).toString(16).padStart(2, '0')
    return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3])
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value.length === 4
    ? '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
    : value
  return fallback
}

async function themeColor() {
  await nextTick()
  const el = stageEl.value
  if (!el) return '#1b1b1f'
  return toHex(getComputedStyle(el).color, '#1b1b1f')
}

/* 内容变化时重读一次（children 语义上只读一次，但热更 / 动态内容要跟上）。 */
watch(() => slots.default && slots.default().length, () => {
  const next = readChildren()
  if (next !== contentText.value) contentText.value = next
})

async function render() {
  const stage = stageEl.value
  renderError.value = ''
  if (!stage) return
  stage.replaceChildren()
  if (!active.value || !anyUsable.value || !contentText.value) return
  const format = active.value
  const meta = CODE_FORMATS[format]
  const opts = resolveOptions(format, props.options, isDev)
  const color = await themeColor()
  const size = props.width || 220
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
      if (svg) {
        svg.classList.add('ui-code-image__svg')
        stage.appendChild(svg)
      } else renderError.value = '二维码渲染异常'
      /* 清掉临时 holder（它没进 DOM，无需处理） */
    } else {
      const JsBarcode = (await import('jsbarcode')).default
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.classList.add('ui-code-image__svg')
      stage.appendChild(svg)
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

watch([active, () => props.options, contentText], () => nextTick(render))
/* 首帧：active 在 setup 期已由 pickInitial 定好，watch 基线就是它，
   不会自发触发，所以挂载后必须主动渲染一次。 */
onMounted(() => nextTick(render))
onBeforeUnmount(() => { renderError.value = '' })
</script>

<template>
  <div class="ui-code-image">
    <div class="ui-code-image__stage" :data-empty="!anyUsable || !contentText ? '' : undefined">
      <div v-show="anyUsable && contentText" ref="stageEl" class="ui-code-image__canvas"></div>
      <UiEmptyState
        v-if="!anyUsable || !contentText"
        :title="contentText ? '无法生成' : '暂无内容'"
        :description="contentText ? '当前内容不符合任何可选码制，请调整内容或码制' : '请在 children 里传入要编码的文本'"
      />
      <p v-if="renderError" class="ui-code-image__error">渲染失败：{{ renderError }}</p>
    </div>

    <!-- 多于一个选项才出现切换控件 -->
    <div v-if="items.length > 1" class="ui-code-image__switcher">
      <!-- 跨族差异大：图标 + 文字 -->
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
      <!-- 同族差异小：文字标签；<=3 Segmented，>3 下拉 -->
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
.ui-code-image__stage[data-empty] :deep(.ui-empty) { padding: 8px 0; }
.ui-code-image__canvas {
  display: grid;
  place-items: center;
  min-width: 0;
}
.ui-code-image__svg {
  max-width: 100%;
  height: auto;
  display: block;
}
.ui-code-image__error {
  margin: 6px 0 0;
  color: var(--error);
  font-size: var(--fs-micro);
}
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
</style>
