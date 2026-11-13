<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 4 },
  max: { type: Number, default: 5 },
  label: { type: String, default: '评分' }
})

const emit = defineEmits(['update:modelValue'])

const hovered = ref(0)
const current = ref(Number(props.modelValue))

watch(() => props.modelValue, value => {
  current.value = Number(value)
})

const stars = computed(() => Array.from({ length: props.max }, (_, index) => index + 1))
const displayValue = computed(() => hovered.value || current.value)

function select(value) {
  current.value = value
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
        :class="{ 'is-filled': star <= displayValue }"
        @mouseenter="hovered = star"
        @focus="hovered = star"
        @blur="hovered = 0"
        @click="select(star)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ui-rating {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-rating__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ui-rating__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}
.ui-rating__value {
  color: var(--on-surface-variant);
  font-family: ui-monospace, monospace;
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
}
.ui-rating__stars {
  display: flex;
  align-items: center;
  gap: 3px;
}
.ui-rating__stars button {
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
.ui-rating__stars button:hover { background: var(--surface-container); }
.ui-rating__stars button:active { transform: scale(.88); }
.ui-rating__stars button:focus-visible {
  outline: var(--focus-w) solid var(--primary);
  outline-offset: 1px;
}
.ui-rating__stars button svg { width: 21px; height: 21px; }
.ui-rating__stars button.is-filled {
  color: var(--ui-warning);
}
.ui-rating__stars button.is-filled svg {
  fill: color-mix(in oklab, var(--ui-warning) 24%, transparent);
}
@media (max-width: 380px) {
  .ui-rating__stars button { width: 30px; height: 30px; }
}
</style>
