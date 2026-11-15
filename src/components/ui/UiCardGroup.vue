<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* 指针捕获在指针已失效时会抛 NotFoundError，包一层避免打断手势。 */
function safeCapture(el, id) {
  try { el && el.setPointerCapture && el.setPointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}
function safeRelease(el, id) {
  try { el && el.releasePointerCapture && el.releasePointerCapture(id) } catch (error) { /* 指针已失效，忽略 */ }
}

const props = defineProps({
  /* gallery | circular | depth | wall | scroll-stack | stack | swap | bounce */
  variant: { type: String, default: 'gallery' },
  /* [{ title, meta?, tone?, image? }] */
  items: { type: Array, default: () => [] },
  /* 容器高度（px）；scroll-stack 用它算单张卡的粘性高度 */
  height: { type: Number, default: 264 },
  /* gallery 的单卡宽度 */
  cardWidth: { type: Number, default: 190 },
  gap: { type: Number, default: 12 },
  /* 自动推进 / 自动漂移 */
  auto: { type: Boolean, default: false },
  /* 自动间隔（ms） */
  interval: { type: Number, default: 2800 },
  /* 初始选中项 */
  modelValue: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'select'])

/* ============================================================
   卡片组（8 种形态共用一个组件）
   共同点：卡池、选中项、指针拖拽、键盘这些都只有一份，
   差异只在「怎么把每张卡放到三维空间里的某个位置」。
   · gallery      横向平铺 + 循环（拖拽跟手，越界无限环绕）
   · circular     3D 圆环（拖拽带惯量，松手吸附到最近格位）
   · depth        沿 Z 轴后退的轨道（拖拽 / 键盘 / 自动推进）
   · wall         透视墙，整体缓慢漂移，悬停的瓦片抬起来
   · scroll-stack 滚动时逐张压成牌堆，离开时整体变暗
   · stack        牌堆，拖 / 甩 / 点把最上面的牌换到最下面
   · swap         3D 牌堆，定时或甩动把最前面的牌送到最后面
   · bounce       扇形牌组，弹入后散开，悬停的那张扶正
   ============================================================ */

const rootEl = ref(null)
const trackEl = ref(null)
const scrollerEl = ref(null)
const active = ref(Math.max(0, Math.min(props.items.length - 1, props.modelValue)))
const count = computed(() => props.items.length)

/* 卡池：stack / swap 用一个顺序数组表示前后关系，0 = 最前面 */
const pile = ref([])
watch(count, value => {
  pile.value = Array.from({ length: value }, (_, i) => i)
  active.value = Math.max(0, Math.min(value - 1, active.value))
}, { immediate: true })

function pick(index) {
  active.value = index
  emit('update:modelValue', index)
  emit('select', { index, item: props.items[index] })
}

/* ---------------- 通用指针拖拽 ---------------- */
let pointerId = null
let startX = 0
let startY = 0
let lastX = 0
let lastT = 0
let velocity = 0
let dragging = false
let dragDelta = 0

function dragStart(event) {
  if (event.button > 0) return
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  lastX = event.clientX
  lastT = event.timeStamp
  velocity = 0
  dragging = false
  dragDelta = 0
}

function dragMove(event) {
  if (pointerId === null || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!dragging && Math.abs(dx) + Math.abs(dy) > 6) dragging = true
  if (!dragging) return
  if (event.cancelable) event.preventDefault()
  velocity = (event.clientX - lastX) / Math.max(1, event.timeStamp - lastT)
  lastX = event.clientX
  lastT = event.timeStamp
  dragDelta = dx
  onDrag(dx, dy, event)
}

function dragEnd(event) {
  if (pointerId === null) return
  const delta = dragDelta
  const wasDragging = dragging
  pointerId = null
  dragging = false
  dragDelta = 0
  if (wasDragging) onDragEnd(delta)
  else if (event.target && event.target.closest('[data-card]')) {
    /* 没拖动 = 点击：点到哪张就选中哪张。 */
    const index = Number(event.target.closest('[data-card]').dataset.card)
    if (Number.isFinite(index) && count.value) pick(index % count.value)
  }
}

/* 各形态对拖拽的响应（默认空实现）。 */
let onDrag = () => {}
let onDragEnd = () => {}

/* ---------------- gallery：循环平铺 ---------------- */
const galleryOffset = ref(0)
const spanPx = computed(() => props.cardWidth + props.gap)
const galleryList = computed(() => (count.value ? [...props.items, ...props.items, ...props.items] : []))

onDrag = (dx) => {
  if (props.variant !== 'gallery') return
  galleryOffset.value -= dx * 0.8
}
onDragEnd = (dx) => {
  if (props.variant !== 'gallery') return
  /* 甩动带一点惯性，然后归到最近的格位。 */
  const step = spanPx.value
  const target = Math.round((galleryOffset.value - velocity * 60) / step) * step
  galleryOffset.value = target
}
/* 循环：把偏移折回一个副本的长度内，视觉上永不到头。 */
const galleryStyle = computed(() => {
  const span = spanPx.value * count.value
  let value = galleryOffset.value
  if (span > 0) value = ((value % span) + span) % span
  return { transform: 'translate3d(' + value + 'px, 0, 0)' }
})

/* ---------------- circular：3D 圆环 ---------------- */
const ringRotation = ref(0)
const stepAngle = computed(() => (count.value ? 360 / count.value : 0))
const radius = computed(() => {
  const w = props.cardWidth
  const a = (stepAngle.value * Math.PI) / 180
  return Math.max(w, (w / 2) / Math.max(0.15, Math.tan(a / 2)))
})

onDrag = (dx) => {
  if (props.variant !== 'circular') return
  ringRotation.value = ringRotation.value + dx * 0.24
}
onDragEnd = () => {
  if (props.variant !== 'circular') return
  /* 吸附：转到最近的格位（正对镜头的那张）。 */
  const step = stepAngle.value
  const snapped = Math.round(ringRotation.value / step) * step
  ringRotation.value = snapped
  const index = ((Math.round(-snapped / step) % count.value) + count.value) % count.value
  pick(index)
}
function circleStyle(index) {
  const angle = index * stepAngle.value + ringRotation.value
  return {
    transform: 'rotateY(' + angle + 'deg) translateZ(' + radius.value + 'px)',
    opacity: 0.35 + 0.65 * Math.max(0, Math.cos((angle * Math.PI) / 180))
  }
}

/* ---------------- depth：Z 轴轨道 ---------------- */
const depthActive = computed(() => active.value)
const autoTimer = ref(0)
function depthNext(delta = 1) {
  if (!count.value) return
  pick((active.value + delta + count.value) % count.value)
}
function depthStyle(index) {
  const d = index - depthActive.value
  const s = Math.sign(d) * Math.min(3, Math.abs(d))
  return {
    transform: 'translate3d(' + s * 26 + 'px, ' + Math.abs(s) * -6 + 'px, ' + (-Math.abs(s) * 120) + 'px) scale(' + (1 - Math.abs(s) * 0.1) + ')',
    opacity: Math.abs(s) > 3 ? 0 : 1 - Math.abs(s) * 0.22,
    zIndex: 20 - Math.abs(s)
  }
}
onDrag = (dx) => { if (props.variant === 'depth') dragDelta = dx }
onDragEnd = (dx) => {
  if (props.variant !== 'depth') return
  if (Math.abs(dx) > 40) depthNext(dx < 0 ? 1 : -1)
}

/* ---------------- wall：透视墙漂移 ---------------- */
const wallTiles = computed(() => {
  if (!count.value) return []
  const total = Math.max(12, count.value * 3)
  return Array.from({ length: total }, (_, i) => props.items[i % count.value])
})

/* ---------------- scroll-stack：滚动压栈 ---------------- */
const scrollProgress = ref(0)
function onScroll(event) {
  if (props.variant !== 'scroll-stack') return
  const el = event.target
  const total = Math.max(1, el.scrollHeight - el.clientHeight)
  scrollProgress.value = el.scrollTop / total
}
function stackScrollStyle(index) {
  const total = Math.max(1, count.value - 1)
  const pin = index / total
  /* 当前卡到达自身位置后，之前的卡保持压住并略微缩小、变暗。 */
  const distance = Math.max(0, scrollProgress.value - pin) * total
  return {
    transform: 'translate3d(0,' + Math.round(index * 10) + 'px,0) scale(' + (1 - Math.min(0.12, distance * 0.04)) + ')',
    filter: 'brightness(' + (1 - Math.min(0.42, distance * 0.14)) + ')',
    zIndex: 10 + index
  }
}

/* ---------------- stack / swap：牌堆 ---------------- */
const throwStyle = ref({ x: 0, y: 0, rotate: 0, animating: false })
const frontIndex = computed(() => pile.value[0] ?? 0)

function pileStyle(position) {
  /* position = 0 是最上面那张，越往后越小越偏。 */
  return {
    transform: 'translate3d(' + position * 8 + 'px, ' + position * -6 + 'px, ' + (-position * 26) + 'px) rotate(' + (position % 2 ? 1.2 : -1.2) * position + 'deg) scale(' + (1 - position * 0.05) + ')',
    zIndex: 30 - position,
    opacity: position > 3 ? 0 : 1
  }
}

function moveFrontToBack() {
  if (pile.value.length < 2) return
  const next = pile.value.slice(1)
  next.push(pile.value[0])
  pile.value = next
  pick(pile.value[0])
}

function throwFront(direction = -1) {
  if (pile.value.length < 2) return
  const el = rootEl.value && rootEl.value.querySelector('[data-card="' + frontIndex.value + '"]')
  throwStyle.value = { x: direction * 220, y: -40, rotate: direction * 18, animating: true }
  setTimeout(() => {
    throwStyle.value = { x: 0, y: 0, rotate: 0, animating: false }
    moveFrontToBack()
  }, 260)
}

onDrag = (dx, dy) => {
  if (props.variant !== 'stack' && props.variant !== 'swap') return
  throwStyle.value = { x: dx, y: dy * 0.4, rotate: dx * 0.06, animating: false }
}
onDragEnd = (dx, dy) => {
  if (props.variant !== 'stack' && props.variant !== 'swap') return
  if (Math.abs(dx) > 90 || Math.abs(velocity) > 0.65) throwFront(dx > 0 ? 1 : -1)
  else throwStyle.value = { x: 0, y: 0, rotate: 0, animating: true }
}

/* swap：定时把最前面的牌送到最后面。 */
let swapTimer = 0
function startAuto() {
  stopAuto()
  if (!props.auto && props.variant !== 'swap' && props.variant !== 'depth') return
  if (!props.interval) return
  swapTimer = setInterval(() => {
    if (props.variant === 'swap' || props.variant === 'stack') moveFrontToBack()
    else if (props.variant === 'depth') depthNext(1)
    else if (props.variant === 'gallery') galleryOffset.value -= spanPx.value
    else if (props.variant === 'circular') { ringRotation.value -= stepAngle.value; onDragEnd() }
  }, Math.max(600, props.interval))
}
function stopAuto() { clearInterval(swapTimer); swapTimer = 0 }

watch(() => [props.variant, props.auto, props.interval], () => { if (props.auto || props.variant === 'swap') startAuto(); else stopAuto() }, { immediate: true })
onMounted(() => { if (props.auto || props.variant === 'swap' || props.variant === 'depth') startAuto(); nextTick(() => { if (props.variant === 'scroll-stack' && scrollerEl.value) scrollerEl.value.scrollTop = 0 }) })
onBeforeUnmount(() => { stopAuto(); pointerId = null })

/* 扇形几何：JS 算好位移 / 角度 / 缩放，避免依赖 CSS abs()（支持面太窄）。 */
function bounceVars(index) {
  const mid = (count.value - 1) / 2
  const offset = index - mid
  const distance = Math.abs(offset)
  return {
    '--card-tone': props.items[index]?.tone || 'primary',
    '--bounce-x': (offset * 54).toFixed(1) + 'px',
    '--bounce-y': (offset * 8).toFixed(1) + 'px',
    '--bounce-rot': (offset * 6).toFixed(2) + 'deg',
    '--bounce-scale': Math.max(0.78, 1 - distance * 0.04).toFixed(3),
    '--bounce-i': index
  }
}

function onKeydown(event) {
  if (!count.value) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); depthNext(1) }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); depthNext(-1) }
  if (event.key === 'Enter') { event.preventDefault(); moveFrontToBack() }
}
</script>

