<script setup>
import { onMounted, ref } from 'vue'
import {
  UiAccordion, UiAlert, UiAvatar, UiBadge, UiBarChart, UiBottomSheet, UiButton,
  UiCheckbox, UiChip, UiCodeEditor, UiDataTable, UiDatePicker, UiEmptyState,
  UiFileDropzone, UiFloatingMenu, UiGauge, UiGaugeSlider, UiHeatmap, UiImageViewer,
  UiInput, UiKeyValueEditor, UiLineChart, UiModal, UiMorphPanel, UiProgress, UiRadioGroup,
  UiRangeDatePicker, UiRangeSlider, UiRangeTimePicker, UiRating, UiRingProgress,
  UiRingSlider, UiSchemaForm, UiSearchField, UiSegmented, UiSelect, UiSkeleton,
  UiSlider, UiSparkline, UiSpinner, UiStepper, UiSwitch, UiTagInput,
  UiTerminalOutput, UiTextarea, UiTimePicker, UiToastHost, UiToolMenu, UiTooltip,
  UiTreeView, UiVirtualList, UiWheelDatePicker
} from '../components/ui'
import { confirmDialog } from '../lib'

/* ============================================================
   组件库示例 · 重写版
   布局：顶部粘性分区导航；每个分区一张自适应网格，
   网格里一格一个组件（标签 / 演示 / 一句话说明），
   窄屏自动单列，宽屏自动多列，不手写行列。
   ============================================================ */

const sections = [
  { id: 'sec-actions', label: '操作' },
  { id: 'sec-forms', label: '表单' },
  { id: 'sec-sliders', label: '滑轨' },
  { id: 'sec-pickers', label: '日期时间' },
  { id: 'sec-dev', label: '工程' },
  { id: 'sec-viz', label: '可视化' },
  { id: 'sec-overlay', label: '浮层反馈' }
]

