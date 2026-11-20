<script setup>
import { computed, ref, watch } from 'vue'
import { highlightToHtml, keywordsOf } from '../../core/highlight'

const props = defineProps({
  modelValue: { type: String, default: '' },
  /* js | json | css | html | md | plain */
  language: { type: String, default: 'plain' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  tabSize: { type: Number, default: 2 },
  /* 可视行数（超出内部滚动） */
  lines: { type: Number, default: 14 },
  /* 失焦时尝试格式化 JSON，失败保持原样 */
  formatJson: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   代码编辑器：透明 textarea 叠在高亮 pre 上（双层法），
   行号槽随滚动同步；Tab 插入空格并保持列宽一致。
   ============================================================ */

const areaEl = ref(null)
const preEl = ref(null)
const gutterEl = ref(null)

const lineCount = computed(() => props.modelValue.split('\n').length)
const lineNumbers = computed(() => {
  const out = []
  for (let i = 1; i <= lineCount.value; i++) out.push(i)
  return out
})

/* 末尾补一个换行，保证高亮层与 textarea 高度一致。 */
const highlighted = computed(() => highlightToHtml(props.modelValue + '\n', props.language))

function syncScroll() {
  if (!areaEl.value) return
  const top = areaEl.value.scrollTop
  const left = areaEl.value.scrollLeft
  if (preEl.value) { preEl.value.scrollTop = top; preEl.value.scrollLeft = left }
  if (gutterEl.value) gutterEl.value.scrollTop = top
}

function onInput(event) {
  emit('update:modelValue', event.target.value)
  completionIndex.value = 0
  completionOpen.value = completions.value.length > 0
}

/* ---------- 轻量补全：语言关键字 + 本文档出现过的标识符 ---------- */
const completionOpen = ref(false)
const completionIndex = ref(0)

const completions = computed(() => {
  const el = areaEl.value
  if (!el) return []
  const pos = el.selectionStart
  const before = props.modelValue.slice(0, pos)
  const match = /[A-Za-z_$][\w$]*$/.exec(before)
  if (!match || match[0].length < 2) return []
  const prefix = match[0].toLowerCase()
  const pool = new Set(keywordsOf(props.language))
  for (const word of props.modelValue.match(/[A-Za-z_$][\w$]{2,}/g) || []) pool.add(word)
  return [...pool]
    .filter(word => word.toLowerCase().startsWith(prefix) && word !== match[0])
    .slice(0, 6)
})

function applyCompletion(word) {
  const el = areaEl.value
  if (!el) return
  const pos = el.selectionStart
  const before = props.modelValue.slice(0, pos)
  const match = /[A-Za-z_$][\w$]*$/.exec(before)
  if (!match) return
  const next = props.modelValue.slice(0, pos - match[0].length) + word + props.modelValue.slice(pos)
  emit('update:modelValue', next)
  completionOpen.value = false
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = pos - match[0].length + word.length
    el.focus()
  })
}

function onKeydown(event) {
  if (completionOpen.value && completions.value.length) {
    if (event.key === 'ArrowDown') { event.preventDefault(); completionIndex.value = (completionIndex.value + 1) % completions.value.length; return }
    if (event.key === 'ArrowUp') { event.preventDefault(); completionIndex.value = (completionIndex.value - 1 + completions.value.length) % completions.value.length; return }
    if (event.key === 'Enter') { event.preventDefault(); applyCompletion(completions.value[completionIndex.value]); return }
    if (event.key === 'Escape') { completionOpen.value = false; return }
  }
  if (event.key !== 'Tab' || props.readonly || props.disabled) return
  if (completionOpen.value && completions.value.length) {
    event.preventDefault()
    applyCompletion(completions.value[completionIndex.value])
    return
  }
  event.preventDefault()
  const el = event.target
  const pad = ' '.repeat(props.tabSize)
  const start = el.selectionStart
  const end = el.selectionEnd
  const next = props.modelValue.slice(0, start) + pad + props.modelValue.slice(end)
  emit('update:modelValue', next)
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + pad.length
  })
}

function onBlur() {
  if (!props.formatJson || props.language !== 'json') return
  try {
    emit('update:modelValue', JSON.stringify(JSON.parse(props.modelValue), null, props.tabSize))
  } catch { /* 非法 JSON 保持原样 */ }
}

watch(() => props.modelValue, syncScroll)
</script>

