<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 4 },
  max: { type: Number, default: 5 },
  label: { type: String, default: '评分' },
  /* 允许半星：点击星星先弹「半颗 / 整颗」小浮层让用户选 */
  half: { type: Boolean, default: false },
  /* 只读（展示用，不响应点击） */
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const hovered = ref(0)
const current = ref(Number(props.modelValue))
/* 每次点选递增，用来重播「点亮」动画（key 变化 = 重新挂载动画） */
const pulse = ref(0)

watch(() => props.modelValue, value => {
  current.value = Number(value)
})

const stars = computed(() => Array.from({ length: props.max }, (_, index) => index + 1))
const displayValue = computed(() => hovered.value || current.value)

/* 某颗星的填充度：0 / .5 / 1 */
function fillOf(star) {
  const v = displayValue.value
  if (v >= star) return 1
  if (props.half && v >= star - 0.5) return 0.5
  return 0
}

/* ---------- 半星选择浮层 ----------
   点到星星时弹出一个贴着该星的小浮层：半颗 / 整颗。
   按值判断：点击已满的星 -> 浮层给「半颗 / 整颗」；
   点击半满的星 -> 「半颗 / 整颗」同语义（当前值已经是半则「整颗」高亮）。
   Esc / 点击外部 / 再次点击星星 = 收起并按原值保留。 */
const pickStar = ref(0) /* 正在选择的星号（0 = 浮层关） */
const pickOpen = ref(false)
const pickStyle = ref({})
const starsEl = ref(null)
let closeTimer = null

function starRect(star) {
  const root = starsEl.value
  if (!root) return null
  const btn = root.querySelectorAll('.ui-rating__star')[star - 1]
  return btn ? btn.getBoundingClientRect() : null
}

function positionPick(star) {
  const rect = starRect(star)
  if (!rect) return
  const rootRect = starsEl.value.getBoundingClientRect()
  pickStyle.value = {
    /* 浮层中心对准星星中心，垂直放在星星下方 */
    left: Math.max(0, rect.left - rootRect.left + rect.width / 2) + 'px',
    top: rect.bottom - rootRect.top + 6 + 'px'
  }
}

function requestPick(star) {
  pickStar.value = star
  pickOpen.value = false
  nextTick(() => {
    positionPick(star)
    pickOpen.value = true
    /* 浮层可能在滚动区深处：滚进来，否则用户看不见 */
    nextTick(() => {
      const pick = starsEl.value?.querySelector('.ui-rating__pick')
      pick?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  })
}

function closePick() {
  pickOpen.value = false
  pickStar.value = 0
}

function commitPick(value) {
  current.value = value
  pulse.value += 1
  emit('update:modelValue', value)
  closePick()
}

function select(star, event) {
  if (props.readonly) return
  /* 半星关闭：直接整颗 */
  if (!props.half) {
    commitPick(star)
    return
  }
  /* 半星开启：先弹浮层。若重复点同一颗且浮层已开 -> 视为收起 */
  if (pickOpen.value && pickStar.value === star) {
    closePick()
    return
  }
  hovered.value = star
  requestPick(star)
}

function onDocPointerDown(e) {
  if (!pickOpen.value) return
  const root = starsEl.value
  if (root?.contains(e.target)) return
  /* 浮层内部点击由按钮自己处理；这里只收外部的 */
  const pick = e.target.closest?.('.ui-rating__pick')
  if (pick) return
  closePick()
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  clearTimeout(closeTimer)
})

function onKeydown(e) {
  if (!pickOpen.value) return
  if (e.key === 'Escape') { e.preventDefault(); closePick() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); commitPick(pickStar.value - 0.5) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); commitPick(pickStar.value) }
}

/* 浮层的两个选项：半颗 / 整颗 */
const pickOptions = computed(() => {
  const star = pickStar.value
  if (!star) return []
  return [
    { value: star - 0.5, label: '半颗' },
    { value: star, label: '整颗' }
  ]
})
</script>

