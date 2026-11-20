<script setup>
import { computed, inject, onBeforeUnmount, provide, ref, watch } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  /* 规则（两种形态，可混用）：
     · 普通：{ test: (v) => boolean, message, not?, label? } 或旧式 (v) => true | '文案'
     · 规则组（headless）：{ group: true, op: 'and'|'or', rules: [...], message, not?, label? }
       组自身不产生独立提示，只组织子规则；子规则失败时按 op 归并。 */
  rules: { type: Array, default: () => [] },
  value: { type: null, default: undefined },
  required: { type: Boolean, default: false },
  pattern: { type: [RegExp, String], default: null },
  patternMessage: { type: String, default: '格式不正确' }
})

const form = inject('ui-form', null)
const error = ref('')
const touched = ref(false)
const focused = ref(false)
const id = Math.random().toString(36).slice(2)

/* ---------- 规则归一化 ---------- */
function normalizeRule(rule) {
  if (typeof rule === 'function') {
    return { test: rule, message: '', label: '' }
  }
  if (rule && rule.group) {
    return { ...rule, rules: (rule.rules || []).map(normalizeRule) }
  }
  return { test: rule.test, message: rule.message || '', label: rule.label || '', not: !!rule.not }
}

const allRules = computed(() => props.rules.map(normalizeRule))

const patternRule = computed(() => {
  if (!props.pattern) return null
  return props.pattern instanceof RegExp ? props.pattern : new RegExp(props.pattern)
})

/* pattern 作为一条内置规则并入体系 */
const effectiveRules = computed(() => {
  const list = [...allRules.value]
  if (patternRule.value) {
    list.push({
      test: v => { patternRule.value.lastIndex = 0; return patternRule.value.test(String(v)) },
      message: props.patternMessage,
      label: props.patternMessage
    })
  }
  return list
})

/* 展开成带缩进的清单行（规则组 headless，只展开子规则） */
const flatRules = computed(() => {
  const out = []
  const walk = (list, depth) => {
    for (const rule of list) {
      if (rule.group) walk(rule.rules, depth)
      else out.push({ rule, depth })
    }
  }
  walk(effectiveRules.value, 0)
  return out
})

/* 清单用的实时状态：规则 + 缩进 + 当前是否通过 */
const flatRuleStates = computed(() =>
  flatRules.value.map(({ rule, depth }) => ({ rule, depth, pass: evalRule(rule, props.value).pass }))
)

/* ---------- 求值 ---------- */
function evalRule(rule, value) {
  if (rule.group) {
    const results = rule.rules.map(r => evalRule(r, value))
    const passed = rule.op === 'or' ? results.some(r => r.pass) : results.every(r => r.pass)
    const failed = results.flatMap(r => r.failed)
    return { pass: rule.not ? !passed : passed, failed: rule.not && passed ? [rule.message] : failed }
  }
  let pass = false
  try { pass = !!rule.test(value) } catch { pass = false }
  pass = rule.not ? !pass : pass
  return { pass, failed: pass ? [] : [rule.message || rule.label || '规则未通过'] }
}

const verdict = computed(() => {
  const value = props.value
  if (value === '' || value === null || value === undefined) return null
  const results = effectiveRules.value.map(r => evalRule(r, value))
  if (results.every(r => r.pass)) return 'ok'
  return results.some(r => r.pass) ? 'fail' : 'fail'
})

/* 未通过的规则（用于失焦后常驻提示） */
const failedRules = computed(() => {
  const value = props.value
  if (value === '' || value === null || value === undefined) return []
  const out = []
  for (const r of effectiveRules.value) {
    const res = evalRule(r, value)
    if (!res.pass) out.push(...res.failed)
  }
  return [...new Set(out)].filter(Boolean)
})

const patternOk = computed(() => (verdict.value === 'ok' ? true : verdict.value === 'fail' ? false : null))

