<script setup>
import { useSlots } from 'vue'
/* ============================================================
   UiMenu —— 菜单（floating / tool / context 三合一）
   ------------------------------------------------------------
   三种「点一下/右键弹出选项」的组件以前是三套调用方式：

     UiFloatingMenu  v-model + items，按钮原地长成面板（可展开成菜单面板）
     UiToolMenu      只有 @select，回传整个 item 对象，无 v-model
     UiContextMenu   包住内容，右键 / 长按在指针处弹

   现在一个组件，variant 决定触发与数据语义：

     <UiMenu variant="floating" v-model="v" :items="items" label="排序" />
     <UiMenu variant="tool" :items="items" label="更多" @select="..." />
     <UiMenu variant="context" :items="items" @select="...">任意内容</UiMenu>

   floating / tool 吃 v-model 之外的 props（label / icon / show-icon /
   show-label / show-chevron / title），context 是包裹型（默认插槽 = 目标）。
   实现保留在 internal/ 下，不再单独导出。
   ============================================================ */

import FloatingImpl from './internal/FloatingMenu.vue'
import ToolImpl from './internal/ToolMenu.vue'
import ContextImpl from './internal/ContextMenu.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'floating',
    validator: v => ['floating', 'tool', 'context'].includes(v)
  },
  /* floating：当前选中值（string）；range 形态未使用 */
  modelValue: { type: [String, Object], default: '' },
  /* [{ value?, label, description?, tone?, icon?, disabled? }] */
  items: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  title: { type: String, default: '' },
  /* 24x24 viewBox 内的 SVG 标记 */
  icon: { type: String, default: '' },
  showIcon: { type: Boolean, default: true },
  showLabel: { type: Boolean, default: true },
  showChevron: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

defineEmits(['update:modelValue', 'select'])
const slots = useSlots()
</script>

<template>
  <!-- floating：自包含，按钮原地长成面板；支持全部动作插槽 -->
  <FloatingImpl
    v-if="variant === 'floating'"
    :model-value="modelValue"
    :items="items"
    :label="label"
    :title="title"
    :icon="icon"
    :show-icon="showIcon"
    :show-label="showLabel"
    :show-chevron="showChevron"
    @update:model-value="$emit('update:modelValue', $event)"
    @select="$emit('select', $event)"
  >
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </FloatingImpl>

  <!-- tool：只有 @select，回传整个 item 对象 -->
  <ToolImpl
    v-else-if="variant === 'tool'"
    :items="items"
    :label="label"
    :disabled="disabled"
    @select="$emit('select', $event)"
  />

  <!-- context：包裹型，默认插槽是被右键的目标 -->
  <ContextImpl
    v-else
    :items="items"
    :disabled="disabled"
    @select="$emit('select', $event)"
  ><slot /></ContextImpl>
</template>
