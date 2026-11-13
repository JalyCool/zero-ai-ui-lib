<script setup>
import ExpandTopbar from '../components/ExpandTopbar.vue'
</script>

<template>
  <ExpandTopbar crumb="今日活动" />
  <h1 class="expand-title">步数</h1>
  <p class="expand-subtitle">今天的目标已完成 78%</p>
  <div class="expand-hero">
    <span class="num">7,842</span>
    <span class="unit">步</span>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">最近 7 天</div>
    <div class="expand-chart-card">
      <svg class="expand-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="grid-line" x1="6" y1="25" x2="294" y2="25"/>
        <line class="grid-line" x1="6" y1="50" x2="294" y2="50"/>
        <line class="grid-line" x1="6" y1="75" x2="294" y2="75"/>
        <path fill="url(#heartGrad)" d="M8,70 L56,40 L104,52 L152,30 L200,55 L248,45 L292,50 L292,92 L8,92 Z"/>
        <path fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M8,70 L56,40 L104,52 L152,30 L200,55 L248,45 L292,50"/>
      </svg>
    </div>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">关键数据</div>
    <div class="expand-metric-grid">
      <div class="expand-metric-cell"><div class="lbl">距离</div><div class="val">5.6<small>公里</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">活跃时间</div><div class="val">1.2<small>小时</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">平均配速</div><div class="val">8'42"<small>/公里</small></div></div>
      <div class="expand-metric-cell"><div class="lbl">爬升</div><div class="val">64<small>米</small></div></div>
    </div>
  </div>
  <p class="expand-desc">你已经连续 6 天达成 5,000 步以上。保持这个节奏，本周末就能完成周目标。</p>
</template>
