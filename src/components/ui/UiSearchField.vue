<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索' },
  /* 收起时是否保留已输入的值（false = 收起即清空） */
  keepValue: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

/* ============================================================
   搜索框（借鉴 app_bar_search）：点图标原地长成输入框，
   宽度过渡 + 自动聚焦；收起按钮缩回图标。与库的形变语言
   一致：形变只动外壳几何，内容淡入。
   ============================================================ */

const open = ref(!!props.modelValue)
const inputEl = ref(null)

function expand() {
  if (props.disabled) return
  open.value = true
  nextTick(() => inputEl.value?.focus())
}

function collapse() {
  open.value = false
  if (!props.keepValue) emit('update:modelValue', '')
  emit('clear')
}

function onInput(event) { emit('update:modelValue', event.target.value) }

function onKeydown(event) {
  if (event.key === 'Enter') emit('search', props.modelValue)
  if (event.key === 'Escape') {
    if (props.modelValue) { emit('update:modelValue', '') ; emit('clear') }
    else collapse()
  }
}

watch(() => props.modelValue, value => { if (value) open.value = true })
</script>

<template>
  <div class="ui-search" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <button v-if="!open" type="button" class="ui-search__trigger" aria-label="搜索" @click="expand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.8-3.8" /></svg>
    </button>
    <Transition name="ui-search">
      <div v-if="open" class="ui-search__field">
        <span class="ui-search__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.8-3.8" /></svg>
        </span>
        <input
          ref="inputEl"
          class="ui-search__input"
          type="search"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-label="placeholder"
          @input="onInput"
          @keydown="onKeydown"
        >
        <button v-if="modelValue" type="button" class="ui-search__mini" aria-label="清空" @click="emit('update:modelValue', ''); emit('clear')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <button type="button" class="ui-search__mini" aria-label="收起搜索" @click="collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ui-search { display: inline-flex; min-width: 40px; }
.ui-search.is-disabled { opacity: .42; }
.ui-search__trigger {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container);
  color: var(--on-surface);
  cursor: pointer;
  transition: background var(--t-fade), transform var(--t-feedback);
}
.ui-search__trigger:hover { background: var(--surface-container-high); }
.ui-search__trigger:active { transform: scale(var(--press-scale)); }
.ui-search__trigger svg { width: 17px; height: 17px; }
.ui-search__field {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(320px, calc(100vw - 64px));
  height: 40px;
  padding: 0 8px 0 11px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(13px * var(--radius-scale));
  background: var(--surface-container-low);
  transition: border-color var(--t-fade), background var(--t-fade);
}
.ui-search__field:focus-within { border-color: var(--primary); background: var(--surface); }
.ui-search__icon { display: grid; place-items: center; width: 16px; color: var(--on-surface-variant); }
.ui-search__icon svg { width: 15px; height: 15px; }
.ui-search__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
}
.ui-search__input::-webkit-search-cancel-button { display: none; }
.ui-search__mini {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade);
}
.ui-search__mini:hover { background: var(--surface-container); color: var(--on-surface); }
.ui-search__mini svg { width: 11px; height: 11px; }
/* 原地长出：外壳宽度/圆角过渡，内容淡入 */
.ui-search-enter-active { transition: opacity var(--t-fade); }
.ui-search-leave-active { transition: opacity var(--t-exit); }
.ui-search-enter-from,
.ui-search-leave-to { opacity: 0; }
</style>
