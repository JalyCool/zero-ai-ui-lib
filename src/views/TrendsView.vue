<script setup>
import { computed, ref } from 'vue'
import {
  UiBarChart, UiButton, UiCalendar, UiCard, UiCardGroup, UiCarousel, UiCol,
  UiGauge, UiGaugeSlider, UiGrid, UiHeatmap, UiLineChart, UiPagerDots,
  UiProgress, UiRangeDatePicker, UiRingProgress, UiRingSlider, UiRow,
  UiSegmented, UiSlider, UiSparkline, UiSplitter, UiStepFlow, UiTooltip,
  UiTooltipGroup, UiVirtualList, UiWheelDatePicker
} from '../lib'

/* ============================================================
   趋势 —— 图表与数据展示的全家桶
   ------------------------------------------------------------
   这一页专门承接「看数��」的组件：折线 / 柱状 / 环形 / 仪表 / 环形滑块 /
   迷你图 / 热力图 / 轮播 / 分隔条 / 步骤流 / 虚拟列表 / 日历 / 滚轮日期。
   每一屏都用真实数据，并且能交互（滑块真的能拖，步骤真的能走）。
   ============================================================ */

const range = ref({ start: '', end: '' })
const granularity = ref('week')
const granularityOptions = [
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' }
]

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
const stepData = [7842, 10230, 6420, 11890, 9650, 13200, 4210]
const sleepData = [7.2, 6.5, 8.1, 7.8, 6.9, 8.4, 7.5]
const hrData = [58, 62, 60, 66, 72, 68, 74, 70, 64, 61, 63, 59]
const hrLabels = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17']

/* 热力图：7 天 × 12 周 */
const heatValues = Array.from({ length: 84 }, (_, i) => {
  const seed = (i * 37 + 11) % 13
  return Math.max(0, Math.min(100, 30 + seed * 5))
})

/* 虚拟列表：大量条目，验证定高虚拟滚动 */
const manyItems = Array.from({ length: 2000 }, (_, i) => ({
  id: i,
  name: `第 ${i + 1} 条记录`,
  value: (i * 7) % 100
}))

/* 卡片组：画廊形态 */
const galleryItems = [
  { title: '周一', value: '7,842 步', desc: '目标完成 78%' },
  { title: '周二', value: '10,230 步', desc: '超额完成' },
  { title: '周三', value: '6,420 步', desc: '目标完成 64%' },
  { title: '周四', value: '11,890 步', desc: '超额完成' }
]

/* 步骤流：恢复流程 */
const stepIndex = ref(1)
const stepItems = [
  { title: '导入数据', desc: '从健康 App 读取最近 30 天' },
  { title: '对齐时间', desc: '统一到本地时区' },
  { title: '计算指标', desc: '步数、睡眠、心率区间' },
  { title: '完成', desc: '可以开始查看了' }
]

/* 环形 / 仪表滑块 */
const ringValue = ref(68)
const gaugeValue = ref(42)

/* 分隔条：左右两栏比例 */
const split = ref(0.32)

/* 轮播 */
const carouselIndex = ref(0)

/* 提示词组 */
const tipItems = [
  { value: 'steps', label: '步数', description: '今天走了多少' },
  { value: 'sleep', label: '睡眠', description: '昨晚睡了多久' },
  { value: 'hr', label: '心率', description: '静息与活动心率' }
]

const selectedMetric = ref('steps')

const metricData = computed(() => {
  if (selectedMetric.value === 'sleep') return { labels: weekLabels, data: sleepData, unit: '小时' }
  if (selectedMetric.value === 'hr') return { labels: hrLabels, data: hrData, unit: 'bpm' }
  return { labels: weekLabels, data: stepData, unit: '步' }
})

const calendarEvents = {
  '2026-03-02': [{ title: '晨跑 5.2km' }],
  '2026-03-05': [{ title: '力量训练' }],
  '2026-03-09': [{ title: '游泳 40 分钟' }],
  '2026-03-14': [{ title: '骑行 18km' }],
  '2026-03-18': [{ title: '徒步' }]
}

const wheelDate = ref('2026-03-18')

/* 虚拟列表的行模板 */
function rowStyle(index) {
  return {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 14px',
    borderBottom: '1px solid var(--outline-variant)'
  }
}
</script>

