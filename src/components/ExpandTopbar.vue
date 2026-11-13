<script setup>
defineProps({
  crumb: { type: String, required: true }
})
</script>

<template>
  <div class="expand-topbar">
    <button class="expand-close" data-close aria-label="返回">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <span class="crumb">{{ crumb }}</span>
    <span style="width:40px"></span>
  </div>
</template>
