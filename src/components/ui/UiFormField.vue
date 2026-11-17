<script setup>
import { computed, inject, onBeforeUnmount, provide, ref, watch } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  /* 规则：[(value) => true | '错误文案'] */
  rules: { type: Array, default: () => [] },
  value: { type: null, default: undefined },
  required: { type: Boolean, default: false },
  /* 格式正则：只有「首次匹配成功」或「失焦」时才给出结论，避免刚输一个字就报错 */
  pattern: { type: [RegExp, String], default: null },
  /* 格式不匹配时的提示 */
  patternMessage: { type: String, default: '格式不正确' }
})

/* 表单项：持有自己的错误状态；真正提交由外层 UiForm 统一触发校验。
   · 必填星号用强调色（primary），不用红色 —— 红是「已经错了」，不是「还差你填」；
   · 常规状态下不显示错误行，只有 submit 之后或失焦校验失败才显示。 */
const form = inject('ui-form', null)
const error = ref('')
const touched = ref(false)
const id = Math.random().toString(36).slice(2)

const patternRule = computed(() => {
  if (!props.pattern) return null
  const re = props.pattern instanceof RegExp ? props.pattern : new RegExp(props.pattern)
  return re
})

/* 格式是否通过（供 UiInput 打绿勾 / 红叉） */
const patternOk = computed(() => {
  if (!patternRule.value) return null
  const value = props.value
  if (value === '' || value === null || value === undefined) return null
  patternRule.value.lastIndex = 0
  return patternRule.value.test(String(value))
})
provide('ui-form-field', { validate, error, id, touched, patternOk })

function validate() {
  const value = props.value
  if (props.required && (value === '' || value === null || value === undefined || (Array.isArray(value) && !value.length))) {
    error.value = '此项必填'
    return false
  }
  /* 正则：非空才校验（空值交给 required 管） */
  if (patternRule.value && value !== '' && value !== null && value !== undefined) {
    patternRule.value.lastIndex = 0
    if (!patternRule.value.test(String(value))) {
      error.value = props.patternMessage
      return false
    }
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

/* 输入过程中：只在「从不对变成对」的瞬间清掉旧错误（改对了立刻回绿），
   不因为刚输一两个字就报错。 */
watch(() => props.value, () => {
  if (error.value && validate()) error.value = ''
  else if (patternOk.value === true) error.value = ''
})

/* 登记时带上根元素引用：UiForm 提交失败要滚到第一处错误 */
const rootEl = ref(null)
const entry = { validate, el: () => rootEl.value }
if (form) form.fields.add(entry)
onBeforeUnmount(() => { if (form) form.fields.delete(entry) })

/* 错误只在右侧气泡显示；下方只留 hint，不出现常驻红色错误行 */
const showError = computed(() => touched.value && !!error.value)
</script>
<template>
  <div ref="rootEl" class="ui-form-field" :class="{ 'has-error': showError }">
    <span v-if="label" class="ui-field__label">
      {{ label }}<em v-if="required" class="is-required" aria-hidden="true">*</em>
    </span>
    <slot :error="error" :validate="validate" :pattern-ok="patternOk" :touched="touched" @blur="touched = true" />
    <!-- 说明文本常驻在下方（hint）；错误一律只在右侧气泡里说，不再往下塞红字 -->
    <span v-if="props.hint && !showError" class="ui-form-field__msg" role="status">{{ props.hint }}</span>

    <Transition name="field-bubble">
      <span v-if="showError" class="ui-form-field__bubble" role="alert">{{ error }}</span>
    </Transition>
  </div>
</template>
<style scoped>
.ui-form-field { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
/* 右侧气泡：锚在字段右上角，箭头指向字段；进出场是位移 + 模糊 + 缩放 */
.ui-form-field__bubble {
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  z-index: 30;
  max-width: 220px;
  padding: 7px 11px;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--inverse-surface, #2f3033);
  color: var(--inverse-on-surface, #f2f1f6);
  font-size: var(--fs-micro);
  line-height: 1.45;
  white-space: pre-line;
  pointer-events: none;
}
.ui-form-field__bubble::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 12px;
  width: 8px;
  height: 8px;
  background: inherit;
  border-radius: 2px;
  transform: rotate(45deg);
}
/* 窄屏（没有右侧空间）时气泡改到下方，避免被视口裁掉 */
@media (max-width: 720px) {
  .ui-form-field__bubble { left: 0; top: calc(100% + 6px); max-width: 100%; }
  .ui-form-field__bubble::before { left: 14px; top: -3px; }
}
.field-bubble-enter-active, .field-bubble-leave-active {
  transition: opacity var(--t-fade), transform var(--t-pop), filter var(--t-fade);
}
.field-bubble-enter-from, .field-bubble-leave-to {
  opacity: 0; transform: translateX(-6px) scale(.94); filter: blur(5px);
}
/* 必填星号：强调色（primary），不是红色 —— 红色留给「真错了」 */
.ui-field__label em.is-required { margin-left: 3px; color: var(--primary); font-style: normal; font-weight: var(--w-strong); }
.ui-form-field__msg { font-size: var(--fs-micro); color: var(--on-surface-variant); line-height: 1.45; }
.ui-form-field__msg.is-error { color: var(--error); }
/* 提交后高亮：字段整体临时套一圈错误色轮廓（滚到位时一眼看到问题在哪） */
.ui-form-field.has-error :deep(input),
.ui-form-field.has-error :deep(textarea) { border-color: color-mix(in oklab, var(--error) 55%, var(--outline-variant)); }
.ui-form-field.has-error :deep(.ui-field__control) {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--error) 16%, transparent);
  border-radius: calc(13px * var(--radius-scale));
}
.ui-form-field.has-error { animation: uiFieldNudge 420ms var(--spring-pop) both; }
@keyframes uiFieldNudge {
  0% { transform: none; }
  30% { transform: translateX(-3px); }
  60% { transform: translateX(2px); }
  100% { transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ui-form-field.has-error, .ui-form-field__bubble { animation: none; transition-duration: .01ms; }
}
</style>
