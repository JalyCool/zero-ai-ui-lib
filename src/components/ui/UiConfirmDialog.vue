<script setup>
/* ============================================================
   统一确认对话框（替代 window.confirm）：
   · 函数用法：import { confirmDialog } from 'zero-ai-ui-lib'
     const ok = await confirmDialog({ title, message, danger: true })
   · 组件用法：<UiConfirmDialog ref="confirm" />，
     然后 confirmRef.value.ask({ ... }) 得到 Promise<boolean>。
   真实对话框由 core/confirm.js 单例挂在 body，模板本身不渲染。
   ============================================================ */
import { confirmDialog } from '../../core/confirm'

defineExpose({ ask: confirmDialog })
</script>

<template>
  <span class="ui-confirm-anchor" aria-hidden="true"></span>
</template>

<style>
.ui-confirm__message { margin: 0; color: var(--on-surface); font-size: var(--fs-small); line-height: 1.6; }
.ui-confirm__detail { margin: 8px 0 0; color: var(--on-surface-variant); font-size: var(--fs-tiny); line-height: 1.6; }
</style>