<template>
  <label class="ui-code" :class="{ 'is-disabled': disabled }">
    <span v-if="label" class="ui-code__label">{{ label }}</span>
    <span class="ui-code__frame" :class="{ 'is-error': !!error }" :style="{ '--code-lines': lines }">
      <span ref="gutterEl" class="ui-code__gutter" aria-hidden="true">
        <span v-for="n in lineNumbers" :key="n" class="ui-code__ln">{{ n }}</span>
      </span>
      <span class="ui-code__stage">
        <pre ref="preEl" class="ui-code__hl" aria-hidden="true"><code v-html="highlighted"></code></pre>
        <ul v-if="completionOpen && completions.length" class="ui-code__completions" role="listbox" aria-label="补全候选">
          <li v-for="(word, i) in completions" :key="word" role="option"
              :class="{ 'is-active': i === completionIndex }"
              :aria-selected="i === completionIndex"
              @mousedown.prevent="applyCompletion(word)">{{ word }}</li>
        </ul>
        <textarea
          ref="areaEl"
          class="ui-code__area"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          wrap="off"
          :value="modelValue"
          :placeholder="placeholder"
          :readonly="readonly"
          :disabled="disabled"
          :aria-label="label || '代码编辑'"
          @input="onInput"
          @keydown="onKeydown"
          @scroll="syncScroll"
          @blur="onBlur"
        />
      </span>
    </span>
    <span v-if="error" class="ui-code__error">{{ error }}</span>
    <span v-else-if="hint" class="ui-code__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.ui-code { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-code__label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); }
.ui-code.is-disabled { opacity: .42; }
.ui-code__frame {
  display: flex;
  align-items: stretch;
  height: calc(var(--code-lines) * 1.55em + 17px);
  min-width: 0;
  border-radius: calc(var(--r-13) * var(--radius-scale));
  background: var(--surface-container-low);
  overflow: hidden;
  transition: border-color var(--t-fade);
}
.ui-code__frame:focus-within { border-color: var(--primary); }
.ui-code__frame.is-error { border-color: var(--error); }
.ui-code__gutter {
  flex-shrink: 0;
  overflow: hidden;
  padding: 8px 0;
  min-width: 2.4em;
  text-align: right;
  border-right: var(--border-w) solid var(--outline-variant);
  background: var(--surface-container);
  color: var(--on-surface-variant);
}
.ui-code__ln {
  display: block;
  padding: 0 8px 0 10px;
  font-family: var(--font-mono);
  font-size: .72rem;
  line-height: 1.55;
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
.ui-code__completions {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: calc(100% - 16px);
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: var(--surface-container-highest, var(--surface-container-high));
  box-shadow: 0 4px 14px rgba(0, 0, 0, .18);
}
.ui-code__completions li {
  padding: 3px 8px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  cursor: pointer;
  color: var(--on-surface-variant);
}
.ui-code__completions li.is-active { background: var(--primary); color: var(--on-primary); }
.ui-code__stage { position: relative; flex: 1; min-width: 0; }
.ui-code__hl,
.ui-code__area {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: .72rem;
  line-height: 1.55;
  white-space: pre;
  overflow: auto;
  scrollbar-width: none;
}
.ui-code__hl { pointer-events: none; color: var(--on-surface); }
.ui-code__hl :deep(.tok-keyword) { color: var(--primary); font-weight: 600; }
.ui-code__hl :deep(.tok-string),
.ui-code__hl :deep(.tok-key) { color: var(--ui-success); }
.ui-code__hl :deep(.tok-number) { color: var(--ui-warning); }
.ui-code__hl :deep(.tok-comment) { color: var(--outline); font-style: italic; }
.ui-code__hl :deep(.tok-fn) { color: var(--on-primary-container); font-weight: 600; }
.ui-code__hl :deep(.tok-prop) { color: var(--secondary); }
.ui-code__hl :deep(.tok-tag) { color: var(--primary); }
.ui-code__hl :deep(.tok-punct) { color: var(--on-surface-variant); }
.ui-code__hl :deep(.tok-heading) { color: var(--primary); font-weight: 700; }
.ui-code__area {
  z-index: 1;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  /* 文字隐形，只留光标与选区 */
  color: transparent;
  caret-color: var(--primary);
  tab-size: 2;
}
.ui-code__area::selection { background: color-mix(in oklab, var(--primary) 26%, transparent); }
.ui-code__area::placeholder { color: var(--on-surface-variant); }
.ui-code__error { color: var(--error); font-size: var(--fs-micro); }
.ui-code__hint { color: var(--on-surface-variant); font-size: var(--fs-micro); }
</style>