<template>
  <section class="view trends-view" data-view="trends">
    <!-- 时间范围与粒度 -->
    <UiCard>
      <div class="trends-view__filters">
        <UiSegmented v-model="granularity" :options="granularityOptions" />
        <UiRangeDatePicker v-model="range" />
        <UiWheelDatePicker v-model="wheelDate" />
      </div>
    </UiCard>

    <!-- 指标切换 + 主图 -->
    <UiCard title="指标总览" description="点下面的小标签切换指标">
      <UiTooltipGroup v-model="selectedMetric" :items="tipItems" />

      <UiLineChart
        :data="metricData.data"
        :labels="metricData.labels"
        :unit="metricData.unit"
        :view-box-height="140"
        aria-label="趋势折线"
      />

      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiSparkline :values="stepData" />
        </UiCol>
        <UiCol :span="8">
          <UiBarChart :data="sleepData" unit="小时" :highlight="8.4" />
        </UiCol>
        <UiCol :span="8">
          <UiProgress :value="78" label="目标完成度" />
        </UiCol>
      </UiRow>
    </UiCard>

    <!-- 环形 / 仪表 / 滑块族 -->
    <UiCard title="环与表" description="三个都能拖">
      <UiGrid :min="150" :gap="16">
        <div class="trends-view__gauge">
          <UiRingProgress :value="78" label="步数目标" />
          <UiSlider v-model="ringValue" :min="0" :max="100" />
        </div>

        <div class="trends-view__gauge">
          <UiRingSlider v-model="ringValue" :size="140" />
        </div>

        <div class="trends-view__gauge">
          <UiGauge :value="gaugeValue" label="恢复指数" />
          <UiGaugeSlider v-model="gaugeValue" />
        </div>
      </UiGrid>
    </UiCard>

    <!-- 热力图 + 卡片组 -->
    <UiCard title="活跃热力" description="最近 12 周">
      <UiHeatmap :values="heatValues" :columns="7" />

      <UiCardGroup
        :items="galleryItems"
        variant="gallery"
        :autoplay="false"
        class="trends-view__gallery"
      />
    </UiCard>

    <!-- 分隔条：左边列表，右边详情 -->
    <UiCard title="分栏" description="拖中间的手柄">
      <UiSplitter v-model="split" :min="0.2" :max="0.8" :snap-count="4">
        <template #first>
          <div class="trends-view__pane">
            <UiTooltip content="这一栏可以拖动比例">
              <UiButton variant="tonal" size="sm">提示</UiButton>
            </UiTooltip>
            <p>左侧内容区</p>
          </div>
        </template>
        <template #second>
          <div class="trends-view__pane">
            <p>右侧内容区</p>
            <UiCalendar :events="calendarEvents" view="month" />
          </div>
        </template>
      </UiSplitter>
    </UiCard>

    <!-- 步骤流 + 轮播 -->
    <UiCard title="导入流程" description="点下一步真的能走">
      <UiStepFlow v-model="stepIndex" :steps="stepItems" orientation="horizontal" />

      <UiCarousel
        :items="galleryItems"
        v-model="carouselIndex"
        :height="160"
        loop-mode="infinite"
      />
      <UiPagerDots :total="galleryItems.length" v-model="carouselIndex" clickable />
    </UiCard>

    <!-- 虚拟列表：2000 条 -->
    <UiCard title="全部记录" description="2000 条，虚拟滚动">
      <UiVirtualList
        :items="manyItems"
        :item-height="48"
        :height="240"
        selection="single"
      >
        <template #default="{ item }">
          <div :style="rowStyle(item.id)">
            <span style="min-width: 120px">{{ item.name }}</span>
            <UiProgress :value="item.value" :show-value="false" />
            <span style="margin-left: auto; font-variant-numeric: tabular-nums">{{ item.value }}</span>
          </div>
        </template>
      </UiVirtualList>
    </UiCard>
  </section>
</template>

<style scoped>
.trends-view { gap: var(--space-gap); }

.trends-view__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.trends-view__gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.trends-view__gallery { margin-top: 14px; }

.trends-view__pane {
  padding: 12px;
  height: 100%;
  overflow: auto;
}
.trends-view__pane p { margin: 6px 0; font-size: var(--fs-small); color: var(--on-surface-variant); }
</style>