<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  /* 文案位置：left（默认，文字在开关左边）/ right（文字在开关右边） */
  labelPlacement: { type: String, default: 'left', validator: v => ['left', 'right'].includes(v) },
  /* 文案在右侧时，是否把整行推到行尾（说明文字右对齐、开关也跟着靠右） */
  alignEnd: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const hasLabel = computed(() => !!props.label)

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <!-- 有文案时外包一行：文字 + 开关，按 labelPlacement 决定先后 -->
  <label
    v-if="hasLabel"
    class="ui-switch-row"
    :class="{ 'is-text-right': labelPlacement === 'right', 'is-end': alignEnd, 'is-disabled': disabled }"
  >
    <span v-if="labelPlacement === 'left'" class="ui-switch-row__text">{{ label }}</span>
    <button
      type="button"
      class="ui-switch"
      :class="{ 'is-on': modelValue }"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      @click.prevent="toggle"
    >
      <span class="ui-switch__thumb"></span>
    </button>
    <span v-if="labelPlacement === 'right'" class="ui-switch-row__text">{{ label }}</span>
  </label>

  <button
    v-else
    type="button"
    class="ui-switch"
    :class="{ 'is-on': modelValue }"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="'开关'"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="ui-switch__thumb"></span>
  </button>
</template>

<style scoped>
/* 一行：文字 + 开关。文案在右时开关在前、文字在后；
   alignEnd 时整行展开、文字吃掉剩余宽度：文案在左 → 文字顶左、开关贴行尾；
   文案在右 → 文字**右对齐到行尾**、开关贴行首。 */
.ui-switch-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}
/* align-end：整行展开成 100% 宽。「最右侧内容对齐到行尾」——
   无论文案在哪侧：吃掉剩余宽度的都是文字，开关永远贴行尾。 */
.ui-switch-row.is-end { display: flex; width: 100%; }
.ui-switch-row__text {
  color: var(--on-surface);
  font-size: var(--fs-small);
  line-height: 1.4;
  transition: color var(--t-fade);
}
.ui-switch-row.is-end .ui-switch-row__text { flex: 1; }
/* 文案在右 + align-end：开关贴行首、文字右对齐到行尾 */
.ui-switch-row.is-end.is-text-right { flex-direction: row-reverse; }
.ui-switch-row.is-end.is-text-right .ui-switch-row__text { text-align: right; }
.ui-switch-row.is-disabled { opacity: .55; cursor: not-allowed; }
.ui-switch-row.is-disabled .ui-switch { cursor: not-allowed; }
</style>