<template>
  <div
    ref="rootEl"
    class="ui-card-group"
    :class="`is-${variant}`"
    :style="{ '--cg-height': height + 'px', '--cg-card-width': cardWidth + 'px', '--cg-gap': gap + 'px' }"
    tabindex="0"
    role="group"
    aria-label="卡片组"
    @pointerdown="dragStart"
    @pointermove="dragMove"
    @pointerup="dragEnd"
    @pointercancel="dragEnd"
    @keydown="onKeydown"
  >
    <!-- ---------- gallery：横向平铺 + 循环 ---------- -->
    <div v-if="variant === 'gallery'" class="ui-card-group__gallery">
      <div ref="trackEl" class="ui-card-group__track" :style="galleryStyle">
        <div
          v-for="(item, index) in galleryList"
          :key="'g' + index"
          data-card
          class="ui-card-group__card"
          :class="{ 'is-active': index % (count || 1) === active }"
          :data-card="index % (count || 1)"
          :style="{ '--card-tone': item.tone || 'primary' }"
        >
          <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__caption">
            <b>{{ item.title }}</b>
            <small v-if="item.meta">{{ item.meta }}</small>
          </span>
        </div>
      </div>
    </div>

    <!-- ---------- circular：3D 圆环 ---------- -->
    <div v-else-if="variant === 'circular'" class="ui-card-group__circular">
      <div
        v-for="(item, index) in items"
        :key="'c' + index"
        data-card
        class="ui-card-group__card"
        :class="{ 'is-active': index === active }"
        :data-card="index"
        :style="[circleStyle(index), { '--card-tone': item.tone || 'primary' }]"
      >
        <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
        <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
        <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
      </div>
    </div>

    <!-- ---------- depth：Z 轴轨道 ---------- -->
    <div v-else-if="variant === 'depth'" class="ui-card-group__depth">
      <div
        v-for="(item, index) in items"
        :key="'d' + index"
        data-card
        class="ui-card-group__card"
        :class="{ 'is-active': index === active }"
        :data-card="index"
        :style="[depthStyle(index), { '--card-tone': item.tone || 'primary' }]"
      >
        <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
        <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
        <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
      </div>
    </div>

    <!-- ---------- wall：透视墙 ---------- -->
    <div v-else-if="variant === 'wall'" class="ui-card-group__wall">
      <div class="ui-card-group__wall-plane">
        <div
          v-for="(item, index) in wallTiles"
          :key="'w' + index"
          data-card
          class="ui-card-group__tile"
          :data-card="index % (count || 1)"
          :style="{ '--card-tone': item.tone || 'primary' }"
        >
          <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
          <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
          <span class="ui-card-group__tile-label">{{ item.title }}</span>
        </div>
      </div>
    </div>

    <!-- ---------- scroll-stack：滚动压栈 ---------- -->
    <div v-else-if="variant === 'scroll-stack'" ref="scrollerEl" class="ui-card-group__scroller" @scroll.passive="onScroll">
      <div class="ui-card-group__scroller-inner" :style="{ height: (count + 1) * 62 + '%' }">
        <div
          v-for="(item, index) in items"
          :key="'s' + index"
          data-card
          class="ui-card-group__pin"
          :data-card="index"
          :style="[{ top: index * 10 + 'px' }, stackScrollStyle(index)]"
        >
          <div class="ui-card-group__pin-card" :style="{ '--card-tone': item.tone || 'primary' }">
            <b>{{ item.title }}</b>
            <small v-if="item.meta">{{ item.meta }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- ---------- stack / swap：牌堆 ---------- -->
    <div v-else-if="variant === 'stack' || variant === 'swap'" class="ui-card-group__pile">
      <div
        v-for="(index, position) in pile"
        :key="'p' + index"
        data-card
        class="ui-card-group__card ui-card-group__pile-card"
        :class="{ 'is-front': position === 0, 'is-thrown': position === 0 && (throwStyle.x !== 0 || throwStyle.y !== 0) }"
        :data-card="index"
        :style="[
          pileStyle(position),
          position === 0 ? {
            transform: (position === 0 ? 'translate3d(' + throwStyle.x + 'px,' + throwStyle.y + 'px,0) rotate(' + throwStyle.rotate + 'deg)' : '') + ' scale(1)',
            transition: throwStyle.animating ? 'transform var(--t-panel) var(--spring-view)' : 'none'
          } : {},
          { '--card-tone': items[index]?.tone || 'primary' }
        ]"
      >
        <img v-if="items[index]?.image" :src="items[index].image" :alt="items[index].title" loading="lazy" />
        <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
        <span class="ui-card-group__caption">
          <b>{{ items[index]?.title }}</b>
          <small v-if="items[index]?.meta">{{ items[index].meta }}</small>
        </span>
      </div>
      <div class="ui-card-group__pile-actions">
        <button type="button" class="ui-card-group__pill" @click="moveFrontToBack">下一张</button>
        <button type="button" class="ui-card-group__pill" @click="throwFront(-1)">甩掉</button>
      </div>
    </div>

    <!-- ---------- bounce：扇形牌组 ---------- -->
    <div v-else class="ui-card-group__bounce">
      <div
        v-for="(item, index) in items"
        :key="'b' + index"
        data-card
        class="ui-card-group__card ui-card-group__bounce-card"
        :class="{ 'is-active': index === active }"
        :data-card="index"
        :style="bounceVars(index)"
      >
        <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
        <span v-else class="ui-card-group__blank" aria-hidden="true"></span>
        <span class="ui-card-group__caption"><b>{{ item.title }}</b><small v-if="item.meta">{{ item.meta }}</small></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-card-group {
  position: relative;
  width: 100%;
  border-radius: calc(18px * var(--radius-scale));
  outline: none;
  touch-action: pan-y;
  user-select: none;
}
.ui-card-group:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 3px; }

