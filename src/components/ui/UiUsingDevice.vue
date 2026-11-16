<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiAgentAvatar from './UiAgentAvatar.vue'
import LaptopColorSvg from '../../assets/agent/Laptop.svg?raw'
import LaptopWhiteSvg from '../../assets/agent/LaptopW.svg?raw'
import PhoneColorSvg from '../../assets/agent/Phone.svg?raw'
import PhoneWhiteSvg from '../../assets/agent/PhoneW.svg?raw'

const props = defineProps({
  /* none 不带设备 | laptop 电脑 | phone 手机 */
  device: { type: String, default: 'laptop' },
  /* 设备上色：替换底图里的 #FF00FF 占位。
     空 = 纯白 W 版；#FFFFFF = 原色；最深只能给 #444444（multiply 下绝不能用 #000000） */
  color: { type: String, default: '' },
  /* 容器边长 px：头像填满容器，设备 / 手按容器定位 */
  size: { type: Number, default: 120 },
  /* 设备位置（容器左上原点，px）；不传用各设备的推荐位 */
  deviceDx: { type: Number, default: null },
  deviceDy: { type: Number, default: null },
  /* 设备宽度 = size * deviceScale；不传用推荐值 */
  deviceScale: { type: Number, default: null },
  /* 手的直径 = size * handScale；不传用推荐值 */
  handScale: { type: Number, default: null },
  /* 电脑：敲击手相对推荐位的偏移 */
  laptopHandDx: { type: Number, default: 0 },
  laptopHandDy: { type: Number, default: 0 },
  /* 手机：持机手（在手机前方，固定）/ 滑动手的偏移 */
  holdDx: { type: Number, default: 0 },
  holdDy: { type: Number, default: 0 },
  swipeDx: { type: Number, default: 0 },
  swipeDy: { type: Number, default: 0 },
  /* 透传给头像 */
  agentShape: { type: String, default: 'circle' },
  agentColor: { type: String, default: '#3f5f90' },
  state: { type: String, default: 'idle' },
  animated: { type: Boolean, default: true },
  eyeColor: { type: String, default: '#ffffff' }
})

const RAW = {
  laptop: { color: LaptopColorSvg, white: LaptopWhiteSvg },
  phone: { color: PhoneColorSvg, white: PhoneWhiteSvg }
}

/* 设备底图：给色 = 彩版替换 #FF00FF；不给 = 纯白 W 版 */
const deviceMarkup = computed(() => {
  if (props.device === 'none') return ''
  const base = props.color ? RAW[props.device].color : RAW[props.device].white
  return props.color ? base.replaceAll('#FF00FF', props.color) : base
})
/* 底图宽高比：从 viewBox 里读，W / 彩版宽度不同也能各自算准 */
const deviceAspect = computed(() => {
  if (props.device === 'none') return 1
  const m = deviceMarkup.value.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  return m ? Number(m[1]) / Number(m[2]) : 1.6
})

const deviceLeft = computed(() => {
  if (props.deviceDx !== null) return props.deviceDx
  return props.device === 'laptop' ? props.size * 0.5 : props.size * 0.46
})
const deviceTop = computed(() => {
  if (props.deviceDy !== null) return props.deviceDy
  return props.device === 'laptop' ? props.size * 0.3 : props.size * 0.26
})
const deviceWidth = computed(() => props.size * (props.deviceScale ?? (props.device === 'laptop' ? 0.58 : 0.42)))
const deviceHeight = computed(() => deviceWidth.value / deviceAspect.value)

/* 手的直径 */
const handPx = computed(() => props.size * (props.handScale ?? 0.15))

/* 推荐 / 实际的手位（容器左上原点，px） */
const laptopHand = computed(() => ({ x: props.size * 0.58 + props.laptopHandDx, y: props.size * 0.8 + props.laptopHandDy }))
const holdHand = computed(() => ({ x: props.size * 0.55 + props.holdDx, y: props.size * 0.88 + props.holdDy }))
const swipeHand = computed(() => ({ x: props.size * 0.64 + props.swipeDx, y: props.size * 0.5 + props.swipeDy }))

