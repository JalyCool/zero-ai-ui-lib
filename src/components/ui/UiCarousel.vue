<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiPagerDots from './UiPagerDots.vue'
const props = defineProps({
  /* 幻灯片：任意内容用插槽，或传 [{ title, text, image }] */
  items: { type: Array, default: () => [] },
  modelValue: { type: Number, default: 0 },
  autoplay: { type: Boolean, default: false },
  interval: { type: Number, default: 4000 },
  loop: { type: Boolean, default: true },
  height: { type: Number, default: 200 }
})
const emit = defineEmits(['update:modelValue', 'change'])

/* 轮播：横向轨道 + 手势拖拽，松手按位移 / 速度决定翻页；
   autoplay 定时前进，悬停或拖动时暂停。 */
const index = ref(props.modelValue)
const trackEl = ref(null)
const dragging = ref(false)
const deltaX = ref(0)
let pointerId = null
let startX = 0
let startTime = 0
let timer = 0

const count = computed(() => props.items.length || (typeof props.items === 'object' ? props.items.length : 0))
const style = computed(() => ({
  height: props.height + 'px',
  transform: 'translate3d(calc(' + (-index.value * 100) + '% + ' + deltaX.value + 'px), 0, 0)',
  transition: dragging.value ? 'none' : 'transform var(--t-panel)'
}))

function go(next, user = true) {
  const total = Math.max(1, props.items.length)
  let value = next
  if (props.loop) value = ((next % total) + total) % total
  else value = Math.min(total - 1, Math.max(0, next))
  if (value === index.value) return
  index.value = value
  if (user) { emit('update:modelValue', value); emit('change', value) }
}
function next() { go(index.value + 1) }
function prev() { go(index.value - 1) }

function onDown(event) {
  pointerId = event.pointerId
  startX = event.clientX
  startTime = event.timeStamp
  dragging.value = true
  deltaX.value = 0
  try { trackEl.value && trackEl.value.setPointerCapture && trackEl.value.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
}
function onMove(event) {
  if (pointerId === null) return
  if (event.cancelable) event.preventDefault()
  deltaX.value = event.clientX - startX
}
function onUp(event) {
  if (pointerId === null) return
  const dx = deltaX.value
  const velocity = dx / Math.max(1, event.timeStamp - startTime)
  pointerId = null
  dragging.value = false
  deltaX.value = 0
  if (dx < -40 || velocity < -0.3) next()
  else if (dx > 40 || velocity > 0.3) prev()
}

/* 悬停暂停：只停计时器，不改变 autoplay 配置 */
function pauseAuto() {
  clearInterval(timer)
  timer = 0
}

function startAuto() {
  clearInterval(timer)
  timer = 0
  if (!props.autoplay) return
  timer = setInterval(() => { if (!dragging.value) next() }, Math.max(1200, props.interval))
}
onMounted(startAuto)
onBeforeUnmount(() => { clearInterval(timer); timer = 0 })
watch(() => [props.autoplay, props.interval], startAuto)
watch(() => props.modelValue, value => { if (value !== index.value) index.value = value })
</script>
<template>
  <div class="ui-carousel" :class="{ 'is-dragging': dragging }" :style="{ '--h': height + 'px' }" @mouseenter="pauseAuto" @mouseleave="startAuto">
    <div class="ui-carousel__viewport">
      <div ref="trackEl" class="ui-carousel__track" :style="style"
        @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
        <div v-for="(item, i) in items" :key="i" class="ui-carousel__slide" :class="{ 'is-active': i === index, 'is-before': i < index }" :aria-hidden="i !== index">
          <slot :item="item" :index="i">
            <img v-if="item.image" :src="item.image" :alt="item.title || ''" />
            <span class="ui-carousel__caption"><b>{{ item.title }}</b><small v-if="item.text">{{ item.text }}</small></span>
          </slot>
        </div>
      </div>
    </div>
    <div class="ui-carousel__bar">
      <button type="button" class="ui-carousel__arrow" aria-label="上一张" @click="prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <UiPagerDots :total="items.length" :model-value="index" label="轮播翻页" @update:model-value="go($event)" />
      <button type="button" class="ui-carousel__arrow" aria-label="下一张" @click="next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  </div>
</template>
<style scoped>
.ui-carousel { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-carousel__viewport { overflow: hidden; border-radius: calc(16px * var(--radius-scale)); }
.ui-carousel__track { display: flex; height: var(--h, 200px); touch-action: pan-y; will-change: transform; }
/* 每张片子自己也有动效：当前页清晰、正面；离开的页缩小、变暗、轻模糊，
   进位 / 退位都跟着轨道一起走，不是硬切。 */
.ui-carousel__slide {
  position: relative;
  flex: 0 0 100%;
  overflow: hidden;
  background: var(--surface-container);
  opacity: .5;
  transform: scale(.93);
  filter: blur(2px);
  transform-origin: 50% 50%;
  transition: opacity var(--t-panel), transform var(--t-panel), filter var(--t-fade);
  will-change: transform, opacity, filter;
}
.ui-carousel__slide.is-active { opacity: 1; transform: none; filter: blur(0); }
.ui-carousel__slide img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.02); transition: transform var(--t-panel); }
.ui-carousel__slide.is-active img { transform: scale(1); }
.ui-carousel.is-dragging .ui-carousel__slide { transition-duration: .01ms; }
.ui-carousel__caption { position: absolute; inset: auto 0 0 0; display: flex; flex-direction: column; gap: 2px; padding: 20px 14px 10px; background: linear-gradient(to top, rgba(0, 0, 0, .56), transparent); color: #fff; font-size: var(--fs-small); }
.ui-carousel__caption small { font-size: var(--fs-micro); opacity: .82; }
.ui-carousel__bar { display: flex; align-items: center; justify-content: center; gap: 10px; }
.ui-carousel__arrow { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: var(--surface-container); color: var(--on-surface-variant); cursor: pointer; }
.ui-carousel__arrow svg { width: 14px; height: 14px; }

</style>