/* ---------- 通用卡片 ---------- */
.ui-card-group__card {
  position: relative;
  flex: 0 0 auto;
  width: var(--cg-card-width, 190px);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(16px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  box-shadow: var(--elev-card);
  transform-origin: center center;
  transition: transform var(--t-panel) var(--spring-view), opacity var(--t-fade), box-shadow var(--t-fade);
  will-change: transform;
}
.ui-card-group__card img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.ui-card-group__blank {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--primary) 34%, transparent), transparent 62%),
    linear-gradient(150deg, var(--surface-container-high), var(--surface-container));
}
.ui-card-group__caption {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 16px 12px 9px;
  background: linear-gradient(to top, rgba(0, 0, 0, .5), transparent);
  color: #fff;
  font-size: var(--fs-tiny);
}
.ui-card-group__caption b { font-weight: var(--w-label); }
.ui-card-group__caption small { font-size: var(--fs-micro); opacity: .82; }

/* ---------- gallery ---------- */
.ui-card-group__gallery { height: var(--cg-height); overflow: hidden; mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent); }
.ui-card-group__track { display: flex; gap: var(--cg-gap); align-items: center; height: 100%; will-change: transform; }
.ui-card-group__gallery .ui-card-group__card { height: 78%; aspect-ratio: auto; }
.ui-card-group__gallery .ui-card-group__card.is-active { box-shadow: var(--elev-tip); }