function jump(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------- 操作 ---------- */
const notifyOn = ref(true)
const checkCloud = ref(true)
const checkInsight = ref(false)
const waterCups = ref(5)
const rating = ref(4)
const chipOptions = ['全部', '步行', '跑步', '睡眠']
const activeChip = ref('步行')
const plan = ref('pro')
const planOptions = [
  { label: '免费版', value: 'free' },
  { label: '专业版', value: 'pro' },
  { label: '团队版', value: 'team' }
]

/* ---------- 形变面板 ---------- */
const panelMode = ref('filter')
const panelQuery = ref('')
const panelRange = ref([18, 30])

/* ---------- 表单 ---------- */
const nickname = ref('Alex')
const email = ref('alex@')
const note = ref('')
const sport = ref('walk')
const sportOptions = [
  { label: '步行', value: 'walk' },
  { label: '跑步', value: 'run' },
  { label: '骑行', value: 'ride' }
]
const frequency = ref('daily')
const frequencyOptions = [
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' }
]
const tags = ref(['vue', 'vite'])
const headers = ref([{ key: 'Authorization', value: 'Bearer ...' }])

/* ---------- 滑轨 ---------- */
const percent = ref(42)
const percentInfo = ref('')
function onSliderSnap({ index, value }) {
  percentInfo.value = '吸附到第 ' + (index + 1) + ' 档（' + value + '）'
}
const temp = ref(36.6)
const rangeGoal = ref([18, 30])
const ringValue = ref(64)
const gaugeValue = ref(72)

/* ---------- 日期时间 ---------- */
const visitDate = ref('')
const visitTime = ref('09:30')
const timePresets = ['07:00', '09:30', '12:00', '18:00']
const timePrecision = ref('m')
const timePrecisionOptions = [
  { label: '时', value: 'h' },
  { label: '时分', value: 'm' },
  { label: '时分秒', value: 's' }
]
const visitRange = ref({ start: '', end: '' })
const wheelDate = ref('')
const visitRangeTime = ref({ start: '09:00', end: '18:00' })
const precision = ref('s')
const precisionOptions = [
  { label: '时', value: 'h' },
  { label: '分', value: 'm' },
  { label: '秒', value: 's' }
]
/* ---------- 工程 ---------- */
const code = ref('{\n  "name": "demo",\n  "count": 3,\n  "on": true\n}')
const terminal = ref(
  '\x1b[36m$ npm run build:lib\x1b[0m\n' +
  'building for production...\n' +
  '\x1b[32m\u2713\x1b[0m 105 modules transformed.\n' +
  '\x1b[33mwarn:\x1b[0m chunk size warning in 2 files\n' +
  '\x1b[31mERROR\x1b[0m simulated error line for color check\n' +
  '\x1b[1mbold line\x1b[0m with \x1b[4munderline\x1b[0m tail')
const schema = {
  type: 'object',
  properties: {
    query: { type: 'string', title: '检索词', description: '支持自然语言' },
    topK: { type: 'integer', title: '返回条数', minimum: 1, default: 5 },
    debug: { type: 'boolean', title: '调试模式' },
    mode: { type: 'string', enum: ['fast', 'deep'] },
    tags: { type: 'array', title: '标签过滤', items: { type: 'string' } }
  },
  required: ['query']
}
const schemaValue = ref({})
const tableColumns = [
  { key: 'name', label: '包名', sortable: true },
  { key: 'version', label: '版本', sortable: true },
  { key: 'size', label: '体积 (kB)', sortable: true },
  { key: 'ok', label: '构建' }
]
const tableRows = [
  { name: 'zero-ai-ui-lib', version: '0.1.1', size: 241.4, ok: true },
  { name: 'vue', version: '3.5.44', size: 112.3, ok: true },
  { name: 'vite', version: '6.4.5', size: 88.1, ok: false }
]
const tree = [
  { label: 'src', kind: 'folder', value: 'src', children: [
    { label: 'core', kind: 'folder', value: 'src/core', children: [
      { label: 'duration.js', value: 'duration.js' },
      { label: 'highlight.js', value: 'highlight.js' },
      { label: 'ansi.js', value: 'ansi.js' }
    ] },
    { label: 'styles', kind: 'folder', value: 'src/styles', children: [
      { label: 'tokens.css', value: 'tokens.css' },
      { label: 'ui.css', value: 'ui.css' }
    ] },
    { label: 'AGENTS.md', kind: 'md', value: 'readme' }
  ] }
]
const treePick = ref('duration.js')
const virtualItems = ref(Array.from({ length: 600 }, (_, i) => ({ label: '会话消息 #' + (i + 1) })))
const virtualSelected = ref([])
const dropped = ref([])
const search = ref('')
const viewer = ref(false)
const viewerSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7e2ff"/><stop offset="1" stop-color="#3f5f90"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="180" cy="140" r="60" fill="#faf9fd" opacity=".9"/><path d="M60 300 L260 180 L420 260 L600 140 L600 360 L60 360 Z" fill="#3f5f90" opacity=".55"/></svg>')

function onDropFiles(files) {
  dropped.value = files.map(f => f.name)
  toast.value?.success('收到 ' + files.length + ' 个文件（演示）')
}

/* ---------- 可视化 ---------- */
const week = [18, 26, 22, 34, 28, 40, 31]
const heat = Array.from({ length: 42 }, (_, i) => Math.round(Math.abs(Math.sin(i * 0.7) * 3 + Math.cos(i * 0.3) * 1.2)))

/* ---------- 浮层反馈 ---------- */
const toast = ref(null)
const modalOpen = ref(false)
const bottomSheetOpen = ref(false)
const sheetNote = ref('')
const alertOpen = ref(true)
const accordionA = ref(true)
const accordionB = ref(false)
const toolChoice = ref('')
const toolItems = [
  { value: 'copy', label: '复制', description: '复制到剪贴板' },
  { value: 'export', label: '导出 JSON' },
  { value: 'remove', label: '删除', tone: 'danger' }
]
const floatChoice = ref('copy')
const floatItems = [
  { value: 'copy', label: '复制' },
  { value: 'move', label: '移动到…' },
  { value: 'pin', label: '固定到顶部' }
]

function onToolSelect(item) {
  toolChoice.value = item.label
  toast.value?.show('工具：' + item.label, 'info')
}

function showToast(tone) {
  const copy = { success: '已保存到活动记录', danger: '保存失败，请重试', warning: '今天还没有喝水记录', info: '同步已完成' }
  toast.value?.show(copy[tone] || '操作完成', tone)
}

async function askDemo() {
  const ok = await confirmDialog({
    title: '删除示例文件？',
    message: '库级 confirmDialog 替代 window.confirm：样式与库一致，Esc 取消、Enter 确认。',
    detail: 'demo/config.json',
    danger: true,
    confirmText: '删除'
  })
  toast.value?.show(ok ? '已确认删除（演示）' : '已取消', ok ? 'danger' : 'info')
}

onMounted(() => showToast('info'))
</script>

<template>
  <section class="view active lib" data-view="components">
    <div class="lib-hero">
      <h2 class="lib-hero__title">组件库</h2>
      <p class="lib-hero__desc">一套令牌、一套弹簧、一套形变语言。7 个分区、54 个组件，窄屏单列、宽屏自动多列。</p>
    </div>

    <nav class="lib-nav" aria-label="组件分区">
        <button
          v-for="tab in sections"
          :key="tab.id"
          type="button"
          class="lib-nav__item"
          @click="jump(tab.id)"
        >{{ tab.label }}</button>
    </nav>

    <!-- 操作 -->
    <section :id="sections[0].id" class="lib-sec">
      <h3 class="lib-sec__title">操作与选择</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">按钮变体 <small>UiButton</small></span>
          <div class="lib-cell__stage">
            <UiButton variant="primary">主要</UiButton>
            <UiButton variant="tonal">填充</UiButton>
            <UiButton variant="outline">描边</UiButton>
            <UiButton variant="text">文本</UiButton>
            <UiButton variant="danger">危险</UiButton>
          </div>
          <span class="lib-cell__note">按下必收缩 scale(.97)，松手走 feedback 弹簧。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">分段 / 步进 / 评分</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="frequency" :options="frequencyOptions" layout="one-line" label="提醒频率" />
            <UiStepper v-model="waterCups" label="喝水" unit="杯" :min="0" :max="12" />
            <UiRating v-model="rating" />
          </div>
          <span class="lib-cell__note">数字变化统一走滚动动效，越界带碰壁回弹。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">形变菜单 <small>Floating / Tool</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiFloatingMenu v-model="floatChoice" :items="floatItems" />
            <UiToolMenu :items="toolItems" label="更多操作" @select="onToolSelect" />
            <span class="lib-muted">当前工具项：{{ toolChoice || '未选择' }}</span>
          </div>
          <span class="lib-cell__note">按钮原地长成面板；收起途中可打断。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">芯片 / 徽标 / 开关 / 复选</span>
          <div class="lib-cell__stage">
            <UiChip v-for="c in chipOptions" :key="c" :selected="activeChip === c" @click="activeChip = c">{{ c }}</UiChip>
            <UiBadge tone="success">已同步</UiBadge>
            <UiBadge tone="warning">3 项待办</UiBadge>
            <UiSwitch v-model="notifyOn" label="通知" />
            <UiCheckbox v-model="checkCloud" label="云端同步" />
            <UiCheckbox v-model="checkInsight" label="周报洞察" />
          </div>
        </div>
      </div>
    </section>

    <!-- 表单 -->
    <section :id="sections[1].id" class="lib-sec">
      <h3 class="lib-sec__title">表单</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">通用形变面板 <small>UiMorphPanel</small></span>
          <div class="lib-cell__stage">
            <UiMorphPanel label="筛选条件">
              <template #trigger>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 5h16M7 12h10M10 19h4" /></svg>
                筛选条件
              </template>
              <template #default="{ close }">
                <div class="lib-cell__stage lib-cell__stage--col" style="width: min(280px, 72vw)">
                  <UiSegmented v-model="panelMode" layout="one-line" label="模式" :options="[{ label: '关键词', value: 'filter' }, { label: '区间', value: 'range' }]" />
                  <UiInput v-if="panelMode === 'filter'" v-model="panelQuery" placeholder="输入关键词" />
                  <UiRangeSlider v-else v-model="panelRange" :min="0" :max="60" />
                  <UiButton size="sm" block @click="close">完成</UiButton>
                </div>
              </template>
            </UiMorphPanel>
          </div>
          <span class="lib-cell__note">按钮 ⇄ 任意组件的泛用形变：外壳只动几何，内容从模糊中浮现，点外部 / Esc 收起。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">输入三段式 <small>label + 控件 + hint/error</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiInput v-model="nickname" label="昵称" hint="展示在个人主页" />
            <UiInput v-model="email" label="邮箱" type="email" :error="email.includes('@') ? '' : '缺少 @ 符号'" />
            <UiTextarea v-model="note" label="备注" placeholder="今天的感觉…" :rows="3" />
          </div>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">选择 / 单选</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSelect v-model="sport" label="运动类型" :options="sportOptions" />
            <span class="lib-cell__note">订阅方案</span>
            <UiRadioGroup v-model="plan" :options="planOptions" />
          </div>
          <span class="lib-cell__note">下拉展开时内容平移到选中项再被列表接手。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">标签输入 / 键值对</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiTagInput v-model="tags" label="标签" hint="回车 / 逗号生成 chip，退格删末尾" />
            <UiKeyValueEditor v-model="headers" label="请求头" />
          </div>
        </div>
      </div>
    </section>

    <!-- 滑轨 -->
    <section :id="sections[2].id" class="lib-sec">
      <h3 class="lib-sec__title">滑轨与旋钮</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">带刻度滑轨 <small>show-scale + 气泡</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSlider v-model="temp" label="目标体温" unit="°C" :min="35" :max="42" :step="0.1" :precision="1" show-scale :major-ticks="7" :minor-ticks="1" show-bubble />
            <UiSlider v-model="percent" label="吸附档" :stops="[0, 20, 40, 60, 80, 100]" show-bubble @snap="onSliderSnap" />
            <span class="lib-muted">{{ percentInfo || '拖动后松手，按速度投射吸附最近档' }}</span>
          </div>
          <span class="lib-cell__note">刻度线在轨道上方、探入轨道 3px；小刻度短、大刻度长，数值只在大刻度处。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">范围滑轨</span>
          <div class="lib-cell__stage">
            <UiRangeSlider v-model="rangeGoal" label="目标区间" unit=" 分钟" :min="0" :max="60" :step="1" />
          </div>
          <span class="lib-cell__note">点轨道移动更近的把手，等距默认移左侧；两把手至少间隔一个步进。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">环形 / 仪表盘滑轨</span>
          <div class="lib-cell__stage">
            <UiRingSlider v-model="ringValue" label="完成度" unit="%" :size="128" />
            <UiGaugeSlider v-model="gaugeValue" label="睡眠压力" show-scale />
          </div>
        </div>
      </div>
    </section>

    <!-- 日期时间 -->
    <section :id="sections[3].id" class="lib-sec">
      <h3 class="lib-sec__title">日期与时间</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">日历 / 时间滚轮</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiDatePicker v-model="visitDate" label="回访日期" />
            <UiSegmented v-model="timePrecision" layout="one-line" label="时间精度" :options="timePrecisionOptions" />
            <UiTimePicker v-model="visitTime" label="回访时间" :precision="timePrecision" :presets="timePresets" />
          </div>
          <span class="lib-cell__note">±3 天显示称呼；滚轮高亮块固定在中间，移动的是数字层。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">范围日期 / 波轮日期</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiRangeDatePicker v-model="visitRange" label="回访区间" />
            <UiWheelDatePicker v-model="wheelDate" label="出生日期" />
          </div>
          <span class="lib-cell__note">范围日期支持「今天 / 近7天 / 近30天」快捷预设。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">范围时间 <small>时长在箭头上方</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="precision" layout="one-line" label="时长精度" :options="precisionOptions" />
            <UiRangeTimePicker v-model="visitRangeTime" :precision="precision" />
          </div>
          <span class="lib-cell__note">60 分钟 → 1h；63 分 3 秒 → 1h03m03s；整串首位 0 隐去。</span>
        </div>
      </div>
    </section>

    <!-- 工程 -->
    <section :id="sections[4].id" class="lib-sec">
      <h3 class="lib-sec__title">工程控件</h3>
      <div class="lib-cells lib-cells--wide">
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">代码编辑器 <small>UiCodeEditor</small></span>
          <UiCodeEditor v-model="code" language="json" label="配置 JSON" :lines="7" format-json hint="Tab 缩进 / 失焦自动格式化" />
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">终端输出 <small>ANSI + 跟随滚动</small></span>
          <UiTerminalOutput :text="terminal" :height="150" />
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">拖拽上传 / 搜索</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiFileDropzone label="拖入附件，或点击选择" hint="演示：accept / 大小过滤" @files="onDropFiles" />
            <span v-if="dropped.length" class="lib-muted">已接收：{{ dropped.join('、') }}</span>
            <UiSearchField v-model="search" placeholder="搜索会话…" @search="toast?.show('执行搜索：' + (search || '空'), 'info')" />
            <span class="lib-muted">当前关键词：{{ search || '空' }}</span>
          </div>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">数据表格 <small>点表头排序</small></span>
          <UiDataTable :columns="tableColumns" :rows="tableRows" striped clickable @row-click="row => toast?.show('点击行：' + row.name, 'info')" />
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">文件树</span>
          <UiTreeView :nodes="tree" v-model="treePick" :default-open="['src']" />
          <span class="lib-muted">选中：{{ treePick }}</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">虚拟列表 <small>滑动多选</small></span>
          <UiVirtualList :items="virtualItems" :item-height="40" :height="180" v-model="virtualSelected" swipe-select>
            <template #default="{ item, selected }">
              <span :class="{ 'lib-cell__on': selected }">{{ item.label }}{{ selected ? ' ✓' : '' }}</span>
            </template>
          </UiVirtualList>
          <span class="lib-muted">600 行只渲染窗口内十几行；横向拖过 44px 切换选中。</span>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">Schema 表单生成器 <small>UiSchemaForm</small></span>
          <UiSchemaForm :schema="schema" v-model="schemaValue" @submit="toast?.success('已提交：' + JSON.stringify(schemaValue))" />
        </div>
      </div>
    </section>

    <!-- 可视化 -->
    <section :id="sections[5].id" class="lib-sec">
      <h3 class="lib-sec__title">数据与可视化</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">迷你图 <small>Sparkline / Progress</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSparkline :values="week" />
            <UiBarChart :data="week" :labels="['一', '二', '三', '四', '五', '六', '日']" :height="88" />
            <UiProgress :value="64" label="周目标" />
          </div>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">环形 / 仪表盘</span>
          <div class="lib-cell__stage">
            <UiRingProgress :value="ringValue" label="达成" :size="96" />
            <UiGauge :value="gaugeValue" label="睡眠压力" />
          </div>
          <span class="lib-cell__note">条形与数字入场都走同一套弹簧。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">折线 / 热力</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiLineChart :data="week" :labels="['一', '二', '三', '四', '五', '六', '日']" />
            <UiHeatmap :values="heat" :weeks="6" />
          </div>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">骨架 / 加载 / 头像</span>
          <div class="lib-cell__stage">
            <UiSkeleton width="120px" height="14px" />
            <UiSkeleton width="80px" height="14px" />
            <UiSpinner :size="20" />
            <UiAvatar name="Alex" />
          </div>
        </div>
      </div>
    </section>

    <!-- 浮层与反馈 -->
    <section :id="sections[6].id" class="lib-sec">
      <h3 class="lib-sec__title">浮层与反馈</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">Toast 语义 API <small>success / error / warning / info</small></span>
          <div class="lib-cell__stage">
            <UiButton size="sm" variant="tonal" @click="showToast('success')">成功</UiButton>
            <UiButton size="sm" variant="tonal" @click="showToast('danger')">失败</UiButton>
            <UiButton size="sm" variant="tonal" @click="showToast('warning')">提醒</UiButton>
            <UiButton size="sm" variant="tonal" @click="showToast('info')">信息</UiButton>
          </div>
          <span class="lib-cell__note">超出 3 条自动排队，前一条退场后顶上。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">确认与图片</span>
          <div class="lib-cell__stage">
            <UiButton variant="danger" @click="askDemo">confirmDialog 演示</UiButton>
            <UiButton variant="outline" @click="viewer = true">查看图片</UiButton>
          </div>
          <span class="lib-cell__note">Esc 取消 / Enter 确认；查看器支持缩放、旋转、下载。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">弹层三件套</span>
          <div class="lib-cell__stage">
            <UiButton variant="outline" @click="modalOpen = true">对话框</UiButton>
            <UiButton variant="outline" @click="bottomSheetOpen = true">底部面板</UiButton>
          </div>
          <span class="lib-cell__note">遮罩只压暗 16%，同时模糊 0→5px 连续过渡。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">提示 / 折叠 / 空状态</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiTooltip text="悬停看提示"><span class="lib-link">什么是周目标？</span></UiTooltip>
            <UiAlert v-if="alertOpen" tone="warning" title="连续 2 天未记录">补一条记录即可恢复连胜。</UiAlert>
            <UiAccordion v-model="accordionA" title="数据来源"><span class="lib-muted">手环 + 手机传感器</span></UiAccordion>
            <UiAccordion v-model="accordionB" title="同步频率"><span class="lib-muted">每 15 分钟</span></UiAccordion>
            <UiEmptyState title="还没有周报" description="记录 7 天后自动生成">
              <template #action><UiButton size="sm" @click="alertOpen = !alertOpen">看看提醒</UiButton></template>
            </UiEmptyState>
          </div>
        </div>
      </div>
    </section>

    <UiModal v-model="modalOpen" title="编辑目标">
      <UiInput label="目标名称" model-value="每天 8 杯水" />
      <template #footer="{ close }">
        <UiButton variant="text" @click="close">取消</UiButton>
        <UiButton @click="close; showToast('success')">保存</UiButton>
      </template>
    </UiModal>

    <UiBottomSheet v-model="bottomSheetOpen" title="快速记录">
      <UiTextarea v-model="sheetNote" label="备注" :rows="2" placeholder="说一句今天的情况" />
      <template #footer>
        <UiButton block @click="bottomSheetOpen = false; showToast('success')">保存</UiButton>
      </template>
    </UiBottomSheet>

    <UiImageViewer v-model="viewer" :src="viewerSrc" alt="示例图片" />
    <UiToastHost ref="toast" />
  </section>
</template>

<style scoped>
.lib { gap: 18px; }

/* ---------- 顶部 ---------- */
.lib-hero__title { margin: 4px 0 0; font-size: var(--fs-h1); font-weight: var(--w-heading); letter-spacing: -.01em; }
.lib-hero__desc { margin: 6px 0 0; color: var(--on-surface-variant); font-size: var(--fs-small); }
.lib-nav {
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  gap: 6px;
  padding: 8px 0;
  margin: 0 -2px;
  background: color-mix(in oklab, var(--background) 92%, transparent);
  backdrop-filter: blur(6px);
  overflow-x: auto;
  scrollbar-width: none;
}
.lib-nav::-webkit-scrollbar { display: none; }
.lib-nav__item {
  flex-shrink: 0;
  padding: 6px 13px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.lib-nav__item:hover { background: var(--surface-container-high); color: var(--on-surface); }
.lib-nav__item:active { transform: scale(var(--press-scale)); }

/* ---------- 分区 ---------- */
.lib-sec { scroll-margin-top: 54px; }
.lib-sec__title {
  margin: 0 0 10px;
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
}

/* 单元网格：窄屏单列，宽屏自动多列；一格一组件 */
.lib-cells {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.lib-cells--wide { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
.lib-cell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-card) * var(--radius-scale));
  background: var(--surface-container-low);
  min-width: 0;
}
.lib-cell--span { grid-column: 1 / -1; }
@media (min-width: 900px) {
  .lib-cell--span { grid-column: span 2; }
}
.lib-cell__label {
  color: var(--on-surface);
  font-size: var(--fs-tiny);
  font-weight: var(--w-strong);
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
}
.lib-cell__label small { color: var(--on-surface-variant); font-weight: var(--w-body); font-size: var(--fs-micro); }
.lib-cell__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.lib-cell__stage--col { flex-direction: column; align-items: stretch; }
/* 防护：任何子组件根节点不得越过格子内容宽度 */
.lib-cell > *,
.lib-cell__stage > * {
  max-width: 100%;
  min-width: 0;
}
.lib-cell__note { color: var(--on-surface-variant); font-size: var(--fs-micro); line-height: 1.55; }
.lib-cell__on { color: var(--on-primary-container); font-weight: var(--w-label); }
.lib-muted { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.lib-link { color: var(--primary); text-decoration: underline dotted; cursor: help; font-size: var(--fs-small); }
</style>
