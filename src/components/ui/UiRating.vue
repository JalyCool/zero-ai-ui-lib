<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 4 },
  max: { type: Number, default: 5 },
  label: { type: String, default: '评分' },
  /* 允许半星：点击左半边 = x.5 */
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

function select(star, event) {
  if (props.readonly) return
  let value = star
  if (props.half) {
    const rect = event.currentTarget.getBoundingClientRect()
    value = event.clientX - rect.left < rect.width / 2 ? star - 0.5 : star
  }
  current.value = value
  pulse.value += 1
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="ui-rating">
    <div class="ui-rating__head">
      <span class="ui-rating__label">{{ label }}</span>
      <span class="ui-rating__value">{{ current }} / {{ max }}</span>
    </div>
    <div class="ui-rating__stars" role="radiogroup" :aria-label="label" @mouseleave="hovered = 0">
      <button
        v-for="star in stars"
        :key="star"
        type="button"
        role="radio"
        :aria-checked="modelValue === star"
        :aria-label="`${star} 星`"
        :class="[
          'ui-rating__star',
          { 'is-filled': fillOf(star) > 0, 'is-half': fillOf(star) === 0.5, 'is-pulsing': pulse > 0 }
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
.ui-rating__stars { display: flex; align-items: center; gap: 3px; }
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

@media (max-width: 380px) { .ui-rating__star { width: 30px; height: 30px; } }
@media (prefers-reduced-motion: reduce) {
  .ui-rating__star.is-filled.is-pulsing svg { animation: none; }
}
</style>
