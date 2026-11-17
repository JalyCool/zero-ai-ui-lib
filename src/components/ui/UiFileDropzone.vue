<script setup>
import { ref } from 'vue'

const props = defineProps({
  label: { type: String, default: '把文件拖进来，或点击选择' },
  hint: { type: String, default: '' },
  accept: { type: String, default: '' },
  multiple: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  /* 单文件大小上限（MB），0 不限制 */
  maxSize: { type: Number, default: 0 }
})

const emit = defineEmits(['files', 'reject'])

/* ============================================================
   拖拽上传区：拖入高亮、drop 收 File 列表；点击等价于选文件；
   超限与类型不符的文件进 reject 事件，不混进 files。
   ============================================================ */

const inputEl = ref(null)
const over = ref(false)
let depth = 0

function filter(files) {
  const list = [...files]
  const ok = []
  const bad = []
  for (const file of list) {
    if (props.maxSize > 0 && file.size > props.maxSize * 1024 * 1024) {
      bad.push({ file, reason: '超过 ' + props.maxSize + 'MB' })
      continue
    }
    if (props.accept) {
      const patterns = props.accept.split(',').map(s => s.trim()).filter(Boolean)
      const matched = patterns.some(p => {
        if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -1))
        if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p.toLowerCase())
        return file.type === p
      })
      if (!matched) { bad.push({ file, reason: '类型不符' }); continue }
    }
    ok.push(file)
  }
  return { ok, bad }
}

function accept(files) {
  if (props.disabled || !files.length) return
  const { ok, bad } = filter(files)
  if (ok.length) emit('files', ok)
  if (bad.length) emit('reject', bad)
}

function onDragEnter(event) {
  if (props.disabled) return
  event.preventDefault()
  depth++
  over.value = true
}
function onDragOver(event) {
  if (props.disabled) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}
function onDragLeave() {
  depth = Math.max(0, depth - 1)
  if (!depth) over.value = false
}
function onDrop(event) {
  event.preventDefault()
  depth = 0
  over.value = false
  accept(event.dataTransfer.files)
}

function pick() {
  if (!props.disabled) inputEl.value?.click()
}

function onPicked(event) {
  accept(event.target.files)
  event.target.value = ''
}

function onKey(event) {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick() }
}
</script>

<template>
  <div
    class="ui-dropzone"
    :class="{ 'is-over': over, 'is-disabled': disabled }"
    role="button"
    tabindex="0"
    :aria-disabled="disabled"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="pick"
    @keydown="onKey"
  >
    <input ref="inputEl" class="ui-dropzone__input" type="file" :accept="accept || undefined" :multiple="multiple" @change="onPicked">
    <span class="ui-dropzone__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V6" /><path d="M7 11l5-5 5 5" /><path d="M4 18h16" /></svg>
    </span>
    <span class="ui-dropzone__label">{{ over ? '松手放入' : label }}</span>
    <span v-if="hint" class="ui-dropzone__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.ui-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 16px;
  border: 1.5px dashed var(--outline-variant);
  border-radius: calc(var(--r-16) * var(--radius-scale));
  background: var(--surface-container-low);
  cursor: pointer;
  outline: 0;
  transition: border-color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-dropzone:hover { border-color: var(--primary); }
.ui-dropzone:focus-visible { border-color: var(--primary); box-shadow: 0 0 0 var(--focus-w) color-mix(in oklab, var(--primary) 30%, transparent); }
.ui-dropzone.is-over {
  border-color: var(--primary);
  border-style: solid;
  background: var(--primary-container);
  transform: scale(1.01);
}
.ui-dropzone.is-disabled { opacity: .42; cursor: not-allowed; }
.ui-dropzone__input { display: none; }
.ui-dropzone__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--icon-bg);
  color: var(--icon-fg);
  transition: transform var(--t-feedback);
}
.ui-dropzone.is-over .ui-dropzone__icon { transform: translateY(-2px); }
.ui-dropzone__icon svg { width: 17px; height: 17px; }
.ui-dropzone__label { color: var(--on-surface); font-size: var(--fs-small); font-weight: var(--w-label); }
.ui-dropzone__hint { color: var(--on-surface-variant); font-size: var(--fs-micro); }
</style>
