# zero-ai-ui-lib

Vue 3 组件库：形变菜单、自绘下拉、日期 / 时间选择器、可展开卡片、底部面板与对话框。
基于 CSS 变量令牌，自带动效体系（弹簧曲线 + 模糊内容替换）。

- 作者：Jaly
- 依赖：Vue 3（`vue-router` 仅 `ExpandableCard` / `RouteExpandCard` 需要，可选）

## 安装

```bash
npm i zero-ai-ui-lib
```

## 使用

```js
import { createApp } from 'vue'
import 'zero-ai-ui-lib/style.css'
import { UiButton, UiSelect, UiFloatingMenu, UiModal } from 'zero-ai-ui-lib'

createApp(App).mount('#app')
```

```vue
<script setup>
import { ref } from 'vue'
import { UiSelect, UiDatePicker, UiTimePicker, UiToolMenu } from 'zero-ai-ui-lib'

const type = ref('walk')
const date = ref('2026-01-01')
const time = ref('09:00')
const options = [
  { label: '步行', value: 'walk' },
  { label: '跑步', value: 'run' }
]
</script>

<template>
  <UiSelect v-model="type" label="运动类型" :options="options" />
  <div style="display: flex; gap: 10px">
    <UiDatePicker v-model="date" label="日期" />
    <UiTimePicker v-model="time" label="时间" />
  </div>
  <UiToolMenu label="工具" :items="options" @select="() => {}" />
</template>
```

## 组件

按钮与操作：`UiButton` `UiChip` `UiBadge` `UiFloatingMenu` `UiToolMenu` `UiSegmented` `UiStepper` `UiRating`

表单：`UiInput` `UiTextarea` `UiSelect` `UiSwitch` `UiCheckbox` `UiRadioGroup` `UiSlider` `UiRangeSlider` `UiRingSlider` `UiGaugeSlider` `UiDatePicker` `UiTimePicker` `UiRangeDatePicker` `UiWheelDatePicker` `UiRangeTimePicker` `UiStepper`

数据录入：`UiTagInput` `UiKeyValueEditor` `UiSchemaForm`（JSON Schema 生成表单）

数据与可视化：`UiSparkline` `UiBarChart` `UiLineChart` `UiRingProgress` `UiGauge` `UiHeatmap` `UiProgress` `UiSkeleton` `UiSpinner` `UiDataTable` `UiTreeView` `UiVirtualList`（虚拟滚动 + 滑动多选）`UiRollNumber`（全库统一数字动效）

工程与代码：`UiCodeEditor`（行号 / 高亮 / Tab 缩进）、`UiTerminalOutput`（ANSI 着色 + 跟随滚动）

反馈与浮层：`UiAlert` `UiTooltip` `UiToastHost`（success/error/warning/info + 队列）`UiEmptyState` `UiModal` `UiBottomSheet` `UiAccordion` `UiConfirmDialog` / `confirmDialog()`（替代 window.confirm）、`UiImageViewer`（缩放 / 旋转 / 下载）、`UiFileDropzone`（拖拽上传）

搜索与状态：`UiSearchField`（图标原地形变）

编码与图形：`UiCodeImage`（children 传文本渲染二维码 / 一维码，多码制可切换，内容不合规自动禁用与降级）

导航：`UiTabBar`（移动端贴底铺满整宽、桌面端贴左竖排铺满整高，两套定位互斥不冲突）

交互基座：`UiMorphPanel`（泛用「按钮 ⇄ 任意组件」形变容器）、`UiWheel`（通用多列波轮基座，时间 / 日期波轮共用）

布局与卡片：`UiAvatar` `UiEmptyState` `ExpandableCard` `RouteExpandCard`

组合式函数：`usePress`（按压反馈）、`useMorphWindow`（从输入框形变成浮动窗口）

工具函数：`formatDuration` / `formatDurationBetween` / `parseClockTime`（00h00m00s 时长规则）、`confirmDialog`、`highlightToHtml` / `ansiToHtml`

> 类型：包自带 `dist/index.d.ts`（手写声明，exports.types 已接好），TS 项目直接获得 props 提示，无需 declare module 兜底。

## 主题

样式通过 CSS 变量驱动，库自带 `tokens.css` 的默认浅色令牌。
覆盖主题时只需在应用根节点重设同名变量：

```css
:root {
  --primary: #3f5f90;
  --primary-container: #d7e2ff;
  --background: #faf9fd;
  --on-surface: #1b1b1f;
  --radius-scale: 1;
  --press-scale: 0.97;
}
```

形变动效统一走 `--spring-*` / `--t-*` 令牌，配合 `prefers-reduced-motion` 自动降级。

## 可展开卡片

`ExpandableCard` / `RouteExpandCard` 依赖 `vue-router`，用于「点击卡片展开成详情、URL 保持父/子层级」。
接入方式见仓库内 `docs/route-expand-card.md`。
