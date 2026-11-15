<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* File[] */
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  accept: { type: String, default: '' },
  /* 单文件上限（MB） */
  maxSize: { type: Number, default: 20 },
  multiple: { type: Boolean, default: true },
  max: { type: Number, default: 8 },
  /* 进度表：{ [filename]: 0~1 }，上传由应用负责，组件只负责显示 */
  progress: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'reject', 'remove'])

/* 文件上传：拖入或点击选取，校验类型 / 体积 / 数量后回传 File 列表；
   上传进度由外部传入（组件不猜上传实现），列表里逐项显示进度与移除。 */
const inputEl = ref(null)
const over = ref(false)
const previews = ref({})

const files = computed(() => props.modelValue || [])
const totalSize = computed(() => files.value.reduce((sum, file) => sum + file.size, 0))

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function acceptFile(file) {
  if (props.accept) {
    const patterns = props.accept.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
    const ok = patterns.some(pattern => {
      if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern)
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1))
      return file.type === pattern
    })
    if (!ok) return '类型不支持'
  }
  if (file.size > props.maxSize * 1024 * 1024) return '超过 ' + props.maxSize + ' MB'
  if (!props.multiple && files.value.length >= 1) return '只能选一个'
  if (files.value.length >= props.max) return '最多 ' + props.max + ' 个'
  return ''
}

function add(list) {
  const accepted = []
  const rejected = []
  for (const file of Array.from(list || [])) {
    const reason = acceptFile(file)
    if (reason) rejected.push({ file, reason })
    else accepted.push(file)
  }
  if (rejected.length) emit('reject', rejected)
  if (accepted.length) {
    const next = props.multiple ? [...files.value, ...accepted] : accepted
    emit('update:modelValue', next)
  }
}

function onDrop(event) {
  over.value = false
  if (props.disabled) return
  add(event.dataTransfer && event.dataTransfer.files)
}
function onPick(event) {
  add(event.target.files)
  event.target.value = ''
}
function remove(file) {
  emit('update:modelValue', files.value.filter(item => item !== file))
  emit('remove', file)
}

/* 图片给缩略图；对象 URL 在文件移除 / 卸载时回收。 */
watch(files, list => {
  for (const file of list) {
    if (file.type && file.type.startsWith('image/') && !previews.value[file.name] && typeof URL !== 'undefined') {
      previews.value[file.name] = URL.createObjectURL(file)
    }
  }
}, { immediate: true, deep: false })
onBeforeUnmount(() => Object.values(previews.value).forEach(url => URL.revokeObjectURL(url)))
</script>
<template>
  <div class="ui-upload">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <div class="ui-upload__box" :class="{ 'is-over': over, 'is-disabled': disabled }"
      role="button" tabindex="0"
      @dragover.prevent="over = true" @dragleave.prevent="over = false" @drop.prevent="onDrop"
      @click="!disabled && inputEl.click()" @keydown.enter.prevent="!disabled && inputEl.click()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
      <span>{{ over ? '松手即可添加' : '拖入文件，或点击选择' }}</span>
      <small>{{ accept ? accept : '任意类型' }} · 单个不超过 {{ maxSize }} MB · 最多 {{ max }} 个</small>
      <input ref="inputEl" type="file" hidden :accept="accept || undefined" :multiple="multiple" :disabled="disabled" @change="onPick" />
    </div>
    <ul v-if="files.length" class="ui-upload__list">
      <li v-for="file in files" :key="file.name + file.size" class="ui-upload__item">
        <span class="ui-upload__thumb">
          <img v-if="previews[file.name]" :src="previews[file.name]" alt="" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>
        </span>
        <span class="ui-upload__meta">
          <b>{{ file.name }}</b>
          <small>{{ formatSize(file.size) }}</small>
          <span v-if="progress[file.name] !== undefined" class="ui-upload__bar"><i :style="{ width: Math.round(progress[file.name] * 100) + '%' }"></i></span>
        </span>
        <button type="button" class="ui-upload__remove" aria-label="移除" @click.stop="remove(file)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </li>
    </ul>
    <span v-if="files.length" class="ui-upload__total">共 {{ files.length }} 个 · {{ formatSize(totalSize) }}</span>
  </div>
</template>
<style scoped>
.ui-upload { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ui-upload__box { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 22px 16px; border: 1.5px dashed var(--outline-variant); border-radius: calc(16px * var(--radius-scale)); background: var(--surface-container-low); color: var(--on-surface-variant); text-align: center; cursor: pointer; transition: border-color var(--t-fade), background var(--t-fade); }
.ui-upload__box svg { width: 26px; height: 26px; }
.ui-upload__box > span { font-size: var(--fs-small); color: var(--on-surface); }
.ui-upload__box small { font-size: var(--fs-micro); }
.ui-upload__box.is-over { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 8%, var(--surface-container-low)); }
.ui-upload__box.is-disabled { opacity: .42; cursor: not-allowed; }
.ui-upload__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.ui-upload__item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: var(--border-w) solid var(--outline-variant); border-radius: 12px; background: var(--surface-container-low); }
.ui-upload__thumb { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; overflow: hidden; border-radius: 9px; background: var(--surface-container); color: var(--on-surface-variant); }
.ui-upload__thumb img { width: 100%; height: 100%; object-fit: cover; }
.ui-upload__thumb svg { width: 18px; height: 18px; }
.ui-upload__meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ui-upload__meta b { font-size: var(--fs-tiny); font-weight: var(--w-label); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-upload__meta small { font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }
.ui-upload__bar { display: block; height: 3px; margin-top: 2px; border-radius: 99px; background: var(--surface-container-high); overflow: hidden; }
.ui-upload__bar i { display: block; height: 100%; background: var(--primary); transition: width var(--t-fade); }
.ui-upload__remove { display: grid; place-items: center; width: 28px; height: 28px; flex-shrink: 0; border: 0; border-radius: 50%; background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.ui-upload__remove svg { width: 14px; height: 14px; }
.ui-upload__total { align-self: flex-end; font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }
</style>
