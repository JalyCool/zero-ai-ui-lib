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

const swipeStartXModel = ref(78)
const swipeStartYModel = ref(96)
const swipeEndXModel = ref(77)
const swipeEndYModel = ref(133)
const gazeScaleModel = ref(0.37)
const wobbleAmpModel = ref(0.34)
const eyesOffsetXModel = ref(-0.4)
const eyesOffsetYModel = ref(-1.15)

const propsJson = ref('')
const copied = ref(false)

const round1 = value => Math.round(value * 10) / 10

function buildProps() {
  return {
    device: device.value,
    color: color.value || undefined,
    size,
    swipeStartX: round1(swipeStartXModel.value),
    swipeStartY: round1(swipeStartYModel.value),
    swipeEndX: round1(swipeEndXModel.value),
    swipeEndY: round1(swipeEndYModel.value),
    gazeScale: Math.round(gazeScaleModel.value * 100) / 100,
    gazeWobbleAmp: Math.round(wobbleAmpModel.value * 100) / 100,
    eyesOffsetX: Math.round(eyesOffsetXModel.value * 100) / 100,
    eyesOffsetY: Math.round(eyesOffsetYModel.value * 100) / 100
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
  <section class="view-lab" data-view="agent-device">
    <UiButton variant="text" size="sm" @click="router.replace({ name: 'components' })">← 返回组件库</UiButton>

    <div class="lab__stage">
      <UiAgentAvatar
        :device="device"
        :device-color="color"
        :size="size"
        :swipe-start-x="swipeStartXModel"
        :swipe-start-y="swipeStartYModel"
        :swipe-end-x="swipeEndXModel"
        :swipe-end-y="swipeEndYModel"
        :gaze-scale="gazeScaleModel"
        :gaze-wobble-amp="wobbleAmpModel"
        :eyes-offset-x="eyesOffsetXModel"
        :eyes-offset-y="eyesOffsetYModel"
      />
    </div>

    <div class="lab__row">
      <UiSegmented v-model="device" :options="deviceOptions" label="设备" layout="one-line" />
      <UiSegmented v-model="color" :options="colorOptions" label="设备颜色" layout="one-line" />
    </div>

    <div class="lab__sliders">
      <span class="lab__label">（设备位置 / 大小 / 持机手与敲击手基点已按上次调好的值固化，不再开放调整）</span>

      <template v-if="device === 'phone'">
        <span class="lab__label">滑动手起点 X：{{ swipeStartXModel }}</span>
        <UiSlider v-model="swipeStartXModel" :min="0" :max="200" :step="1" />
        <span class="lab__label">滑动手起点 Y：{{ swipeStartYModel }}</span>
        <UiSlider v-model="swipeStartYModel" :min="0" :max="200" :step="1" />
        <span class="lab__label">滑动手终点 X：{{ swipeEndXModel }}</span>
        <UiSlider v-model="swipeEndXModel" :min="0" :max="200" :step="1" />
        <span class="lab__label">滑动手终点 Y：{{ swipeEndYModel }}</span>
        <UiSlider v-model="swipeEndYModel" :min="0" :max="200" :step="1" />
      </template>

      <span class="lab__label">眼睛注视强度：{{ gazeScaleModel.toFixed(2) }}</span>
      <UiSlider v-model="gazeScaleModel" :min="0.1" :max="1" :step="0.01" />
      <span class="lab__label">注视微摆幅度：{{ wobbleAmpModel.toFixed(2) }}</span>
      <UiSlider v-model="wobbleAmpModel" :min="0" :max="0.8" :step="0.02" />
      <span class="lab__label">眼位偏移 X：{{ eyesOffsetXModel.toFixed(2) }}</span>
      <UiSlider v-model="eyesOffsetXModel" :min="-2" :max="2" :step="0.05" />
      <span class="lab__label">眼位偏移 Y：{{ eyesOffsetYModel.toFixed(2) }}</span>
      <UiSlider v-model="eyesOffsetYModel" :min="-2" :max="2" :step="0.05" />
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
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: ui-monospace, monospace;
  font-size: var(--fs-micro);
  resize: none;
}
</style>
