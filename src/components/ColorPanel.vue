<script setup>
import { computed, ref } from 'vue'
import { state } from '../core/state'
import { PRESET_COLORS } from '../core/theme'
import { getMotionTone, setMotionTone } from '../core/motionTone'
import { UiButton, UiChip, UiColorPicker, UiSegmented, UiStatusMark, UiSwitch } from './ui'

/* ============================================================
   Playground 面板（设置弹层里的「Playground」）
   全部用库里的组件搭：分段、取色、开关、状态标记 —— 不再手写按钮样式。
   ============================================================ */

const scheme = computed({
  get: () => state.scheme,
  set: value => { state.scheme = value }
})
const appearance = computed({
  get: () => state.appearance,
  set: value => { state.appearance = value }
})
const seed = computed({
  get: () => state.seed,
  set: value => { state.seed = value }
})

/* 动效气质：产品调性，不是用户偏好 —— 这里放出来仅为演示。 */
const motion = ref(getMotionTone())
function applyMotion(value) {
  motion.value = setMotionTone(value)
}

const demoOn = ref(true)
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
</script>

<template>
  <div class="sheet-panel active" data-panel="color">
    <UiSegmented v-model="scheme" :options="schemeOptions" label="配色方案" />

    <template v-if="scheme !== 'mono'">
      <UiColorPicker v-model="seed" label="主题色（选一个颜色自动生成整套系统）" :swatches="PRESET_COLORS" />
    </template>

    <UiSegmented v-model="appearance" :options="appearanceOptions" label="外观" />

    <UiSegmented
      :model-value="motion"
      :options="motionOptions"
      label="动效气质（仅演示）"
      @update:model-value="applyMotion"
    />
    <p class="pg-note">
      克制：稳、短、几乎不过冲；活泼：弹簧更陡、回弹与缩放更大。
      <b>这不是给终端用户切换的选项</b> —— 正式应用按调性在代码里
      <code>setMotionTone('lively')</code> 或写进 <code>zero.config</code> 的 <code>ui.motion</code> 预置。
    </p>

    <div class="pg-preview">
      <UiButton size="sm">主要按钮</UiButton>
      <UiChip selected>标签</UiChip>
      <UiSwitch v-model="demoOn" label="开关" />
      <UiStatusMark status="progress" :progress="0.64" :size="20" />
      <UiStatusMark status="progress" :progress="null" :size="20" />
      <UiStatusMark status="done" :size="20" />
    </div>
  </div>
</template>

<style scoped>
.sheet-panel { display: flex; flex-direction: column; gap: 16px; }
.pg-note { margin: 0; color: var(--on-surface-variant); font-size: var(--fs-micro); line-height: 1.6; }
.pg-note b { color: var(--on-surface); font-weight: var(--w-label); }
.pg-note code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--surface-container);
  font-family: ui-monospace, monospace;
  font-size: .95em;
}
.pg-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container-low);
}
</style>
