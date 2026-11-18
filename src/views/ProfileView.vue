<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiAlert, UiAvatar, UiAvatarGroup, UiBadge, UiBreadcrumb, UiButton,
  UiCard, UiChip, UiCodeEditor, UiColorPicker, UiCommandPalette, UiMenu,
  UiDataTable, UiForm, UiFormField, UiKeyValueEditor, UiLink, UiMarquee,
  UiPagination, UiPopover, UiRadioGroup, UiRangeSlider, UiRating, UiScrubField,
  UiSearchField, UiSegmented, UiSelect, UiSideNav, UiSlider, UiStepper,
  UiSwitch, UiTagInput, UiTimeline, UiToastHost, UiTour, UiTreeView
} from '../lib'
import { state, persistThemeState } from '../core/state'
import * as theme from '../core/theme'

/* ============================================================
   我的 —— 把「设置类」组件铺进真实场景
   ------------------------------------------------------------
   这一页是组件库里最没被用起来的一批的归宿：表单、分段、单选、
   滑块、步进器、标签输入、键值编辑、代码编辑器、树、表格、时间线、
   分页、搜索、评分、拖拽数字、颜色选择、命令面板、右键菜单、导览。
   每个都用真实的数据，而不是「示例 1 / 示例 2」。
   ============================================================ */

const router = useRouter()
const toastRef = ref(null)
const paletteOpen = ref(false)
const tourOpen = ref(false)
const contextItems = [
  { value: 'edit', label: '编辑资料' },
  { value: 'copy', label: '复制 ID' },
  { value: 'share', label: '分享' },
  { value: 'qr', label: '显示二维码' },
  { type: 'divider' },
  { value: 'danger', label: '注销账号', tone: 'danger' }
]

/* ---------- 偏好设置 ---------- */
const prefs = ref({
  density: 'comfortable',
  reminders: true,
  autoSync: false,
  weekly: true,
  theme: 'system',
  notify: 'mentions',
  sync: 'all'
})

const densityOptions = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '标准' },
  { value: 'roomy', label: '宽松' }
]

const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

const notifyOptions = [
  { value: 'all', label: '全部通知' },
  { value: 'mentions', label: '仅 @我' },
  { value: 'none', label: '不打扰' }
]

const accent = ref('#3f5f90')
const volume = ref(62)
const range = ref([30, 70])
const stepCount = ref(3)
const rating = ref(4)
const scrubValue = ref(1280)
const tags = ref(['健康', '步数', '睡眠'])
const tagInput = ref([])
const headers = ref([
  { key: 'Authorization', value: 'Bearer ****' },
  { key: 'X-Client-Id', value: 'zero-web' }
])
const jsonCode = ref('{\n  "density": "comfortable",\n  "reminders": true\n}')
const keyword = ref('')

const treeNodes = ref([
  {
    label: '账户',
    children: [
      { label: '个人资料' },
      { label: '健康目标', children: [{ label: '每日步数' }, { label: '睡眠时长' }] },
      { label: '安全' }
    ]
  },
  {
    label: '设备',
    children: [{ label: '手表' }, { label: '手机' }]
  }
])

const tableRows = ref([
  { id: 'ZC-2041', device: 'Apple Watch S9', sync: '2 分钟前', status: '正常' },
  { id: 'ZC-2039', device: 'iPhone 15', sync: '8 分钟前', status: '正常' },
  { id: 'ZC-2012', device: '体脂秤', sync: '1 小时前', status: '需重连' }
])

const tableColumns = [
  { key: 'id', label: '设备 ID', sortable: true },
  { key: 'device', label: '设备' },
  { key: 'sync', label: '最后同步' },
  { key: 'status', label: '状态' }
]

const timelineItems = [
  { title: '登录了新设备', time: '今天 09:12', text: 'Apple Watch S9 · 上海' },
  { title: '修改了健康目标', time: '昨天 21:40', text: '每日步数 10000 → 12000' },
  { title: '导出了运动数据', time: '3 天前', text: 'CSV · 128 条记录' }
]

