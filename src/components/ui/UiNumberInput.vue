<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
  precision: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

/* 数字输入：输入框 + 上下步进，长按连续加减；步进按 precision 取整。 */
const draft = ref(null)
const value = computed(() => Number(props.modelValue) || 0)
const shown = computed(() => draft.value !== null ? draft.value : value.value.toFixed(props.precision))

function commit(next) {
  const step = props.step || 1
  const factor = Math.pow(10, Math.max(0, props.precision))
  let out = Math.round(next / step) * step
  out = Math.min(props.max, Math.max(props.min, out))
  out = Math.round(out * factor) / factor
  emit('update:modelValue', out)
  return out
}
function bump(delta) { commit(value.value + delta * (props.step || 1)) }
function onInput(event) { draft.value = event.target.value }
function onBlur() {
  const parsed = Number(String(draft.value ?? '').replace(/[^\d.-]/g, ''))
  draft.value = null
  if (Number.isFinite(parsed)) commit(parsed)
}

let repeat = 0
function startRepeat(delta) {
  bump(delta)
  clearInterval(repeat)
  repeat = setInterval(() => bump(delta), 90)
}
function stopRepeat() { clearInterval(repeat) }
onBeforeUnmount(() => clearInterval(repeat))
</script>
<template>
  <div class="ui-number">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <div class="ui-number__box" :class="{ 'is-disabled': disabled }">
      <input :value="shown" inputmode="decimal" :disabled="disabled" @input="onInput" @blur="onBlur" @keydown.enter="$event.target.blur()" />
      <span v-if="unit" class="ui-number__unit">{{ unit }}</span>
      <span class="ui-number__steppers">
        <button type="button" tabindex="-1" aria-label="增加" :disabled="disabled || value >= max"
          @pointerdown="startRepeat(1)" @pointerup="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 14l6-6 6 6" /></svg>
        </button>
        <button type="button" tabindex="-1" aria-label="减少" :disabled="disabled || value <= min"
          @pointerdown="startRepeat(-1)" @pointerup="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 10l6 6 6-6" /></svg>
        </button>
      </span>
    </div>
  </div>
</template>
<style scoped>
.ui-number { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ui-number__box { display: flex; align-items: center; gap: 4px; border: var(--border-w) solid var(--outline-variant); border-radius: calc(13px * var(--radius-scale)); background: var(--surface-container-low); padding-right: 4px; }
.ui-number__box.is-disabled { opacity: .42; }
.ui-number__box input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border: 0; background: transparent; color: var(--on-surface); font: inherit; font-size: var(--fs-small); font-variant-numeric: tabular-nums; outline: none; }
.ui-number__unit { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-number__steppers { display: flex; flex-direction: column; gap: 2px; }
.ui-number__steppers button { display: grid; place-items: center; width: 26px; height: 18px; border: 0; border-radius: 6px; background: var(--surface-container); color: var(--on-surface-variant); cursor: pointer; }
.ui-number__steppers button:active { transform: scale(.92); }
.ui-number__steppers svg { width: 12px; height: 12px; }
</style>
