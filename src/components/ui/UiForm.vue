<script setup>
import { provide, reactive, ref } from 'vue'

const props = defineProps({
  /* 提交前自动校验 */
  validateOnSubmit: { type: Boolean, default: true }
})
const emit = defineEmits(['submit', 'invalid'])

/* 表单容器：收集所有 UiFormField 的校验函数，提交时一起跑。 */
const fields = reactive(new Set())
const busy = ref(false)
provide('ui-form', { fields, busy })

async function submit() {
  if (busy.value) return
  if (props.validateOnSubmit) {
    let ok = true
    for (const validate of fields) { if (!validate()) ok = false }
    if (!ok) { emit('invalid'); return }
  }
  busy.value = true
  try { emit('submit') } finally { setTimeout(() => { busy.value = false }, 260) }
}

function reset() {
  fields.forEach(validate => { try { validate() } catch (error) { /* 忽略 */ } })
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
