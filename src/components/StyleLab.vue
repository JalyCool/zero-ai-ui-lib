<script setup>
import { computed, ref, watch } from 'vue'
import { state } from '../core/state'
import { PRESET_COLORS } from '../core/theme'
import { getMotionTone, setMotionTone } from '../core/motionTone'
import {
  UiButton, UiCheckbox, UiChip, UiColorPicker, UiSegmented, UiSelect, UiSlider,
  UiStatusMark, UiSwitch, UiText
} from './ui'

/* ============================================================
   Style Lab（样式测试）
   把「调性 / 外观 / 配色 / 圆角 / 密度 / 字号」做成可当场看效果的
   试验台：所有控件都用库自己的组件，改动直接落到全局 CSS 令牌，
   下方预览区即时反映。正式应用的这些值应该在代码 / zero.config 里定死，
   不要把整个面板搬到用户设置页。
   ============================================================ */

const scheme = computed({ get: () => state.scheme, set: v => { state.scheme = v } })
const appearance = computed({ get: () => state.appearance, set: v => { state.appearance = v } })
const seed = computed({ get: () => state.seed, set: v => { state.seed = v } })

const motion = ref(getMotionTone())
const radius = ref(1)
const density = ref(0.93)
const fontScale = ref(1)
const demoOn = ref(true)
const previewCheck = ref(true)
const previewSlider = ref(42)
const previewPick = ref('button')
const previewOptions = [
  { label: '按钮', value: 'button' },
  { label: '标签 / 复选', value: 'chip' },
  { label: '开关', value: 'switch' },
  { label: '状态标记', value: 'status' },
  { label: '滑轨', value: 'slider' },
  { label: '文字动效', value: 'text' }
]

const schemeOptions = [
  { label: 'Material 鲜艳', value: 'material' },
  { label: '黑白灰', value: 'mono' }
]
const appearanceOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '纯白', value: 'white' },
  { label: '纯黑', value: 'black' }
]
const motionOptions = [
  { label: '克制', value: 'calm' },
  { label: '活泼', value: 'lively' }
]

function applyMotion(value) {
  motion.value = setMotionTone(value)
}

/* 三个数值档直接改全局令牌：圆角倍率 / 密度（含派生间距）/ 字号基准。 */
watch(radius, value => document.documentElement.style.setProperty('--radius-scale', String(value)), { immediate: true })
watch(density, value => {
  const el = document.documentElement.style
  el.setProperty('--density', String(value))
  el.setProperty('--space-gap', (20 * value).toFixed(2) + 'px')
  el.setProperty('--space-card', (16 * value).toFixed(2) + 'px')
  el.setProperty('--space-metric', (14 * value).toFixed(2) + 'px')
  el.setProperty('--space-item', (12 * value).toFixed(2) + 'px')
}, { immediate: true })
watch(fontScale, value => document.documentElement.style.setProperty('--font-scale', String(value)), { immediate: true })
</script>

<template>
  <div class="style-lab">
    <section class="style-lab__group">
      <h4>调性</h4>
      <UiSegmented :model-value="motion" :options="motionOptions" label="动效气质（仅演示）" @update:model-value="applyMotion" />
      <p class="style-lab__hint">
        活泼模式按 react-bits 的弹簧参数（高刚度 + 大 bounce）翻译成 CSS 曲线，过冲给到 1.6~2.1。
        <b>这不是用户设置</b>：正式应用在代码里 <code>setMotionTone('lively')</code> 或写进 <code>zero.config</code> 的 <code>ui.motion</code>。
      </p>
    </section>

    <section class="style-lab__group">
      <h4>外观</h4>
      <UiSegmented v-model="appearance" :options="appearanceOptions" label="明暗" />
      <UiSegmented v-model="scheme" :options="schemeOptions" label="配色方案" />
      <UiColorPicker v-if="scheme !== 'mono'" v-model="seed" label="主题色（生成整套系统色）" :swatches="PRESET_COLORS" />
    </section>

    <section class="style-lab__group">
      <h4>形态</h4>
      <UiSlider v-model="radius" label="圆角倍率" :min="0.5" :max="1.8" :step="0.1" :precision="1" />
      <UiSlider v-model="density" label="密度" :min="0.8" :max="1.12" :step="0.01" :precision="2" />
      <UiSlider v-model="fontScale" label="字号倍率" :min="0.9" :max="1.2" :step="0.01" :precision="2" />
    </section>

    <section class="style-lab__group">
      <h4>预览</h4>
      <UiSelect v-model="previewPick" :options="previewOptions" label="预览组件（仅演示）" />
      <div class="style-lab__preview">
        <template v-if="previewPick === 'button'">
          <UiButton>主要按钮</UiButton>
          <UiButton variant="tonal" size="sm">次要</UiButton>
          <UiButton variant="outline" size="sm">描边</UiButton>
        </template>
        <template v-else-if="previewPick === 'chip'">
          <UiChip selected>标签</UiChip>
          <UiChip removable>可移除</UiChip>
          <UiCheckbox v-model="previewCheck" label="复选" />
        </template>
        <template v-else-if="previewPick === 'switch'">
          <UiSwitch v-model="demoOn" label="开关" />
          <span class="style-lab__hint">{{ demoOn ? '已开启' : '已关闭' }}</span>
        </template>
        <template v-else-if="previewPick === 'status'">
          <UiStatusMark status="progress" :progress="0.64" :size="22" />
          <UiStatusMark status="progress" :progress="null" :size="22" />
          <UiStatusMark status="pending" :size="22" />
          <UiStatusMark status="done" :size="22" />
          <UiStatusMark status="failed" :size="22" />
        </template>
        <template v-else-if="previewPick === 'slider'">
          <UiSlider v-model="previewSlider" label="滑轨" unit="%" class="style-lab__slider" />
        </template>
        <template v-else>
          <UiText variant="type" type-effect="blur" :text="'逐字进场预览 · 透明度 + 模糊'" :cps="14" :loop="true" />
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.style-lab { display: flex; flex-direction: column; gap: 18px; padding-bottom: 8px; }
.style-lab__group { display: flex; flex-direction: column; gap: 11px; }
.style-lab__group h4 {
  margin: 0;
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
}
.style-lab__hint { margin: 0; color: var(--on-surface-variant); font-size: var(--fs-micro); line-height: 1.6; }
.style-lab__hint b { color: var(--on-surface); font-weight: var(--w-label); }
.style-lab__hint code { padding: 1px 4px; border-radius: 4px; background: var(--surface-container); font-family: var(--font-mono); font-size: .95em; }
.style-lab__slider { flex: 1 1 100%; }
.style-lab__preview {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--surface-container-low);
}
</style>
