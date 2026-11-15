<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  length: { type: Number, default: 6 },
  modelValue: { type: String, default: '' },
  /* idle | success | error —— success 会洗成完成态（下沉 + 勾），error 会逐位抽走 */
  status: { type: String, default: 'idle' },
  mask: { type: Boolean, default: false },
  autofocus: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
  /* 每个新数字的落位时长（ms） */
  settle: { type: Number, default: 300 },
  /* 粘贴时逐位错开的间隔（ms） */
  cascade: { type: Number, default: 20 }
})

const emit = defineEmits(['update:modelValue', 'complete', 'focus', 'blur', 'change'])

/* ============================================================
   一次性验证码（按 react-bits CodeSlots 的手法移植）
   ------------------------------------------------------------
   · 每个数字独立「落位」：透明度 0→1、模糊 6px→0、位移 .5em→0、
     缩放 .72→1，用 spring 曲线；粘贴时按 cascade 逐位错开，形成
     一串接连落下的节奏，而不是整排一起出现。
   · 位光标是**一个**元素，在格子之间滑过去（transform 过渡），
     只在当前位为空（或错误态）时显示。
   · success：先铺一层洗色（clip-path 从中间向两侧展开），数字逐位
     下沉淡出，勾号从下方升起；error：数字从后往前逐位抽走再清空。
   · 键盘可完全操作：数字写入、退格删前一位、方向键/Home/End 移位、
     粘贴按位错开；原生 input 负责焦点与短信 autocomplete。
   ============================================================ */

const inputEl = ref(null)
const focused = ref(false)
const active = ref(0)
const version = ref(Array.from({ length: props.length }, () => 0))
const delays = ref(Array.from({ length: props.length }, () => 0))
const ghosts = ref(Array.from({ length: props.length }, () => null))
const veiled = ref(false)
const draining = ref(false)
let ghostTimers = []
let drainTimer = 0

const digits = computed(() => {
  const raw = String(props.modelValue || '').replace(/\D/g, '').slice(0, props.length)
  return Array.from({ length: props.length }, (_, i) => raw[i] || '')
})
const filled = computed(() => digits.value.filter(Boolean).length)
function onFocus() {
  focused.value = true
  /* 聚焦时把当前位落到「第一个空格」，全部填满则停在最后一位。 */
  active.value = Math.min(filled.value, props.length - 1)
  emit('focus')
}

function onBlur() {
  focused.value = false
  emit('blur')
}

/* 当前位：不再用独立光标元素，直接给这一格填充强调。
   成功后整排会洗色，就不再强调当前位。 */
const activeIndex = computed(() => Math.min(Math.max(0, active.value), props.length - 1))
const showActive = computed(() =>
  focused.value && !props.disabled && !veiled.value && props.status !== 'success'
)

function sanitize(value) {
  return String(value || '').replace(/\D/g, '').slice(0, props.length)
}

/* 写入一串数字：从 from 开始逐位落位，按 cascade 错峰。 */
function insert(raw, from = active.value) {
  if (props.disabled || draining.value) return
  const text = sanitize(raw)
  if (!text) return
  const list = digits.value.slice()
  const landing = []
  let cursor = from
  for (const char of text) {
    if (cursor >= props.length) break
    if (list[cursor] !== char) { version.value[cursor] += 1; delays.value[cursor] = landing.length * props.cascade }
    list[cursor] = char
    landing.push(cursor)
    cursor += 1
  }
  if (!landing.length) return
  commit(list.join(''))
  active.value = Math.min(cursor, props.length - 1)
}

function clearSlot(index, stepBack = false) {
  const list = digits.value.slice()
  if (!list[index]) {
    if (stepBack) active.value = Math.max(0, index - 1)
    return
  }
  ghosts.value[index] = { char: list[index], tick: ++version.value[index] }
  clearTimeout(ghostTimers[index])
  ghostTimers[index] = setTimeout(() => { ghosts.value[index] = null }, 220)
  list[index] = ''
  commit(list.join(''))
  if (stepBack) active.value = Math.max(0, index)
}

function commit(value) {
  const before = sanitize(props.modelValue)
  emit('update:modelValue', value)
  emit('change', value)
  if (before.length !== props.length && value.length === props.length) emit('complete', value)
}

function moveActive(delta) {
  active.value = Math.max(0, Math.min(props.length - 1, active.value + delta))
}

