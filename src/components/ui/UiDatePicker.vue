<script setup>
import { computed, useAttrs } from 'vue'
/* ============================================================
   UiDatePicker —— 日期选择（grid / wheel / range 三合一）
   ------------------------------------------------------------
   以前三种选日期的交互是三个组件、三套调用方式：
     UiDatePicker（弹层日历网格）/ UiWheelDatePicker（年月日滚轮）/
     UiRangeDatePicker（区间）。现在一个组件，mode 决定形态：

     <UiDatePicker v-model="d" />                     // grid（默认）
     <UiDatePicker v-model="d" mode="wheel" label="出生日期" />
     <UiDatePicker v-model="range" mode="range" />    // v-model = { start, end }

   除 `mode` 与 `modelValue` 外**所有 props 原样透传**给对应实现
   （label / precision / min / max / startYear / endYear…），
   所以旧写法一行不用改参数名，只是把组件名换掉。
   实现保留在 internal/ 下，不再单独导出——同一种能力只有一个名字。
   ============================================================ */

import GridImpl from './internal/DatePicker.vue'
import WheelImpl from './internal/WheelDatePicker.vue'
import RangeImpl from './internal/RangeDatePicker.vue'

const props = defineProps({
  /* grid（日历网格弹层，默认）| wheel（年月日滚轮）| range（区间点选） */
  mode: {
    type: String,
    default: 'grid',
    validator: v => ['grid', 'wheel', 'range'].includes(v)
  },
  /* grid / wheel: 'YYYY-MM-DD'；range: { start, end } */
  modelValue: { type: [String, Object], default: '' }
})

defineEmits(['update:modelValue'])
defineOptions({ inheritAttrs: false })

const IMPLS = { grid: GridImpl, wheel: WheelImpl, range: RangeImpl }
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
