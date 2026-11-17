<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  UiAccordion, UiAlert, UiAvatar, UiBadge, UiBarChart, UiBottomSheet, UiButton, UiCard,
  UiCheckbox, UiChip, UiCodeEditor, UiCodeImage, UiDataTable, UiDatePicker, UiEmptyState, UiSideNav,
  MarkdownView, UiLink,
  UiCardGroup, UiCodeSlots, UiFileDropzone, UiFloatingMenu, UiGauge, UiGaugeSlider, UiHeatmap,
  UiAgentAvatar, UiAvatarGroup, UiAvatarTag, UiRotatingText, UiScrubField, UiStatusMark, UiStepFlow, UiSwipeRow,
  UiText, UiTooltipGroup,
  UiInput, UiKeyValueEditor, UiLineChart, UiModal, UiMorphPanel, UiProgress, UiRadioGroup,
  UiRangeDatePicker, UiRangeSlider, UiRangeTimePicker, UiRating, UiRingProgress,
  UiRingSlider, UiSchemaForm, UiSearchField, UiSegmented, UiSelect, UiSkeleton,
  UiSlider, UiSparkline, UiSpinner, UiStepper, UiSwitch, UiTagInput,
  UiTerminalOutput, UiTextarea, UiTimePicker, UiToastHost, UiToolMenu, UiTooltip,
  UiTreeView, UiVirtualList, UiWheelDatePicker,
  UiAutocomplete, UiBreadcrumb, UiCalendar, UiCarousel, UiCol, UiColorPicker,
  UiCommandPalette, UiContextMenu, UiForm, UiFormField,
  UiGrid, UiIcon, UiKbd, UiMarquee, UiNavigationMenu, UiPagination,
  UiPagerDots, UiPopover, UiRow, UiScrollArea, UiSidebar, UiSlideover, UiSplitter,
  UiTimeline, UiTour
} from '../components/ui'
import { confirmDialog, AGENT_SHAPES } from '../lib'
import { useRouter } from 'vue-router'
import supabaseSvg from '../assets/figma/supabase.svg?raw'

/* 产品授权卡（Figma 5:454）里的 ZERO 头像：黑底两只白眼睛的图标脸 */
const zeroFace = '<rect width="24" height="24" rx="12" fill="#111"/><rect x="8.4" y="8.2" width="2.6" height="7.6" rx="1.3" fill="#fff"/><rect x="13" y="8.2" width="2.6" height="7.6" rx="1.3" fill="#fff"/>'

/* Figma 5:454 里的品牌图标：留内部标记，viewBox 由 prop 传 0 0 20 20 */
const supabaseGlyph = supabaseSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const agentShapeList = AGENT_SHAPES
const router = useRouter()
/* 状态机展示：分段切换 8 个状态，看任意状态之间的弹簧过渡 */
const agentState = ref('idle')
const agentGazeOn = ref(false)
const agentGaze = computed(() => (agentGazeOn.value ? 'mouse' : 'none'))
const agentStates = [
  { label: '待机', value: 'idle' },
  { label: '倾听', value: 'listening' },
  { label: '思考', value: 'thinking' },
  { label: '开心', value: 'happy' },
  { label: '困惑', value: 'confused' },
  { label: '惊讶', value: 'surprised' },
  { label: '困', value: 'sleepy' },
  { label: '说话', value: 'speaking' }
]

/* ============================================================
   组件库示例 · 重写版
   布局：顶部粘性分区导航；每个分区一张自适应网格，
   网格里一格一个组件（标签 / 演示 / 一句话说明），
   窄屏自动单列，宽屏自动多列，不手写行列。
   ============================================================ */