/* ---------- 键盘：完全自己接管，才能控制逐位动画 ---------- */
function onKeydown(event) {
  if (props.disabled || draining.value) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key
  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    insert(key)
  } else if (key === 'Backspace') {
    event.preventDefault()
    /* 与产品约定一致：退格删「当前位前面那一位」；停在第一位时删第一位。 */
    if (active.value > 0 && !digits.value[active.value]) clearSlot(active.value - 1, true)
    else if (digits.value[active.value]) clearSlot(active.value) && (active.value = Math.max(0, active.value - 1))
    else if (active.value > 0) clearSlot(active.value - 1, true)
  } else if (key === 'Delete') {
    event.preventDefault()
    clearSlot(active.value)
  } else if (key === 'ArrowLeft') { event.preventDefault(); moveActive(-1) }
  else if (key === 'ArrowRight') { event.preventDefault(); moveActive(1) }
  else if (key === 'Home') { event.preventDefault(); active.value = 0 }
  else if (key === 'End') { event.preventDefault(); active.value = props.length - 1 }
}

function onInput(event) {
  if (props.disabled) return
  const text = sanitize(event.target.value)
  event.target.value = ''
  if (!text) return
  insert(text, active.value)
}

function onPaste(event) {
  if (props.disabled) return
  event.preventDefault()
  insert((event.clipboardData || window.clipboardData).getData('text'), 0)
}

function focusInput() {
  if (props.disabled) return
  inputEl.value && inputEl.value.focus()
}

/* 点某格：把当前位放过去（不超过末尾下一位）。 */
function onRowDown(event) {
  if (props.disabled) return
  const row = event.currentTarget.getBoundingClientRect()
  const index = Math.floor((event.clientX - row.left) / pitch.value)
  active.value = Math.max(0, Math.min(index, filled.value))
  focusInput()
}

/* ---------- 状态：成功洗色 + 下沉 + 勾；失败抽走 ---------- */
watch(() => props.status, (next, prev) => {
  if (next === 'success') {
    veiled.value = true
    return
  }
  if (prev === 'success') {
    veiled.value = false
    return
  }
  if (next !== 'error') return
  const list = digits.value
  const targets = list.map((char, i) => (char ? i : -1)).filter(i => i >= 0).reverse()
  if (!targets.length) return
  draining.value = true
  targets.forEach((index, order) => {
    ghosts.value[index] = { char: list[index], tick: ++version.value[index], delay: order * props.cascade }
    list[index] = ''
  })
  clearTimeout(drainTimer)
  drainTimer = setTimeout(() => {
    draining.value = false
    emit('update:modelValue', '')
    emit('change', '')
  }, targets.length * props.cascade + 220)
}, { immediate: false })

watch(() => props.modelValue, value => {
  /* 外部改值（含清空）：字符合法范围内，重置当前位到末尾下一位。 */
  if (inputEl.value && focused.value) inputEl.value.value = ''
  const filledCount = sanitize(value).length
  if (filledCount < props.length) active.value = Math.min(filledCount, props.length - 1)
})

watch(() => props.length, length => {
  version.value = Array.from({ length }, (_, i) => version.value[i] || 0)
  delays.value = Array.from({ length }, (_, i) => delays.value[i] || 0)
  ghosts.value = Array.from({ length }, (_, i) => ghosts.value[i] || null)
  active.value = Math.min(active.value, length - 1)
})

onMounted(() => { if (props.autofocus) nextTick(focusInput) })
onBeforeUnmount(() => {
  ghostTimers.forEach(timer => clearTimeout(timer))
  clearTimeout(drainTimer)
})

defineExpose({ focus: () => focusInput(), blur: () => inputEl.value && inputEl.value.blur() })
</script>

<template>
  <div class="ui-code-slots" :class="{ 'is-disabled': disabled, 'is-focused': focused, 'is-success': status === 'success', 'is-error': status === 'error' }">
    <span v-if="label" class="ui-code-slots__label">{{ label }}</span>

    <div
      class="ui-code-slots__row"
      @pointerdown="onRowDown"
    >
      <input
        ref="inputEl"
        class="ui-code-slots__input"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        autocapitalize="off"
        spellcheck="false"
        :disabled="disabled"
        :aria-label="label || '验证码'"
        @keydown="onKeydown"
        @input="onInput"
        @paste="onPaste"
        @focus="onFocus"
        @blur="onBlur"
      />

      <!-- 洗色层：success 时从中间向两侧展开 -->
      <span class="ui-code-slots__wash" aria-hidden="true"></span>
      <!-- 勾：success 时从下方升起 -->
      <span class="ui-code-slots__check" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.6 4.6L19 7.2" /></svg>
      </span>

      <span
        v-for="(digit, index) in digits"
        :key="'slot-' + index"
        class="ui-code-slots__slot"
        :class="{ 'is-filled': !!digit, 'is-active': index === activeIndex && showActive, 'is-ghost': !!ghosts[index] }"
        :style="{ '--i': index }"
        aria-hidden="true"
      >
        <!-- 新数字：key 变化触发落位动画（透明度 + 模糊 + 位移 + 缩放） -->
        <span
          v-if="digit"
          :key="'d-' + index + '-' + version[index]"
          class="ui-code-slots__digit"
          :style="{ animationDelay: (delays[index] || 0) + 'ms', animationDuration: settle + 'ms' }"
        >{{ mask ? '•' : digit }}</span>
        <!-- 被删掉的数字：先播放抽笔（上移 + 淡出 + 模糊）再消失 -->
        <span
          v-if="ghosts[index]"
          :key="'g-' + index + '-' + ghosts[index].tick"
          class="ui-code-slots__digit is-leaving"
          :style="{ animationDelay: (ghosts[index].delay || 0) + 'ms' }"
        >{{ mask ? '•' : ghosts[index].char }}</span>
      </span>
    </div>

    <span class="ui-code-slots__progress" aria-live="polite">{{ filled }} / {{ length }}</span>
  </div>