/* 眼睛看向设备中心（换算到 24 盒坐标）；电脑左右轻扫、手机上下轻点 */
const gazeX = computed(() => ((deviceLeft.value + deviceWidth.value / 2) / props.size) * 24)
const gazeY = computed(() => ((deviceTop.value + deviceHeight.value / 2) / props.size) * 24)
const gazeWobble = computed(() => (props.device === 'laptop' ? 'x' : props.device === 'phone' ? 'y' : 'none'))

/* ---------- 手的动画：确定性正弦，只有位置在动 ---------- */
const laptopHandEl = ref(null)
const holdHandEl = ref(null)
const swipeHandEl = ref(null)
let rafId = 0

function placeHand(el, x, y) {
  if (!el) return
  el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%)`
}

function frame(now) {
  const S = props.size
  if (props.device === 'laptop' && laptopHandEl.value) {
    /* 敲击：快速下按回弹 + 左右手感的轻微换位 */
    const tap = -Math.abs(Math.sin((now / 1000) * Math.PI * 2 * 2.6)) * S * 0.028
    const drift = Math.sin((now / 1000) * Math.PI * 2 * 1.3) * S * 0.012
    placeHand(laptopHandEl.value, laptopHand.value.x + drift, laptopHand.value.y + tap)
  }
  if (props.device === 'phone') {
    /* 持机手固定不动（图层在手机前方） */
    placeHand(holdHandEl.value, holdHand.value.x, holdHand.value.y)
    /* 滑动手：沿屏幕上下滑动，带一点横向弧度 */
    const phase = (now / 1000) * Math.PI * 2 / 1.6
    placeHand(swipeHandEl.value,
      swipeHand.value.x + Math.sin(phase) * S * 0.018,
      swipeHand.value.y + Math.sin(phase) * S * 0.07)
  }
  rafId = requestAnimationFrame(frame)
}

function startLoop() {
  cancelAnimationFrame(rafId)
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!props.animated || reduce || props.device === 'none') return
  rafId = requestAnimationFrame(frame)
}

watch(() => [props.device, props.animated, props.size], () => startLoop())
onMounted(startLoop)
onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<template>
  <span class="ui-using-device" :style="{ width: size + 'px', height: size + 'px' }">
    <UiAgentAvatar
      class="ui-using-device__agent"
      :shape="agentShape"
      :color="agentColor"
      :eye-color="eyeColor"
      :size="size"
      :state="state"
      :animated="animated"
      gaze="point"
      :gaze-x="gazeX"
      :gaze-y="gazeY"
      :gaze-wobble="gazeWobble"
    />
    <span
      v-if="device !== 'none'"
      class="ui-using-device__device"
      :style="{ left: deviceLeft + 'px', top: deviceTop + 'px', width: deviceWidth + 'px', height: deviceHeight + 'px' }"
      v-html="deviceMarkup"
    ></span>
    <span
      v-if="device === 'laptop'"
      ref="laptopHandEl"
      class="ui-using-device__hand"
      :style="{ width: handPx + 'px', height: handPx + 'px' }"
    ></span>
    <template v-if="device === 'phone'">
      <span ref="holdHandEl" class="ui-using-device__hand" :style="{ width: handPx * 1.15 + 'px', height: handPx * 1.15 + 'px' }"></span>
      <span ref="swipeHandEl" class="ui-using-device__hand" :style="{ width: handPx + 'px', height: handPx + 'px' }"></span>
    </template>
  </span>
</template>

<style scoped>
/* 容器不裁切：设备 / 手都可以探出容器 */
.ui-using-device { position: relative; display: inline-block; overflow: visible; flex-shrink: 0; }
.ui-using-device__agent { position: absolute; inset: 0; z-index: 0; }
.ui-using-device__device { position: absolute; z-index: 1; pointer-events: none; }
.ui-using-device__device :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.ui-using-device__hand {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px color-mix(in oklab, var(--on-surface) 22%, transparent);
  pointer-events: none;
  will-change: transform;
}
</style>
