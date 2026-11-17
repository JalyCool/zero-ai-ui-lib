<script setup>
import { computed, nextTick, ref, watch, useSlots } from 'vue'
import UiButton from './UiButton.vue'

const props = defineProps({
  /* v-model：文本内容 */
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '输入消息…' },
  /* 附件：[{ id, name, size, type, url?, kind: 'image'|'video'|'file'|'text' }] */
  attachments: { type: Array, default: () => [] },
  /* 发送中 / 禁用 */
  sending: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /* 附件限制：单文件大小（MB）与数量 */
  maxAttachmentMB: { type: Number, default: 25 },
  maxAttachments: { type: Number, default: 9 },
  accept: { type: String, default: '' },
  /* 长文本粘贴自动转附件：超过该字符数的粘贴（>该阈值）转为 .txt 附件 */
  pasteToFileChars: { type: Number, default: 2000 },
  /* 自动增高（行数范围） */
  autoRows: { type: Boolean, default: true },
  minRows: { type: Number, default: 1 },
  maxRows: { type: Number, default: 6 },
  /* 展开附件面板时给的提示文案 */
  attachLabel: { type: String, default: '添加附件' },
  sendLabel: { type: String, default: '发送' },
  disabledReason: { type: String, default: '' }
})

const emit = defineEmits([
  'update:modelValue',
  'update:attachments',
  'send',
  'error',
  'pick-attachment'
])

const slots = useSlots()

/* ---------- 文本 ---------- */
const textEl = ref(null)
const rows = ref(props.minRows)

function autoSize() {
  if (!props.autoRows || !textEl.value) return
  const el = textEl.value
  el.style.height = 'auto'
  const line = parseFloat(getComputedStyle(el).lineHeight) || 21
  const padY = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom) || 0
  const rowsH = Math.round((el.scrollHeight - padY) / line)
  rows.value = Math.max(props.minRows, Math.min(props.maxRows, rowsH))
}

watch(() => props.modelValue, () => nextTick(autoSize), { immediate: true })

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

/* ---------- 附件 ---------- */
const fileInput = ref(null)
const pending = ref([]) /* 本地待确认列表（也直接进 attachments） */
const showPanel = ref(false)

/* props.attachments 的 computed 包装：脚本里统一 attachments.value 访问 */
const attachments = computed(() => props.attachments || [])

