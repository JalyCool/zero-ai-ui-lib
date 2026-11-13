<script setup>
import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import { UiBarChart, UiLineChart, UiRingProgress } from '../components/ui'
import ExpandSteps from '../expand/ExpandSteps.vue'
import ExpandHeart from '../expand/ExpandHeart.vue'
import ExpandSleep from '../expand/ExpandSleep.vue'
import ExpandMetric from '../expand/ExpandMetric.vue'

const heartData = [58, 62, 60, 66, 72, 68, 74, 70, 64, 61, 63, 59]
const heartLabels = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const sleepData = [7.2, 6.5, 8.1, 7.8, 6.9, 8.4, 7.5]

const metrics = [
  {
    key: 'oxygen',
    label: '血氧',
    value: '98',
    small: '%',
    trend: '正常范围',
    warn: false,
    content: {
      title: '血氧', num: '98', unit: '%', trend: '处于健康范围',
      desc: '全天血氧饱和度保持在 96–99% 之间，没有明显波动。'
    }
  },
  {
    key: 'energy',
    label: '消耗',
    value: '412',
    small: 'kcal',
    trend: '活跃 48 分钟',
    warn: false,
    content: {
      title: '消耗', num: '412', unit: 'kcal', trend: '活跃 48 分钟',
      desc: '今天的活动消耗主要来自晨间快走和中午的力量训练。'
    }
  },
  {
    key: 'stand',
    label: '站立',
    value: '9',
    small: '/ 12 小时',
    trend: '还差 3 小时',
    warn: true,
    content: {
      title: '站立', num: '9 / 12', unit: '小时', trend: '还差 3 小时',
      desc: '站立提醒已经触发 9 次。傍晚时段活动较少，可以站起来走动 3 分钟。'
    }
  },
  {
    key: 'breath',
    label: '呼吸',
    value: '16',
    small: '次/分',
    trend: '平稳',
    warn: false,
    content: {
      title: '呼吸', num: '16', unit: '次/分', trend: '平稳',
      desc: '呼吸频率处于 12–20 次的正常范围。白天没有异常峰值。'
    }
  }
]
</script>

<template>
  <section class="view active" data-view="home">
    <RouteExpandCard section="home" card-key="steps" :content="ExpandSteps" feature>
      <div class="steps">
        <UiRingProgress :value="78" label="今日目标" />
        <div class="steps-info">
          <div class="big">7,842 步</div>
          <div class="sub">目标 10,000 步</div>
          <span class="ui-chip ui-chip--tonal steps-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14l5-5 5 5"/></svg>
            比昨天多 12%
          </span>
        </div>
      </div>
    </RouteExpandCard>

    <RouteExpandCard section="home" card-key="heart" :content="ExpandHeart">
      <div class="card-title">
        <span>心率</span>
        <span class="muted">今天 · 静息 62 bpm</span>
      </div>
      <UiLineChart
        id="heartChart"
        :data="heartData"
        :labels="heartLabels"
        :view-box-height="92"
        :grid-y="[23, 46, 69]"
        aria-label="今日心率曲线"
      />
    </RouteExpandCard>

    <RouteExpandCard section="home" card-key="sleep" :content="ExpandSleep">
      <div class="card-title"><span>睡眠</span><span class="muted">平均 7.4 小时</span></div>
      <UiBarChart :data="sleepData" unit="小时" :highlight="7.8" />
    </RouteExpandCard>

    <div class="metrics">
      <RouteExpandCard
        v-for="item in metrics"
        :key="item.key"
        tag="div"
        variant="metric"
        section="home"
        :card-key="item.key"
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
