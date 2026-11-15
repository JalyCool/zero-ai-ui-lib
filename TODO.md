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
   - gallery：选中卡应居中（现在是按偏移吸附，选中项不在视口正中）；
   - depth：触控交互很差，要按原库改成跟手 + 惯性 + 吸附；
   - wall：所有卡片堆在一起（布局/透视平面需要重写）；
   - scroll-stack：不用滚到头就开始缩小；压暗过深 → 改为透明度 + 轻微压暗；
   - stack / swap：甩出后回队尾是**闪现**，要补 tween（原库 `tuck` 弹簧）；
   - bounce：扇形布局被做乱，需要重做；
   - 所有形态：方向键切换时也必须有动画（现在直接跳）。
   - **Stack 与 CardSwap 必须拆成两套机制**：Stack = 物理牌堆（lean / face / tuck），
     CardSwap = 3D 轮换台（rest → exit → enter 阶段机）。
4. **Button hold 完整动画**：按压波（wave）、发光（glow）、完成态、松手回弹曲线。
5. **BottomSheet 锚点规则**（用户两次提出）：
   - 内容全高 < 60% 时；不要出现 60% 档；
   - 内容全高 < 95% 时；必须在「内容完整显示」的高度加吸附；
   - 有压暗背景的版本不要 20% 档（已做）。
6. **Playground**：本轮已改成 UiBottomSheet + StyleLab；后续可加组件级预览选择器。

## C. 进度记录（最近提交）

- 本轮：新增 `--spring-pop` / `--spring-pop-dur` / `--t-pop`（克制模式纯减速不回弹，活泼模式过冲 2.6）并接到开关把手、勾选框、分段指示器、Chip、滑块把手、单选圆点、评分星、Tab 图标、波轮行；补齐 31 个组件的 d.ts 声明

- `6115c39` 活泼模式加强 / 字体栈（阿里巴巴普惠体 3.0 优先）/ Playground 重写 / 示例页分类选择器 / 修全屏遮罩导致交互失效
- `b581a85` StepFlow 指示器、MediaViewer 关闭、StatusMark 底槽、保险丝初始隐藏与尺寸、slide 圆角、删除线擦除方向、TooltipGroup 图标按钮
- `4760d75` 打字机逐字 blur 进场 + 验证码按 react-bits CodeSlots 重做
- `f1178c2` 动作按钮三修 + Playground 收编 + CardGroup 真弹簧
