<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /* 位数 */
  length: { type: Number, default: 6 },
  /* 已输入的字符（只保留数字） */
  modelValue: { type: String, default: '' },
  /* 挂载后自动聚焦（会唤起键盘，按需开启） */
  autofocus: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /* 是否遮住已输入的位（OTP 一般明文，默认不遮） */
  mask: { type: Boolean, default: false },
  label: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'complete', 'focus', 'blur'])

/* ============================================================
   一次性验证码输入
   · 真正的输入是一个透明的原生 input（autocomplete="one-time-code"），
     这样 iOS / Android 的短信验证码自动填充、以及系统粘贴都能直接进来；
   · 界面上每个格子只是显示层：新数字落格时从下方弹入并去模糊，
     「spring into its slots」就是这个落格动画；
   · 粘贴时一次性铺满所有格子，多的截掉、非数字丢弃。
   ============================================================ */

const inputEl = ref(null)
const focused = ref(false)
const caretIndex = ref(0)

const digits = computed(() => {
  const raw = String(props.modelValue || '').replace(/\D/g, '').slice(0, props.length)
  return Array.from({ length: props.length }, (_, i) => raw[i] || '')
})
const filled = computed(() => digits.value.filter(Boolean).length)
const activeIndex = computed(() => (focused.value ? Math.min(filled.value, props.length - 1) : -1))

function sanitize(value) {
  return String(value || '').replace(/\D/g, '').slice(0, props.length)
}

function onInput(event) {
  const next = sanitize(event.target.value)
  event.target.value = next
  emit('update:modelValue', next)
  caretIndex.value = next.length
  if (next.length === props.length) emit('complete', next)
}

function focusInput() {
  if (props.disabled) return
  inputEl.value && inputEl.value.focus()
}

/* 点任意格子都把焦点还给真实 input，光标落到末尾。 */
function onSlotClick() {
  focusInput()
  const el = inputEl.value
  if (el) {
    const end = el.value.length
    el.setSelectionRange(end, end)
  }
}

function onPaste(event) {
  if (props.disabled) return
  const text = sanitize((event.clipboardData || window.clipboardData).getData('text'))
  if (!text) return
  event.preventDefault()
  emit('update:modelValue', text)
  if (inputEl.value) inputEl.value.value = text
  if (text.length === props.length) emit('complete', text)
}

/* 键盘退格 / 方向键：input 自身即可处理，这里只同步光标位置。 */
function onKeydown(event) {
  if (props.disabled) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace') {
    requestAnimationFrame(() => { caretIndex.value = inputEl.value ? inputEl.value.value.length : 0 })
  }
}

onMounted(() => {
  if (props.autofocus) nextTick(focusInput)
})

onBeforeUnmount(() => { /* 无定时器需要清理 */ })

defineExpose({ focus: () => focusInput(), blur: () => inputEl.value && inputEl.value.blur() })
</script>

<template>
  <div class="ui-code-slots" :class="{ 'is-disabled': disabled, 'is-focused': focused }">
    <span v-if="label" class="ui-code-slots__label">{{ label }}</span>

    <div class="ui-code-slots__row" @click="onSlotClick">
      <!-- 透明原生输入：短信自动填充 / 系统粘贴 / 数字键盘都靠它。 -->
      <input
        ref="inputEl"
        class="ui-code-slots__input"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        autocapitalize="off"
        spellcheck="false"
        :maxlength="length"
        :disabled="disabled"
        :value="modelValue"
        :aria-label="label || '验证码'"
        @input="onInput"
        @paste="onPaste"
        @keydown="onKeydown"
        @focus="focused = true; emit('focus')"
        @blur="focused = false; emit('blur')"
      />
      <span
        v-for="(digit, index) in digits"
        :key="index"
        class="ui-code-slots__slot"
        :class="{ 'is-filled': !!digit, 'is-active': index === activeIndex }"
        aria-hidden="true"
      >
        <span
          v-if="digit"
          :key="digit + '-pop'"
          class="ui-code-slots__digit"
        >{{ mask ? '•' : digit }}</span>
        <span v-if="index === activeIndex" class="ui-code-slots__caret"></span>
      </span>
    </div>

    <span class="ui-code-slots__progress" aria-live="polite">{{ filled }} / {{ length }}</span>
  </div>
</template>

<style scoped>
.ui-code-slots { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-code-slots__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-code-slots__row { position: relative; display: flex; gap: 8px; }

/* 输入本体：完全透明但盖满整行，点任意位置都相当于聚焦它。 */
.ui-code-slots__input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 16px;      /* 小于 16px 会在 iOS 上触发自动放大 */
  opacity: 0;
  cursor: text;
}

.ui-code-slots__slot {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 56px;
  flex: 1 1 0;
  min-width: 0;
  max-width: 56px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: 1.32rem;
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  transition: border-color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
/* 当前待输入位：主色描边 + 呼吸提示。 */
.ui-code-slots__slot.is-active { border-color: var(--primary); background: var(--surface-container); }
.ui-code-slots__slot.is-filled { border-color: color-mix(in oklab, var(--primary) 34%, var(--outline-variant)); }
.ui-code-slots:not(.is-focused) .ui-code-slots__slot.is-active { border-color: var(--outline-variant); }
.ui-code-slots.is-disabled .ui-code-slots__slot { opacity: .42; }
.ui-code-slots.is-disabled .ui-code-slots__input { cursor: not-allowed; }

/* 落格：从下方弹入 + 去模糊，这就是「spring into its slots」。 */
.ui-code-slots__digit {
  animation: uiCodeSlotDrop var(--spring-feedback-dur, 320ms) var(--spring-feedback, cubic-bezier(.22,1.2,.36,1)) both;
  will-change: transform, filter, opacity;
}
@keyframes uiCodeSlotDrop {
  from { opacity: 0; transform: translateY(52%) scale(.82); filter: blur(7px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

.ui-code-slots__caret {
  position: absolute;
  bottom: 9px;
  width: 16px;
  height: 2px;
  border-radius: 1px;
  background: var(--primary);
  animation: uiCodeCare 1.05s steps(1, end) infinite;
}
@keyframes uiCodeCare { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }

.ui-code-slots__progress { align-self: flex-end; font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .ui-code-slots__digit { animation: none; }
  .ui-code-slots__caret { animation: none; opacity: 1; }
}
</style>
