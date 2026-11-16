# TODO — 未完成事项（持久记录）

> 说明：会话级的 todo 工具在下一轮会清空，所以**真正的待办写在这里**。
> 每完成一项就改这一份，不依赖会话记忆。

## A. 已实现但还没接线（有代码、没导出 / 没类型 / 没文档 / 没示例）

| 组件 | ui/index 导出 | d.ts 声明 | AGENTS 组件表 | 示例页 |
|---|---|---|---|---|
| UiColorPicker / UiAutocomplete | ✅ | ✅ | ✅ | ✅ |
| UiForm / UiFormField | ✅ | ✅ | ✅ | ✅ |
| UiBreadcrumb / UiPagination | ✅ | ✅ | ✅ | ✅ |
| UiSidebar / UiSlideover | ✅ | ✅ | ✅ | ✅ |
| UiNavigationMenu | ✅ | ✅ | ✅ | ✅ |
| UiGrid / UiRow / UiCol | ✅ | ✅ | ✅ | ✅ |
| UiSplitter | ✅ | ✅ | ✅ | ✅ |
| UiScrollArea | ✅ | ✅ | ✅ | ✅ |
| UiContextMenu / UiCommandPalette | ✅ | ✅ | ✅ | ✅ |
| UiTour / UiPopover | ✅ | ✅ | ✅ | ✅ |
| UiKbd / UiIcon | ✅ | ✅ | ✅ | ✅ |
| UiCalendar / UiTimeline / UiCarousel / UiMarquee | ✅ | ✅ | ✅ | ✅ |
| UiAvatarTag / UiPagerDots / UiCard（product 变体） | ✅ | ✅ | ✅ | ✅ |
| core：a11y / directives / shortcuts / icons / springPhysics | ✅ lib 入口导出 | ✅ | 部分 | 不适用 |

→ 上述组件的 d.ts / AGENTS 组件表 / 示例页分区演示**全部接线完成**。重复实现已删除（UiNumberInput → UiStepper、UiDateInput / UiTimeInput → 日期时间选择器、UiFileUpload → UiFileDropzone、UiToastQueue → UiToastHost、UiVirtualScroll → UiVirtualList、UiBanner → UiAlert、UiMediaViewer 按反馈整只删除）。

## B. 完全没实现的能力

1. ✅ **UiDataTable 增强**：`group-by` 分组、`server` + `v-model:page` 服务端分页、`v-model:visible` 列显隐、`selection` + `v-model:selected` 多选。
2. ✅ **UiTreeView 增强**：`filter` 过滤（命中分支自动展开）、`draggable` 拖拽换父（`@move`）、`multi` + `cascade` 级联多选（父级半选）。
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
   - ✅ **Stack 与 CardSwap 拆成两套机制**：Stack = 物理牌堆（前后左右错位 + 甩出 tuck 回堆底）；
     CardSwap = 三维轮换台（整叠向一侧错开 15px、绕 X 后仰 3°，前卡绕底边向后仰掉出、再从背后落下）。
4. ✅ **Button hold 完整动画**：按住有扩散波纹、填充前缘辉光、完成态整颗填充 + 勾 + 弹一下。
5. ✅ **BottomSheet 锚点规则**（用户两次提出）：
   - 内容全高 < 60% 时；不要出现 60% 档（实测 27% 内容上下拖动都回到 251px）；
   - 内容全高 < 95% 时；自动追加「内容完整显示」高度锚点（fullFraction）；
   - 有压暗背景的版本不要 20% 档；有拖拽把手时不再有关闭键。
6. ✅ **Playground**：UiBottomSheet + StyleLab，并加了「预览组件」选择器（按钮 / 标签复选 / 开关 / 状态标记 / 滑轨 / 文字动效 / 工具调用胶囊）。
7. ✅ **颜色生成本地化**：调色板改为官方 `@material/material-color-utilities@0.3.0` 本地依赖，断网可用；实测 seed #3b82f6 → #005ac2、#10b981 → #006c49，与库自身输出一致，无外部请求。

## C. 本轮（第十二段）反馈修复

- [x] 卡片 variant="product"：品牌图标 + 底部光晕 + 不分段画线 + accent 动作按钮；UiAvatarTag 支持异形遮罩图与任意 SVG（无遮罩）。
- [x] 自绘取色盘（Nuxt UI 结构，HSV / RGB / HEX 本地换算），不再调用系统 input type=color。
- [x] 自动完成改成与下拉同款的固定定位形变展开，输入框在展开层内实现；选中回填 label。
- [x] 删除 UiMediaViewer 及两处演示。
- [x] 侧栏 / 抽屉 / 巡览 / 轮播 / 文件树动画：修掉 28 处「transition: X var(--t-*) var(--spring-*)」的非法写法（--t-* 已含时长 + 曲线，再拼一条曲线会让整条声明失效）；树改用 grid-template-rows 0fr ↔ 1fr；巡览进场从整屏收拢到目标、退场再张回；翻页指示器抽成 UiPagerDots，轮播引用它。
- [x] UiRow / UiCol 改 12 轨 grid（gap 由轨道承担）；UiSplitter 只分配「总长 - 分隔条」且兼容 20 / 80 百分数；修掉分隔条跑到滚动条、UiCodeImage 滑入层撑出横向滚动。
- [x] UiDataTable 列显隐改用 UiSelect 的 multiple 多选下拉；增强表格与基础表格仍是同一个组件、同一套实现。

## D. 进度记录（最近提交）