const sideNavItems = [
  { value: 'account', label: '账户', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
  { value: 'devices', label: '设备', icon: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/>' },
  { value: 'data', label: '数据', icon: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>' },
  { value: 'about', label: '关于', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>' }
]

const sideNav = ref('account')

/* ---------- 计算 ---------- */
const filteredTree = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return treeNodes.value
  const walk = nodes => nodes
    .map(node => {
      const hit = node.label.includes(kw)
      const kids = node.children ? walk(node.children) : null
      if (hit) return node
      if (kids && kids.length) return { ...node, children: kids }
      return null
    })
    .filter(Boolean)
  return walk(treeNodes.value)
})

const appearance = computed({
  get: () => state.appearance,
  set: value => {
    state.appearance = value
    persistThemeState()
    theme.apply({ animate: true })
  }
})

const paletteItems = [
  { value: 'go:home', label: '首页', description: '跳转' },
  { value: 'go:chat', label: '对话', description: '跳转' },
  { value: 'go:activity', label: '活动', description: '跳转' },
  { value: 'go:trends', label: '趋势', description: '跳转' },
  { value: 'go:components', label: '组件库', description: '跳转' },
  { value: 'go:profile', label: '我的', description: '跳转' },
  { value: 'act:export', label: '导出健康数据', description: 'CSV / JSON' },
  { value: 'act:clear', label: '清除本地缓存', description: '危险操作' }
]

function onPalettePick(item) {
  const [kind, arg] = String(item.value).split(':')
  if (kind === 'go') router.replace({ name: arg })
  else if (kind === 'act') toast(`已触发：${item.label}`, arg === 'clear' ? 'danger' : 'info')
}

function routerPush(name) {
  const map = { home: 'home', chat: 'chat', activity: 'activity', trends: 'trends', components: 'components', profile: 'profile' }
  window.dispatchEvent(new CustomEvent('zero:goto', { detail: map[name] }))
}

function toast(text, tone = 'info') { toastRef.value?.show(text, tone) }

function onContextPick(item) {
  if (item.value === 'danger') toast('注销需要二次确认', 'danger')
  else toast(`已触发：${item.label}`, 'info')
}

function savePrefs() { toast('偏好已保存', 'success') }

const tourSteps = [
  { target: '#pref-basic', title: '基础偏好', text: '密度、外观与通知都在这里。' },
  { target: '#pref-data', title: '数据与同步', text: '导出与同步策略。' }
]
</script>

<template>
  <section class="view profile-view" data-view="profile">
    <!-- ① 账户概览 -->
    <UiCard class="profile-view__hero">
      <template #header>
        <div class="profile-view__id">
          <UiAvatar name="Alex" size="52" status />
          <div class="profile-view__meta">
            <strong>Alex</strong>
            <span>健康数据已同步 2 台设备</span>
          </div>
          <UiAvatarGroup :max="3">
            <UiAvatar name="Apple Watch" />
            <UiAvatar name="iPhone" />
            <UiAvatar name="体脂秤" />
          </UiAvatarGroup>
        </div>
      </template>

      <div class="profile-view__stats">
        <div><b>128</b><span>记录</span></div>
        <div><b>12</b><span>周连续</span></div>
        <div><b>7.4</b><span>平均睡眠</span></div>
      </div>

      <div class="profile-view__badges">
        <UiBadge tone="success">已同步</UiBadge>
        <UiChip variant="tonal" dot>实时心率</UiChip>
        <UiChip variant="tonal">iCloud 备份</UiChip>
      </div>

      <!-- 右键菜单：真的能触发 -->
      <div class="profile-view__ctx" @contextmenu.prevent>
        <UiMenu variant="context" :items="contextItems" @select="onContextPick">
          <UiButton variant="text" size="sm">右键这里</UiButton>
        </UiMenu>
      </div>
    </UiCard>

    <!-- ② 基础偏好 -->
    <UiCard id="pref-basic" title="基础偏好" description="影响整个应用的显示与提醒">
      <UiForm @submit="savePrefs">
        <UiFormField label="界面密度" hint="紧凑模式一屏能看到更多内容">
          <UiSegmented v-model="prefs.density" :options="densityOptions" />
        </UiFormField>

        <UiFormField label="外观">
          <UiSegmented v-model="prefs.theme" :options="themeOptions" />
        </UiFormField>

        <UiFormField label="通知频率">
          <UiSelect v-model="prefs.notify" :options="notifyOptions" />
        </UiFormField>

        <UiFormField label="同步频率" hint="后台刷新运动数据">
          <UiRadioGroup v-model="prefs.sync" :options="notifyOptions" />
        </UiFormField>

        <div class="profile-view__switches">
          <UiSwitch v-model="prefs.reminders" label="站立提醒" />
          <UiSwitch v-model="prefs.autoSync" label="自动同步" />
          <UiSwitch v-model="prefs.weekly" label="每周回顾" />
        </div>

        <UiButton type="submit" variant="primary">保存偏好</UiButton>
      </UiForm>
    </UiCard>

    <!-- ③ 目标与数值 -->
    <UiCard title="目标" description="拖动或输入都可以">
      <div class="profile-view__grid">
        <UiFormField label="每日步数">
          <UiStepper v-model="stepCount" :min="0" :max="30" unit="千步" />
        </UiFormField>

        <UiFormField label="提醒音量">
          <UiSlider v-model="volume" :min="0" :max="100" show-scale :stops="[0, 50, 100]" />
        </UiFormField>

        <UiFormField label="有效心率区间">
          <UiRangeSlider v-model="range" :min="0" :max="100" :step="1" unit="%" />
        </UiFormField>

        <UiFormField label="主观疲劳度" hint="点星星可选半颗或整颗">
          <UiRating v-model="rating" :max="5" half />
        </UiFormField>

        <UiFormField label="步长校准" hint="拖动数字直接改">
          <UiScrubField v-model="scrubValue" :min="0" :max="20000" :step="20" unit="步" />
        </UiFormField>

        <UiFormField label="主题色" hint="用于图表与高亮">
          <UiColorPicker v-model="accent" :swatches="['#3f5f90', '#7438ff', '#ff9838', '#00d4d1', '#0f766e']" />
        </UiFormField>
      </div>
    </UiCard>

    <!-- ④ 标签与键值 -->
    <UiCard title="数据同步" description="自定义请求头与同步标签">
      <UiFormField label="同步标签" hint="回车添加">
        <UiTagInput v-model="tagInput" placeholder="添加标签" />
      </UiFormField>

      <UiFormField label="请求头" hint="密钥字段已加密">
        <UiKeyValueEditor v-model="headers" secret />
      </UiFormField>
    </UiCard>

    <!-- ⑤ 搜索 + 树 -->
    <UiCard id="pref-data" title="配置项" description="按关键字过滤">
      <UiSearchField v-model="keyword" placeholder="搜索配置项…" @search="toast('已搜索')" />

      <UiTreeView :nodes="filteredTree" class="profile-view__tree" />

      <UiPagination :total="12" :page-size="6" />
    </UiCard>

    <!-- ⑥ 表格 + 时间线 -->
    <UiCard title="设备" description="最近同步的设备">
      <UiDataTable :columns="tableColumns" :rows="tableRows" :max-height="220" />
    </UiCard>

    <UiCard title="最近操作">
      <UiTimeline :items="timelineItems" time-position="left" />
    </UiCard>

    <!-- ⑦ 代码 + 杂项 -->
    <UiCard title="调试" description="本地配置预览">
      <UiCodeEditor v-model="jsonCode" language="json" :lines="6" />

      <div class="profile-view__misc">
        <UiBreadcrumb :items="[{ label: '设置' }, { label: '调试' }, { label: '配置' }]" />
        <UiLink href="https://example.com/docs" external>配置文档</UiLink>
        <UiMarquee text="实时心率同步中 · 步数累计 7842 · 距离目标还差 2158 步" :speed="28" />
      </div>
    </UiCard>

    <!-- ⑧ 侧栏 + 导览 + 命令面板入口 -->
    <UiCard title="更多">
      <UiSideNav
        :items="sideNavItems"
        :active="sideNav"
        contain
        title="设置分区"
        @select="v => (sideNav = v)"
      />

      <div class="profile-view__actions">
        <UiButton variant="tonal" @click="tourOpen = true">开始导览</UiButton>
        <UiButton variant="outline" @click="paletteOpen = true">命令面板</UiButton>
        <UiPopover placement="top">
          <template #trigger>
            <UiButton variant="text">关于这个应用</UiButton>
          </template>
          <p style="max-width: 240px; margin: 0; font-size: var(--fs-small); color: var(--on-surface-variant)">
            zero-ai-ui-lib 演示应用 · 组件库 + 真实场景
          </p>
        </UiPopover>
      </div>
    </UiCard>

    <UiAlert tone="info" title="数据都在本地">
      演示应用不联网，所有记录存在浏览器 localStorage 里。
    </UiAlert>

    <UiToastHost ref="toastRef" />
    <UiCommandPalette v-model="paletteOpen" :items="paletteItems" @select="onPalettePick" />
    <UiTour v-model="tourOpen" :steps="tourSteps" />
  </section>
</template>

<style scoped>
.profile-view { gap: var(--space-gap); }

.profile-view__id {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.profile-view__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.profile-view__meta strong { font-size: var(--fs-body); }
.profile-view__meta span {
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
}

.profile-view__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.profile-view__stats div { display: flex; flex-direction: column; gap: 2px; }
.profile-view__stats b {
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
.profile-view__stats span { font-size: var(--fs-micro); color: var(--on-surface-variant); }

.profile-view__badges { display: flex; gap: 6px; flex-wrap: wrap; }
.profile-view__ctx { margin-top: 12px; display: flex; justify-content: flex-end; }

.profile-view__switches {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 4px 0 12px;
}

.profile-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.profile-view__tree { margin: 12px 0; max-height: 220px; overflow: auto; }

.profile-view__misc {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  margin-top: 12px;
  overflow: hidden;
}

.profile-view__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
</style>