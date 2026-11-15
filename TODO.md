# TODO — 未完成事项（持久记录）

> 说明：会话级的 todo 工具在下一轮会清空，所以**真正的待办写在这里**。
> 每完成一项就改这一份，不依赖会话记忆。

## A. 已实现但还没接线（有代码、没导出 / 没类型 / 没文档 / 没示例）

| 组件 | ui/index 导出 | d.ts 声明 | AGENTS 组件表 | 示例页 |
|---|---|---|---|---|
| UiColorPicker / UiAutocomplete | ✅ | ✅ | ❌ | ❌ |
| UiForm / UiFormField | ✅ | ✅ | ❌ | ❌ |
| UiNumberInput | ✅ | ✅ | ❌ | ❌ |
| UiDateInput / UiTimeInput | ✅ | ✅ | ❌ | ❌ |
| UiFileUpload | ✅ | ✅ | ❌ | ❌ |
| UiBreadcrumb / UiPagination | ✅ | ✅ | ❌ | ❌ |
| UiSidebar / UiSlideover | ✅ | ✅ | ❌ | ❌ |
| UiNavigationMenu | ✅ | ✅ | ❌ | ❌ |
| UiGrid / UiRow / UiCol | ✅ | ✅ | ❌ | ❌ |
| UiSplitter | ✅ | ✅ | ❌ | ❌ |
| UiScrollArea | ✅ | ✅ | ❌ | ❌ |
| UiContextMenu / UiCommandPalette | ✅ | ✅ | ❌ | ❌ |
| UiTour / UiPopover / UiBanner | ✅ | ✅ | ❌ | ❌ |
| UiToastQueue | ✅ | ✅ | ❌ | ❌ |
| UiKbd / UiIcon / UiVirtualScroll | ✅ | ✅ | ❌ | ❌ |
| UiCalendar / UiTimeline / UiCarousel / UiMarquee | ✅ | ✅ | ❌ | ❌ |
| core：a11y / directives / shortcuts / icons / springPhysics | ✅ lib 入口导出 | ❌ | 部分 | ❌ |

→ d.ts 31 个声明**已补**（本轮）。待办：**AGENTS 组件表行 + 示例页分区演示**。

## B. 完全没实现的能力

1. **UiDataTable 增强**：行分组、服务端分页（`@page-change`）、列显隐（`v-model:columns`）、多选。
2. **UiTreeView 增强**：过滤（`filter` 关键字）、拖拽换父、多选级联（父子联动）。
3. **CardGroup 一批重做**（逐条来自用户反馈）：
   - ✅ gallery：改成「居中索引」单一状态，轨道位移由它算（卡片宽度 < 视口时
     也不再贴左）；方向键 / 自动推进走弹簧；resize 后重新居中。实测选中卡中心 = 视口中心（误差 0）。
   - ✅ scroll-stack：提前 1.2 张开始缩；压暗改为「变淡 + 最多 12% 亮度」。
   - ✅ stack：甩出后由 `tuck` 弹簧从飞出姿态收到堆底（不再闪现）；
     同时把牌堆卡上的入场动画关掉 —— 重排让 `--i` 变化会重跑 cgCardIn，那才是闪现根因。
   - ✅ 方向键：gallery 已确认有动画（轨道位移逐帧变化）。
   - ✅ depth：拖动改成 1:1 跟手（拖 120px 卡走 120px），松手按速度投射吸附整格，可多格；点击侧卡也会滑到最前。
   - ✅ wall：平面铺满舞台（4 列 × 3 份），位移在 -1/3 平面高之间无缝循环，拖拽跟手 + 惯性。
   - ✅ bounce：改成共同圆心的扇形（下缘外 150% 为轴），选中的卡内联 z-index 42 真的在最上层；悬停不再瞬移到屏幕中间。
   - ◐ **Stack 与 CardSwap 拆成两套机制**：Stack 已是物理牌堆（lean / face / tuck 各走各的弹簧），
     CardSwap 仍复用牌堆的 DOM 结构，只是加了 rest → exit → enter 阶段机；后续可独立成 3D 轮换台。
4. ✅ **Button hold 完整动画**：按住有扩散波纹、填充前缘辉光、完成态整颗填充 + 勾 + 弹一下。
5. **BottomSheet 锚点规则**（用户两次提出）：
   - 内容全高 < 60% 时；不要出现 60% 档；
   - 内容全高 < 95% 时；必须在「内容完整显示」的高度加吸附；
   - 有压暗背景的版本不要 20% 档（已做）。
6. **Playground**：本轮已改成 UiBottomSheet + StyleLab；后续可加组件级预览选择器。

## C. 进度记录（最近提交）

- 本轮（第三段）：CardGroup 的 depth / wall / bounce 重做；hold 按钮加波纹 + 前缘辉光 + 完成态弹一下；
  「更多组件」新分区（9 格，覆盖 31 个组件）+ AGENTS 组件表补齐 31 行 + 补 UiCol 导出。

- 本轮（第二段）：弹簧曲线按气质重算（`core/spring.js` 之前用 ζ=1 写死 → 活泼永不回弹）；
  `animateSpring` 精度随行程缩放（scale 0.06 的动画不再一帧结束）；
  ExpandableCard 收起时用占位块**现场重测**落点；RangeSlider 吸附改真弹簧（不再瞬移）；
  UiSelect 长列表封顶 62% 视口 + 自动滚到选中项 + 展开瞬间忽略滚动事件；
  BottomSheet 锚点严格低于内容全高 / 有把手不再有关闭键；
  滑块族松手「缩到 70% 再 duang 回弹」；开关/分段的**位移**换温和弹簧、**尺寸**变化放大。

- 本轮：CardGroup gallery 选中卡居中（实测误差 0）、方向键有动画、scroll-stack 提前缩小 + 减淡、stack 甩出改用 tuck 弹簧回堆底（关掉牌堆卡入场动画）、提示浮签移到舞台内

- 本轮：新增 `--spring-pop` / `--spring-pop-dur` / `--t-pop`（克制模式纯减速不回弹，活泼模式过冲 2.6）并接到开关把手、勾选框、分段指示器、Chip、滑块把手、单选圆点、评分星、Tab 图标、波轮行；补齐 31 个组件的 d.ts 声明

- `6115c39` 活泼模式加强 / 字体栈（阿里巴巴普惠体 3.0 优先）/ Playground 重写 / 示例页分类选择器 / 修全屏遮罩导致交互失效
- `b581a85` StepFlow 指示器、MediaViewer 关闭、StatusMark 底槽、保险丝初始隐藏与尺寸、slide 圆角、删除线擦除方向、TooltipGroup 图标按钮
- `4760d75` 打字机逐字 blur 进场 + 验证码按 react-bits CodeSlots 重做
- `f1178c2` 动作按钮三修 + Playground 收编 + CardGroup 真弹簧
