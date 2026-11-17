<script setup>
import { computed, ref } from 'vue'
import {
  UiAccordion, UiAutocomplete, UiAvatarTag, UiCodeImage, UiCodeSlots,
  UiFileDropzone, UiIcon, UiKbd, UiNavigationMenu, UiRangeTimePicker,
  UiRollNumber, UiSchemaForm, UiScrollArea, UiSidebar, UiSideNav, UiSlideover,
  UiSpinner, UiTerminalOutput, UiText, UiToolMenu, UiWheel, ZeroScroll, MarkdownView
} from '../lib'

/* ============================================================
   实验室 —— 剩下那些「不好归到业务场景」的组件的归宿
   ------------------------------------------------------------
   这些组件要么是纯输入型（验证码、文件、代码、schema），
   要么是展示型（终端、日志、导航、图标），硬塞进首页/活动页
   反而假。给它们一个真实的实验台：每一块都有真实数据，
   每一块都能真的操作。
   ============================================================ */

/* ---------- 验证码 ---------- */
const codeValue = ref('')
const codeStatus = ref('idle')

/* ---------- 文件拖放 ---------- */
const files = ref([])
const rejected = ref([])

/* ---------- Schema 表单 ---------- */
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: '应用名称', description: '会显示在侧栏顶部' },
    port: { type: 'integer', title: '端口', minimum: 1, maximum: 65535 },
    ratio: { type: 'number', title: '采样率', multipleOf: 0.1 },
    mode: { type: 'string', enum: ['auto', 'manual', 'off'], title: '运行模式' }
  },
  required: ['name']
}
const schemaOut = ref({})

/* ---------- 自动补全 ---------- */
const autoValue = ref('')
const autoOptions = [
  { value: '苹果', label: '苹果' },
  { value: '香蕉', label: '香蕉' },
  { value: '蓝莓', label: '蓝莓' },
  { value: '车厘子', label: '车厘子' },
  { value: '草莓', label: '草莓' }
]

/* ---------- 时间范围 ---------- */
const timeRange = ref({ start: '', end: '' })

/* ---------- 终端 ---------- */
const logText = computed(() => {
  const lines = [
    '\u001b[32m[ok]\u001b[0m   服务已启动 \u001b[90m监听 5173\u001b[0m',
    '\u001b[36m[info]\u001b[0m 正在同步 128 条运动记录…',
    '\u001b[33m[warn]\u001b[0m 心率传感器在 09:12 短暂断连',
    '\u001b[32m[ok]\u001b[0m   同步完成，耗时 \u001b[1m1.4s\u001b[0m',
    '\u001b[31m[err]\u001b[0m  体重秤连接失败，已重试 3 次',
    '\u001b[32m[ok]\u001b[0m   已进入低功耗模式'
  ]
  return lines.join('\n')
})