const activeSection = ref('')
const sections = [
  { id: 'sec-actions', label: '操作' },
  { id: 'sec-forms', label: '表单' },
  { id: 'sec-sliders', label: '滑轨' },
  { id: 'sec-pickers', label: '日期时间' },
  { id: 'sec-dev', label: '工程' },
  { id: 'sec-viz', label: '可视化' },
  { id: 'sec-overlay', label: '浮层反馈' },
  { id: 'sec-motion', label: '动效手势' }
]
activeSection.value = sections[0].id
/* 调试入口：/?sec=sec-overlay 直接落到对应分区 */
const debugSec = new URLSearchParams(window.location.search).get('sec')
if (debugSec && sections.some(s => s.id === debugSec)) activeSection.value = debugSec
const sectionOptions = sections.map(section => ({ label: section.label, value: section.id }))

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
const ratingHalf = ref(3.5)
const chipOptions = ['全部', '步行', '跑步', '睡眠']
const activeChip = ref('步行')
const plan = ref('pro')
const planOptionsWithDisabled = [
  { label: '免费版（暂不可选）', value: 'free', disabled: true },
  { label: '专业版', value: 'pro' },
  { label: '团队版', value: 'team' }
]
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
const dpPrecision = ref('day')
const dpPrecisionOptions = [
  { label: '日', value: 'day' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' }
]
/* min / max 用相对今天算出来的固定串，避免演示过期 */
const dpMin = (() => { const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().slice(0, 10) })()
const dpMax = (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10) })()
const visitDate2 = ref('')
const workTime = ref('09:30')
const phone = ref('13800138')
const hexColor = ref('#4f6')
const swLeft = ref(true)
const swRight = ref(false)
const swEnd = ref(true)
const swOff = ref(true)
const note = ref('')
const sport = ref('walk')
/* 超长列表：验证面板封顶 + 自动滚到选中项 */
const longOptions = Array.from({ length: 40 }, (_, i) => ({
  label: '选项 ' + String(i + 1).padStart(2, '0'),
  value: 'long-' + (i + 1)
}))
const longPick = ref('long-35')

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
  { label: '时分', value: 'm' },
  { label: '时分秒', value: 's' }
]
const displayPrecision = ref('s')
const displayPrecisionOptions = [
  { label: '整小时', value: 'h' },
  { label: '半小时', value: 'h/2' },
  { label: '整分钟', value: 'm' },
  { label: '半分钟', value: 'm/2' },
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

/* 分组 / 多选 / 列显隐 / 服务端分页 的表格演示 */
const tableColumns2 = [
  { key: 'team', label: '团队', hidden: true },
  { key: 'name', label: '包名', sortable: true },
  { key: 'version', label: '版本', sortable: true },
  { key: 'size', label: '体积 (kB)', sortable: true, align: 'right' }
]
const groupTableRows = [
  { team: '框架', name: 'zero-ai-ui-lib', version: '0.1.1', size: 241.4 },
  { team: '框架', name: 'vue', version: '3.5.44', size: 112.3 },
  { team: '构建', name: 'vite', version: '6.4.5', size: 88.1 },
  { team: '构建', name: 'rollup', version: '4.67.4', size: 96.8 },
  { team: '测试', name: 'vitest', version: '3.2.4', size: 71.2 },
  { team: '测试', name: 'playwright', version: '1.55.0', size: 154.6 }
]
const tablePage = ref(1)
const tableVisible = ref(['name', 'version', 'size'])
const tableSelected = ref([])
const groupedPageRows = computed(() => groupTableRows.slice((tablePage.value - 1) * 2, tablePage.value * 2))
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
const treeFilter = ref('')
const treeMulti = ref(['duration.js'])
function onTreeMove(payload) {
  toast.value?.show('移动：' + payload.from + ' → ' + payload.to, 'info')
}
const virtualItems = ref(Array.from({ length: 600 }, (_, i) => ({ label: '会话消息 #' + (i + 1) })))
const virtualSelected = ref([])
const dropped = ref([])
const search = ref('')
/* ---- 动效 / 手势演示用的状态 ---- */
const rotateIndex = ref(0)
const rotatingPhrases = ['已同步 3 项记录', '今天比昨天多走 1800 步', '连续 7 天达标', '下周目标：每天 8000 步']

const statusStep = ref('none')
/* null = 没有实际进度（转圈）；数字 = 实际进度 0~1 */
const statusProgress = ref(null)
const statusAuto = ref(true)
let statusTimer = 0
let statusTick = 0
let statusRunId = 0

/* 演示用的状态机：none → pending → progress(实际进度) → done →
   progress(没有实际进度，转圈) → failed → 回到 none。
   任意两态都能直接跳（手动按钮），组件里是同一圈描边在变形，所以不闪。 */
const statusSequence = [
  { status: 'none', wait: 600 },
  { status: 'idle', wait: 700 },
  { status: 'progress', wait: 1600, ramp: true },
  { status: 'done', wait: 1000 },
  { status: 'none', wait: 400 },
  { status: 'progress', wait: 1400, indeterminate: true },
  { status: 'done', wait: 800 },
  { status: 'error', wait: 1100 }
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function rampProgress(duration, runId) {
  clearInterval(statusTick)
  statusProgress.value = 0
  const started = Date.now()
  statusTick = setInterval(() => {
    if (runId !== statusRunId) { clearInterval(statusTick); return }
    statusProgress.value = Math.min(1, (Date.now() - started) / duration)
    if (statusProgress.value >= 1) clearInterval(statusTick)
  }, 60)
}

async function playStatus() {
  const runId = ++statusRunId
  while (statusAuto.value && runId === statusRunId) {
    for (const step of statusSequence) {
      if (!statusAuto.value || runId !== statusRunId) return
      statusStep.value = step.status
      clearInterval(statusTick)
      if (step.ramp) rampProgress(step.wait, runId)
      else if (step.indeterminate) statusProgress.value = null
      else statusProgress.value = step.status === 'done' ? 1 : null
      await sleep(step.wait)
    }
  }
}

function setStatus(status) {
  statusAuto.value = false
  statusRunId++
  clearInterval(statusTick)
  statusStep.value = status
  statusProgress.value = status === 'progress' ? 0.64 : status === 'done' ? 1 : null
}

function toggleStatusAuto() {
  statusAuto.value = !statusAuto.value
  if (statusAuto.value) {
    statusProgress.value = null
    playStatus()
  }
}

const codeSlot = ref('')
const codeStatus = ref('idle')
watch(codeStatus, value => {
  if (value === 'idle') return
  setTimeout(() => { codeStatus.value = 'idle' }, value === 'success' ? 1600 : 900)
})
const scrubValue = ref(42)
const stepIndex = ref(0)
const stepFlowSteps = [
  { label: '填写资料', description: '姓名与联系方式' },
  { label: '选择方案', description: '按月或按年' },
  { label: '确认支付', description: '核对金额' }
]
/* 提示词组主要给工具栏图标用：这里是图标按钮，不是文字链接。 */
const tooltipItems = [
  { label: '搜索', tip: '搜索记录（⌘K）', icon: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>' },
  { label: '筛选', tip: '按类型 / 时间筛选', icon: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>' },
  { label: '导出', tip: '导出为 CSV', icon: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 19h14"/>' },
  { label: '设置', tip: '训练目标与提醒', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3l1.4 2.5 2.8-.7 1.1 2.7 2.7 1.1-.7 2.8L21 12l-1.7 2.6.7 2.8-2.7 1.1-1.1 2.7-2.8-.7L12 21l-1.4-2.5-2.8.7-1.1-2.7-2.7-1.1.7-2.8L3 12l1.7-2.6-.7-2.8 2.7-1.1 1.1-2.7 2.8.7z"/>' }
]
const swipeLog = ref('尚未操作')
/* 向左划露出右侧操作；向右划露出左侧操作 */
const swipeActions = [
  { label: '置顶', tone: 'neutral', icon: '<path d="M12 4v16M6 10l6-6 6 6"/>' },
  { label: '删除', tone: 'danger', icon: '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/>' }
]
const swipeLeftActions = [
  { label: '完成', tone: 'success', icon: '<path d="M5 13l4 4L19 7"/>' }
]
/* commit 事件带 { action, full }；action 事件只带 action */
function onSwipeCommit({ action, full }) {
  swipeLog.value = (full ? '划到底执行：' : '点击执行：') + action.label
}

const cardItems = [
  { title: '晨跑', meta: '5.2 公里 · 32 分钟', tone: 'primary' },
  { title: '力量', meta: '上肢 · 4 组', tone: 'secondary' },
  { title: '拉伸', meta: '12 分钟', tone: 'tertiary' },
  { title: '骑行', meta: '18 公里', tone: 'primary' },
  { title: '游泳', meta: '800 米', tone: 'secondary' },
  { title: '冥想', meta: '10 分钟', tone: 'tertiary' }
]
const cardVariant = ref(new URLSearchParams(window.location.search).get('cg') || 'gallery')

/* Markdown 渲染器演示：标题 / 强调 / 内联图标（四种裸写法 + ::显式::）/ @提及 */
const mdMentions = ref(true)
const mdStreaming = ref(true)
const mdStreamingLive = ref(false)
const mdFeed = ref('')
let mdTimer = 0
function toggleMdFeed() {
  if (mdStreamingLive.value) {
    mdStreamingLive.value = false
    clearInterval(mdTimer)
    return
  }
  mdFeed.value = ''
  mdStreamingLive.value = true
  /* 按码点切，不要把 emoji / 中文组合字符切坏；每次 6~10 个字符，
     节奏 ~70ms，接近真实 LLM 的出字速度，才看得出「新字浮上来」。 */
  const chars = Array.from(mdDoc)
  let i = 0
  mdTimer = setInterval(() => {
    i = Math.min(chars.length, i + 8)
    mdFeed.value = chars.slice(0, i).join('')
    if (i >= chars.length) { mdStreamingLive.value = false; clearInterval(mdTimer) }
  }, 70)
}
const MD_USERS = {
  nova: { username: 'nova', showname: 'Nova', type: 'agent', shape: 'triangle' },
  iris: { username: 'iris', showname: 'Iris', type: 'agent', shape: 'circle' },
  alex: { username: 'alex', showname: 'Alex Chen', type: 'normal', shape: 'circle' }
}
function mdResolve(name) {
  return MD_USERS[name] || { username: name, showname: name, type: 'normal' }
}
const mdDoc = [
  '# 会话记录',
  '',
  '## 内联图标（四种裸写法）',
  '',
  'mdi:home  mdi/home  mdi--home  i-mdi:home',
  '',
  '显式标记优先级最高：::mdi:send:: 可以与上一行混用。',
  '',
  '> 代码块与行内代码是字面量，不解析图标：' + '`' + 'mdi:home' + '`' + ' 保持原样。',
  '',
  '## 强调与列表',
  '',
  '- 支持 **加粗**、*斜体*、~~删除线~~ 与 ' + '`' + '行内代码' + '`',
  '- 也支持 [链接](https://example.com)',
  '',
  '## 提及',
  '',
  '打开「@ 提及」后 @nova 与 @alex 会渲染成头像标签药丸；关闭则保持纯文本。',
  '',
  '| 参数 | 说明 |',
  '| --- | --- |',
  '| mentions | 开启 @ 提及解析 |',
  '| mentionResolver | 返回 username / showname / type / image / shape |'
].join('\n')
mdFeed.value = mdDoc
const cardActive = ref(0)
const cardVariants = [
  { label: '平铺', value: 'gallery' },
  { label: '圆环', value: 'circular' },
  { label: '纵深', value: 'depth' },
  { label: '透视墙', value: 'wall' },
  { label: '滚动压栈', value: 'scroll-stack' },
  { label: '牌堆', value: 'stack' },
  { label: '轮换', value: 'swap' },
  { label: '扇形', value: 'bounce' }
]
const stepOrientation = ref('horizontal')
const slideLoading = ref(false)
let slideTimer = 0
function startSlide() {
  slideLoading.value = true
  clearTimeout(slideTimer)
  slideTimer = setTimeout(() => { slideLoading.value = false }, 1600)
}
const buttonLog = ref('')
const strikeDone = ref(false)
const jellyPick = ref('a')

/* ---------- 第二批组件（表单 / 布局 / 导航 / 浮层 / 数据展示） ---------- */
const colorPick = ref('#3f5f90')
const autoPick = ref('')
const formName = ref('')
const autoOptions = [
  { label: '晨跑', value: 'run' },
  { label: '骑行', value: 'ride' },
  { label: '游泳', value: 'swim' }
]
const pageNo = ref(2)
const sidebarOpen = ref(true)

/* SideNav 演示 */
const sidenavItems = [
  { value: 'today', label: '今天', icon: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6L16.9 7.1M7.1 16.9l-1.5 1.5"/>' },
  { value: 'all', label: '全部任务', icon: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"/>' },
  { value: 'done', label: '已完成', icon: '<path d="M5 12.5l4.4 4.4L19 7"/>' }
]
const sidenavActive = ref('today')
const sidenavDrawer = ref(false)
const sidenavCollapsed = ref(false)
const sidenavLabel = computed(() => (sidenavItems.find(i => i.value === sidenavActive.value) || sidenavItems[0]).label)
const slideoverOpen = ref(false)
const navPick = ref('record')
const navItems = [
  { label: '记录', value: 'record', children: [
    { label: '晨跑', description: '5.2 公里', value: 'run' },
    { label: '骑行', description: '18 公里', value: 'ride' }
  ] },
  { label: '趋势', value: 'trend' },
  { label: '设置', value: 'setting', children: [
    { label: '提醒', description: '每天 20:00', value: 'remind' }
  ] }
]
const splitRatio = ref(0.42)
const splitSnapRatio = ref(0.5)
const ctxLog = ref('在灰色区域里右键 / 长按试试')
const ctxItems = [
  { label: '复制', shortcut: '⌘C', icon: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>' },
  { label: '重命名', shortcut: 'F2' },
  { divider: true },
  { label: '删除', tone: 'danger', shortcut: '⌫' }
]
const cmdOpen = ref(false)
const cmdItems = [
  { label: '跳到今日记录', value: 'today', hint: 'G T' },
  { label: '新建一条记录', value: 'new', hint: 'N' },
  { label: '导出 CSV', value: 'export', hint: 'E' },
  { label: '切换外观', value: 'theme', hint: 'T' }
]
const tourOpen = ref(false)
const tourSteps = [
  { target: '.lib-hero__title', title: '这里是标题', text: '巡览会高亮目标元素，气泡自动放到下方。' },
  { target: '.lib-picker', title: '分区选择器', text: '一次只展示一个分区，避免把全部组件排开。' }
]
const popOpen = ref(false)
const demoNotify = ref(true)
const demoNotify2 = ref(false)
const todayIso = new Date().toISOString().slice(0, 10)
const calDate = ref(todayIso)
const calEvents = { [todayIso]: [{ title: '晨跑', tone: 'primary' }, { title: '喝水', tone: 'success' }] }
const timelineItems = [
  { title: '晨跑 5.2 公里', time: '06:40', text: '配速 5\'42"，心率 148', tone: 'primary' },
  { title: '骑行 18 公里', time: '18:05', text: '通勤往返', tone: 'success' },
  { title: '未记录饮水', time: '21:00', tone: 'warning' }
]
const timelineSide = ref('right')
const timelineSideOptions = [
  { label: '时间在右', value: 'right' },
  { label: '时间在左', value: 'left' },
  { label: '不显示时间', value: 'none' }
]
const carouselMode = ref('cycle')
const carouselModeOptions = [
  { label: '循环', value: 'cycle' },
  { label: '无限', value: 'infinite' }
]
const carouselItems = [
  { title: '晨跑', text: '5.2 公里 · 32 分钟' },
  { title: '骑行', text: '18 公里 · 通勤' },
  { title: '游泳', text: '800 米 · 自由泳' }
]
const carouselIndex = ref(0)

const viewerSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7e2ff"/><stop offset="1" stop-color="#3f5f90"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="180" cy="140" r="60" fill="#faf9fd" opacity=".9"/><path d="M60 300 L260 180 L420 260 L600 140 L600 360 L60 360 Z" fill="#3f5f90" opacity=".55"/></svg>')

function onDropFiles(files) {
  dropped.value = files.map(f => f.name)
  toast.value?.success('收到 ' + files.length + ' 个文件（演示）')
}

/* ---------- 可视化 ---------- */
const week = [18, 26, 22, 34, 28, 40, 31]

/* CodeImage 演示 */
const ciSingle = 'https://example.com'
/* 图标标记：24x24 viewBox 内的 SVG 内部内容 */
const ICON_QR = '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>'
const ICON_BAR = '<path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M19 5v14"/>'
const ICON_BUILDING = '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>'
const ICON_FLOWER = '<path d="M12 13c0-2 1.5-3.5 3.2-3.5C17 9.5 18 11 18 12.6c0 2-1.6 3.4-3.6 3.4H12zM12 13c0-2-1.5-3.5-3.2-3.5C7 9.5 6 11 6 12.6c0 2 1.6 3.4 3.6 3.4H12z"/><path d="M12 16v4"/>'
const ICON_MOUNT = '<path d="M3 18l6-9 4 6 2-3 6 6z"/>'
const ICON_BIRD = '<path d="M4 14c4 0 6-2 8-5 1.5 2.5 3.5 4 6 4-2 3-5 5-9 5-2 0-3.5-.6-5-1.6zM15 6l2-2"/>'

const iconSegOptions = [
  { label: '二维码', value: 'qr', icon: ICON_QR },
  { label: '一维码', value: 'bar', icon: ICON_BAR },
  { label: '建筑', value: 'build', icon: ICON_BUILDING }
]
const iconTopOptions = [
  { label: '全部', value: 'all', icon: ICON_QR },
  { label: '建筑', value: 'build', icon: ICON_BUILDING },
  { label: '花卉', value: 'flower', icon: ICON_FLOWER },
  { label: '风景', value: 'mount', icon: ICON_MOUNT },
  { label: '物件', value: 'object', icon: ICON_BAR },
  { label: '野生', value: 'bird', icon: ICON_BIRD }
]
const iconSelectOptions = iconTopOptions
/* 极限情况演示：10 个带长标签的选项，图标在上时必然多行，用 max-rows 截到 2 行滚动 */
const segManyOptions = Array.from({ length: 10 }, (_, i) => ({
  label: '分类 ' + (i + 1) + ' · ' + ['报表', '日程', '联系人', '任务', '文件', '书签', '标签', '群组', '设备', '日志'][i],
  value: 'cat' + i,
  icon: iconTopOptions[i % iconTopOptions.length].icon
}))
const segMaxRowPick = ref('cat0')
const iconSegPick = ref('qr')
const iconTopPick = ref('all')
const iconOnlyPick = ref('all')
const iconSelPick = ref('all')
const iconSelTopPick = ref('build')

const ciMixed = ['qrcode', 'ean13', 'code128']
const ciMixedText = '1234567890128'
const ciBarGroup = ['ean13', 'ean8', 'upc', 'code128', 'itf14', 'qrcode']
const ciBarText = 'HELLO-CODE'
const ciFallbackType = ['ean13']
const ciFallbackText = '任意自由文本，一维码装不下'
const ciOptions = { qrcode: { errorCorrectionLevel: 'H', margin: 2 }, code128: { showText: true } }
const heat = Array.from({ length: 42 }, (_, i) => Math.round(Math.abs(Math.sin(i * 0.7) * 3 + Math.cos(i * 0.3) * 1.2)))

/* ---------- 浮层反馈 ---------- */
const toast = ref(null)
const modalOpen = ref(false)
const bottomSheetOpen = ref(false)
const sheetBareOpen = ref(false)
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

onMounted(() => {
  showToast('info')
  playStatus()
})

/* 进入「工程」分区（MarkdownView 在这里）时自动播一次流式演示：
   不点按钮就永远只看到全文闪现，新字的上浮 + 模糊动画等于没展示。 */
let mdAutoPlayed = false
watch(activeSection, id => {
  if (id !== 'sec-dev' || mdAutoPlayed) return
  mdAutoPlayed = true
  toggleMdFeed()
})
</script>

<template>
  <section class="view active lib" data-view="components">
    <div class="lib-hero">
      <h2 class="lib-hero__title">组件库</h2>
      <p class="lib-hero__desc">一套令牌、一套弹簧、一套形变语言。8 个分区、97 个组件，窄屏单列、宽屏自动多列。</p>
    </div>

    <!-- 分类选择器：一次只展示一个分区，避免把几十个组件全排在一页里 -->
    <div class="lib-picker">
      <UiSelect
        v-model="activeSection"
        :options="sectionOptions"
        label="选择分类"
      />
    </div>

    <!-- 操作 -->
    <section v-show="activeSection === sections[0].id" :id="sections[0].id" class="lib-sec">
      <h3 class="lib-sec__title">操作与选择</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">按键提示 / 图标 <small>Kbd / Icon</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-demo-row">
              <UiKbd keys="⌘K" />
              <UiKbd :keys="['Shift', 'Enter']" size="sm" />
              <UiIcon name="heart" :size="20" label="喜欢" />
              <UiIcon name="star" :size="20" filled />
            </div>
          </div>
          <span class="lib-cell__note">按键提示用等宽字符；图标来自库内 ICONS 注册表。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">面包屑 / 分页 / 导航菜单</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiBreadcrumb :items="[{ label: '首页' }, { label: '记录' }, { label: '晨跑' }]" />
            <UiPagination v-model="pageNo" :total="120" :page-size="10" />
            <UiNavigationMenu v-model="navPick" :items="navItems" />
          </div>
          <span class="lib-cell__note">面包屑最后一项为当前页；导航菜单悬停 / 聚焦展开子面板。</span>
        </div>

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
          <span class="lib-cell__label">卡片 · 页眉 / 主体 / 页脚 <small>Card</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiCard title="本周目标" description="4 / 5 天达标" icon="<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;8.5&quot;/><path d=&quot;M12 7.5V12l3 2&quot;/>">
              <template #actions><UiBadge tone="success">进行中</UiBadge></template>
              <p class="lib-muted">再完成一次运动就达标。主体放任意内容，页眉 / 页脚都能省略。</p>
              <template #footer>
                <UiButton size="sm" variant="text">查看详情</UiButton>
                <UiButton size="sm">去运动</UiButton>
              </template>
            </UiCard>
            <UiCard title="纯文字卡" description="variant=plain、无页脚" variant="plain" :divider="false" size="sm">
              <span class="lib-muted">没有描边与底色，只保留排版。</span>
            </UiCard>

            <UiCard
              variant="product"
              product-name="Supabase"
              :product-icon="supabaseGlyph"
              product-icon-view-box="0 0 20 20"
              accent="#3ecf8e"
            >
              <UiAvatarTag name="ZERO" :icon="zeroFace" />
              <span>需要连接到</span>
              <b style="font-weight: 700; background: linear-gradient(90deg, var(--card-accent), color-mix(in oklab, var(--card-accent) 55%, var(--on-surface))); -webkit-background-clip: text; background-clip: text; color: transparent;">Supabase</b>
              <span>来创建数据库和获取连接信息</span>
              <template #footer>
                <UiButton variant="tonal">拒绝</UiButton>
                <UiButton>授权</UiButton>
              </template>
            </UiCard>
          </div>
          <span class="lib-cell__note">#header / 默认插槽 / #footer 三段；#actions 在页眉右侧；divider 控制分隔线。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">头像标签 <small>AvatarTag</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-demo-row">
              <UiAvatarTag name="圆形" :src="viewerSrc" shape="circle" />
              <UiAvatarTag name="圆角方形" :src="viewerSrc" shape="squircle" />
              <UiAvatarTag name="六边形" :src="viewerSrc" shape="hexagon" />
              <UiAvatarTag name="菱形" :src="viewerSrc" shape="diamond" />
            </div>
            <div class="lib-demo-row">
              <UiAvatarTag name="Nova" agent agent-shape="triangle" agent-color="#7438ff" agent-state="listening" />
              <UiAvatarTag name="Iris" agent agent-shape="circle" agent-color="#3f5f90" agent-state="thinking" />
              <UiAvatarTag name="Iris · md" agent agent-shape="circle" agent-color="#249361" agent-state="happy" size="md" />
            </div>
            <div class="lib-demo-row">
              <UiAvatarTag name="Alex Chen" :src="viewerSrc" />
              <UiAvatarTag name="Coco Li" />
              <UiAvatarTag name="自定义形状" :src="viewerSrc" shape="blob" size="lg" />
            </div>
          </div>
          <span class="lib-cell__note">头像本体默认用标准 UiAvatar（src / 首字母）或 UiAgentAvatar（agent，带眼睛会动）渲染；图片按 shape 裁切。药丸底色上下各内缩 1px，头像比底色探出 1px（对齐 Frame 11）。icon 模式（任意 SVG 无遮罩）仍支持，示例默认不展示。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">智能体头像 <small>AgentAvatar</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-demo-row">
              <UiAgentAvatar shape="circle" color="#3f5f90" :state="agentState" :size="88" :gaze="agentGaze" />
              <UiSegmented v-model="agentState" :options="agentStates" label="状态机" layout="one-line" />
              <UiSwitch v-model="agentGazeOn" label="跟随鼠标看" />
            </div>
            <div class="lib-demo-row">
              <UiAgentAvatar shape="triangle" color="#7438ff" state="listening" :size="44" />
              <UiAgentAvatar shape="diamond" color="#0f766e" state="thinking" :size="44" />
              <UiAgentAvatar shape="triangle" color="#b45309" state="happy" :size="44" />
              <UiAgentAvatar shape="hexagon" color="#ba1a1a" state="confused" :size="44" />
              <UiAgentAvatar shape="tilt" color="#7b5294" state="surprised" :size="44" />
              <UiAgentAvatar shape="flower" color="#46464f" state="sleepy" :size="44" />
              <UiAgentAvatar shape="star" color="#249361" state="speaking" :size="44" />
            </div>
          </div>
          <div class="lib-demo-row">
            <UiAgentAvatar v-for="(item, key) in agentShapeList" :key="key" :shape="key" :size="36" :animated="false" state="idle" />
          </div>
          <div class="lib-demo-row">
            <UiAgentAvatar device="laptop" :size="110" state="listening" />
            <UiAgentAvatar device="phone" device-color="#3f5f90" :size="110" state="idle" />
            <UiButton size="sm" variant="tonal" @click="router.push({ name: 'agent-device' })">调设备位置</UiButton>
          </div>
          <span class="lib-cell__note">shape 传内置 key（{{ Object.keys(agentShapeList).join(' / ') }}）或纯剪影标记；自动描边 + 两只同尺寸圆角矩形眼（不旋转、不随机、成组位移，默认略偏右上）；eyesY 不传时按形状推荐值。下面两只带 UsingDevice：眼睛看向设备（电脑左右轻扫 / 手机上下轻点），白圆手敲键盘 / 持机 + 滑屏。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">头像组 <small>AvatarGroup</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiAvatarGroup>
              <UiAvatar name="Alex Chen" :src="viewerSrc" />
              <UiAvatar name="B" :src="viewerSrc" />
              <UiAvatar name="Coco Li" />
              <UiAvatar name="D" :src="viewerSrc" status />
              <UiAvatar name="Eve Wang" />
            </UiAvatarGroup>
            <UiAvatarGroup size="sm" :max="3">
              <UiAvatar name="A" :src="viewerSrc" />
              <UiAvatar name="B" />
              <UiAvatar name="C" :src="viewerSrc" />
              <UiAvatar name="D" />
              <UiAvatar name="E" :src="viewerSrc" />
            </UiAvatarGroup>
          </div>
          <span class="lib-cell__note">src 支持 base64 data URL / 在线地址；size 统一继承，单项可覆盖；max 超出折叠成 +N。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">分段 / 步进 / 评分</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="frequency" :options="frequencyOptions" layout="one-line" label="提醒频率" />
            <UiStepper v-model="waterCups" label="喝水" unit="杯" :min="0" :max="12" />
            <UiRating v-model="rating" />
            <UiRating v-model="ratingHalf" :max="5" half label="半星评分（点亮逐颗错峰弹跳）" />
          </div>
          <span class="lib-cell__note">数字变化统一走滚动动效，越界带碰壁回弹。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">分段 / 下拉的图标 <small>Segmented / Select</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="iconSegPick" layout="one-line" label="图标在前" :options="iconSegOptions" />
            <UiSegmented v-model="iconTopPick" label="图标在上（6 项自动多行）" icon-placement="top" :options="iconTopOptions" />
            <UiSegmented v-model="segMaxRowPick" label="图标在上 · 限 2 行内部滚动（max-rows=2）" icon-placement="top" :options="segManyOptions" :max-rows="2" />
            <UiSegmented v-model="iconOnlyPick" label="仅图标" :options="iconTopOptions.slice(0, 2)" :show-labels="false" icon-placement="top" />
            <UiSelect v-model="iconSelPick" label="下拉 · 图标在前" :options="iconSelectOptions" />
            <UiSelect v-model="iconSelTopPick" label="下拉 · 图标在上" :options="iconSelectOptions" icon-placement="top" />
          </div>
          <span class="lib-cell__note">图标可放在文字前端（布局不变）或上方（卡片网格）；单行装不下时自动切成多行。</span>
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
          <span class="lib-cell__label">开关文案位置 <small>labelPlacement / alignEnd</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSwitch v-model="swLeft" label="文案在左（默认）" />
            <UiSwitch v-model="swRight" label="文案在右" label-placement="right" />
            <UiSwitch v-model="swEnd" label="文案在右 · 右对齐到行尾" label-placement="right" align-end />
            <UiSwitch v-model="swOff" label="禁用开关" :disabled="true" />
          </div>
          <span class="lib-cell__note">说明文本统一在控件同一行；align-end 时整行撑满、文字吃剩余宽度，开关贴到行尾。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">芯片 / 徽标 / 开关 / 复选</span>
          <div class="lib-cell__stage">
            <UiChip v-for="c in chipOptions" :key="c" :selected="activeChip === c" @click="activeChip = c">{{ c }}</UiChip>
            <UiBadge tone="success">已同步</UiBadge>
            <UiBadge tone="warning">3 项待办</UiBadge>
            <UiSwitch v-model="notifyOn" label="通知" />
            <UiCheckbox v-model="checkCloud" label="云端同步" />
            <UiCheckbox v-model="checkInsight" label="周报洞察" :disabled="true" />
          </div>
        </div>
      </div>
    </section>

    <!-- 表单 -->
    <section v-show="activeSection === sections[1].id" :id="sections[1].id" class="lib-sec">
      <h3 class="lib-sec__title">表单</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">取色 / 自动完成</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiColorPicker v-model="colorPick" label="主题色" />
            <UiAutocomplete v-model="autoPick" label="运动" :options="autoOptions" placeholder="输入筛选" />
          </div>
          <span class="lib-cell__note">取色有预设色板；自动完成边输边筛，Enter 选第一项。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">表单与校验 <small>Form / FormField</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiForm :validate-on-submit="true">
              <UiFormField label="目标名称" hint="必填，至少 2 个字" :value="formName">
                <UiInput v-model="formName" placeholder="例如：每天喝水 8 杯" />
              </UiFormField>
            </UiForm>
          </div>
          <span class="lib-cell__note">Form 管提交与校验，FormField 提供 label / hint / rules。</span>
        </div>

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
            <UiInput v-model="phone" label="手机号（格式正则）" pattern="^1[3-9]\d{9}$" pattern-message="需要 11 位大陆手机号" hint="输入中不报错；首次匹配即绿勾，失焦仍不匹配才红叉" />
            <UiInput v-model="hexColor" label="十六进制色值" pattern="^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" pattern-message="格式是 #RGB 或 #RRGGBB" />
            <UiTextarea v-model="note" label="备注" placeholder="今天的感觉…" :rows="3" />
          </div>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">选择 / 单选</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSelect v-model="sport" label="运动类型" :options="sportOptions" />
            <UiSelect v-model="plan" label="含禁用项的方案" :options="planOptionsWithDisabled" />
            <UiSelect label="整体禁用" :options="sportOptions" model-value="walk" disabled />
            <UiSelect v-model="longPick" label="超长列表（40 项）" :options="longOptions" />
            <span class="lib-cell__note">订阅方案（单选：含禁用项 + 整体禁用）</span>
            <UiRadioGroup v-model="plan" :options="planOptionsWithDisabled" />
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
    <section v-show="activeSection === sections[2].id" :id="sections[2].id" class="lib-sec">
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
    <section v-show="activeSection === sections[3].id" :id="sections[3].id" class="lib-sec">
      <h3 class="lib-sec__title">日期与时间</h3>
      <div class="lib-cells">
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">日历 <small>Calendar</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiCalendar v-model="calDate" :events="calEvents" switchable />
          </div>
          <span class="lib-cell__note">四种视图（月 / 周 / 年 / 日程）可切换：年视图是 12 个月总览、点月份下钻回月视图；日程视图按日期列出当月事件。切换走内容替换（旧视图模糊淡出、新视图浮入）。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">日历 / 时间滚轮</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="dpPrecision" layout="one-line" label="选择精度" :options="dpPrecisionOptions" />
            <UiDatePicker v-model="visitDate2" label="回访日期" :precision="dpPrecision" :min="dpMin" :max="dpMax" />
            <UiSegmented v-model="timePrecision" layout="one-line" label="时间精度" :options="timePrecisionOptions" />
            <UiTimePicker v-model="visitTime" label="回访时间" :precision="timePrecision" :presets="timePresets" />
            <UiTimePicker v-model="workTime" label="上班打卡（限 09:00–18:00）" min="09:00" max="18:00" />
          </div>
          <span class="lib-cell__note">±3 天显示称呼；滚轮高亮块固定在中间，移动的是数字层。
            日期精度选「月 / 年」时必须选到该级才提交关闭；min / max 之外的日期直接禁用。</span>
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
            <UiSegmented v-model="precision" layout="one-line" label="选择器精度" :options="precisionOptions" />
            <UiSelect v-model="displayPrecision" label="时长显示精度（取整后加 ~）" :options="displayPrecisionOptions" />
            <UiRangeTimePicker v-model="visitRangeTime" :precision="precision" :display-precision="displayPrecision" />
          </div>
          <span class="lib-cell__note">60 分钟 → 1h；63 分 3 秒 → 1h03m03s；整串首位 0 隐去。</span>
        </div>
      </div>
    </section>

    <!-- 工程 -->
    <section v-show="activeSection === sections[4].id" :id="sections[4].id" class="lib-sec">
      <h3 class="lib-sec__title">工程控件</h3>
      <div class="lib-cells lib-cells--wide">
        <div class="lib-cell">
          <span class="lib-cell__label">栅格 / 行列 / 分隔条</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiGrid :min="110" :gap="8">
              <div class="lib-tile">自适应</div>
              <div class="lib-tile">按最小宽</div>
              <div class="lib-tile">自动换行</div>
            </UiGrid>
            <UiRow :gap="8">
              <UiCol :span="5"><div class="lib-tile">span 5 / 12</div></UiCol>
              <UiCol :span="5"><div class="lib-tile">span 5 / 12</div></UiCol>
            </UiRow>
            <div class="lib-splitter-demo">
              <UiSplitter v-model="splitRatio" :min="0.2" :max="0.8" :handle="14">
                <template #first><div class="lib-tile">左侧 {{ Math.round(splitRatio * 100) }}%</div></template>
                <div class="lib-tile">右侧</div>
              </UiSplitter>
              <UiSplitter v-model="splitSnapRatio" :min="0.1" :max="0.9" :handle="14" :snap-count="4">
                <template #first><div class="lib-tile">吸附 1/4 · {{ Math.round(splitSnapRatio * 100) }}%</div></template>
                <div class="lib-tile">右侧</div>
              </UiSplitter>
            </div>
          </div>
          <span class="lib-cell__note">Grid 按最小列宽铺满；Splitter 拖动分隔条实时改比例。第二条开了 <code>snap-count=4</code>：松手吸附到 1/4、2/4、3/4 这类分段值（也可传 <code>stops</code> 指定具体点）。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">滚动区 <small>ScrollArea</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiScrollArea max-height="120px">
              <div class="lib-sheet-long">
                <p v-for="n in 8" :key="n">第 {{ n }} 行 —— 自定义滚动条 + 贴边阴影。</p>
              </div>
            </UiScrollArea>
          </div>
          <span class="lib-cell__note">只接管滚动外观，不改变内容布局。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">链接 <small>UiLink</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-demo-row">
              <UiLink href="https://nuxt.com" external>外部链接</UiLink>
              <UiLink href="/components">应用内链接</UiLink>
              <UiLink href="#" tone="muted">弱化链接</UiLink>
              <UiLink href="#" tone="danger" underline>危险链接</UiLink>
            </div>
          </div>
          <span class="lib-cell__note">默认 primary 无下划线、悬停才出；外链自动带 ↗ 角标并 target=_blank；tone 三档 primary / muted / danger。</span>
        </div>

        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">Markdown 渲染器 <small>MarkdownView</small></span>
          <div class="lib-demo-row">
            <UiSwitch v-model="mdMentions" label="@ 提及渲染为头像标签" />
            <UiSwitch v-model="mdStreaming" label="流式增量进场" />
            <UiButton size="sm" variant="tonal" @click="toggleMdFeed">{{ mdStreamingLive ? '停止' : '模拟流式输出' }}</UiButton>
          </div>
          <div class="lib-md-demo">
            <MarkdownView :content="mdStreamingLive ? mdFeed : mdDoc" :mentions="mdMentions" :streaming="mdStreaming" :stream-effect="'rise'" :mention-resolver="mdResolve" />
          </div>
          <span class="lib-cell__note">标题 / 强调 / 列表 / 引用 / 表格全部走库令牌；内联图标支持 pack:icon、pack/icon、pack--icon、i-pack:icon 与 ::pack:icon:: 五种写法（本地注册表优先于 Iconify）；@用户名 在 mentions 开启时渲染为 UiAvatarTag。</span>
        </div>

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
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">数据表格 · 分组 / 多选 / 列显隐 / 服务端分页</span>
          <UiDataTable
            :columns="tableColumns2"
            :rows="groupedPageRows"
            row-key="name"
            group-by="team"
            v-model:visible="tableVisible"
            v-model:selected="tableSelected"
            selection="multiple"
            :server="true"
            :page="tablePage"
            :page-size="2"
            :total="groupTableRows.length"
            @page-change="p => tablePage = p.page"
          />
          <span class="lib-cell__note">列显隐直接用下拉的多选模式；表头全选、行首多选；组标题整行合并；服务端模式下排序 / 分页只发事件。</span>
          <span class="lib-muted">已选 {{ tableSelected.length }} 行 · 第 {{ tablePage }} 页</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">文件树</span>
          <UiTreeView :nodes="tree" v-model="treePick" :default-open="['src']" />
          <span class="lib-muted">选中：{{ treePick }}；分组用 grid 行高 0fr ↔ 1fr 连续过渡，嵌套子树也跟手。</span>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">文件树 · 过滤 / 级联多选 / 拖拽换父</span>
          <UiInput v-model="treeFilter" placeholder="过滤关键字（例如 core / css）" />
          <UiTreeView
            :nodes="tree"
            v-model="treeMulti"
            multi
            cascade
            draggable
            :filter="treeFilter"
            :default-open="['src']"
            @move="onTreeMove"
          />
          <span class="lib-muted">已选 {{ treeMulti.length }} 项；勾目录 = 勾整棵子树（父级半选）；把行拖到目录上可换父。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">虚拟列表 <small>滑动多选</small></span>
          <UiVirtualList :items="virtualItems" :item-height="40" :height="180" v-model="virtualSelected" selection="multiple" drag-select>
            <template #default="{ item }">
              <span>{{ item.label }}</span>
            </template>
          </UiVirtualList>
          <span class="lib-muted">600 行只渲染窗口内十几行；单击切换选中，长按某行后竖向拖动可连续勾选，拖到边缘自动滚动。</span>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">Schema 表单生成器 <small>UiSchemaForm</small></span>
          <UiSchemaForm :schema="schema" v-model="schemaValue" @submit="toast?.success('已提交：' + JSON.stringify(schemaValue))" />
        </div>
      </div>
    </section>

    <!-- 可视化 -->
    <section v-show="activeSection === sections[5].id" :id="sections[5].id" class="lib-sec">
      <h3 class="lib-sec__title">数据与可视化</h3>
      <div class="lib-cells">
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">时间线 / 轮播 / 跑马灯</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="timelineSide" layout="one-line" label="时间位置" :options="timelineSideOptions" />
            <UiTimeline :items="timelineItems" :time-position="timelineSide" />

            <UiSegmented v-model="carouselMode" layout="one-line" label="轮播变体" :options="carouselModeOptions" />
            <UiCarousel v-model="carouselIndex" :items="carouselItems" :height="120" :autoplay="true" :loop-mode="carouselMode" />
            <div class="lib-demo-row lib-dots-demo">
              <span class="lib-muted">翻页指示器</span>
              <UiPagerDots :total="carouselItems.length" :model-value="carouselIndex" @update:model-value="carouselIndex = $event" />
            </div>
            <UiMarquee text="跑马灯：记录不中断 · 数据自己会说话 · 每天一点点" :speed="60" />
          </div>
          <span class="lib-cell__note">时间线时间可放左侧（独立列、右对齐贴轨道）或右侧。<strong>轮播两种变体</strong>：<code>cycle</code> 到尾回到第一张；<code>infinite</code> 首尾各克隆一张，走到克隆位无动画瞬移归位，视觉上一直朝一个方向延伸、不跳回。<strong>手动翻页（箭头 / 圆点）会重置自动计时器。</strong>外层容器不带圆角，圆角是卡片自己的。</span>
        </div>

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
          <span class="lib-cell__label">码图 <small>CodeImage</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiCodeImage type="qrcode" :width="150" :options="ciOptions">{{ ciSingle }}</UiCodeImage>
            <UiCodeImage :type="ciMixed" :width="150" :options="ciOptions">{{ ciMixedText }}</UiCodeImage>
            <UiCodeImage :type="ciBarGroup" :width="150">{{ ciBarText }}</UiCodeImage>
            <UiCodeImage :type="ciFallbackType" :width="150">{{ ciFallbackText }}</UiCodeImage>
          </div>
          <span class="lib-cell__note">单码 / 跨族 2~3 项走图标分段 / 4 项以上走带图标下拉 / 全不可用自动降级；不合规选项可见但禁用。</span>
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
    <section v-show="activeSection === sections[6].id" :id="sections[6].id" class="lib-sec">
      <h3 class="lib-sec__title">浮层与反馈</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">侧栏 <small>Sidebar</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiButton size="sm" variant="outline" @click="sidebarOpen = !sidebarOpen">侧栏 {{ sidebarOpen ? '展开' : '收起' }}</UiButton>
            <div class="lib-sidebar-demo">
              <UiSidebar v-model="sidebarOpen" label="示例侧栏" :width="196" :collapsed-width="56">
                <template #head><b>目录</b></template>
                <div class="lib-muted">菜单项</div>
              </UiSidebar>
            </div>
          </div>
          <span class="lib-cell__note">宽度走 view 弹簧，内容随收拢淡出，箭头同时翻转。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">响应式导航 <small>SideNav</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-sidenav-demo">
              <div class="lib-sidenav-demo__desktop">
                <UiSideNav
                  :items="sidenavItems"
                  :active="sidenavActive"
                  v-model:collapsed="sidenavCollapsed"
                  title="工作台"
                  @select="sidenavActive = $event"
                />
              </div>
              <div class="lib-sidenav-demo__phone" :class="{ 'is-dim': sidenavDrawer }">
                <div class="lib-sidenav-demo__bar">
                  <button type="button" class="lib-sidenav-demo__menu" aria-label="打开菜单" @click="sidenavDrawer = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                  </button>
                  <b>{{ sidenavLabel }}</b>
                </div>
                <div class="lib-sidenav-demo__body">
                  <p v-for="i in 3" :key="i" class="lib-muted">{{ i }}. 示例内容行，抽屉打开时锁定滚动</p>
                </div>
                <UiSideNav
                  contain
                  v-model="sidenavDrawer"
                  :items="sidenavItems"
                  :active="sidenavActive"
                  title="工作台"
                  @select="sidenavActive = $event"
                />
              </div>
            </div>
          </div>
          <span class="lib-cell__note">同一套 items：桌面端（≥900px）渲染为常驻侧栏（右下按钮折叠），窄屏渲染为左侧滑抽屉——压暗模糊遮罩、选中即收、Esc 关闭、打开锁 #scrollArea。右侧手机框是 contain 预览。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">右键菜单 / 命令面板 / 巡览</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiContextMenu :items="ctxItems" @select="ctxLog = '选中：' + $event.label">
              <div class="lib-ctx">{{ ctxLog }}</div>
            </UiContextMenu>
            <div class="lib-demo-row">
              <UiButton size="sm" variant="tonal" @click="cmdOpen = true">命令面板</UiButton>
              <UiButton size="sm" variant="tonal" @click="tourOpen = true">开始巡览</UiButton>
            </div>
          </div>
          <span class="lib-cell__note">右键 / 长按弹菜单；命令面板可输入筛选；巡览高亮真实目标。</span>
        </div>

        <div class="lib-cell">
          <span class="lib-cell__label">气泡 <small>Popover</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiPopover v-model="popOpen" placement="bottom">
              <template #trigger><UiButton size="sm" variant="outline">气泡</UiButton></template>
              <div class="lib-tile">气泡内容</div>
            </UiPopover>
          </div>
          <span class="lib-cell__note">#trigger 放触发器，默认插槽放任意面板内容。</span>
        </div>

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
          <span class="lib-cell__label">确认对话框 <small>confirmDialog</small></span>
          <div class="lib-cell__stage">
            <UiButton variant="danger" @click="askDemo">删除记录</UiButton>
            <UiButton variant="outline" @click="askDemo">发布周报</UiButton>
          </div>
          <span class="lib-cell__note">统一替代 window.confirm；有意不接 Esc / Enter，确认必须显式点按钮。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">弹层</span>
          <div class="lib-cell__stage">
            <UiButton variant="outline" @click="modalOpen = true">对话框</UiButton>
            <UiButton variant="outline" @click="bottomSheetOpen = true">底部面板</UiButton>
            <UiButton variant="outline" @click="sheetBareOpen = true">无背景面板</UiButton>
            <UiButton variant="outline" @click="slideoverOpen = true">抽屉</UiButton>
          </div>
          <span class="lib-cell__note">遮罩只压暗 16%，同时模糊 0→5px；抽屉从右侧整块推入，内容随后浮入。</span>
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

    <section v-show="activeSection === sections[7].id" :id="sections[7].id" class="lib-sec">
      <h3 class="lib-sec__title">动效与手势</h3>
      <div class="lib-cells">
        <div class="lib-cell">
          <span class="lib-cell__label">循环短语 <small>RotatingText</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiRotatingText :phrases="rotatingPhrases" transition="rotate" :interval="2400" />
            <UiRotatingText :phrases="rotatingPhrases" transition="flip" :interval="2600" />
            <UiRotatingText :phrases="rotatingPhrases" transition="slide" :interval="2800" background radius="999px" />
          </div>
          <span class="lib-cell__note">rotate 原地旋转 / flip 绕轴翻牌 / slide 纵向滑过；悬停暂停。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">文字变体 <small>Text</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiText variant="type" type-effect="blur" :text="'正在生成报告…'" :cps="16" :loop="true" />
            <UiText variant="type" type-effect="fade" cursor-style="block" :text="'淡入进场 · 方块光标'" :cps="20" :loop="true" />
            <UiText variant="type" type-effect="rise" cursor-style="underscore" :text="'升起进场 · 下划线光标'" :cps="18" :loop="true" />
            <UiText variant="type" type-effect="blur" :cursor="false" :text="'不要光标 · 只留逐字进场'" :cps="16" :loop="true" />
            <UiText variant="shiny" text="掠光文字" sheen="chrome" />
            <UiText variant="gradient" text="流动渐变 · 扫过" gradient="sweep" />
            <UiText variant="gradient" text="流动渐变 · 网格" gradient="mesh" />
            <UiText variant="gradient" text="流动渐变 · 锥形" gradient="conic" />
          </div>
          <span class="lib-cell__note">打字机逐字符进场（透明度 + 模糊，另有淡入 / 升起两档），光标四档；掠光有柔和与金属两档；渐变有扫过 / 漂移 / 锥形三种。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">状态标记（状态机） <small>StatusMark</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <div class="lib-cell__stage">
              <UiStatusMark :status="statusStep" :progress="statusProgress" :size="34" />
              <span class="lib-muted">{{ statusStep }} · {{ statusProgress === null ? '不定进度（转圈）' : Math.round(statusProgress * 100) + '%' }}</span>
            </div>
            <div class="lib-cell__stage">
              <UiButton size="sm" variant="tonal" @click="setStatus('none')">none</UiButton>
              <UiButton size="sm" variant="tonal" @click="setStatus('idle')">pending</UiButton>
              <UiButton size="sm" variant="tonal" @click="setStatus('progress')">progress</UiButton>
              <UiButton size="sm" variant="tonal" @click="setStatus('done')">done</UiButton>
              <UiButton size="sm" variant="tonal" @click="setStatus('error')">failed</UiButton>
              <UiButton size="sm" :variant="statusAuto ? 'primary' : 'outline'" @click="toggleStatusAuto">{{ statusAuto ? '自动中' : '自动播放' }}</UiButton>
            </div>
            <div class="lib-cell__stage">
              <UiStatusMark status="none" :size="22" />
              <UiStatusMark status="pending" :size="22" />
              <UiStatusMark status="progress" :progress="0.68" :size="22" />
              <UiStatusMark status="progress" :progress="null" :size="22" />
              <UiStatusMark status="done" :size="22" />
              <UiStatusMark status="failed" :size="22" />
            </div>
          </div>
          <span class="lib-cell__note">none 只留底部一段空槽；progress 有实际进度就长弧、没有就转圈（两种不会互相乱跳）；任意两态互转都是同一条描边在变形。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">一次性验证码 <small>CodeSlots</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiCodeSlots v-model="codeSlot" :length="6" :status="codeStatus" label="验证码（粘贴或短信自动填充）" />
            <div class="lib-cell__stage">
              <UiButton size="sm" variant="tonal" @click="codeStatus = 'success'">校验成功</UiButton>
              <UiButton size="sm" variant="outline" @click="codeStatus = 'error'">校验失败</UiButton>
              <UiButton size="sm" variant="text" @click="codeStatus = 'idle'; codeSlot = ''">重置</UiButton>
            </div>
            <span class="lib-muted">已输入：{{ codeSlot || '空' }} · 状态：{{ codeStatus }}</span>
          </div>
          <span class="lib-cell__note">逐位落位（透明度 + 模糊 + 位移 + 缩放），粘贴按 20ms 错峰；成功洗色下沉出勾，失败从后往前抽走。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">可拖数值 <small>ScrubField</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiScrubField v-model="scrubValue" label="每日目标" unit="步" :min="0" :max="20000" :step="500" :pixels-per-range="260" />
            <span class="lib-muted">当前：{{ scrubValue }}　左右拖，或用方向键；点击可输入。</span>
          </div>
          <span class="lib-cell__note">越界走橡皮筋，松手弹回；点击（不拖）切换成输入框。</span>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">划开式列表行 <small>SwipeRow</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSwipeRow :actions="swipeActions" :left-actions="swipeLeftActions" full-swipe collapse-on-action @commit="onSwipeCommit">
              <div class="lib-row">
                <b>晨跑 5.2 公里</b>
                <span>32 分钟 · 268 kcal</span>
              </div>
            </UiSwipeRow>
            <UiSwipeRow :actions="swipeActions" :left-actions="swipeLeftActions" @commit="onSwipeCommit">
              <div class="lib-row">
                <b>力量训练</b>
                <span>上肢 · 4 组（不开划到底）</span>
              </div>
            </UiSwipeRow>
            <span class="lib-muted">{{ swipeLog }}（向左划 = 右侧操作，向右划 = 左侧操作；第一行开了划到底，执行后整行折叠消失）</span>
          </div>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">多步流程 <small>StepFlow</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="stepOrientation" :options="[{ label: '横向', value: 'horizontal' }, { label: '纵向', value: 'vertical' }]" layout="one-line" label="方向" />
            <UiStepFlow v-model="stepIndex" :steps="stepFlowSteps" :orientation="stepOrientation" @finish="showToast('success')">
              <template #default="{ index, step }">
                <p class="lib-muted">{{ step.label }}：{{ step.description }}</p>
              </template>
            </UiStepFlow>
          </div>
          <span class="lib-cell__note">指示器是一块滑动的薄条，换步时在轨道上滑过去。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">提示词组 <small>TooltipGroup</small></span>
          <div class="lib-cell__stage">
            <UiTooltipGroup :items="tooltipItems" />
          </div>
          <span class="lib-cell__note">图标按钮组（工具栏场景）：第一次悬停要等 520ms，热了之后兄弟项瞬开；气泡只渲染一个，跟着指针走。</span>
        </div>
        <div class="lib-cell lib-cell--span">
          <span class="lib-cell__label">卡片组 <small>CardGroup · 8 种形态</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiSegmented v-model="cardVariant" :options="cardVariants" layout="one-line" label="形态" :auto-multiline="true" />
            <UiCardGroup :variant="cardVariant" :items="cardItems" :height="240" :card-width="170" :auto="true" :interval="3200" v-model="cardActive" />
          </div>
          <span class="lib-cell__note">拖拽 / 点击 / 方向键都可交互，松手有惯性或吸附；形态只决定每张卡落在三维空间的哪儿。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">动作按钮 <small>Button · fuse / hold / slide</small></span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiButton variant="fuse" :undo-window="4200" @click="buttonLog = 'fuse 点击'" @commit="buttonLog = 'fuse 已落定'" @undo="buttonLog = 'fuse 已撤销'">删除记录</UiButton>
            <UiButton variant="hold" :hold-time="1100" @confirm="buttonLog = 'hold 已确认'">按住确认</UiButton>

            <UiButton variant="slide" :slide-threshold="56" :loading="slideLoading" @confirm="startSlide">滑动发布</UiButton>
            <span class="lib-muted">{{ buttonLog }}</span>
          </div>
          <span class="lib-cell__note">fuse 烧引线可撤销；hold 松手即缩回；slide 跑完展开成药丸。</span>
        </div>
        <div class="lib-cell">
          <span class="lib-cell__label">单选 / 删除线复选</span>
          <div class="lib-cell__stage lib-cell__stage--col">
            <UiRadioGroup v-model="jellyPick" :options="[{ label: '轻松', value: 'a' }, { label: '适中', value: 'b' }, { label: '高强度', value: 'c' }]" />
            <UiCheckbox v-model="strikeDone" strike label="完成今日目标" description="勾选后划线" />
          </div>
          <span class="lib-cell__note">单选回到原生胶囊样式；删除线复选的线从左往右划过文字。</span>
        </div>
      </div>
    </section>

    <!-- 抽屉内容：放几个真实控件，演示遮罩 / 关闭 / Esc -->
    <UiSlideover v-model="slideoverOpen" title="通知设置">
      <div class="lib-cell__stage lib-cell__stage--col">
        <UiSwitch v-model="demoNotify" label="每日提醒" />
        <UiSwitch v-model="demoNotify2" label="周报摘要" />
        <span class="lib-muted">点遮罩或按 Esc 收起；抽屉从右侧推入。</span>
      </div>
    </UiSlideover>

    <UiCommandPalette v-model="cmdOpen" :items="cmdItems" @select="item => { cmdOpen = false; toast?.show('命令：' + item.label, 'info') }" />
    <UiTour v-model="tourOpen" :steps="tourSteps" @finish="tourOpen = false" />

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

    <UiBottomSheet v-model="sheetBareOpen" title="拖把手试试" :scrim="false">
      <div class="lib-sheet-long">
        <p v-for="n in 14" :key="n">第 {{ n }} 行内容 —— 上下拖动顶部把手，松手会吸附到 20% / 60% / 全内容三个锚点；拖到最低锚点之下直接关闭。无背景版本不压暗、不模糊，但背景依旧不可交互。</p>
      </div>
    </UiBottomSheet>

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
.lib-picker { position: sticky; top: 0; z-index: 5; padding: 8px 0; background: color-mix(in oklab, var(--background) 88%, transparent); backdrop-filter: blur(8px); }
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
.lib-row { display: flex; flex-direction: column; gap: 2px; padding: 13px 14px; }
.lib-row b { font-size: var(--fs-small); font-weight: var(--w-strong); }
/* 小工具类：横排按钮 / 示例面块 / 右键区域 */
.lib-demo-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lib-sidebar-demo {
  display: flex;
  height: 190px;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface-container-low);
}
.lib-sidebar-demo .ui-sidebar { height: 100%; }
.lib-md-demo { padding: 4px 2px; }
.lib-sidenav-demo { display: flex; gap: 14px; flex-wrap: wrap; }
.lib-sidenav-demo__desktop { width: 220px; height: 210px; display: flex; background: var(--background); border-radius: 12px; overflow: hidden; }
.lib-sidenav-demo__phone {
  position: relative;
  width: 170px;
  height: 230px;
  border-radius: 18px;
  background: var(--background);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lib-sidenav-demo__bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
.lib-sidenav-demo__bar b { font-size: var(--fs-small); }
.lib-sidenav-demo__menu { border: 0; background: none; color: var(--on-surface); width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; cursor: pointer; transition: background var(--t-fade); }
.lib-sidenav-demo__menu:hover { background: var(--surface-container-high); }
.lib-sidenav-demo__menu svg { width: 18px; height: 18px; }
.lib-sidenav-demo__body { padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
.lib-sidenav-demo__body p { margin: 0; font-size: var(--fs-micro); color: var(--on-surface-variant); }
.lib-sidenav-demo__phone.is-dim { pointer-events: none; }
.lib-splitter-demo { display: flex; height: 148px; min-width: 0; }
.lib-splitter-demo > * { flex: 1; min-width: 0; }
.lib-splitter-demo .lib-tile { height: 100%; border-radius: 0; }
.lib-dots-demo { gap: 10px; padding: 2px 0; }
.lib-tile {
  display: grid;
  place-items: center;
  min-height: 52px;
  padding: 8px;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  text-align: center;
}
.lib-ctx {
  display: grid;
  place-items: center;
  min-height: 72px;
  padding: 10px;
  border: var(--border-w) dashed var(--outline-variant);
  border-radius: calc(var(--r-12) * var(--radius-scale));
  color: var(--on-surface-variant);
  font-size: var(--fs-tiny);
  user-select: none;
}
.lib-sheet-long p { margin: 0 0 8px; font-size: var(--fs-small); color: var(--on-surface-variant); line-height: 1.6; }
.lib-row span { font-size: var(--fs-micro); color: var(--on-surface-variant); }
.lib-muted { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.lib-link { color: var(--primary); text-decoration: underline dotted; cursor: help; font-size: var(--fs-small); }
</style>
