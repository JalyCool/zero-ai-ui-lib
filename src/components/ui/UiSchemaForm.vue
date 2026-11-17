<script setup>
import { computed, reactive, watch } from 'vue'
import UiInput from './UiInput.vue'
import UiSwitch from './UiSwitch.vue'
import UiSelect from './UiSelect.vue'
import UiTextarea from './UiTextarea.vue'
import UiStepper from './UiStepper.vue'

const props = defineProps({
  /* JSON Schema（object 层）；enum 自动降级成下拉 */
  schema: { type: Object, required: true },
  modelValue: { type: Object, default: () => ({}) },
  /* 数组项编辑器模式：rows 逐行（简单类型） */
  arrayMode: { type: String, default: 'rows' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'submit'])

/* ============================================================
   JSON Schema 表单生成器：把 MCP 工具的 inputSchema 可视化
   成表单。支持 string / number / integer / boolean / enum /
   简单类型数组；必填项标 *；提交时按 schema 类型收敛值。
   ============================================================ */

const draft = reactive({})

const fields = computed(() => {
  const properties = props.schema?.properties || {}
  const required = new Set(props.schema?.required || [])
  return Object.entries(properties).map(([name, def]) => ({
    name,
    def: def || {},
    label: def?.title || name,
    hint: def?.description || '',
    required: required.has(name),
    kind: kindOf(def || {})
  }))
})

function kindOf(def) {
  if (Array.isArray(def.enum)) return 'enum'
  const type = Array.isArray(def.type) ? def.type[0] : def.type
  if (type === 'boolean') return 'boolean'
  if (type === 'number' || type === 'integer') return 'number'
  if (type === 'array') {
    const itemType = def.items?.type
    if (itemType === 'string' || itemType === 'number' || itemType === 'integer') return 'array-' + itemType
    return 'json'
  }
  if (type === 'object') return 'json'
  if (def.format === 'textarea') return 'textarea'
  return 'string'
}

function defaultValueFor(def) {
  if (def.default !== undefined) return def.default
  const kind = kindOf(def)
  if (kind === 'boolean') return false
  if (kind === 'number') return def.minimum ?? 0
  if (kind.startsWith('array-') || kind === 'json') return kind === 'json' ? '{}' : []
  return ''
}

/* schema / 外部值变化时重建草稿，保留仍然合法的键。 */
watch(fields, list => {
  for (const key of Object.keys(draft)) delete draft[key]
  for (const field of list) {
    const incoming = props.modelValue?.[field.name]
    draft[field.name] = incoming !== undefined ? incoming : defaultValueFor(field.def)
  }
}, { immediate: true })

watch(() => props.modelValue, value => {
  for (const field of fields.value) {
    const incoming = value?.[field.name]
    if (incoming !== undefined && incoming !== draft[field.name]) draft[field.name] = incoming
  }
}, { deep: true })

function coerce(field, raw) {
  const kind = kindOf(field.def)
  if (kind === 'number') {
    const n = Number(raw)
    if (!Number.isFinite(n)) return raw
    if (field.def.minimum !== undefined) return Math.max(field.def.minimum, n)
    return n
  }
  if (kind === 'json') {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return raw
}

const missing = computed(() => fields.value.filter(f => f.required &&
  (draft[f.name] === '' || draft[f.name] === undefined ||
   (Array.isArray(draft[f.name]) && !draft[f.name].length))))

function payload() {
  const out = {}
  for (const field of fields.value) {
    const value = draft[field.name]
    if (value === '' || value === undefined) continue
    out[field.name] = coerce(field, value)
  }
  return out
}

function submit() {
  if (missing.value.length) return
  emit('update:modelValue', payload())
  emit('submit', payload())
}

defineExpose({ payload, submit })
</script>

<template>
  <form class="ui-schema-form" @submit.prevent="submit">
    <template v-for="field in fields" :key="field.name">
      <!-- 枚举 / 下拉 -->
      <UiSelect
        v-if="field.kind === 'enum'"
        v-model="draft[field.name]"
        :label="field.label + (field.required ? ' *' : '')"
        :options="field.def.enum.map(v => ({ label: String(v), value: v }))"
        :disabled="disabled"
      />
      <!-- 布尔开关 -->
      <div v-else-if="field.kind === 'boolean'" class="ui-schema-form__switch">
        <UiSwitch v-model="draft[field.name]" :disabled="disabled" />
        <span class="ui-schema-form__switch-text">
          <b>{{ field.label }}<template v-if="field.required"> *</template></b>
          <small v-if="field.hint">{{ field.hint }}</small>
        </span>
      </div>
      <!-- 数字 -->
      <UiStepper
        v-else-if="field.kind === 'number'"
        v-model="draft[field.name]"
        :label="field.label + (field.required ? ' *' : '')"
        :min="field.def.minimum ?? -Infinity"
        :max="field.def.maximum ?? Infinity"
        :step="field.def.multipleOf ?? (field.def.type === 'integer' ? 1 : 0.1)"
        :disabled="disabled"
      />
      <!-- 字符串数组：逐行 -->
      <div v-else-if="field.kind.startsWith('array-')" class="ui-schema-form__array">
        <span class="ui-schema-form__array-label">{{ field.label }}<template v-if="field.required"> *</template></span>
        <div v-for="(_, index) in draft[field.name]" :key="index" class="ui-schema-form__array-row">
          <input
            class="ui-schema-form__array-input"
            :type="field.kind === 'array-number' ? 'number' : 'text'"
            :value="draft[field.name][index]"
            @input="draft[field.name][index] = field.kind === 'array-number' ? Number($event.target.value) : $event.target.value"
          >
          <button type="button" class="ui-schema-form__array-del" aria-label="删除" @click="draft[field.name].splice(index, 1)">×</button>
        </div>
        <button type="button" class="ui-schema-form__array-add" @click="draft[field.name].push(field.kind === 'array-number' ? 0 : '')">+ 添加</button>
      </div>
      <!-- 对象 / 复杂数组：JSON 文本域 -->
      <UiTextarea
        v-else-if="field.kind === 'json'"
        v-model="draft[field.name]"
        :label="field.label + (field.required ? ' *' : '')"
        :hint="field.hint || 'JSON'"
        :disabled="disabled"
      />
      <!-- 普通字符串 -->
      <UiInput
        v-else
        v-model="draft[field.name]"
        :label="field.label + (field.required ? ' *' : '')"
        :hint="field.hint"
        :type="field.def.format === 'password' ? 'password' : 'text'"
        :disabled="disabled"
      />
    </template>
    <div class="ui-schema-form__foot">
      <span v-if="missing.length" class="ui-schema-form__missing">必填：{{ missing.map(f => f.label).join('、') }}</span>
      <button type="submit" class="ui-schema-form__submit" :disabled="disabled || !!missing.length">提交</button>
    </div>
  </form>
</template>

<style scoped>
.ui-schema-form { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ui-schema-form__switch { display: flex; align-items: center; gap: 10px; }
.ui-schema-form__switch-text { display: flex; flex-direction: column; gap: 1px; }
.ui-schema-form__switch-text b { color: var(--on-surface); font-size: var(--fs-small); font-weight: var(--w-label); }
.ui-schema-form__switch-text small { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-schema-form__array { display: flex; flex-direction: column; gap: 6px; }
.ui-schema-form__array-label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); }
.ui-schema-form__array-row { display: flex; align-items: center; gap: 6px; }
.ui-schema-form__array-input {
  flex: 1;
  min-width: 0;
  padding: 7px 9px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-11) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: var(--fs-small);
  outline: 0;
}
.ui-schema-form__array-input:focus { border-color: var(--primary); background: var(--surface); }
.ui-schema-form__array-del {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  font-size: 1rem;
  cursor: pointer;
}
.ui-schema-form__array-del:hover { background: var(--surface-container); color: var(--error); }
.ui-schema-form__array-add {
  align-self: flex-start;
  padding: 4px 10px;
  border: var(--border-w) dashed var(--outline-variant);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
}
.ui-schema-form__foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.ui-schema-form__missing { margin-right: auto; color: var(--error); font-size: var(--fs-micro); }
.ui-schema-form__submit {
  padding: var(--btn-pad-md);
  border: 0;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--primary);
  color: var(--on-primary);
  font-size: var(--btn-fs-md);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: transform var(--t-feedback), opacity var(--t-fade);
}
.ui-schema-form__submit:active { transform: scale(var(--press-scale)); }
.ui-schema-form__submit:disabled { opacity: .42; cursor: not-allowed; }
</style>