const kinds = [
  { key: 'image', label: '图片', icon: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3L16 12l3 3"/>' },
  { key: 'video', label: '视频', icon: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5l5 2.5-5 2.5z"/>' },
  { key: 'file', label: '文件', icon: '<path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v4h4"/>' },
  { key: 'text', label: '文本', icon: '<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>' }
]

function kindOf(file) {
  const t = file.type || ''
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'file'
  return 'file'
}

let uid = 0

function addFiles(list) {
  const added = []
  const errors = []
  for (const file of Array.from(list || [])) {
    if (attachments.value.length + pending.value.length >= props.maxAttachments) {
      errors.push(`最多 ${props.maxAttachments} 个附件`)
      break
    }
    const mb = file.size / 1024 / 1024
    if (mb > props.maxAttachmentMB) {
      errors.push(`${file.name} 超过 ${props.maxAttachmentMB}MB`)
      continue
    }
    const kind = kindOf(file)
    const item = {
      id: 'a' + Date.now() + '_' + (uid++),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      kind,
      file
    }
    /* 图片 / 视频本地预览 */
    if (kind === 'image' || kind === 'video') {
      try { item.url = URL.createObjectURL(file) } catch { /* 预览失败不影响 */ }
    }
    pending.value.push(item)
    added.push(item)
  }
  if (errors.length) emit('error', errors)
  flushPending()
  return added
}

function flushPending() {
  if (!pending.value.length) return
  const list = [...attachments.value, ...pending.value]
  pending.value = []
  emit('update:attachments', list)
}

function pick(kinds_) {
  /* kinds_ 是点中的入口；这里统一走一个隐藏 input，
     accept 按入口调整（图片入口限 image/* 等） */
    const el = fileInput.value
    if (!el) return
    el.accept = kinds_ === 'image' ? 'image/*'
      : kinds_ === 'video' ? 'video/*'
      : props.accept || ''
    el.multiple = true
    el.value = ''
    el.click()
}

function onFiles(e) {
  addFiles(e.target.files)
}

/* 长文本粘贴 -> 自动转 .txt 附件 */
function onPaste(e) {
  const text = e.clipboardData?.getData('text/plain') || ''
  if (text.length > props.pasteToFileChars) {
    e.preventDefault()
    const blob = new Blob([text], { type: 'text/plain' })
    const name = '粘贴的文本.txt'
    addFiles([new File([blob], name, { type: 'text/plain' })])
  }
}

function removeAttachment(id) {
  const item = attachments.value.find(a => a.id === id)
  if (item?.url) { try { URL.revokeObjectURL(item.url) } catch { /* noop */ } }
  emit('update:attachments', attachments.value.filter(a => a.id !== id))
}

function sizeLabel(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

/* ---------- 发送 ---------- */
const canSend = computed(() =>
  !props.disabled && !props.sending &&
  (!!props.modelValue.trim() || attachments.value.length > 0)
)

function send() {
  if (!canSend.value) return
  emit('send', { text: props.modelValue, attachments: attachments.value })
  /* 清空由调用方决定：组件不主动清（失败重试场景需要保留） */
}

function onKeydown(e) {
  /* ⌘/Ctrl+Enter 发送；Enter 只换行（对话输入不抢 Enter） */
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    send()
  }
}

defineExpose({
  focus: () => textEl.value?.focus(),
  addFiles,
  clear: () => emit('update:modelValue', '')
})
</script>

<template>
  <div class="ui-chat-composer" :class="{ 'is-disabled': disabled }">
    <!-- 附件条：有附件时出现在输入框上方（横滑） -->
    <div v-if="attachments.length" class="ui-chat-composer__files">
      <div
        v-for="a in attachments"
        :key="a.id"
        class="ui-chat-composer__file"
        :class="'is-' + a.kind"
        role="listitem"
      >
        <img v-if="a.kind === 'image' && a.url" :src="a.url" alt="" />
        <video v-else-if="a.kind === 'video' && a.url" :src="a.url" muted></video>
        <span v-else class="ui-chat-composer__file-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v4h4"/>
          </svg>
        </span>
        <span class="ui-chat-composer__file-meta">
          <b>{{ a.name }}</b>
          <small>{{ sizeLabel(a.size) }}</small>
        </span>
        <button
          type="button"
          class="ui-chat-composer__file-x"
          :aria-label="`移除附件 ${a.name}`"
          @click="removeAttachment(a.id)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="ui-chat-composer__field">
      <textarea
        ref="textEl"
        class="ui-chat-composer__text"
        :rows="rows"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="onInput"
        @keydown="onKeydown"
        @paste="onPaste"
      ></textarea>
    </div>

    <!-- 底栏：左下插槽（功能开关）+ 右下插槽 + 加号 + 发送 -->
    <div class="ui-chat-composer__bar">
      <div class="ui-chat-composer__bar-left">
        <slot name="left-start" />
        <!-- 加号 = 附件入口（截图里的 ＋）：展开四类入口 -->
        <slot name="left-end">
          <button
            type="button"
            class="ui-chat-composer__plus"
            :aria-label="attachLabel"
            :aria-expanded="showPanel"
            :disabled="disabled || attachments.length >= maxAttachments"
            @click="showPanel = !showPanel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </slot>
      </div>

      <div class="ui-chat-composer__bar-right">
        <slot name="right-start" />
        <slot name="right-end">
          <UiButton
            class="ui-chat-composer__send"
            variant="primary"
            size="sm"
            :disabled="!canSend"
            :loading="sending"
            :aria-label="sendLabel"
            @click="send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </UiButton>
        </slot>
      </div>
    </div>

    <!-- 附件入口面板：拍照 / 图片 / 视频 / 文件（参照截图的格子布局） -->
    <Transition name="ui-chat-composer-panel">
      <div v-if="showPanel" class="ui-chat-composer__panel" role="menu">
        <button
          v-for="k in kinds"
          :key="k.key"
          type="button"
          class="ui-chat-composer__kind"
          role="menuitem"
          @click="pick(k.key); showPanel = false"
        >
          <span class="ui-chat-composer__kind-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="k.icon"></svg>
          </span>
          <span class="ui-chat-composer__kind-label">{{ k.label }}</span>
        </button>
        <slot name="panel" />
      </div>
    </Transition>

    <input
      ref="fileInput"
      type="file"
      class="ui-chat-composer__input"
      :accept="accept"
      multiple
      @change="onFiles"
    >
  </div>
</template>

<style scoped>
.ui-chat-composer {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.ui-chat-composer.is-disabled { opacity: .55; pointer-events: none; }

/* ---------- 附件条 ---------- */
.ui-chat-composer__files {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.ui-chat-composer__files::-webkit-scrollbar { display: none; }

.ui-chat-composer__file {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  max-width: 240px;
  padding: 7px 30px 7px 9px;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--surface-container);
}
.ui-chat-composer__file img,
.ui-chat-composer__file video {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  flex-shrink: 0;
}
.ui-chat-composer__file-glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: var(--surface-container-high);
  color: var(--on-surface-variant);
}
.ui-chat-composer__file-glyph svg { width: 17px; height: 17px; }

.ui-chat-composer__file-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ui-chat-composer__file-meta b {
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}
.ui-chat-composer__file-meta small { font-size: var(--fs-micro); color: var(--on-surface-variant); }

.ui-chat-composer__file-x {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  background: var(--on-surface);
  color: var(--surface);
  cursor: pointer;
}
.ui-chat-composer__file-x svg { width: 10px; height: 10px; }

/* ---------- 输入框 ---------- */
.ui-chat-composer__field {
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-16) * var(--radius-scale));
  background: var(--surface);
  transition: border-color var(--t-fade);
}
.ui-chat-composer__field:focus-within { border-color: var(--primary); }

