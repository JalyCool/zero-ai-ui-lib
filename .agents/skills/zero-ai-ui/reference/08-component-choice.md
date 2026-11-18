# 组件选用规范（先读这篇再动手）

AI 最容易犯的错不是「不会用组件」，而是**用错组件**或**自己造一个**。
下面三件事按顺序做：① 这件事库里有专门组件吗？② 该用哪个变体？③ 相似的两个怎么区分？

---

## 1. 这件事该用库的哪个组件（速查）

| 要做的事 | 用 | 不要用 |
| --- | --- | --- |
| 页面骨架 / 滚动 / 边缘模糊 | `ZeroApp` + `ZeroScroll` | 手写 `overflow-y:auto` 容器、逐页配 `UiProgressiveBlur` |
| 页面标题 + 上滑后的小标题条 | `AppHead` | 自造 `.view-head` / 每个页面写一套标题+按钮行 |
| 底部导航 / 侧边导航 | `UiTabBar` / `UiSideNav` | 手写 tab 条、自己算高亮 |
| 普通动作 | `UiButton`（含 `fuse`/`hold`/`slide` 变体） | `<button class="btn">` |
| 下拉选择 | `UiSelect`（单选）/ `UiSelect multiple`（多选） | 自绘列表浮层 |
| 输入即筛选的下拉 | `UiAutocomplete` | 拿 `UiSelect` 硬拼过滤 |
| 日期 / 时间 / 区间 | `UiDatePicker`（`mode=grid\|wheel\|range`）、`UiTimePicker`（`mode=single\|range`） | 三个不同组件名混用、自己拼两个时间选择器 |
| 任何「点一下弹出选项」 | `UiMenu`（`variant=floating\|tool\|context`） | 同时用 FloatingMenu / ToolMenu / ContextMenu 三套名字 |
| 弹窗 / 底部抽屉 / 长面板 | `UiModal` / `UiBottomSheet` / `UiSlideover` | 自己 `position:fixed` + 遮罩 |
| 轻提示 | `UiToastHost` | `alert()`、自写浮层 |
| 操作告警 | `UiAlert` | 自写横幅 |
| 危险确认 | `confirmDialog()` | `window.confirm`（阻塞且样式断层） |
| 悬浮说明 | `UiTooltip` / `UiPopover` / `UiTour`（引导） | 自写气泡 |
| 图表 | `UiChart type=bar\|line\|spark\|heat\|ring\|gauge` | 六个图表组件名混用 |
| 列表 + 排序 / 分组 / 分页 | `UiDataTable` | 手写 `<table>` + 排序逻辑 |
| 树 / 虚拟长列表 / 滑动操作行 | `UiTreeView` / `UiVirtualList` / `UiSwipeRow` | 递归手写、一次性渲染全部行 |
| 卡片翻转 / 多形态卡片组 | `UiCardGroup`（`variant=gallery\|circular\|depth\|wall\|stack\|swap\|bounce…`） | 为每形态写一套组件 |
| 对话流 | `UiChatThread` + `UiChatMessage` + `UiChatSystemLine` + `UiChatComposer` | 自写消息列表 / 另做 mention |
| Markdown 正文 | `MarkdownView` | `v-html`（注入风险） |
| 文字动效 | `UiText`（打字机 / 掠光 / 渐变） | 自写逐字定时器 |
| 数字变化动效 | `UiRollNumber` | 直接改文本 |
| 状态指示 | `UiStatusMark` / `UiSkeleton` / `UiSpinner` / `UiProgress` | 自画圈、自画占位块 |
| 头像 | `UiAvatar` / `UiAvatarGroup` / `UiAgentAvatar` / `UiAvatarTag` | 自写圆形裁切 + 首字母 |
| 图标 | `UiIcon` | 引入第二套图标库 |
| 链接 | `UiLink` | 裸 `<a>` 手写样式 |

---

## 2. 什么时候**不该**用某个组件

