<script setup>
import { computed } from 'vue'
/* ============================================================
   UiChart —— 统一图表入口（bar / line / spark / heat / ring / gauge）
   ------------------------------------------------------------
   以前同一种数据可视化有六个组件、六套 prop 名（data vs values、
   ariaLabel vs label、size 只在环/仪表上有），调用方要先记「哪种图
   叫哪个名字、参数怎么拼」。现在一个组件 + type 决定形态，prop 名
   全族统一：

   · data      —— 序列值（柱 / 线 / 迷你 / 热力都吃它，不再叫 values）
   · labels    —— x 轴标签（柱 / 线）
   · unit      —— 单位后缀；decimals 小数位；highlight 参考线（柱）
   · weeks     —— 热力图周数；columns 每周列数（给了就按它切）
   · size      —— 环 / 仪表的直径
   · stroke    —— 弧宽档位（thin / bold / 具体数值）
   · gridY / viewBoxHeight —— 折线的网格与画布高度

   形态差异由**内部分发**承接：每种图仍是一套自己的 SVG 实现，
   这里只做「按 type 把统一 prop 映射到对应实现」，所以既有图一行
   代码都不用重写，只是收敛成一个对外 API。旧组件文件保留为实现，
   不再单独导出（命名规范：同义的东西只有一个名字）。
   ============================================================ */

import BarChartImpl from './internal/BarChart.vue'
import LineChartImpl from './internal/LineChart.vue'
import SparklineImpl from './internal/Sparkline.vue'
import HeatmapImpl from './internal/Heatmap.vue'
import RingProgressImpl from './internal/RingProgress.vue'
import GaugeImpl from './internal/Gauge.vue'

const props = defineProps({
  /* 形态 */
  type: {
    type: String,
    default: 'line',
    validator: v => ['bar', 'line', 'spark', 'heat', 'ring', 'gauge'].includes(v)
  },
  /* 序列值：柱 / 线 / 迷你 / 热力共用 */
  data: { type: Array, default: () => [] },
  /* x 轴标签（柱 / 线） */
  labels: { type: Array, default: () => [] },
  /* SVG 内渐变 / 裁剪用的稳定 id（柱 / 线） */
  id: { type: String, default: '' },
  /* 柱状图高度（px） */
  height: { type: [String, Number], default: null },
  unit: { type: String, default: '' },
  decimals: { type: Number, default: 1 },
  /* 参考线（柱）：画一条高亮横线标出目标值 */
  highlight: { type: Number, default: null },
  /* 折线画布高度与横向网格线 */
  viewBoxHeight: { type: Number, default: 92 },
  gridY: { type: Array, default: () => [23, 46, 69] },
  /* 热力图：周数；给了 columns 就按「总格数 / columns」推算周数 */
  weeks: { type: Number, default: 12 },
  columns: { type: Number, default: 0 },
  /* 环 / 仪表直径与中心文案 */
  size: { type: [Number, String], default: 116 },
  /* 弧宽档位：thin(10) / bold(12) / 具体数值 */
  stroke: { type: [String, Number], default: 'thin' },
  /* 无障碍标签（柱 / 线 / 迷你 / 热力） */
  ariaLabel: { type: String, default: '' }
})

/* 环的弧宽是数字（px）；对外统一用 thin/bold 档位 */
const STROKE_NUM = { thin: 10, bold: 12 }

const IMPLS = {
  bar: BarChartImpl,
  line: LineChartImpl,
  spark: SparklineImpl,
  heat: HeatmapImpl,
  ring: RingProgressImpl,
  gauge: GaugeImpl
}

const impl = computed(() => IMPLS[props.type])

/* 每种形态实际吃到的 props：未声明的 prop 传下去只会变成 DOM attr，
   所以按形态显式挑。 */
const implProps = computed(() => {
  switch (props.type) {
    case 'bar':
      return {
        id: props.id,
        data: props.data,
        labels: props.labels,
        height: props.height,
        unit: props.unit,
        decimals: props.decimals,
        highlight: props.highlight,
        ariaLabel: props.ariaLabel || '柱状图'
      }
    case 'line':
      return {
        id: props.id,
        data: props.data,
        labels: props.labels,
        viewBoxHeight: props.viewBoxHeight,
        gridY: props.gridY,
        ariaLabel: props.ariaLabel || '趋势曲线'
      }
    case 'spark':
      return {
        values: props.data,
        label: props.ariaLabel || '趋势迷你图'
      }
    case 'heat': {
      const total = props.data.length
      const cols = props.columns > 0 ? props.columns : 7
      const weeks = props.columns > 0
        ? Math.max(1, Math.ceil((total || props.weeks * cols) / cols))
        : props.weeks
      return {
        values: props.data,
        weeks,
        label: props.ariaLabel || '活动热力图'
      }
    }
    case 'ring':
      return {
        value: props.data[0] ?? 0,
        size: Number(props.size),
        stroke: STROKE_NUM[props.stroke] ?? (Number(props.stroke) || 10),
        label: props.ariaLabel || ''
      }
    case 'gauge':
      return {
        value: props.data[0] ?? 0,
        stroke: props.stroke === 'thin' ? 'bold' : props.stroke,
        label: props.ariaLabel || ''
      }
    default:
      return {}
  }
})
</script>

<template>
  <component :is="impl" v-bind="implProps" />
</template>
