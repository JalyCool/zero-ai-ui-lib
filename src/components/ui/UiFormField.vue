<script setup>
import { computed, inject, onBeforeUnmount, provide, ref } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  /* 规则：[(value) => true | '错误文案'] */
  rules: { type: Array, default: () => [] },
  value: { type: null, default: undefined },
  required: { type: Boolean, default: false }
})

/* 表单项：持有自己的错误状态；真正提交由外层 UiForm 统一触发校验。 */
const form = inject('ui-form', null)
const error = ref('')
const id = Math.random().toString(36).slice(2)

function validate() {
  const value = props.value
  if (props.required && (value === '' || value === null || value === undefined || (Array.isArray(value) && !value.length))) {
    error.value = '此项必填'
    return false
  }
  for (const rule of props.rules) {
    const result = rule(value)
    if (result !== true && result !== undefined && result !== null) {
      error.value = String(result)
      return false
    }
  }
  error.value = ''
  return true
}

provide('ui-form-field', { validate, error, id })
if (form) form.fields.add(validate)
onBeforeUnmount(() => { if (form) form.fields.delete(validate) })

const message = computed(() => error.value || props.hint)
</script>
<template>
  <div class="ui-form-field" :class="{ 'has-error': !!error }">
    <span v-if="label" class="ui-field__label">
      {{ label }}<em v-if="required" aria-hidden="true">*</em>
    </span>
    <slot :error="error" :validate="validate" />
    <span v-if="message" class="ui-form-field__msg" :class="{ 'is-error': !!error }" role="status">{{ message }}</span>
  </div>
</template>
<style scoped>
.ui-form-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-field__label em { margin-left: 3px; color: var(--error); font-style: normal; }
.ui-form-field__msg { font-size: var(--fs-micro); color: var(--on-surface-variant); line-height: 1.45; }
.ui-form-field__msg.is-error { color: var(--error); }
.ui-form-field.has-error :deep(input), .ui-form-field.has-error :deep(textarea) { border-color: color-mix(in oklab, var(--error) 55%, var(--outline-variant)); }
</style>