</template>

<style scoped>
.ui-code-slots { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-code-slots__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-code-slots__row { position: relative; display: flex; gap: 8px; }

/* 输入本体透明地盖住整行，只负责焦点、键盘与短信自动填充。 */
.ui-code-slots__input {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 16px;
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
  overflow: hidden;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: 1.32rem;
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  transition: border-color var(--t-fade), background var(--t-fade), transform var(--t-feedback);
}
.ui-code-slots__slot.is-filled { border-color: color-mix(in oklab, var(--primary) 34%, var(--outline-variant)); }
.ui-code-slots__slot.is-active {
  border-color: var(--primary);
  /* 当前输入位「填充强调」：用主色容器整格填上，而不是一条光标线 */
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.ui-code-slots.is-disabled .ui-code-slots__slot { opacity: .42; }
.ui-code-slots.is-error .ui-code-slots__slot { border-color: color-mix(in oklab, var(--error) 40%, var(--outline-variant)); }
.ui-code-slots.is-error .ui-code-slots__slot.is-active {
  border-color: var(--error);
  background: color-mix(in oklab, var(--error) 15%, var(--surface-container-low));
}

/* 单个数字：落位（透明度 + 模糊 + 位移 + 缩放）。 */
.ui-code-slots__digit {
  display: block;
  will-change: opacity, filter, transform;
  animation-name: uiSlotLand;
  animation-timing-function: var(--spring-pop);
  animation-fill-mode: both;
}
@keyframes uiSlotLand {
  from { opacity: 0; filter: blur(6px); transform: translateY(.5em) scale(.72); }
  to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
}
/* 删除：上移 + 淡出 + 模糊 */
.ui-code-slots__digit.is-leaving { position: absolute; animation-name: uiSlotLeave; animation-duration: 200ms; }
@keyframes uiSlotLeave {
  from { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
  to { opacity: 0; filter: blur(4px); transform: translateY(-.45em) scale(.8); }
}

/* 成功：洗色从中间展开，数字下沉，勾升起。 */
.ui-code-slots__wash {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: calc(14px * var(--radius-scale));
  background: color-mix(in oklab, var(--ui-success, #15803d) 16%, var(--surface-container-low));
  clip-path: inset(0 50% 0 50% round 14px);
  opacity: 0;
  transition: clip-path 320ms cubic-bezier(.23, 1, .32, 1), opacity 120ms ease;
  pointer-events: none;
}
.ui-code-slots.is-success .ui-code-slots__wash { clip-path: inset(0 0 0 0 round 14px); opacity: 1; }

.ui-code-slots__check {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  color: var(--ui-success, #15803d);
  opacity: 0;
  transform: translateY(8px) scale(.85);
  transition: opacity 200ms ease, transform 320ms cubic-bezier(.22, 1.4, .36, 1);
  pointer-events: none;
}
.ui-code-slots__check svg { width: 26px; height: 26px; }
.ui-code-slots.is-success .ui-code-slots__check { opacity: 1; transform: none; transition-delay: 280ms; }
/* 成功时数字逐位下沉：用独立 keyframes 覆盖落位动画（同一个 ranimation 的
   fill-mode 会把 opacity 顶回 1，所以不能只写 opacity:0）。 */
.ui-code-slots.is-success .ui-code-slots__digit {
  animation-name: uiSlotSink;
  animation-duration: 260ms;
  animation-timing-function: cubic-bezier(.23, 1, .32, 1);
  animation-delay: calc(var(--i, 0) * 28ms);
  animation-fill-mode: both;
}
@keyframes uiSlotSink {
  from { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
  to { opacity: 0; filter: blur(4px); transform: translateY(.45em) scale(.9); }
}

.ui-code-slots__progress { align-self: flex-end; font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .ui-code-slots__digit { animation-duration: .01ms !important; }
  .ui-code-slots__digit.is-leaving { animation-duration: .01ms !important; }
  .ui-code-slots__wash,
  .ui-code-slots__check { transition-duration: .01ms; }
}
</style>
