<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiAgentAvatar, UiButton, UiSegmented, UiSlider } from '../components/ui'

/* ============================================================
   设备位置调节台
   拖滑块调 UiUsingDevice 的设备 / 手位，调好后「复制属性」
   把组件标签发回来，由助手固化成组件默认值。
   ============================================================ */
const router = useRouter()

const device = ref('laptop')
const size = 140
const color = ref('')
const deviceOptions = [
  { label: '电脑', value: 'laptop' },
  { label: '手机', value: 'phone' },
  { label: '无', value: 'none' }
]
const colorOptions = [
  { label: '纯白', value: '' },
  { label: '主题蓝', value: '#3f5f90' },
  { label: '深灰', value: '#444444' },
  { label: '品牌紫', value: '#7438ff' }
]

const deviceDxModel = ref(70)
const deviceDyModel = ref(42)
const scaleModel = ref(0.5)
const handModel = ref(0.15)
const laptopHandDxModel = ref(0)
const laptopHandDyModel = ref(0)
const holdDxModel = ref(0)
const holdDyModel = ref(0)
const swipeDxModel = ref(0)
const swipeDyModel = ref(0)

const propsJson = ref('')
const copied = ref(false)

const round1 = value => Math.round(value * 10) / 10

function buildProps() {
  return {
    device: device.value,
    color: color.value || undefined,
    size,
    deviceDx: round1(deviceDxModel.value),
    deviceDy: round1(deviceDyModel.value),
    deviceScale: Math.round(scaleModel.value * 100) / 100,
    handScale: Math.round(handModel.value * 100) / 100,
    laptopHandDx: round1(laptopHandDxModel.value),
    laptopHandDy: round1(laptopHandDyModel.value),
    holdDx: round1(holdDxModel.value),
    holdDy: round1(holdDyModel.value),
    swipeDx: round1(swipeDxModel.value),
    swipeDy: round1(swipeDyModel.value)
  }
}

async function copyProps() {
  const entries = Object.entries(buildProps()).filter(([, value]) => value !== undefined)
  const text = '<UiAgentAvatar ' + entries
    .map(([key, value]) => (typeof value === 'number' ? ':' + key + '="' + value + '"' : key + '="' + value + '"'))
    .join(' ') + ' />'
  propsJson.value = text
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch (error) {
    /* 剪贴板不可用时兜底：选中文本框让用户手动复制 */
    document.getElementById('devicePropsOut')?.select()
  }
}
</script>

<template>
  <section class="view lab" data-view="agent-device">
    <UiButton variant="text" size="sm" @click="router.replace({ name: 'components' })">← 返回组件库</UiButton>

    <div class="lab__stage">
      <UiAgentAvatar
        :device="device"
        :device-color="color"
        :size="size"
        :device-dx="deviceDxModel"
        :device-dy="deviceDyModel"
        :device-scale="scaleModel"
        :hand-scale="handModel"
        :laptop-hand-dx="laptopHandDxModel"
        :laptop-hand-dy="laptopHandDyModel"
        :hold-dx="holdDxModel"
        :hold-dy="holdDyModel"
        :swipe-dx="swipeDxModel"
        :swipe-dy="swipeDyModel"
      />
    </div>

    <div class="lab__row">
      <UiSegmented v-model="device" :options="deviceOptions" label="设备" layout="one-line" />
      <UiSegmented v-model="color" :options="colorOptions" label="设备颜色" layout="one-line" />
    </div>

    <div class="lab__sliders">
      <span class="lab__label">设备位置 X：{{ deviceDxModel }}</span>
      <UiSlider v-model="deviceDxModel" :min="0" :max="200" :step="1" />
      <span class="lab__label">设备位置 Y：{{ deviceDyModel }}</span>
      <UiSlider v-model="deviceDyModel" :min="0" :max="200" :step="1" />
      <span class="lab__label">设备大小：{{ scaleModel.toFixed(2) }}</span>
      <UiSlider v-model="scaleModel" :min="0.2" :max="1" :step="0.01" />
      <span class="lab__label">手大小：{{ handModel.toFixed(2) }}</span>
      <UiSlider v-model="handModel" :min="0.08" :max="0.3" :step="0.01" />

      <template v-if="device === 'laptop'">
        <span class="lab__label">敲击手 X：{{ laptopHandDxModel }}</span>
        <UiSlider v-model="laptopHandDxModel" :min="-40" :max="40" :step="1" />
        <span class="lab__label">敲击手 Y：{{ laptopHandDyModel }}</span>
        <UiSlider v-model="laptopHandDyModel" :min="-40" :max="40" :step="1" />
      </template>

      <template v-if="device === 'phone'">
        <span class="lab__label">持机手 X：{{ holdDxModel }}</span>
        <UiSlider v-model="holdDxModel" :min="-40" :max="40" :step="1" />
        <span class="lab__label">持机手 Y：{{ holdDyModel }}</span>
        <UiSlider v-model="holdDyModel" :min="-40" :max="40" :step="1" />
        <span class="lab__label">滑动手 X：{{ swipeDxModel }}</span>
        <UiSlider v-model="swipeDxModel" :min="-40" :max="40" :step="1" />
        <span class="lab__label">滑动手 Y：{{ swipeDyModel }}</span>
        <UiSlider v-model="swipeDyModel" :min="-40" :max="40" :step="1" />
      </template>
    </div>

    <div class="lab__copy">
      <UiButton block @click="copyProps">{{ copied ? '已复制 ✓' : '复制属性' }}</UiButton>
      <textarea id="devicePropsOut" class="lab__out" readonly :value="propsJson" placeholder="点「复制属性」生成组件标签"></textarea>
    </div>
  </section>
</template>

<style scoped>
.lab { gap: 14px; }
.lab__stage {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 240px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(16px * var(--radius-scale));
  background: var(--surface-container-low);
  overflow: visible;
}
.lab__row { display: flex; flex-direction: column; gap: 10px; }
.lab__sliders { display: flex; flex-direction: column; gap: 6px; }
.lab__label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); font-variant-numeric: tabular-nums; }
.lab__copy { display: flex; flex-direction: column; gap: 8px; }
.lab__out {
  min-height: 64px;
  padding: 10px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: ui-monospace, monospace;
  font-size: var(--fs-micro);
  resize: none;
}
</style>
