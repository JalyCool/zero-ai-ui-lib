<script setup>
import { provide, reactive, ref, nextTick } from 'vue'

const props = defineProps({
  /* 提交前自动校验 */
  validateOnSubmit: { type: Boolean, default: true }
})
const emit = defineEmits(['submit', 'invalid'])

/* 表单容器：收集所有 UiFormField 的校验函数，提交时一起跑。
   校验策略：
   · 平时不显示错误、不拦提交按钮；
   · 点提交才跑校验，失败时「滚动到第一处错误 + 高亮 + 气泡说明」，
     而不是把错误常驻在左下角。 */
const fields = reactive(new Set())
const busy = ref(false)
provide('ui-form', { fields, busy })

/* 汇总失败项：每一项形如 { validate, el } */
async function collectErrors() {
  const failed = []
  for (const entry of fields) {
    /* 兼容「直接传函数」和「注册时带 el」两种登记方式 */
    const validate = typeof entry === 'function' ? entry : entry.validate
    const el = typeof entry === 'function' ? null : entry.el
    if (!validate()) failed.push({ el: el ? el() : null })
  }
  return failed
}

async function submit() {
  if (busy.value) return
  if (props.validateOnSubmit) {
    const failed = await collectErrors()
    if (failed.length) {
      /* 滚动到第一处错误并聚焦，气泡由 UiFormField 自己渲染 */
      await nextTick()
      const first = failed[0].el
      if (first && first.scrollIntoView) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = first.querySelector('input, textarea, select, button')
        if (input && input.focus) input.focus({ preventScroll: true })
      }
      emit('invalid', failed.length)
      return
    }
  }
  busy.value = true
  try { emit('submit') } finally { setTimeout(() => { busy.value = false }, 260) }
}

function reset() {
  fields.forEach(entry => {
    const validate = typeof entry === 'function' ? entry : entry.validate
    try { validate() } catch (error) { /* 忽略 */ }
  })
}
defineExpose({ submit, reset })
</script>
<template>
  <form class="ui-form" novalidate @submit.prevent="submit">
    <slot :submit="submit" :busy="busy" />
  </form>
</template>
<style scoped>
.ui-form { display: flex; flex-direction: column; gap: var(--space-card); min-width: 0; }
</style>
