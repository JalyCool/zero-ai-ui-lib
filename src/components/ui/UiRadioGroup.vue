<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /* [{ label, value }] */
  options: { type: Array, default: () => [] },
  name: { type: String, default: 'ui-radio' }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   单选（果冻）
   选中的那一颗会鼓起来，并且把左右邻居往外推一点：
   邻居的位移量按「离选中项的距离」衰减，越远推得越少，
   所以整排看起来像被中间那颗顶开，而不是一起平移。
   位移与缩放都走同一个弹簧，松手时是软的回弹。
   ============================================================ */

const selectedIndex = computed(() => props.options.findIndex(option => option.value === props.modelValue))

function jellyStyle(index) {
  if (selectedIndex.value < 0) return {}
  const offset = index - selectedIndex.value
  if (offset === 0) return { transform: 'translateX(0) scale(1.07)' }
  const push = Math.max(0, 3 - Math.abs(offset)) * 2.6
  return { transform: 'translateX(' + Math.sign(offset) * push + 'px) scale(' + (1 - Math.min(0.06, Math.abs(offset) * 0.02)) + ')' }
}

function onChange(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="ui-radio-group" role="radiogroup">
    <label
      v-for="(option, index) in options"
      :key="option.value"
      class="ui-radio"
      :class="{ 'is-on': modelValue === option.value }"
      :style="jellyStyle(index)"
    >
      <input
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        @change="onChange"
      >
      <span class="ui-radio__dot" aria-hidden="true"></span>
      <span class="ui-radio__label">{{ option.label }}</span>
    </label>
  </div>
</template>

<style scoped>
.ui-radio-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ui-radio {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px 7px 10px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: var(--fs-small);
  cursor: pointer;
  user-select: none;
  transition: transform var(--t-panel) var(--spring-view), background var(--t-fade),
              border-color var(--t-fade), color var(--t-fade), box-shadow var(--t-fade);
  will-change: transform;
}
.ui-radio input { position: absolute; opacity: 0; width: 0; height: 0; }
.ui-radio__dot {
  position: relative;
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 50%;
  background: var(--surface);
  transition: border-color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
/* 内圈：选中时长出来（scale 从 0 起），和外圈一起构成「鼓起来」的感觉。 */
.ui-radio__dot::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--on-primary);
  transform: scale(0);
  transition: transform var(--t-feedback) var(--spring-feedback);
}
.ui-radio.is-on {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
  box-shadow: var(--elev-tip);
}
.ui-radio.is-on .ui-radio__dot { border-color: transparent; background: color-mix(in oklab, #fff 78%, transparent); transform: scale(1.06); }
.ui-radio.is-on .ui-radio__dot::after { transform: scale(1); background: var(--primary); }
.ui-radio:active { transform: scale(var(--press-scale)); }
.ui-radio:focus-within { outline: var(--focus-w) solid var(--primary); outline-offset: 2px; }
.ui-radio__label { white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .ui-radio, .ui-radio__dot, .ui-radio__dot::after { transition-duration: .01ms; }
}
</style>
