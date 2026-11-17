<script setup>
import { nextTick, onBeforeUnmount, ref, watch, computed } from 'vue'
import { useProjectAnimate, getSpringConfig } from '../../composables/useMotion'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索' },
  keepValue: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear', 'expand', 'collapse'])

/* ============================================================
   搜索框 (motion-v 版本)：
   · 使用 motion-v 的 useAnimate 进行外壳几何动画
   · 图标位移与外壳宽度同步
   · 内容替换动画使用 blur + opacity + transform
   · 支持中断动画
   ============================================================ */

const open = ref(!!props.modelValue)
const inputEl = ref(null)
const rootEl = ref(null)
const iconEl = ref(null)
const innerEl = ref(null)

const [scope, animate] = useProjectAnimate()

// 计算字段宽度
const fieldWidth = computed(() => Math.min(320, window.innerWidth - 64))

async function expand() {
  if (props.disabled || open.value) return
  
  const wasOpen = open.value
  open.value = true
  emit('expand')
  
  // Animate shell width
  if (!wasOpen) {
    const config = getSpringConfig('view')
    await animate(scope.current, { width: fieldWidth.value + 'px' }, config)
  }
  
  nextTick(() => inputEl.value?.focus())
}

async function collapse() {
  if (!open.value) return
  
  open.value = false
  emit('collapse')
  if (!props.keepValue) emit('update:modelValue', '')
  emit('clear')
  
  const config = getSpringConfig('exit')
  await animate(scope.current, { width: '40px' }, config)
}

function onTriggerClick() {
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

function onDocPointer(event) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(event.target)) collapse()
}

document.addEventListener('pointerdown', onDocPointer)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer))

watch(() => props.modelValue, value => { if (value) open.value = true })

// Compute icon transform based on open state
const iconTransform = computed(() => {
  return open.value ? `translateX(${fieldWidth.value - 40}px)` : 'translateX(0)'
})
</script>

<template>
  <div
    ref="rootEl"
    class="ui-search"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
    role="search"
    :style="{ width: open ? fieldWidth + 'px' : '40px' }"
  >
    <!-- 输入区：外壳长出来之后从模糊中浮现（内容替换语言）。 -->
    <div ref="innerEl" class="ui-search__inner">
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
      ref="iconEl"
      type="button"
      class="ui-search__icon"
      :aria-label="open ? '执行搜索' : '展开搜索'"
      @click.stop="onTriggerClick"
      :style="{ transform: iconTransform }"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.8-3.8" /></svg>
      <!-- 背景单独一层：hover / 按压 / 压缩动画都只作用于它，图标本体不动。 -->
      <span class="ui-search__icon-bg" />
    </button>
  </div>
</template>

<style scoped>
.ui-search {
  --field-w: min(320px, calc(100vw - 64px));
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
  border: var(--border-w) solid transparent;
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container);
  /* motion-v will handle the width animation */
  background: var(--surface-container);
  transition: background var(--t-fade), border-color var(--t-fade);
}
.ui-search.is-open {
  background: var(--surface-container-low);
  border-color: var(--outline-variant);
}
.ui-search.is-open:focus-within { border-color: var(--primary); background: var(--surface); }
.ui-search.is-disabled { opacity: .42; }

/* 图标：使用 inline style 控制 transform，motion-v 会处理动画 */
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
  will-change: transform;
}
.ui-search__icon-bg {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(12px * var(--radius-scale));
  background: transparent;
  transition: background var(--t-fade), transform var(--t-feedback);
  transform: scale(1);
}
.ui-search__icon:hover .ui-search__icon-bg { background: color-mix(in oklab, var(--primary) 12%, transparent); }
.ui-search__icon:active .ui-search__icon-bg { background: color-mix(in oklab, var(--primary) 18%, transparent); transform: scale(0.94); }
.ui-search.is-open .ui-search__icon { color: var(--primary); }
.ui-search__icon svg { position: relative; z-index: 1; width: 17px; height: 17px; }

/* 输入区：占据外壳中间，展开时按内容替换语言浮现。 */
.ui-search__inner {
  position: absolute;
  top: 0;
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