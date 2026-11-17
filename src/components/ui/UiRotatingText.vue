<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* 要循环展示的短语 */
  phrases: { type: Array, default: () => [] },
  /* 每句停留时长（ms） */
  interval: { type: Number, default: 2600 },
  /* rotate = 原地旋转进出；flip = 绕 X 轴翻牌；slide = 纵向滑入滑出 */
  transition: { type: String, default: 'rotate' },
  /* 悬停 / 聚焦时暂停轮播 */
  pauseOnHover: { type: Boolean, default: true },
  /* 外部暂停 */
  paused: { type: Boolean, default: false },
  /* 是否需要给文字垫一层背景（浅色底，方便叠在图片 / 深色上） */
  background: { type: Boolean, default: false },
  /* 背景圆角，CSS 长度；padding 小时给小圆角更自然 */
  radius: { type: String, default: '8px' },
  /* 背景色（默认取表面容器） */
  backgroundTone: { type: String, default: 'var(--surface-container)' }
})

const emit = defineEmits(['change'])

/* ============================================================
   循环短语
   同一位置叠两层：进场层从「进入方向」的偏转 + 位移 + 模糊里出现，
   离场层朝相反方向散去并模糊（内容替换语言，方向相反形成转动感）。
   方向按前后顺序切换：正向轮播统一一个方向，反向（手动 prev）反过来。
   ============================================================ */

const index = ref(0)
const direction = ref(1)
const hovering = ref(false)

const list = computed(() => props.phrases.filter(item => item !== null && item !== undefined && item !== ''))
const current = computed(() => list.value[index.value] || '')
const running = computed(() => !props.paused && !(props.pauseOnHover && hovering.value))

let timer = 0

function schedule() {
  clearTimeout(timer)
  if (!running.value || list.value.length < 2) return
  timer = setTimeout(() => {
    if (!running.value) return
    direction.value = 1
    step(1)
    schedule()
  }, Math.max(400, props.interval))
}

function step(delta) {
  if (list.value.length < 2) return
  direction.value = delta >= 0 ? 1 : -1
  const count = list.value.length
  index.value = (index.value + delta + count) % count
  emit('change', { index: index.value, phrase: list.value[index.value] })
}

watch([running, () => props.interval, () => list.value.length], schedule, { immediate: true })
watch(index, () => { if (running.value) schedule() })

onBeforeUnmount(() => clearTimeout(timer))

defineExpose({ next: () => step(1), prev: () => step(-1), go: value => { index.value = Math.max(0, Math.min(list.value.length - 1, value)) } })
</script>

<template>
  <span
    class="ui-rotating-text"
    :class="[`is-${transition}`, direction < 0 ? 'is-backward' : 'is-forward', { 'has-background': background }]"
    :style="background ? { '--rt-bg': backgroundTone, '--rt-radius': radius } : undefined"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <Transition :name="`rot-${transition}`">
      <span :key="index" class="ui-rotating-text__item">{{ current }}</span>
    </Transition>
  </span>
</template>

<style scoped>
/* 外层只负责占位与裁切；两层文字绝对定位叠在同一处。 */
.ui-rotating-text {
  position: relative;
  display: inline-block;
  min-width: 1ch;
  line-height: 1.25;
  vertical-align: bottom;
  perspective: 620px;
}
.ui-rotating-text__item { display: inline-block; }

/* 可选背景：垫一层浅底 + 圆角，随内容进出一起平滑过渡
   （背景变化走 fade，圆角走 panel 弹簧，不会突然「跳」出一个方块） */
.ui-rotating-text.has-background {
  padding: 2px 8px;
  border-radius: var(--rt-radius, 8px);
  background: var(--rt-bg, var(--surface-container));
  transition: background var(--t-fade), border-radius var(--t-panel);
}
.ui-rotating-text.is-rotate { transform-style: preserve-3d; }

/* 离场层脱离文档流，进场层接管占位，宽度不跳。 */
.ui-rotating-text__item:global(.rot-rotate-leave-active),
.ui-rotating-text__item:global(.rot-flip-leave-active),
.ui-rotating-text__item:global(.rot-slide-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
}

/* ---------- rotate：绕中心轻微旋转 + 纵向位移 + 模糊 ---------- */
.rot-rotate-enter-active,
.rot-rotate-leave-active {
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
}
.rot-rotate-enter-from { opacity: 0; transform: rotate(9deg) translateY(58%); filter: blur(8px); }
.rot-rotate-leave-to { opacity: 0; transform: rotate(-9deg) translateY(-58%); filter: blur(8px); }
.ui-rotating-text.is-backward .rot-rotate-enter-from { transform: rotate(-9deg) translateY(-58%); }
.ui-rotating-text.is-backward .rot-rotate-leave-to { transform: rotate(9deg) translateY(58%); }

/* ---------- flip：绕 X 轴翻牌 ---------- */
.rot-flip-enter-active,
.rot-flip-leave-active {
  transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade);
  transform-style: preserve-3d;
}
.rot-flip-enter-from { opacity: 0; transform: rotateX(-88deg) translateZ(14px); filter: blur(6px); }
.rot-flip-leave-to { opacity: 0; transform: rotateX(88deg) translateZ(-14px); filter: blur(6px); }
.ui-rotating-text.is-backward .rot-flip-enter-from { transform: rotateX(88deg) translateZ(14px); }
.ui-rotating-text.is-backward .rot-flip-leave-to { transform: rotateX(-88deg) translateZ(-14px); }

/* ---------- slide：整句纵向滑过 ---------- */
.rot-slide-enter-active,
.rot-slide-leave-active {
  transition: opacity var(--t-fade), transform var(--t-view), filter var(--t-fade);
}
.rot-slide-enter-from { opacity: 0; transform: translateY(88%); filter: blur(8px); }
.rot-slide-leave-to { opacity: 0; transform: translateY(-88%); filter: blur(8px); }
.ui-rotating-text.is-backward .rot-slide-enter-from { transform: translateY(-88%); }
.ui-rotating-text.is-backward .rot-slide-leave-to { transform: translateY(88%); }

@media (prefers-reduced-motion: reduce) {
  .ui-rotating-text :deep(*) { transition-duration: .01ms !important; filter: none !important; }
}
</style>
