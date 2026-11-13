<script setup>
import ExpandTopbar from '../components/ExpandTopbar.vue'

const props = defineProps({
  title: { type: String, required: true },
  meta: { type: String, required: true },
  kcal: { type: String, required: true },
  desc: { type: String, required: true }
})
</script>

<template>
  <ExpandTopbar crumb="活动" />
  <h1 class="expand-title">{{ title }}</h1>
  <p class="expand-subtitle">{{ meta }}</p>
  <div class="expand-hero">
    <span class="num">{{ kcal.split(' ')[0] }}</span>
    <span class="unit">kcal 消耗</span>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">心率曲线</div>
    <div class="expand-chart-card">
      <svg class="expand-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="grid-line" x1="6" y1="25" x2="294" y2="25"/>
        <line class="grid-line" x1="6" y1="50" x2="294" y2="50"/>
        <line class="grid-line" x1="6" y1="75" x2="294" y2="75"/>
        <path fill="url(#heartGrad)" d="M8,55 L48,35 L88,58 L128,42 L168,32 L208,52 L248,40 L292,48 L292,92 L8,92 Z"/>
        <path fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M8,55 L48,35 L88,58 L128,42 L168,32 L208,52 L248,40 L292,48"/>
      </svg>
    </div>
  </div>
  <p class="expand-desc">{{ desc }}</p>
</template>
