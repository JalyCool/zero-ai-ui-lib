<script setup>
import { ref } from 'vue'
import UiChip from './UiChip.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '输入后回车生成标签' },
  hint: { type: String, default: '' },
  /* 最多几个标签；0 不限制 */
  max: { type: Number, default: 0 },
  /* 分隔字符：输入中出现即视为提交一次 */
  delimiters: { type: Array, default: () => [',', '，'] }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   标签输入：输入即生成 chip，Backspace 删最后一个，
   回车 / Tab / 分隔字符提交，重复标签自动去重。
   ============================================================ */

const draft = ref('')
const focused = ref(false)
const inputEl = ref(null)

function addTag(raw) {
  const value = String(raw).trim()
  if (!value) return
  if (props.max > 0 && props.modelValue.length >= props.max) { draft.value = ''; return }
  if (!props.modelValue.includes(value)) {
    emit('update:modelValue', [...props.modelValue, value])
  }
  draft.value = ''
}

function removeAt(index) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onInput(event) {
  const text = event.target.value
  const hit = props.delimiters.find(d => text.includes(d))
  if (hit) {
    addTag(text.slice(0, text.indexOf(hit)))
    draft.value = text.slice(text.indexOf(hit) + hit.length)
    return
  }
  draft.value = text
}

function onKeydown(event) {
  if (event.key === 'Enter' || event.key === 'Tab') {
    if (draft.value.trim()) { event.preventDefault(); addTag(draft.value) }
    return
  }
  if (event.key === 'Backspace' && !draft.value && props.modelValue.length) {
    removeAt(props.modelValue.length - 1)
  }
}

function onBlur() {
  addTag(draft.value)
  focused.value = false
}
</script>

<template>
  <label class="ui-tag-input" :class="{ 'is-focused': focused }" @click="inputEl && inputEl.focus()">
    <span v-if="label" class="ui-tag-input__label">{{ label }}</span>
    <span class="ui-tag-input__box">
      <!-- 标签一律用库里的标准 UiChip，不自绘一颗 -->
      <UiChip
        v-for="(tag, index) in modelValue"
        :key="tag"
        class="ui-tag-input__chip"
        removable
        @remove="removeAt(index)"
      >{{ tag }}</UiChip>
      <input
        ref="inputEl"
        class="ui-tag-input__input"
        type="text"
        :value="draft"
        :placeholder="modelValue.length ? '' : placeholder"
        :aria-label="label || placeholder"
        @input="onInput"
        @keydown="onKeydown"
        @focus="focused = true"
        @blur="onBlur"
      >
    </span>
    <span v-if="hint" class="ui-tag-input__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.ui-tag-input { display: flex; flex-direction: column; gap: 6px; min-width: 0; max-width: 100%; }
.ui-tag-input__label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); }
.ui-tag-input__box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-13) * var(--radius-scale));
  background: var(--surface-container-low);
  cursor: text;
  transition: border-color var(--t-fade), background var(--t-fade);
}
.ui-tag-input.is-focused .ui-tag-input__box { border-color: var(--primary); background: var(--surface); }
.ui-tag-input__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 9px;
  border-radius: 999px;
  background: var(--primary-container);
  color: var(--on-primary-container);
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
}
.ui-tag-input__close {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  opacity: .6;
}
.ui-tag-input__close:hover { opacity: 1; }
.ui-tag-input__close svg { width: 9px; height: 9px; }
.ui-tag-input__input {
  flex: 1 1 60px;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
  line-height: 1.4;
}
.ui-tag-input__hint { color: var(--on-surface-variant); font-size: var(--fs-micro); }
</style>