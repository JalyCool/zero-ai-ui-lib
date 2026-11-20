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
  /* infinite = 视觉上一直朝一个方向延伸（首尾无缝、不跳回第一张）；
     cycle    = 当前这种：到尾回到第一张。 */
  loopMode: { type: String, default: 'cycle', validator: v => ['cycle', 'infinite'].includes(v) },
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

/* ---------- 无限变体：首尾各克隆一张，轨道长度 = n + 2 ---------- */
/* 视觉上永远朝一个方向延伸：走到克隆位后无动画瞬移回真实位，
   用户看到的是连续前进，不会「跳回第一张」。 */
const isInfinite = computed(() => props.loop && props.loopMode === 'infinite' && props.items.length > 1)
/* 渲染用的幻灯片序列：infinite 时 = [末] + 全部 + [首] */
const slides = computed(() => {
  const list = props.items
  if (!isInfinite.value) return list.map((item, i) => ({ item, realIndex: i, clone: false }))
  return [
    { item: list[list.length - 1], realIndex: list.length - 1, clone: true },
    ...list.map((item, i) => ({ item, realIndex: i, clone: false })),
    { item: list[0], realIndex: 0, clone: true }
  ]
})
/* 轨道上的定位索引：infinite 时整体右移一格 */
const slot = ref(isInfinite.value ? props.modelValue + 1 : props.modelValue)
const noTransition = ref(false)

const style = computed(() => ({
  height: props.height + 'px',
  transform: 'translate3d(calc(' + (-slot.value * 100) + '% + ' + deltaX.value + 'px), 0, 0)',
  transition: dragging.value || noTransition.value ? 'none' : 'transform var(--t-panel)'
}))

/* 到克隆位后瞬移回真实位（同内容的另一格），用户察觉不到 */
function normalizeSlot() {
  if (!isInfinite.value) return
  const total = props.items.length
  if (slot.value === 0) {
    noTransition.value = true
    slot.value = total
    requestAnimationFrame(() => requestAnimationFrame(() => { noTransition.value = false }))
  } else if (slot.value === total + 1) {
    noTransition.value = true
    slot.value = 1
    requestAnimationFrame(() => requestAnimationFrame(() => { noTransition.value = false }))
  }
}

function go(next, user = true) {
  const total = Math.max(1, props.items.length)
  let value = next
  if (props.loop) value = ((next % total) + total) % total
  else value = Math.min(total - 1, Math.max(0, next))
  if (value === index.value) return
  index.value = value
  /* infinite：轨道索引 = 真实索引 + 1（前面多一张克隆）。
     跨首尾时必须滑**一格到克隆位**（第一项从右侧飞入 / 最后一项从左侧
     飞入），过渡结束后再无动画瞬移归位；直接落回真实位会变成「整条列表
     滑回第一张」，方向感全丢。cycle 则直接倒回第一张的位置。 */
  if (isInfinite.value) {
    const total = props.items.length
    if (index.value === total - 1 && value === 0) slot.value = total + 1
    else if (index.value === 0 && value === total - 1) slot.value = 0
    else slot.value = value + 1
  } else {
    slot.value = value
  }
  if (user) { emit('update:modelValue', value); emit('change', value) }
}

/* 轨道过渡结束：infinite 模式下检查是否停在克隆位 */
function onTrackEnd() {
  if (dragging.value || noTransition.value) return
  normalizeSlot()
}
/* 手动翻页（箭头 / 圆点 / 拖动）都要重置自动播放计时，
   否则刚点完可能立刻被计时器抢走下一张。 */
function next() { go(index.value + 1); startAuto() }
function prev() { go(index.value - 1); startAuto() }

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
watch(() => props.loopMode, () => {
  noTransition.value = true
  slot.value = isInfinite.value ? index.value + 1 : index.value
  requestAnimationFrame(() => requestAnimationFrame(() => { noTransition.value = false }))
})
watch(() => props.modelValue, value => {
  if (value === index.value) return
  index.value = value
  slot.value = isInfinite.value ? value + 1 : value
})
</script>
<template>
  <div class="ui-carousel" :class="{ 'is-dragging': dragging }" :style="{ '--h': height + 'px' }" @mouseenter="pauseAuto" @mouseleave="startAuto">
    <div class="ui-carousel__viewport">
      <div ref="trackEl" class="ui-carousel__track" :style="style" @transitionend.self="onTrackEnd"
        @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
        <div
          v-for="(entry, i) in slides"
          :key="(entry.clone ? 'c' : 'r') + entry.realIndex + '-' + i"
          class="ui-carousel__slide"
          :class="{ 'is-active': i === slot, 'is-before': i < slot }"
          :aria-hidden="entry.realIndex !== index"
        >
          <slot :item="entry.item" :index="entry.realIndex">
            <img v-if="entry.item.image" :src="entry.item.image" :alt="entry.item.title || ''" />
            <span class="ui-carousel__caption"><b>{{ entry.item.title }}</b><small v-if="entry.item.text">{{ entry.item.text }}</small></span>
          </slot>
        </div>
      </div>
    </div>
    <div class="ui-carousel__bar">
      <button type="button" class="ui-carousel__arrow" aria-label="上一张" @click="prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <UiPagerDots :total="items.length" :model-value="index" label="轮播翻页" @update:model-value="go($event); startAuto()" />
      <button type="button" class="ui-carousel__arrow" aria-label="下一张" @click="next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  </div>
</template>
<style scoped>
.ui-carousel { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
/* 外层容器不裁圆角（圆角属于卡片本身），只负责裁切轨道 */
.ui-carousel__viewport { overflow: hidden; border-radius: 0; }
.ui-carousel__track { display: flex; height: var(--h, 200px); touch-action: pan-y; will-change: transform; }
/* 每张片子自己也有动效：当前页清晰、正面；离开的页缩小、变暗、轻模糊，
   进位 / 退位都跟着轨道一起走，不是硬切。 */
.ui-carousel__slide {
  position: relative;
  flex: 0 0 100%;
  overflow: hidden;
  /* 圆角在卡片上：外层容器保持直角，卡片自己带圆角 */
  border-radius: calc(var(--r-16) * var(--radius-scale));
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