<template>
  <div class="ui-rating">
    <div class="ui-rating__head">
      <span class="ui-rating__label">{{ label }}</span>
      <span class="ui-rating__value">{{ current }} / {{ max }}</span>
    </div>
    <div
      ref="starsEl"
      class="ui-rating__stars"
      role="radiogroup"
      :aria-label="label"
      @mouseleave="hovered = 0"
      @keydown="onKeydown"
    >
      <button
        v-for="star in stars"
        :key="star"
        type="button"
        role="radio"
        :aria-checked="modelValue === star"
        :aria-label="`${star} 星`"
        :aria-haspopup="half ? 'menu' : undefined"
        :aria-expanded="half && pickOpen && pickStar === star"
        :class="[
          'ui-rating__star',
          { 'is-filled': fillOf(star) > 0, 'is-half': fillOf(star) === 0.5, 'is-pulsing': pulse > 0, 'is-pick-open': half && pickOpen && pickStar === star }
        ]"
        :style="{ '--pulse-delay': (star - 1) * 28 + 'ms' }"
        @mouseenter="hovered = star"
        @focus="hovered = star"
        @blur="hovered = 0"
        @click="select(star, $event)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <!-- 半星：用线性渐变只填左半边 -->
            <linearGradient :id="'uiStarHalf' + star" x1="0" x2="1" y1="0" y2="0">
              <stop offset="50%" stop-color="currentColor" />
              <stop offset="50%" stop-color="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z"
            :fill="fillOf(star) === 1 ? 'currentColor' : (fillOf(star) === 0.5 ? `url(#uiStarHalf${star})` : 'none')"
          />
        </svg>
      </button>

      <!-- 半星选择浮层：贴着目标星，二选一 -->
      <Transition name="ui-rating-pick">
        <div
          v-if="pickOpen"
          class="ui-rating__pick"
          :style="pickStyle"
          role="menu"
          :aria-label="`选择第 ${pickStar} 颗星的精度`"
        >
          <button
            v-for="opt in pickOptions"
            :key="opt.value"
            type="button"
            role="menuitemradio"
            :aria-checked="current === opt.value"
            class="ui-rating__pick-item"
            :class="{ 'is-active': current === opt.value }"
            @click="commitPick(opt.value)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path
                v-if="opt.value % 1 === 0"
                d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z"
                fill="currentColor"
              />
              <template v-else>
                <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z" fill="none" />
                <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z" fill="currentColor" clip-path="url(#uiPickHalfClip)" />
                <clipPath :id="'uiPickHalfClip'"><rect x="0" y="0" width="12" height="24" /></clipPath>
              </template>
            </svg>
            {{ opt.label }}
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.ui-rating { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ui-rating__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ui-rating__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-rating__value {
  color: var(--on-surface-variant);
  font-family: var(--font-numeric);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
.ui-rating__stars { display: flex; align-items: center; gap: 3px; position: relative; }
.ui-rating__star {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--outline);
  cursor: pointer;
  transition: color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-rating__star:hover { background: var(--surface-container); }
.ui-rating__star:active { transform: scale(.88); }
.ui-rating__star:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 1px; }
.ui-rating__star.is-pick-open { background: var(--surface-container-high); }
.ui-rating__star svg { width: 21px; height: 21px; transition: fill var(--t-fade), color var(--t-fade); }
.ui-rating__star.is-filled { color: var(--ui-warning); }

/* 点亮时：每颗星错峰弹一下（不是整排一起跳） */
.ui-rating__star.is-filled.is-pulsing svg {
  animation: uiStarPop 420ms var(--spring-pop) both;
  animation-delay: var(--pulse-delay, 0ms);
}
@keyframes uiStarPop {
  0% { transform: scale(.72); }
  55% { transform: scale(1.18); }
  100% { transform: scale(1); }
}

/* ---------- 半星选择浮层 ---------- */
.ui-rating__pick {
  position: absolute;
  z-index: 90;
  display: flex;
  gap: 2px;
  padding: 3px;
  transform: translateX(-50%);
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface-container-high);
  box-shadow: 0 6px 22px color-mix(in oklab, var(--on-surface) 18%, transparent);
}
.ui-rating__pick-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 0;
  border-radius: calc(var(--r-9) * var(--radius-scale));
  background: none;
  color: var(--on-surface-variant);
  font: inherit;
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-rating__pick-item svg { width: 14px; height: 14px; }
.ui-rating__pick-item:active { transform: scale(.94); }
@media (hover: hover) {
  .ui-rating__pick-item:hover { background: var(--surface-container); color: var(--on-surface); }
}
.ui-rating__pick-item.is-active {
  background: var(--primary-container);
  color: var(--on-primary-container);
}

.ui-rating-pick-enter-active,
.ui-rating-pick-leave-active { transition: opacity var(--t-pop), transform var(--t-pop); transform-origin: top center; }
.ui-rating-pick-enter-from,
.ui-rating-pick-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px) scale(.92); }

@media (prefers-reduced-motion: reduce) {
  .ui-rating__star.is-filled.is-pulsing svg { animation: none; }
}
</style>