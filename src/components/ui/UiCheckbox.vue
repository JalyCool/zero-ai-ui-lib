<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  /* 删除线变体：勾选后一条线从左往右划过文字 */
  strike: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="ui-check" :class="{ 'is-strike': strike, 'is-on': modelValue }">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="emit('update:modelValue', $event.target.checked)"
    >
    <span class="ui-check__box" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
    </span>
    <span class="ui-check__text">
      <span class="ui-check__label">{{ label }}</span>
      <span v-if="description" class="ui-check__desc">{{ description }}</span>
    </span>
  </label>
</template>

<style scoped>
/* 删除线：用伪元素从左到右扫过（scaleX 0 -> 1），
   而不是直接给文字加 text-decoration —— 那样没有「划」的过程。 */
.ui-check.is-strike .ui-check__label { position: relative; display: inline-block; }
/* 画线时从左往右；取消勾选时改成从右往左擦掉（origin 切换）。 */
.ui-check.is-strike .ui-check__label::after {
  content: '';
  position: absolute;
  left: -1px;
  right: -1px;
  top: 52%;
  height: 1.5px;
  border-radius: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--t-pop), opacity var(--t-fade);
  opacity: 0;
}
.ui-check.is-strike:not(.is-on) .ui-check__label::after { transform-origin: right center; }
.ui-check.is-strike.is-on .ui-check__label::after { transform: scaleX(1); opacity: .78; }
.ui-check.is-strike.is-on .ui-check__label { color: var(--on-surface-variant); }
.ui-check.is-strike.is-on .ui-check__desc { text-decoration: line-through; text-decoration-thickness: 1px; opacity: .6; }

@media (prefers-reduced-motion: reduce) {
  .ui-check.is-strike .ui-check__label::after { transition-duration: .01ms; }
}
</style>
