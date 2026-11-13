<script setup>
import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import { UiLineChart } from '../components/ui'
import ExpandMetric from '../expand/ExpandMetric.vue'

const weekData = [7200, 9100, 8400, 10200, 7600, 8800, 8100]
const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const metrics = [
  {
    key: 'avgSleep',
    route: 'trends-avg-sleep',
    label: '平均睡眠',
    value: '7.4',
    small: '小时',
    trend: '连续 5 天达标',
    warn: false,
    content: {
      title: '平均睡眠', num: '7.4', unit: '小时', trend: '连续 5 天达标',
      desc: '本周有五个晚上的睡眠时长超过 7 小时。'
    }
  },
  {
    key: 'restingHr',
    route: 'trends-resting-hr',
    label: '静息心率',
    value: '62',
    small: 'bpm',
    trend: '较上周 -2',
    warn: false,
    content: {
      title: '静息心率', num: '62', unit: 'bpm', trend: '较上周 -2',
      desc: '静息心率的下降通常和睡眠、压力改善相关。'
    }
  }
]
</script>

<template>
  <section class="view active" data-view="trends">
    <div class="view-title">趋势</div>
    <RouteExpandCard
      section="trends"
      card-key="weekSteps"
      route-name="trends-week-steps"
      :content="ExpandMetric"
      :content-props="{
        title: '本周步数', num: '8,120', unit: '步 · 平均', trend: '较上周 +6%',
        desc: '七天中有五天达到了 7,000 步以上。周末略低，可以考虑加入一次户外活动。'
      }"
    >
      <div class="card-title"><span>本周步数</span><span class="muted">平均 8,120</span></div>
      <UiLineChart
        id="weekChart"
        :data="weekData"
        :labels="weekLabels"
        :view-box-height="100"
        :grid-y="[25, 50, 75]"
        aria-label="本周步数曲线"
      />
    </RouteExpandCard>
    <div class="metrics">
      <RouteExpandCard
        v-for="item in metrics"
        :key="item.key"
        tag="div"
        variant="metric"
        section="trends"
        :card-key="item.key"
        :route-name="item.route"
        :content="ExpandMetric"
        :content-props="item.content"
      >
        <div class="label">{{ item.label }}</div>
        <div class="value">{{ item.value }}<small>{{ item.small }}</small></div>
        <div class="trend" :class="item.warn ? 'warn' : 'up'">{{ item.trend }}</div>
      </RouteExpandCard>
    </div>
  </section>
</template>
