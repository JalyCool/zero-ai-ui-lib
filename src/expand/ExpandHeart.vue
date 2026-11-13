<script setup>
import ExpandTopbar from '../components/ExpandTopbar.vue'
</script>

<template>
  <ExpandTopbar crumb="心率" />
  <h1 class="expand-title">心率</h1>
  <p class="expand-subtitle">今天的波动平稳，静息心率 62 bpm</p>
  <div class="expand-hero">
    <span class="num">62</span>
    <span class="unit">bpm · 静息</span>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">今天分时</div>
    <div class="expand-chart-card">
      <svg class="expand-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="grid-line" x1="6" y1="25" x2="294" y2="25"/>
        <line class="grid-line" x1="6" y1="50" x2="294" y2="50"/>
        <line class="grid-line" x1="6" y1="75" x2="294" y2="75"/>
        <path fill="url(#heartGrad)" d="M8,60 L40,55 L72,62 L104,45 L136,38 L168,52 L200,48 L232,58 L264,60 L292,55 L292,92 L8,92 Z"/>
        <path fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M8,60 L40,55 L72,62 L104,45 L136,38 L168,52 L200,48 L232,58 L264,60 L292,55"/>
      </svg>
    </div>
  </div>
  <div class="expand-section">
    <div class="expand-section-title">区间分布</div>
    <div class="timeline">
      <div class="timeline-row"><span class="t">静息</span><span class="lbl">安静状态</span><span class="val">62 bpm</span></div>
      <div class="timeline-row"><span class="t">轻度</span><span class="lbl">日常活动</span><span class="val">78 bpm</span></div>
      <div class="timeline-row"><span class="t">中度</span><span class="lbl">快走 / 爬楼</span><span class="val">112 bpm</span></div>
      <div class="timeline-row"><span class="t">高强度</span><span class="lbl">力量训练峰值</span><span class="val">156 bpm</span></div>
    </div>
  </div>
  <p class="expand-desc">静息心率比上周降低了 2 bpm，是近期睡眠质量改善的常见表现。若无其他不适，继续维持当前节奏即可。</p>
</template>
