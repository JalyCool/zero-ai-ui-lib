<script setup>
import { computed, inject, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  inputmode: { type: String, default: undefined },
  /* 格式校验：正则或字符串。命中即绿勾，失焦且不命中即红叉。 */
  pattern: { type: [RegExp, String], default: null },
  /* 不命中时的提示文案 */
  patternMessage: { type: String, default: '格式不正确' }
})

const emit = defineEmits(['update:modelValue'])

/* 校验节奏（避免刚输一两个字就报错）：
   · 输入过程中：只有「改对了」会立刻变绿（从错到对的即时反馈）；
   · 输入过程中：从不主动变红；
   · 失焦时：才给出最终结论（绿勾 / 红叉 + 原因）。 */
const touched = ref(false)
const field = inject('ui-form-field', null)

const regex = computed(() => {
  if (!props.pattern) return null
  return props.pattern instanceof RegExp ? props.pattern : new RegExp(props.pattern)
})

const filled = computed(() => props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined)
const matched = computed(() => {
  if (!regex.value || !filled.value) return null
  regex.value.lastIndex = 0
  return regex.value.test(String(props.modelValue))
})

/* 判定结果：null 什么都不显示 / true 绿勾 / false 红叉 */
const status = computed(() => {
  if (!regex.value || !filled.value) return null
  if (matched.value) return true
  return touched.value ? false : null
})

const showError = computed(() => status.value === false)
const message = computed(() => {
  if (props.error) return props.error
  if (showError.value) return props.patternMessage
  return ''
})

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function onFocus() {
  if (field && field.touched) field.touched.value = true
}

function onBlur() {
  touched.value = true
  if (field && field.touched) field.touched.value = true
}
</script>

<template>
  <label class="ui-field">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <span
      class="ui-field__control"
      :class="{ 'is-error': !!error || showError, 'is-valid': status === true }"
    >
      <span v-if="$slots.prefix" class="ui-field__icon"><slot name="prefix" /></span>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :min="min"
        :max="max"
        :step="step"
        :inputmode="inputmode"
        :aria-invalid="!!error || showError"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >
      <!-- 校验结论：绿勾 / 红叉，只在有 pattern 时出现 -->
      <span v-if="status !== null" class="ui-field__state" :class="status ? 'is-ok' : 'is-bad'" aria-hidden="true">
        <svg v-if="status" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.4 4.4L19 7" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 7L7 17" /></svg>
      </span>
      <span v-if="$slots.suffix" class="ui-field__icon"><slot name="suffix" /></span>
    </span>
    <span v-if="error || showError" class="ui-field__error">{{ message }}</span>
    <span v-else-if="hint" class="ui-field__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.ui-field__state {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  transition: color var(--t-fade), background var(--t-fade), transform var(--t-pop);
}
.ui-field__state svg { width: 12px; height: 12px; }
.ui-field__state.is-ok { color: var(--ui-success, #15803d); }
.ui-field__state.is-bad { color: var(--error); }
.ui-field__control.is-valid { border-color: color-mix(in oklab, var(--ui-success, #15803d) 55%, var(--outline-variant)); }
</style>