/* ---------- circular ---------- */
.ui-card-group__circular {
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 1200px;
  transform-style: preserve-3d;
}
.ui-card-group__circular .ui-card-group__card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.86);
  transform-style: preserve-3d;
  backface-visibility: hidden;
}
.ui-card-group__circular .ui-card-group__card.is-active { box-shadow: var(--elev-tip); }
.ui-card-group__circular .ui-card-group__card.is-active .ui-card-group__caption { color: #fff; }

/* ---------- depth ---------- */
.ui-card-group__depth {
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 820px;
  transform-style: preserve-3d;
}
.ui-card-group__depth .ui-card-group__card { position: absolute; width: calc(var(--cg-card-width) * 0.9); }
.ui-card-group__depth .ui-card-group__card.is-active { box-shadow: var(--elev-tip); }

/* ---------- wall ---------- */
.ui-card-group__wall {
  height: var(--cg-height);
  overflow: hidden;
  perspective: 900px;
  mask-image: radial-gradient(120% 110% at 50% 50%, #000 52%, transparent 100%);
}
.ui-card-group__wall-plane {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  height: 160%;
  align-content: start;
  transform: rotateX(24deg) rotateZ(-6deg);
  animation: cgWallDrift 22s linear infinite;
}
.ui-card-group__tile {
  position: relative;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  border-radius: calc(12px * var(--radius-scale));
  border: var(--border-w) solid var(--outline-variant);
  background: var(--surface-container-low);
  transition: transform var(--t-panel) var(--spring-view), box-shadow var(--t-fade), border-color var(--t-fade);
}
.ui-card-group__tile img { width: 100%; height: 100%; object-fit: cover; }
.ui-card-group__tile-label { position: absolute; inset: auto 6px 5px 6px; color: var(--on-surface); font-size: var(--fs-micro); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 悬停的瓦片从墙里抬起来：位移 + 放大 + 描边亮起。 */
.ui-card-group__tile:hover {
  transform: translateZ(46px) scale(1.06);
  box-shadow: var(--elev-tip);
  border-color: var(--primary);
  z-index: 2;
}
@keyframes cgWallDrift {
  from { transform: rotateX(24deg) rotateZ(-6deg) translateY(-8%); }
  to { transform: rotateX(24deg) rotateZ(-6deg) translateY(-46%); }
}

/* ---------- scroll-stack ---------- */
.ui-card-group__scroller {
  height: var(--cg-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  border-radius: inherit;
}
.ui-card-group__scroller::-webkit-scrollbar { display: none; }
.ui-card-group__scroller-inner { position: relative; padding: 0 2px; }
.ui-card-group__pin { position: sticky; height: 58px; transform-origin: top center; transition: transform var(--t-fade), filter var(--t-fade); }
.ui-card-group__pin-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  padding: 12px 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: linear-gradient(140deg, var(--surface-container-low), var(--surface-container));
  box-shadow: var(--elev-card);
  font-size: var(--fs-small);
}
.ui-card-group__pin-card small { color: var(--on-surface-variant); font-size: var(--fs-micro); }

/* ---------- stack / swap ---------- */
.ui-card-group__pile {
  position: relative;
  height: var(--cg-height);
  display: grid;
  place-items: center;
  perspective: 1100px;
}
.ui-card-group__pile-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.92);
  transform-style: preserve-3d;
  cursor: grab;
}
.ui-card-group__pile-card.is-front { cursor: grab; }
.ui-card-group__pile-card.is-front:active { cursor: grabbing; }
.ui-card-group__pile-card.is-front.is-thrown { opacity: .96; }
.ui-card-group__pile-actions { position: absolute; inset: auto 0 6px 0; display: flex; justify-content: center; gap: 8px; }
.ui-card-group__pill {
  padding: 7px 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 82%, transparent);
  color: var(--on-surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: transform var(--t-feedback), border-color var(--t-fade);
}
.ui-card-group__pill:active { transform: scale(var(--press-scale)); }

/* ---------- bounce ---------- */
.ui-card-group__bounce {
  height: var(--cg-height);
  position: relative;
  display: grid;
  place-items: center;
  perspective: 900px;
}
.ui-card-group__bounce-card {
  position: absolute;
  width: calc(var(--cg-card-width) * 0.68);
  /* 扇形：以中轴为基准左右展开并倾斜，悬停的那张扶正。 */
  transform: translate3d(var(--bounce-x, 0px), var(--bounce-y, 0px), 0) rotate(var(--bounce-rot, 0deg)) scale(var(--bounce-scale, 1));
  animation: cgBounceIn 620ms var(--spring-view) both;
  animation-delay: calc(var(--bounce-i) * 55ms);
}
.ui-card-group__bounce-card:hover {
  transform: translate3d(var(--bounce-x, 0px), calc(var(--bounce-y, 0px) - 14px), 0) rotate(0deg) scale(1.06);
  z-index: 40;
}
@keyframes cgBounceIn {
  0% { opacity: 0; transform: translate3d(0, 120%, 0) rotate(0deg) scale(.7); filter: blur(10px); }
  60% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-card-group__wall-plane { animation: none; }
  .ui-card-group__bounce-card { animation: none; }
  .ui-card-group__card { transition-duration: .01ms; }
}
</style>