- 2026-11-16（第十七段）：固化调节台实测设备位（laptop 39/42/scale1、phone 59/60/scale.62、
  hold 40/-11，按 size 比例存）；滑动手改起点↔终点（swipeStart/End X·Y）；动态手压到设备
  下层、持机手保持设备上层；设备层抗锯齿（translateZ + 透明 outline）；眼参数外显
  （gazeScale / gazeWobbleAmp / eyesOffsetX·Y）进调节台。
- 2026-11-16（第十六段）：AgentAvatar 本体并入 **UsingDevice 设备变体**（device = laptop /
  phone / none，不单列组件）：设备底图 Figma 3D SVG 放 src/assets/agent，deviceColor 替换
  #FF00FF 占位、multiply 禁 #000000；眼睛 gaze=point 自动看向设备 + 左右 / 上下轻摆，
  白圆手敲击 / 持机 + 滑屏；新路由 /agent-device 设备位置调节台（滑块 + 复制属性）。
- 2026-11-15（第十五段）：尺寸随机清零（眨眼两眼同步，同一闭合度）；默认眼略偏右上
  （EYE_BASE 0.55 / -0.55）；注视范围加大（±1.5 × 1.6）；新增 `core/agentShapes`
  **AGENT_SHAPES** 内置形状注册表（10 个语义化底图，来自 111×1312 精灵图逐形状归一化，
  含 faceY 眼位推荐值），`shape` 传 key 或剪影均可；SVG 根 overflow visible 不裁头像。
- 2026-11-15（第十四段）：AgentAvatar 三条硬规则落实——眼睛**不旋转**（删 tilt / 视线角度）、
  **生成尺寸零随机**（首次落状态直接摆到位，开合无噪声项，level 缺省不调制）、
  **两眼成组位移**（同一注视偏移同值画两眼，幅度加大到 ±1.2 单位）；示例页加大头像 +
  分段实时切 8 状态展示状态机过渡。
- 2026-11-15（第十三段）：新增 **UiAgentAvatar**（剪影 SVG + 颜色 → 自动描边 + 胶囊眼；状态机
  idle / listening / thinking / happy / confused / surprised / sleepy / speaking，任意状态间弹簧过渡；
  呼吸 / 随机眨眼快闭慢开过冲 1.02 / 弹簧注视 / 微扫视 / 左右眼 15ms 延迟 / 闭眼细线）与
  **UiAvatarGroup**（叠放 + surface 描环 + max 折叠 +N，size 组内继承）；UiAvatar 支持
  base64 data URL / 在线地址且 size 可继承组。UiAvatarTag 药丸底色上下内缩 1px、头像探出
  1px（对齐 Frame 11），新增 accent。
- 2026-11-15 发布 npm **0.2.0**：新增 UiAvatarTag / UiPagerDots / 卡片 product 变体，取色盘 / 自动完成 / 动效与布局修复；包内已无 UiMediaViewer。

- 本轮（第十一段）：清理重复组件 —— 删除 UiNumberInput（UiStepper）、UiDateInput/UiTimeInput
  （日期 / 时间选择器自带字段）、UiFileUpload（UiFileDropzone）、UiToastQueue（UiToastHost）、
  UiVirtualScroll（UiVirtualList）、UiBanner（UiAlert），保留原有实现；其余第二批组件从
  「更多组件」拆回 8 个正式分类（表单 / 操作 / 日期时间 / 工程 / 可视化 / 浮层反馈），
  UiTour / UiCommandPalette 真正挂到页面里。

- 本轮（第十段）：滑轨把「只缩放把手本身」做彻底 —— 环形 / 仪表盘把圆点拆出
  `.ui-*-thumb-body`，位移层不再带 scale；线性 / 范围的光晕层 `pointer-events: none`，
  命中范围不随放大变大。新增 nuxt-ui 风格的 `UiCard`（页眉 / 主体 / 页脚 + actions）。

- 本轮（第九段）：底部面板加 50dvh 视口外「弹簧裙边」——面板位移下沉到 `.ui-sheet-frame`，
  活泼模式上冲（实测 frame y=-8、面板底 924、视口 932）时由裙边补住 8px 缺口，
  底线区域仍是面板色，不再露页面背景。

- 本轮（第八段）：活泼模式所有弹簧时长统一 ×1.25（`LIVELY_DURATION_SCALE`，CSS 兜底值同步），
  实测 feedback 0.52 / view 0.66 / sheet 0.82 / expand 0.67 / exit 0.56 / fade 0.42 / pop·shift 0.42；
  开关把手圆角固定 999px，按压放大到 32×32 仍保持胶囊/圆形。

- 本轮（第七段）：验证码去掉独立位光标（`ui-code-slots__caret`），当前位改为整格填充
  主色容器（错误态用 error 填充）；dev server 的 watch.ignored 扩到 `.chrome-*/` 与 `.shot*`。

- 本轮（第六段）：分区下拉错位 —— 根因是粘性筛选条的 backdrop-filter 把 fixed 包含块
  从视口换成了自己；新增 `core/fixedBox` 做包含块补偿，UiSelect 与 useMorphWindow 共用；
  顺手修了对象式 style 数值不补 px 导致 top/width 被丢弃的问题。桌面 1306 / 移动 430
  展开与收起逐像素对齐。

- 本轮（第五段）：深色模式拉开层级 —— 表面色阶从 MD3 默认 6/10/12/17/22 改为
  6/14/17/22/27（描边 tone 36），纯黑外观同步加宽；卡片与背景亮度比 1.20、高层 1.51。

- 本轮（第四段）：颜色生成本地化（官方 `@material/material-color-utilities@0.3.0` 依赖，
  断网可用、输出与库一致）；StyleLab 预览组件选择器；core 的 a11y / 指令 / 快捷键 /
  图标 / 弹簧求解补齐真实 d.ts 声明（不再只有运行时导出）。

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
