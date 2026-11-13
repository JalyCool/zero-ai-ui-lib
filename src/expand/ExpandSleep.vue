<script setup>
import ExpandTopbar from '../components/ExpandTopbar.vue'
import { UiBarChart } from '../components/ui'

const week = [7.2, 6.5, 8.1, 7.8, 6.9, 8.4, 7.5]
</script>

<template>
  <ExpandTopbar crumb="睡眠" />
  <h1 class="expand-title">睡眠</h1>
  <p class="expand-subtitle">过去 7 天平均 7.4 小时</p>
  <div class="expand-hero">
    <span class="num">7.4</span>
    <span class="unit">小时 · 平均</span>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">本周睡眠时长</div>
    <div class="expand-chart-card">
      <UiBarChart id="expandSleepBars" :data="week" :height="120" unit="小时" :highlight="7.8" />
    </div>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">睡眠质量</div>
    <div class="expand-metric-grid">
      <div class="expand-metric-cell"><div class="lbl">深睡</div><div class="val">1.6<small>小时</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">浅睡</div><div class="val">4.8<small>小时</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">快速眼动</div><div class="val">1.0<small>小时</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">入睡时长</div><div class="val">14<small>分钟</small></div></div>
    </div>
  </div>
  <p class="expand-desc">深睡比例约 21%，略高于同龄人群的平均值。周末两晚的入睡时间比工作日更晚，建议把作息差异控制在 1 小时内。</p>
</template>
