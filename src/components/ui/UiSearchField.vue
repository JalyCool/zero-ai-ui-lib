<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索' },
  /* 收起时是否保留已输入的值（false = 收起即清空） */
  keepValue: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear', 'expand', 'collapse'])

/* ============================================================
   搜索框（借鉴 app_bar_search）：
   · 外壳只做几何过渡（宽度 40px -> 字段宽），走 view 弹簧；
   · 同一个搜索图标元素从「左侧」平移到「右侧尾部」，
     位移量与外壳宽度用同一个变量算出来，所以图标始终贴着
     右边框走 —— 收起 / 展开是同一段路反向，连贯不断裂；
   · 展开后图标变成提交按钮（点击 = 搜索），输入区按内容
     替换语言从模糊中浮现；
   · Esc / 点击外部收起。
   ============================================================ */

const open = ref(!!props.modelValue)
const inputEl = ref(null)
const rootEl = ref(null)

function expand() {
  if (props.disabled || open.value) return
  open.value = true
  emit('expand')
  nextTick(() => inputEl.value?.focus())
}

function collapse() {
  if (!open.value) return
  open.value = false
  emit('collapse')
  if (!props.keepValue) emit('update:modelValue', '')
  emit('clear')
}

function onTriggerClick() {
  /* 收起态：展开；展开态：同一个图标就是搜索动作。 */
  if (open.value) emit('search', props.modelValue)
  else expand()
}

function onInput(event) { emit('update:modelValue', event.target.value) }

function onKeydown(event) {
  if (event.key === 'Enter') { emit('search', props.modelValue); return }
  if (event.key === 'Escape') {
    if (props.modelValue) { emit('update:modelValue', ''); emit('clear') }
    else collapse()
  }
}

/* 点击外部收起 */
function onDocPointer(event) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(event.target)) collapse()
}
document.addEventListener('pointerdown', onDocPointer)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer))

watch(() => props.modelValue, value => { if (value) open.value = true })
</script>

<template>
  <div
    ref="rootEl"
    class="ui-search"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
    role="search"
  >
    <!-- 输入区：外壳长出来之后从模糊中浮现（内容替换语言）。 -->
    <div class="ui-search__inner">
      <input
        ref="inputEl"
        class="ui-search__input"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="placeholder"
        :tabindex="open ? 0 : -1"
        @input="onInput"
        @keydown="onKeydown"
      >
      <button
        v-if="modelValue"
        type="button"
        class="ui-search__clear"
        aria-label="清空"
        :tabindex="open ? 0 : -1"
        @click.stop="emit('update:modelValue', ''); emit('clear'); inputEl && inputEl.focus()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <!-- 同一个元素：收起态是展开按钮，展开态平移到尾部成为搜索动作。 -->
    <button
      type="button"
      class="ui-search__icon"
      :aria-label="open ? '执行搜索' : '展开搜索'"
      @click.stop="onTriggerClick"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.8-3.8" /></svg>
    </button>
  </div>
</template>

<style scoped>
.ui-search {
  --field-w: min(320px, calc(100vw - 64px));
  /* 图标旅行时长：略慢于外壳变长（view 的 1.2 倍）。 */
  --icon-travel: calc(var(--spring-view-dur) * 1.2);
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
  border: var(--border-w) solid transparent;
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container);
  /* 形变只动外壳几何：宽度 + 底色 + 描边 */
  transition: width var(--t-view), background var(--t-fade), border-color var(--t-fade);
}
.ui-search.is-open {
  width: var(--field-w);
  background: var(--surface-container-low);
  border-color: var(--outline-variant);
}
.ui-search.is-open:focus-within { border-color: var(--primary); background: var(--surface); }
.ui-search.is-disabled { opacity: .42; }

/* 图标：同一个元素，贴着外壳右边框平移；位移量与宽度同源，
   所以展开时它和右边框一起走，收起时原路返回。
   旅行比外壳慢 20%：宽度先到、图标后落位，动效有前后层次。 */
.ui-search__icon {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  cursor: pointer;
  transition: transform var(--icon-travel) var(--spring-view), color var(--t-fade);
}
/* 背景单独一层：hover / 按压 / 压缩动画都只作用于它，图标本体不动。 */
.ui-search__icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(12px * var(--radius-scale));
  background: transparent;
  transition: background var(--t-fade);
}
.ui-search__icon:hover::before { background: color-mix(in oklab, var(--primary) 12%, transparent); }
.ui-search__icon:active::before { background: color-mix(in oklab, var(--primary) 18%, transparent); }
.ui-search.is-open .ui-search__icon {
  transform: translateX(calc(var(--field-w) - 40px));
  color: var(--primary);
}
/* 展开旅行的前三分之一：背景框压缩到 94%，随后回弹到 100%。 */
.ui-search.is-open .ui-search__icon::before {
  animation: uiSearchSqueeze var(--icon-travel) var(--spring-view) 1;
}
@keyframes uiSearchSqueeze {
  0% { transform: scale(1); }
  33% { transform: scale(.94); }
  100% { transform: scale(1); }
}
.ui-search__icon svg { position: relative; z-index: 1; width: 17px; height: 17px; }

/* 输入区：占据外壳中间，展开时按内容替换语言浮现。 */
.ui-search__inner {
  position: absolute;
  top: 0;
  /* 收起时让位给图标；展开时随图标离开向左扩展，不留空白。 */
  left: 40px;
  right: 40px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  filter: blur(10px);
  transform: translateX(-6px);
  pointer-events: none;
  transition: opacity var(--t-fade), filter var(--t-fade), transform var(--t-panel),
              left var(--t-view);
}
.ui-search.is-open .ui-search__inner { left: 11px; }
.ui-search.is-open .ui-search__inner {
  opacity: 1;
  filter: blur(0);
  transform: none;
  pointer-events: auto;
  transition-delay: 80ms;
}
.ui-search__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
}
.ui-search__input::placeholder { color: var(--on-surface-variant); }
.ui-search__clear {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-search__clear:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-search__clear svg { width: 10px; height: 10px; }

@media (prefers-reduced-motion: reduce) {
  .ui-search__inner { transition-delay: 0ms; filter: none; }
}
</style>