function validate() {
  const value = props.value
  if (props.required && (value === '' || value === null || value === undefined || (Array.isArray(value) && !value.length))) {
    error.value = '此项必填'
    return false
  }
  if (verdict.value === 'fail') {
    error.value = failedRules.value[0] || '格式不正确'
    return false
  }
  error.value = ''
  return true
}

/* 输入过程中不报错：只有「匹配成功」或「已失焦」才给出结论。
   · 首次匹配成功 -> 清掉旧错误（绿勾）
   · 已失焦后仍不匹配 / 从匹配变不匹配 -> 红叉并展示未通过的规则 */
watch(() => props.value, () => {
  if (verdict.value === 'ok') error.value = ''
})

provide('ui-form-field', { validate, error, id, touched, patternOk, verdict, failedRules, focused })

const rootEl = ref(null)
const entry = { validate, el: () => rootEl.value }
if (form) form.fields.add(entry)
onBeforeUnmount(() => { if (form) form.fields.delete(entry) })

const showError = computed(() => touched.value && !!error.value)
/* 聚焦时展示完整规则清单；失焦后展示未通过的规则（保持显示） */
const showList = computed(() => focused.value || (touched.value && failedRules.value.length > 0))
</script>
<template>
  <div ref="rootEl" class="ui-form-field" :class="{ 'has-error': showError }">
    <span v-if="label" class="ui-field__label">
      {{ label }}<em v-if="required" class="is-required" aria-hidden="true">*</em>
    </span>
    <slot :error="error" :validate="validate" :pattern-ok="patternOk" :verdict="verdict" :touched="touched" :focused="focused" @focus="focused = true" @blur="touched = true; focused = false" />
    <!-- 说明文本常驻在下方（hint）；错误一律只在右侧气泡里说，不再往下塞红字 -->
    <span v-if="props.hint && !showError" class="ui-form-field__msg" role="status">{{ props.hint }}</span>

    <!-- 聚焦时：完整规则清单（每条前 ✓/✗，组内缩进）；
         失焦后：只留未通过的规则，持续可见 -->
    <ul v-if="showList && flatRuleStates.length" class="ui-form-field__rules" :class="{ 'is-focused': focused }">
      <template v-if="focused">
        <li v-for="(entry, i) in flatRuleStates" :key="i"
            :style="{ paddingLeft: (entry.depth * 12) + 'px' }"
            :class="{ 'is-bad': !entry.pass }">
          <span class="ui-form-field__mark" aria-hidden="true">{{ entry.pass ? '✓' : '✗' }}</span>
          {{ entry.rule.label || entry.rule.message || '规则' }}
        </li>
      </template>
      <template v-else>
        <li v-for="(msg, i) in failedRules" :key="i" class="is-bad">
          <span class="ui-form-field__mark" aria-hidden="true">✗</span>
          {{ msg }}
        </li>
      </template>
    </ul>

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
  border-radius: calc(var(--r-10) * var(--radius-scale));
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
/* 规则清单：聚焦时全量展示（每条前 ✓/✗）；失焦后折叠成未通过项 */
.ui-form-field__rules {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 6px 9px;
  list-style: none;
  border-radius: calc(var(--r-9) * var(--radius-scale));
  background: var(--surface-container-low);
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  line-height: 1.5;
}
.ui-form-field__rules li { display: flex; align-items: baseline; gap: 5px; }
.ui-form-field__rules li.is-bad { color: var(--error); }
.ui-form-field__mark { font-size: 10px; color: var(--primary); }
.ui-form-field__rules li.is-bad .ui-form-field__mark { color: var(--error); }
/* 提交后高亮：字段整体临时套一圈错误色轮廓（滚到位时一眼看到问题在哪） */
.ui-form-field.has-error :deep(input),
.ui-form-field.has-error :deep(textarea) { border-color: color-mix(in oklab, var(--error) 55%, var(--outline-variant)); }
.ui-form-field.has-error :deep(.ui-field__control) {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--error) 16%, transparent);
  border-radius: calc(var(--r-13) * var(--radius-scale));
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
