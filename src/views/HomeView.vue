<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import ExpandSteps from '../expand/ExpandSteps.vue'
import ExpandHeart from '../expand/ExpandHeart.vue'
import ExpandSleep from '../expand/ExpandSleep.vue'
import ExpandMetric from '../expand/ExpandMetric.vue'
import { UiBadge, UiCard, UiCarousel, UiChart, UiChip } from '../lib'

const router = useRouter()

const heartData = [58, 62, 60, 66, 72, 68, 74, 70, 64, 61, 63, 59]
const heartLabels = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const sleepData = [7.2, 6.5, 8.1, 7.8, 6.9, 8.4, 7.5]

/* 四个指标格：点开是「展开卡片」的详情页 */
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

/* 快捷入口：直接跳到别的页 */
const shortcuts = [
  { key: 'chat', label: '问 Zero', hint: '让它安排行程', icon: '<path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.3-.7L3 21l1.9-5.4A8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z"/>' },
  { key: 'activity', label: '记一笔', hint: '新增运动记录', icon: '<path d="M12 5v14M5 12h14"/>' },
  { key: 'trends', label: '看趋势', hint: '这一周的���化', icon: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>' },
  { key: 'lab', label: '实验室', hint: '组件的真实用例', icon: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>' }
]

/* 今日要点：轮播索引 */
const hlIndex = ref(0)

/* 今日要点：轮播内容 */
const highlights = [
  { title: '连续达标第 12 天', desc: '这周的平均步数比上周高了 8%。' },
  { title: '昨晚睡得不错', desc: '7.4 小时，深睡占比 21%，在正常范围。' },
  { title: '静息心率下降', desc: '62 bpm，比上周同期低 3 bpm。' }
]
</script>

<template>
  <section class="view active" data-view="home">
    <!-- 今日要点：轮播 + 圆点指示 -->
    <UiCard class="home-hero">
      <template #header>
        <div class="home-hero__head">
          <div>
            <span class="home-hero__label">今天</span>
            <h2 class="home-hero__title">今日要点</h2>
          </div>
          <UiBadge tone="success" dot>状态良好</UiBadge>
        </div>
      </template>

      <UiCarousel
        v-model="hlIndex"
        :items="highlights"
        :height="88"
        :autoplay="true"
        :interval="5200"
        loop-mode="cycle"
      >
        <template #default="{ item }">
          <div class="home-highlight">
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </div>
        </template>
      </UiCarousel>
      <!-- 圆点由 Carousel 自带（__bar：箭头 + PagerDots），不要再加一组 -->
    </UiCard>

    <!-- 快捷入口 -->
    <div class="home-shortcuts">
      <button
        v-for="s in shortcuts"
        :key="s.key"
        class="home-shortcut"
        @click="router.push({ name: s.key })"
      >
        <span class="home-shortcut__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="s.icon"></svg>
        </span>
        <span class="home-shortcut__text">
          <b>{{ s.label }}</b>
          <small>{{ s.hint }}</small>
        </span>
      </button>
    </div>

    <!-- 步数：主卡，点开是展开详情 -->
    <RouteExpandCard section="home" card-key="steps" :content="ExpandSteps" feature>
      <div class="steps">
        <UiChart type="ring" :data="[78]" label="今日目标" />
        <div class="steps-info">
          <div class="big">7,842 步</div>
          <div class="sub">目标 10,000 步</div>
          <UiChip variant="tonal" class="steps-pill">比昨天多 12%</UiChip>
        </div>
      </div>
    </RouteExpandCard>

    <!-- 心率 -->
    <RouteExpandCard section="home" card-key="heart" :content="ExpandHeart">
      <div class="card-title">
        <span>心率</span>
        <span class="muted">今天 · 静息 62 bpm</span>
      </div>
      <UiChart
        type="line"
        id="heartChart"
        :data="heartData"
        :labels="heartLabels"
        :view-box-height="92"
        :grid-y="[23, 46, 69]"
        aria-label="今日心率曲线"
      />
    </RouteExpandCard>

    <!-- 睡眠 -->
    <RouteExpandCard section="home" card-key="sleep" :content="ExpandSleep">
      <div class="card-title"><span>睡眠</span><span class="muted">平均 7.4 小时</span></div>
      <UiChart type="bar" :data="sleepData" unit="小时" :highlight="7.8" />
    </RouteExpandCard>

    <!-- 四个指标格 -->
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

<style scoped>
.home-hero__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.home-hero__label {
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  letter-spacing: .04em;
}
.home-hero__title {
  margin: 2px 0 0;
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
}

.home-highlight {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  height: 100%;
  padding: 0 4px;
}
.home-highlight strong { font-size: var(--fs-body); }
.home-highlight span { font-size: var(--fs-small); color: var(--on-surface-variant); }

.home-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.home-shortcut {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: calc(var(--r-16) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--t-pop), transform var(--t-pop);
}
.home-shortcut:active { transform: scale(var(--press-scale)); }
@media (hover: hover) {
  .home-shortcut:hover { background: var(--surface-container); }
}

.home-shortcut__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.home-shortcut__icon svg { width: 17px; height: 17px; }

.home-shortcut__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.home-shortcut__text b { font-size: var(--fs-small); font-weight: var(--w-label); }
.home-shortcut__text small {
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>