/* ---------- 侧栏 ---------- */
const navItems = [
  { value: 'overview', label: '总览', icon: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>' },
  { value: 'devices', label: '设备', icon: '<rect x="5" y="2" width="14" height="20" rx="2.5"/>' },
  { value: 'logs', label: '日志', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
  { value: 'settings', label: '设置', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>' }
]
const navActive = ref('overview')

/* ---------- 抽屉 ---------- */
const slideOpen = ref(false)

/* ---------- 折叠面板 ---------- */
const accordions = ref([
  { title: '采样频率', text: '每 5 秒采一次心率，每 30 秒同步一次位置。提高到每 1 秒会更耗电。' },
  { title: '数据保留', text: '原始数据保留 90 天，聚合数据永久保留。' },
  { title: '隐私', text: '所有数据只存在本机，不会上传到任何服务器。' }
])

/* ---------- 导航菜单 ---------- */
const navMenuItems = [
  {
    value: 'data',
    label: '数据',
    children: [
      { value: 'import', label: '导入' },
      { value: 'export', label: '导出' }
    ]
  },
  {
    value: 'help',
    label: '帮助',
    children: [
      { value: 'faq', label: '常见问题' },
      { value: 'contact', label: '联系我们' }
    ]
  }
]

/* ---------- 滚轮 ---------- */
const wheelColumns = [
  { items: Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1} 月`, value: i + 1 })), value: 3, separator: '月' },
  { items: Array.from({ length: 28 }, (_, i) => ({ label: `${i + 1} 日`, value: i + 1 })), value: 18, separator: '日' }
]

/* ---------- 工具菜单 ---------- */
const toolItems = [
  { value: 'copy', label: '复制配置' },
  { value: 'reset', label: '重置' },
  { value: 'export', label: '导出 JSON' }
]

/* ---------- 二维码 ---------- */
const qrContent = 'https://zero-ai-ui-lib.dev/sync?token=demo'

/* ---------- 数字动效 ---------- */
const rollValue = ref(0)
const rollText = ref('7842')

/* ---------- 文本动效 ---------- */
const typedPhrases = ['读取传感器…', '计算步数…', '同步完成']
</script>

<template>
  <section class="view lab-view" data-view="lab">
    <!-- 数字与文字动效 -->
    <div class="lab-grid">
      <div class="lab-card">
        <h3 class="lab-title">数字滚动 <UiKbd keys="R" /></h3>
        <UiRollNumber :value="rollText" size="28px" />
        <div class="lab-row">
          <button class="lab-btn" @click="rollText = String(Math.round(Math.random() * 12000))">换值</button>
        </div>
      </div>

      <div class="lab-card">
        <h3 class="lab-title">文字动效</h3>
        <UiText variant="type" :phrases="typedPhrases" :cps="18" type-effect="blur" />
      </div>

      <div class="lab-card">
        <h3 class="lab-title">加载态 <UiSpinner :size="18" /></h3>
        <UiSpinner :size="26" />
        <UiSpinner :size="34" />
      </div>

      <div class="lab-card">
        <h3 class="lab-title">图标</h3>
        <div class="lab-icons">
          <UiIcon name="pack:heart" />
          <UiIcon name="pack:activity" />
          <UiIcon name="pack:moon" />
          <UiIcon name="mdi:run" />
        </div>
      </div>
    </div>

    <!-- Markdown -->
    <div class="lab-card">
      <h3 class="lab-title">Markdown 渲染</h3>
      <MarkdownView
        content="**加粗**、*斜体*、`行内代码`、[链接](https://example.com)。\n\n> 引用块\n\n- 列表项一\n- 列表项二\n\n| 指标 | 值 |\n| --- | --- |\n| 步数 | 7842 |"
      />
    </div>

    <!-- 提及药丸 -->
    <div class="lab-card">
      <h3 class="lab-title">提及药丸</h3>
      <div class="lab-row">
        <UiAvatarTag name="Guide" agent agent-shape="triangle" agent-color="#7438ff" />
        <UiAvatarTag name="Gourmet" agent agent-shape="circle" agent-color="#ff9838" />
        <UiAvatarTag name="Planner" agent agent-shape="squircle" agent-color="#00d4d1" />
        <UiAvatarTag name="普通用户" src="" />
      </div>
    </div>

    <!-- 验证码 -->
    <div class="lab-card">
      <h3 class="lab-title">验证码</h3>
      <UiCodeSlots v-model="codeValue" :length="6" @status="s => (codeStatus = s)" />
      <p class="lab-note">状态：{{ codeStatus || 'idle' }}</p>
    </div>

    <!-- 自动补全 -->
    <div class="lab-card">
      <h3 class="lab-title">自动补全</h3>
      <UiAutocomplete v-model="autoValue" :options="autoOptions" free />
    </div>

    <!-- 时间范围 -->
    <div class="lab-card">
      <h3 class="lab-title">时间范围</h3>
      <UiRangeTimePicker v-model="timeRange" precision="h" />
    </div>

    <!-- Schema 表单 -->
    <div class="lab-card">
      <h3 class="lab-title">Schema 表单</h3>
      <UiSchemaForm :schema="schema" @submit="v => (schemaOut = v)" />
      <pre v-if="Object.keys(schemaOut).length" class="lab-pre">{{ JSON.stringify(schemaOut, null, 2) }}</pre>
    </div>

    <!-- 文件拖放 -->
    <div class="lab-card">
      <h3 class="lab-title">文件拖放</h3>
      <UiFileDropzone accept="image/*,.pdf" :max-size="5" @reject="r => rejected.push(r)" />
      <ul v-if="files.length" class="lab-files">
        <li v-for="f in files" :key="f.name">{{ f.name }}</li>
      </ul>
      <p v-if="rejected.length" class="lab-note lab-note--warn">
        已拒绝 {{ rejected.length }} 个文件（类型或大小不符）
      </p>
    </div>

    <!-- 终端 -->
    <div class="lab-card">
      <h3 class="lab-title">终端输出</h3>
      <UiTerminalOutput :text="logText" follow />
    </div>

    <!-- 自定义滚动区 -->
    <div class="lab-card">
      <h3 class="lab-title">自定义滚动区</h3>
      <UiScrollArea max-height="140px">
        <div class="lab-scroll-body">
          <p v-for="n in 12" :key="n">第 {{ n }} 行 —— 贴边时出现渐隐阴影。</p>
        </div>
      </UiScrollArea>
    </div>

    <!-- ZeroScroll：局部滚动区自带「溢出即模糊」，不用再手搭模糊层 -->
    <div class="lab-card">
      <h3 class="lab-title">零配置滚动区 <small>ZeroScroll</small></h3>
      <div class="lab-zero-scroll">
        <ZeroScroll id="labScroll" :fade="56" :fade-blur="7" padding="12px 14px">
          <div class="lab-scroll-body">
            <p v-for="n in 16" :key="n">第 {{ n }} 行 —— 上下滚动，靠边的一侧自己糊起来。</p>
          </div>
        </ZeroScroll>
      </div>
    </div>

    <!-- 折叠面板 -->
    <div class="lab-card">
      <h3 class="lab-title">折叠面板</h3>
      <UiAccordion :items="accordions" />
    </div>

    <!-- 导航菜单 + 工具菜单 -->
    <div class="lab-grid">
      <div class="lab-card">
        <h3 class="lab-title">导航菜单</h3>
        <UiNavigationMenu :items="navMenuItems" @select="item => (navActive = item.value)" />
      </div>

      <div class="lab-card">
        <h3 class="lab-title">工具菜单</h3>
        <UiToolMenu :items="toolItems" label="配置" />
      </div>
    </div>

    <!-- 滚轮 + 二维码 -->
    <div class="lab-grid">
      <div class="lab-card">
        <h3 class="lab-title">滚轮</h3>
        <UiWheel :columns="wheelColumns" />
      </div>

      <div class="lab-card">
        <h3 class="lab-title">二维码</h3>
        <UiCodeImage type="qrcode">{{ qrContent }}</UiCodeImage>
      </div>
    </div>

    <!-- 抽屉 + 侧栏 -->
    <div class="lab-grid">
      <div class="lab-card">
        <h3 class="lab-title">抽屉</h3>
        <button class="lab-btn" @click="slideOpen = true">打开</button>
      </div>

      <div class="lab-card">
        <h3 class="lab-title">侧栏</h3>
        <UiSidebar v-model="slideOpen" title="详情">
          <p style="margin: 0; font-size: var(--fs-small); color: var(--on-surface-variant)">
            侧栏内容
          </p>
        </UiSidebar>
      </div>
    </div>

    <UiSlideover v-model="slideOpen" title="记录详情" side="right" width="320px">
      <p>抽屉里的内容。抽屉从右侧整块推入。</p>
      <ul class="lab-files">
        <li>今天的步数 7,842</li>
        <li>睡眠 7.4 小时</li>
        <li>静息心率 62 bpm</li>
      </ul>
    </UiSlideover>

    <!-- 侧边导航 -->
    <div class="lab-card">
      <h3 class="lab-title">侧边导航</h3>
      <UiSideNav
        :items="navItems"
        :active="navActive"
        contain
        title="实验台"
        @select="v => (navActive = v)"
      />
    </div>
  </section>
</template>

<style scoped>
.lab-view { gap: var(--space-gap); }

.lab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.lab-card {
  padding: 14px;
  border-radius: calc(var(--r-card) * var(--radius-scale));
  background: var(--surface-container-low);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.lab-title {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  gap: 6px;
}

.lab-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.lab-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: var(--border-w) solid var(--outline-variant);
  background: var(--surface);
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}
.lab-btn:active { transform: scale(var(--press-scale)); }

.lab-icons { display: flex; gap: 10px; align-items: center; color: var(--on-surface); }

.lab-note {
  margin: 0;
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
}
.lab-note--warn { color: var(--error); }

.lab-pre {
  margin: 0;
  padding: 10px;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  overflow: auto;
}

.lab-files {
  margin: 0;
  padding-left: 18px;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
}

.lab-scroll-body p { margin: 0 0 8px; font-size: var(--fs-small); }

.lab-zero-scroll {
  height: 180px;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  overflow: hidden;
  background: var(--surface);
}
</style>