- **`UiModal` vs 内联展开**：内容就在当前页、不需要打断 → 用 `UiAccordion` 或原地展开；需要用户显式确认 / 聚焦完成 → `UiModal`。
- **`UiBottomSheet`**：移动端为主的操作面板、选项不多；桌面端长内容用 `UiSlideover`。
- **`UiDataTable`**：只有两三列的简单列表别上表格（开销大、视觉重）；超过 5 列或有排序需求才用。
- **`UiVirtualList`**：行数 < 100 直接 `v-for`，虚拟滚动反而增加复杂度。
- **`UiCardGroup`**：只是静态展示一组卡片 → `UiGrid` + `UiCard`；需要拖拽 / 轮转 / 3D 形态才用 CardGroup。
- **`UiChart type="heat"`**：只有一周数据时热力图没有意义；少于 4 周考虑柱状图。
- **`UiSparkline`**：装饰性迷你趋势（卡片角标）；需要读数 / 交互 → 折线。
- **`UiRingSlider` / `UiGaugeSlider`**：滑块要圆盘形态才用；普通数值区间用 `UiSlider` / `UiRangeSlider`。
- **`UiTerminalOutput` / `UiCodeEditor`**：仅当真的展示代码 / 日志；普通文本别用等宽终端壳。
- **`UiTour`**：只用于首次引导；常驻说明用 `UiTooltipGroup`。

---

## 3. 相似组件的区别（最容易选错的六组）

### 3.1 `UiSelect` / `UiAutocomplete` / `UiMenu`
- `UiSelect`：**从给定选项里选一个**（闭合语义），带搜索框但本质是选择器。
- `UiAutocomplete`：**输入为主**，选项是建议，`free` 允许提交不在选项里的值（搜索框场景）。
- `UiMenu`：**动作列表**（「编辑 / 删除 / 分享」），不是数据选择，选中即执行。

> 判断口诀：选值 → Select；搜内容 → Autocomplete；执行操作 → Menu。

### 3.2 `UiMenu variant="floating"` / `"tool"` / `"context"`
- `floating`：有当前选中值（`v-model`），原地长成面板（排序方式、视图切换）。
- `tool`：无选中值概念，`@select` **回传整个 item 对象**（「更多操作」）。
- `context`：包住任意内容，**右键 / 长按**在指针处弹出行操作。

### 3.3 `UiModal` / `UiBottomSheet` / `UiSlideover` / `UiSidebar`
- `UiModal`：居中、压暗模糊、强打断（确认 / 表单）。
- `UiBottomSheet`：贴底、可拖拽把手、锚点吸附（移动端操作面板）。
- `UiSlideover`：从侧边整块推入、不压暗（查阅型面板，如详情）。
- `UiSidebar`：**常驻**侧栏的展开 / 收起（导航结构，不是临时面板）。

### 3.4 `UiSwitch` / `UiCheckbox` / `UiRadioGroup`
- `UiSwitch`：**立即生效的布尔开关**（设置项）。
- `UiCheckbox`：**可多选的列表项 / 协议勾选**，或单个「记住我」。
- `UiRadioGroup`：**互斥单选**（性别、支付方式）。
> 一个「启用通知」永远用 Switch，不要用 Checkbox 凑。

### 3.5 `UiSlider` / `UiRangeSlider` / `UiStepper` / `UiScrubField`
- `UiSlider`：连续 / 分档单值，带刻度与吸附（音量、亮度）。
- `UiRangeSlider`：**区间** `[lo, hi]`（价格区间、时长范围）。
- `UiStepper`：**离散数量**（商品件数），有 +/- 控件和单位。
- `UiScrubField`：**横向拖动改数字读数**（参数微调台），点击可切输入框。

### 3.6 `UiCard` / `UiCardGroup` / `RouteExpandCard`
- `UiCard`：静态内容容器（三段：header / body / footer）。
- `UiCardGroup`：一组卡的**交互形态**（拖拽、轮转、牌堆）。
- `RouteExpandCard`：列表项**点开后变成子路由详情页**（返回即收起）。
> 想「点开看详情」就用 RouteExpandCard，别自己写展开态 + `push`。

---

## 4. 反模式清单（出现即改）

- 同一个页面里既用 `UiButton` 又写 `<button class="x">`。
- 用 `UiSelect` 做「删除 / 编辑」这类操作列表。
- 日期选择同时出现 `UiWheelDatePicker`、`UiRangeDatePicker` 这种旧名（已合并，见 `UiDatePicker mode`）。
- 给卡片、告警加 `box-shadow` 或装饰性描边。
- 在浮层祖先上用 `transform` / `filter`（包含块被劫持）。
- 把 `motion tone` 做成用户设置项。
- 消息组件里自己实现 `@mention` 渲染。
