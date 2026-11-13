<script setup>
import ExpandTopbar from '../components/ExpandTopbar.vue'

defineProps({
  title: { type: String, required: true },
  num: { type: String, required: true },
  unit: { type: String, required: true },
  trend: { type: String, required: true },
  desc: { type: String, required: true }
})
</script>

<template>
  <ExpandTopbar :crumb="title" />
  <h1 class="expand-title">{{ title }}</h1>
  <p class="expand-subtitle">{{ trend }}</p>
  <div class="expand-hero">
    <span class="num">{{ num }}</span>
    <span class="unit">{{ unit }}</span>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">今天的趋势</div>
    <div class="expand-chart-card">
      <svg class="expand-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="grid-line" x1="6" y1="25" x2="294" y2="25"/>
        <line class="grid-line" x1="6" y1="50" x2="294" y2="50"/>
        <line class="grid-line" x1="6" y1="75" x2="294" y2="75"/>
        <path fill="url(#heartGrad)" d="M8,60 L48,42 L88,50 L128,38 L168,45 L208,55 L248,48 L292,42 L292,92 L8,92 Z"/>
        <path fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M8,60 L48,42 L88,50 L128,38 L168,45 L208,55 L248,48 L292,42"/>
      </svg>
    </div>
  </div>
  <p class="expand-desc">{{ desc }}</p>
</template>