.ui-chat-composer__text {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 10px 14px;
  border: 0;
  background: none;
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-body);
  line-height: 1.5;
  resize: none;
  outline: none;
}
.ui-chat-composer__text::placeholder { color: var(--on-surface-variant); opacity: .75; }

/* ---------- 底栏 ---------- */
.ui-chat-composer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ui-chat-composer__bar-left,
.ui-chat-composer__bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-chat-composer__plus {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), transform var(--t-feedback), color var(--t-fade);
}
.ui-chat-composer__plus svg { width: 17px; height: 17px; }
.ui-chat-composer__plus:active { transform: scale(var(--press-scale)); }
@media (hover: hover) {
  .ui-chat-composer__plus:hover { background: var(--surface-container-high); color: var(--on-surface); }
}

.ui-chat-composer__send { flex-shrink: 0; }
.ui-chat-composer__send svg { width: 15px; height: 15px; }

/* ---------- 附件入口面板 ---------- */
.ui-chat-composer__panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 90;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
  border-radius: calc(var(--r-18) * var(--radius-scale));
  background: var(--surface-container-high);
  box-shadow: 0 8px 28px color-mix(in oklab, var(--on-surface) 16%, transparent);
}
.ui-chat-composer__kind {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 0;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: none;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-chat-composer__kind:active { transform: scale(var(--press-scale)); }
@media (hover: hover) {
  .ui-chat-composer__kind:hover { background: var(--surface-container); color: var(--on-surface); }
}
.ui-chat-composer__kind-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--surface);
}
.ui-chat-composer__kind-icon svg { width: 20px; height: 20px; }

.ui-chat-composer-panel-enter-active,
.ui-chat-composer-panel-leave-active { transition: opacity var(--t-pop), transform var(--t-pop); }
.ui-chat-composer-panel-enter-from,
.ui-chat-composer-panel-leave-to { opacity: 0; transform: translateY(6px) scale(.97); }

.ui-chat-composer__input { display: none; }
</style>