<script setup>
import { computed, useAttrs } from 'vue'
/* ============================================================
   UiTimePicker —— 时间选择（single / range 二合一）
   ------------------------------------------------------------
    以前单个时间是 UiTimePicker、区间是 UiRangeTimePicker。现在：

     <UiTimePicker v-model="t" />                    // single（默认）
     <UiTimePicker v-model="range" mode="range" />   // { start, end }

   除 `mode` 与 `modelValue` 外 props 原样透传
   （label / precision / presets / min / max / displayPrecision…）。
   实现保留在 internal/ 下，不再单独导出。
   ============================================================ */

import SingleImpl from './internal/TimePicker.vue'
import RangeImpl from './internal/RangeTimePicker.vue'

const props = defineProps({
  /* single（波轮单值，默认）| range（两个波轮 + 箭头，v-model = { start, end }） */
  mode: {
    type: String,
    default: 'single',
    validator: v => ['single', 'range'].includes(v)
  },
  modelValue: { type: [String, Object], default: '' }
})

defineEmits(['update:modelValue'])
defineOptions({ inheritAttrs: false })

const IMPLS = { single: SingleImpl, range: RangeImpl }
const impl = computed(() => IMPLS[props.mode])
const attrs = useAttrs()
</script>

<template>
  <component
    :is="impl"
    :model-value="modelValue"
    v-bind="attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
