# AGENTS.md — 用 zero-ai-ui-lib 从零做一个新项目

这份文档写给「要基于这套 UI 框架新建一个应用」的 AI / 协作者。照着做即可，不需要读组件源码。
包已发布到 npm：`zero-ai-ui-lib`（作者 Jaly）。

## 0. 这套框架长什么样

- **视觉**：Material 3 血统的平面化语言。层次靠「表面色阶 + 圆角分档」，不用阴影；**描边只出现在功能处**——输入框 / 开关、复选框类控件 / `variant="outline"` 变体 / 行分隔线 / 浮层边界，**能没有描边的地方就不要有描边**（卡片、告警、折叠面板、模态、表格外形、卡片组等一律无描边）。**阴影全库只有一处：TabBar**（移动端向上 / 桌面端向右投一层淡分离影），其他组件一律不投影。
- **动效**：6 组固定弹簧（feedback / view / sheet / expand / exit / fade），一切展开都是同一个元素在形变。
- **交付形态**：99 个组件 + 2 个组合式函数 + 一批工具函数（时长格式 / 高亮 / ANSI / confirmDialog）+ 一份 CSS 变量令牌，并自带 TypeScript 类型声明。库只管控件，页面布局由应用自己写。
- **字体**：三组变量是**唯一来源**，别处不许写死字体名——`--font-sans`（中文优先阿里巴巴普惠体 3.0 → PingFang SC / 微软雅黑 / Noto Sans CJK → 系统 sans）、`--font-mono`（代码 / 终端：ui-monospace → SFMono → Cascadia → Consolas → DejaVu / Liberation / Ubuntu Mono → Noto Sans Mono → Source Code Pro / Fira Code / JetBrains Mono → monospace，逐平台回退）、`--font-numeric`（读数 / 二维码条码等数字列，等同 mono）。等宽数字**双保险**：`font-variant-numeric: tabular-nums` + `font-feature-settings: var(--font-feat-tnum)`（`"tnum" 1, "lnum" 1`，兼容不认前者的老浏览器）。应用想换字库只要覆盖 `--font-sans-custom` / `--font-mono-custom`。
- **数字动效**：一切数字大小变化（步进器 / 仪表盘 / 滑块读数 / 气泡 / 时长文本）统一走 `UiRollNumber` 的上下位移 + 模糊渐变；拖拽等连续变化传 `instant`（缩短到 ~220ms 但仍然动画）。读数一律等宽（`tabular-nums`），值变化不得引起宽度跳变。

## 1. 五分钟起步

```bash
mkdir my-app && cd my-app
npm init -y
npm i vue vue-router zero-ai-ui-lib
npm i -D vite @vitejs/plugin-vue
```

最小目录：

```text
my-app/
├─ index.html
├─ vite.config.js
└─ src/
   ├─ main.js
   ├─ App.vue          # 外壳：#scrollArea + 底部 tabbar
   ├─ shell.css        # 应用外壳样式（库不提供）
   ├─ router/index.js
   └─ views/*.vue
```

`index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>My App</title>
  <link rel="icon" href="data:," />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

`src/main.js`

```js
import { createApp } from 'vue'
import 'zero-ai-ui-lib/style.css'
import './shell.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

`vite.config.js`（`host: '0.0.0.0'` 才能被局域网设备访问）

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true }
})
```

`src/shell.css`（直接抄，与库的视觉语言一致）

```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--background);
  color: var(--on-surface);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
  line-height: var(--line-height);
  overflow: hidden;
  transition: background var(--t-fade), color var(--t-fade);
}
#app { height: 100dvh; }
.app { display: flex; flex-direction: column; height: 100dvh; max-width: 480px; margin: 0 auto; }
#scrollArea { flex: 1; overflow-y: auto; padding: 20px clamp(16px, 4vw, 48px) 110px; scrollbar-width: none; }
#scrollArea::-webkit-scrollbar { display: none; }
.view { display: flex; flex-direction: column; gap: var(--space-gap); min-width: 0; }
```

> `#scrollArea` 这个 id 有含义：`UiModal` / `UiBottomSheet` / `ExpandableCard` 打开时锁它的滚动，
> 关闭时恢复；换名字这些组件就锁不住页面。滚动容器是它，不是 `body`。

## 2. 组件清单

```js
import {
  UiButton, UiCard, UiChip, UiBadge, UiAvatar, UiSegmented, UiStepper, UiRating,
  UiInput, UiTextarea, UiSelect, UiSwitch, UiCheckbox, UiRadioGroup, UiSlider,
  UiDatePicker, UiTimePicker, UiModal, UiBottomSheet, UiAccordion,
  UiAlert, UiTooltip, UiToastHost, UiEmptyState, UiSpinner, UiSkeleton,
  UiProgress, UiRingProgress, UiGauge, UiSparkline, UiBarChart, UiLineChart,
  UiHeatmap, UiFloatingMenu, UiToolMenu,
  UiRangeDatePicker, UiWheelDatePicker, UiRangeTimePicker,
  UiRangeSlider, UiRingSlider, UiGaugeSlider, UiRollNumber,
  UiCodeEditor, UiTerminalOutput, UiTagInput, UiKeyValueEditor, UiSchemaForm,
  UiDataTable, UiTreeView, UiVirtualList, UiFileDropzone,
  UiMorphPanel, UiWheel, UiCodeImage, UiTabBar, confirmDialog,
  UiRotatingText, UiText, UiStatusMark, UiCodeSlots, UiScrubField,
  UiAvatarTag, UiSwipeRow, UiStepFlow, UiTooltipGroup, UiCardGroup, UiPagerDots,
  UiSideNav, MarkdownView, normalizeIconName,
  ExpandableCard, RouteExpandCard, EmptyRoute, usePress, useMorphWindow
} from 'zero-ai-ui-lib'
```

| 组件 | 用法 |
| --- | --- |
| `UiButton` | `variant`: primary / tonal / outline / text / danger / icon；`size`: sm / md / lg；`block` `loading` `disabled` |
| `UiCard` | 三段卡片：`#header`（也可用 `title` / `description` / `icon` 快速生成，`#actions` 在右侧）/ 默认插槽主体 / `#footer`；`divider` 控制分隔线，`variant` outline / filled / plain，`size` sm / md / lg，`clickable` 只做悬停与按下的表现。`variant="product"` 是产品授权卡：`product-name` + `product-icon`（任意 viewBox 的 SVG 标记）+ `accent` 品牌色，卡片底部带同色光晕、不分段画线、页脚动作按钮跟随品牌色（主按钮实心 accent、tonal 按钮 accent 淡底） |
| `UiChip` / `UiBadge` | chip 可 `selected` `removable` `dot`；badge `tone`: primary / success / warning / danger |
| `UiAvatar` / `UiAvatarGroup` | 头像 + 头像组：`name` 取首字母、`src` 支持 base64 data URL / 在线地址、`status` 在线点。Group 叠放（后一个压前一个、surface 色描环、悬停抬起），`size` 统一给组内头像设置尺寸（单项自己写了以单项为准），`max` 超出折叠成 **+N** |
| `UiAgentAvatar` | 智能体头像：`shape` 传**内置 key**（`AGENT_SHAPES` 注册表：circle / squircle / triangle / diamond / hexagon / flower / tilt / star / sparkle / scallop，来自 111×1312 精灵图逐个归一化；也可传纯剪影 SVG）+ `color`，组件自动上色、白 30% 外圈描边（paint-order: stroke）、**SVG 根 overflow visible 不裁头像**，并叠加**两只同尺寸的圆角矩形眼**（四角同半径 = 宽度一半，直接写宽 / 高 / 圆角属性，不用 scale，不会被拉成椭圆）。眼睛由状态机驱动：`state` = idle / listening / thinking / happy / confused / surprised / sleepy / speaking，**任意状态→任意状态都是同一组参数（开合 / 眼距 / 高度）的弹簧过渡**，没有硬切。三条硬规则：**不旋转**（没有 tilt / 视线角度，只有位移）、**尺寸零随机**（挂载即按状态落位，开合不含噪声项，眨眼两眼同步——同一闭合度，不会出现一睁一闭的大小差）、**两眼成组位移**（注视偏移对两眼同值，永远等大）。**默认眼位（-0.4, -1.15）与注视压缩 0.37 / 微摆 0.34 均为调节台实测固化值**，注视可移动范围 ±1.8 单位 × 1.6 / 1.2 倍。生命层（呼吸 3–5s、随机眨眼快闭慢开过冲 1.02，**眨眼两眼完全同步**）永远在，注意力层（微扫视每 2–5s 换目标常驻；`gaze="mouse"` 才跟随指针，**默认不跟随鼠标**；`gaze="point"` 由 UsingDevice 自动设置）叠加其上；闭眼是一条宽度略增的细线不消失；`eyesY` 调眼睛基准高度（三角脸往下调），`level` 给说话状态接外部音量包络（给了才调制开合），`animated=false` 摆静止姿势。**UsingDevice 设备使用变体（归本体，不单列组件）**：`device` = laptop / phone / none，设备底图（`src/assets/agent` 的 Figma 3D 导出）放在 AI **右下方**，眼睛自动看向设备中心——电脑**左右轻扫**、手机**上下轻点**；手是纯白圆：电脑一只敲击手（连续敲键盘），手机两只——持机手**固定在手机前方**（z 在设备之上），滑动手沿滑动轨迹来回——**每条腿 300~500ms、ease-in-out 速度曲线（起步加速 / 中段快 / 收尾减速）**；回合制调度（确定性 hash）：滑动 / **滑到设备左侧（滑动手的自然一侧）不在屏幕上的区域悬停等一等，跟呼吸轻浮动** / **双击屏幕两下**（两处短促按压带回弹）；`deviceColor` 替换底图 **#FF00FF 占位**（multiply 混色，**禁用 #000000，最深 #444444；#FFFFFF = 原色**；空 = 纯白 W 版）；位置 / 大小 / 手位 / 眼参数可调（`deviceDx / deviceDy / deviceScale / handScale / laptopHandDx·Dy / holdDx·Dy / swipeStartX·Y / swipeEndX·Y / gazeScale / gazeWobbleAmp / eyesOffsetX·Y`）；**动态手（敲击 / 滑动）在设备下层，持机手在设备上层**；设备层抗锯齿只用**透明 outline**（div + 内层 svg 都要；translateZ / backface-visibility 会破坏 3D 场景，禁用）。默认位来自 140px 调节台实测（laptop dx .279 dy .30 scale 1；phone dx .421 dy .429 scale .62 holdDx .316 swipe 起点 .557/.686 终点 .55/.95），示例库「调设备位置」页面滑块调完一键复制属性标签 |
| `UiAvatarTag` | 头像标签：左侧探出一枚头像（**本体优先用标准 `UiAvatar` 或 `UiAgentAvatar` 渲染**：`agent` + `agent-shape` / `agent-color` / `agent-state` 让药丸里是一颗会眨眼看设备写代码的智能体头像；`src` / 首字母走 UiAvatar；`icon` 仍为任意 SVG 无遮罩）+ 右侧药丸文字；`src` 按 `shape`（circle / squircle / square / hexagon / diamond / blob）裁成不同形状，`icon` 直接放任意 SVG 标记 —— **图标模式不套任何遮罩 / 裁切**，保留 SVG 自身形状；`icon-view-box` 可自定义（品牌图标多半不是 24×24），`size` sm / md / lg；药丸底色上下各内缩 **1px**、头像与组件盒同高，所以头像天然探出底色 1px（对齐 Frame 11）；`accent` 给药丸底色 10% 品牌色、文字用压暗后的品牌色 |
| `UiSegmented` | `v-model` + `options`（`{ label, value, disabled?, icon? }`）；`label` 在左上角，`layout="one-line"` 标签与控件同行；`icon-placement="leading\|top"`（图标在文字前端 / 上方卡片式）、`show-labels="false"` 只留图标、`auto-multiline`（默认开）在**真实内容宽度**放不下时切成网格多行——列数用 canvas measureText 量文字宽度算，不靠猜固定最小宽度；控件本身 `width:100%`，避免「量一次→变窄→再量更窄」的收缩循环；多行网格列数按**中位数宽度 + 容器 6 等分密度下限**算（长标签省略号截断，不会把整排挤成 2 个巨格），`max-rows`（默认 3）按实测行高限高、超出内部滚动 |
| `UiStepper` | `v-model` 数字 + `unit` `min` `max` `step`；`size`(sm/md/lg/xl)、`controls`(sides/bottom)、`roll`(standard/reverse)、`fieldLabel` |
| `UiSelect` | 自绘下拉：`v-model` + `:options="[{ label, value, icon?, disabled? }]"`；点输入框原地展开成列表；`icon-placement="leading\|top"`——leading 图标在文字前端（列表行布局不变，选中项图标也会显示在字段里），top 把面板变成图标卡片网格；`disabled` 整体禁用，单项 `disabled` 可见不可选；**`multiple` 多选模式**：`v-model` 为数组，勾选不收回面板，字段里显示已选标签摘要（列显隐等场景直接复用它） |
| `UiSlider` | `v-model`；`stops` 数组或 `snapCount` 等分 → 拖动跟手、松手弹簧吸附；`@snap="({index, value}) => …"`；刻度：`show-scale` + `major-ticks`（大刻度区间数）+ `minor-ticks`（大刻度间的小刻度份数）+ `precision`（小数位）。刻度在轨道上方、短浅线，小刻度短大刻度长；数值只在最小值 / 最大值（无刻度时）或大刻度位置显示；`show-bubble` 拖拽时把手上方浮当前值；弹簧参数收进 `spring` 对象（`{ stiffness, dampingRatio, flingTime, rubber, maxOverscroll }`）；拖拽越界有**橡皮筋**（rubber 衰减 + 最多越界 6% 量程）；松手**惯性有触发阈值**——甩出速度 ≥ 0.8 × 量程 / 秒才做惯性预测，慢松手原地落定，阻尼默认 1.05 略过阻尼；旧的 5 个独立 props 已废弃仍兼容 |
| `UiDatePicker` / `UiTimePicker` | `v-model` 字符串；贴着输入框展开，不压暗背景；`UiTimePicker` 有 `precision`（h/m/s）决定波轮字段数，`min` / `max`（默认无限制）**级联到每一列**（min=09:30:15 时 时列>=9、时=9 时 分列>=30），越界的行禁用且滚动被钉在合法范围（推不动）；`UiDatePicker` 有 `precision`（day / month / year）+ 三级状态机：顶部**年、月可点击往宏观走**（镜头拉远），网格点击往细走（镜头推近，ZoomTo 缩放 + 模糊过渡）；年视图按 10 年一页；**非终点层级的格子两种语义**——单击 = 下钻、再点已高亮项 = 选中本层提交；必须选到最终精度才关闭；回传值按精度是 `YYYY` / `YYYY-MM` / `YYYY-MM-DD`（显示与解析都按对应精度，不会跳回今天）；`min` / `max` 之外的日期直接禁用 |
| `UiCodeImage` | 2~3 项用分段控件（跨族时图标在上、仅 2 项跨族时只留图标不显示文字）、4 项及以上一律用带图标的下拉框。切换动画的方向按「目标相对当前位置」动态决定（目标在后往正方向进、在前往反方向进），进场层先按新方向落位、下一帧再滑回原位；用下拉切换时轴改为纵向（上下滑入滑出），分段 / 图标切换保持横向；仅两个跨族（一维/二维）选项时图标模式不再显示文字标签（图标已说明族差别）。children 直接传文本：<`CodeImage type="qrcode">https://…</`CodeImage>；`type` 字符串或数组（数组 = 可切换码制组，<=3 用 Segmented、>3 用下拉；跨一维/二维用图标区分，同族用文字标签）；一维码渲染后把固有宽高转成 viewBox，长条码不会再撑出画布；`options` 按码制传参 `{ qrcode: { errorCorrectionLevel: 'H' }, ean13: { flat: true } }`，未传的走默认、未知键忽略不崩溃；内容不合规的选项可见但禁用、自动切到可用项；全部不可用走降级候选（二维码兜底），仍无解渲染空状态。校验 / 参数 / 降级规则全部集中在 `core/codeFormats`，组件内不硬编码码制规则 |
| `UiRotatingText` | 循环短语：`phrases` + `transition="rotate|flip|slide"`；进场层从进入方向的偏转 + 位移 + 模糊里出现，离场层反向散去，方向随前后顺序切换；`pause-on-hover` 默认开 |
| `UiText` | 文字动效包装器：`variant="type"` 打字机（`cps` 节奏、逐字符进场 `type-effect="blur|fade|rise"`、**`reserve` 提前占位**——没有光标时默认开启，用不可见完整文本撑开最终高度，逐字进场不把下方内容顶得抖；`streaming` 开启后内容增长时只给新增片段播一次进场（`stream-effect`），不重播整段 —— 默认 blur 就是**透明度 + 模糊**渐变、光标四档 `bar|block|underscore|character`、`loop` 会先逐字删除再重打）、`shiny` 掠光（`sheen="soft|chrome"`）、`gradient` 流动渐变（`sweep|mesh|conic` + `colors`） |
| `UiStatusMark` | 任务状态标记（仅受控），五个状态：`none`（只有底部一段空槽，上半部分什么都没有）/ `pending`（整圈虚线待命）/ `progress`（**分两种**：`progress` 是数字 → 弧长 = 实际进度、静止不转；`progress=null` → 一小段弧匀速转圈，表示没有实际进度）/ `done`（弧收满 + 勾抽笔）/ `failed`（弧淡出 + 叉抽笔）。全部由同一圈描边用 dasharray 连续过渡，任意两态互转不闪；圆环旋转原点只由 SVG `rotate(-90 12 12)` 提供，不要再写 CSS `transform-origin`（会被应用两次导致整体偏移） |
| `UiCodeSlots` | 一次性验证码（按 react-bits CodeSlots 手法）：每个数字**独立落位**（透明度 + 模糊 + 上移 + 缩放，spring 曲线），粘贴按 `cascade`（默认 20ms）逐位错开；**当前输入位直接整格填充主色容器**（不再有独立光标线），空位 / 错误态时强调，成功后洗色时自动收起；`status="success"` 洗色从中间展开 + 数字下沉 + 勾升起，`status="error"` 从后往前逐位抽走再清空；键盘可完全操作（数字 / 退格删前一位 / Delete 删本位 / 方向键 / Home / End），原生 input 负责焦点与 `autocomplete="one-time-code"` |
| `UiScrubField` | 可拖数字：横向拖动改值（`pixels-per-range` 定灵敏度），越界走橡皮筋松手弹回；不拖直接点击切换成输入框；方向键可微调 |
| `UiSwipeRow` | 划开式列表行（**双侧操作**）：`actions` 露在右侧（向左划）、`leftActions` 露在左侧（向右划），拖拽跟手、按位移 + 速度吸附；`fullSwipe`（默认**关闭**）开启后越过本侧轨道再推 64px 直接执行该侧最后一个操作，落定块从该侧长出、整行滑出折叠（列表删除场景慎开）；`collapseOnAction` 操作后整行折叠消失；`@commit` 回传 `{ action, full }`、`@action` 回传裸 action（两者语义不同，别混用）；作用域插槽带 `close()` 程序化收起。指针捕获不吞行内点击：纯点按用 elementsFromPoint 转发回真正被点的元素，拖过则吞掉补发的 click |
| `UiStepFlow` | 多步流程：`steps` + `v-model` 索引；指示器是一块绝对定位的薄条，靠 transform 在轨道上滑到当前格位，面板内容按方向滑入并模糊；`orientation="horizontal|vertical"` |
| `UiTooltipGroup` | 提示词组：冷态第一次悬停要等 `wait`（默认 520ms），打开过一次后在 `warm-window` 内兄弟项瞬时打开；气泡只渲染一个，跟着当前项移动 |
| `UiCardGroup` | 卡片组，**每种形态都可拖拽 / 点击 / 方向键**，松手有惯性或吸附；`variant` 8 种形态：`gallery` 横向平铺循环、`circular` 3D 圆环（拖拽惯量 + 吸附）、`depth` Z 轴轨道（拖拽 / 键盘 / 自动推进）、`wall` 透视墙漂移 + 悬停抬起、`scroll-stack` 滚动压栈、`stack` 牌堆拖甩点、`swap` 定时 / 甩动轮换、`bounce` 扇形弹入。吸附与惯性用真弹簧求解（`core/springPhysics`：place 220/26、settle 300/30、tuck 240/28、fling 650/42），松手速度会作为初速度注入，所以甩得快冲得远、落点干净；gallery 拖拽后按速度惯性再吸到最近格位并循环，圆环拖动带惯性吸附到最近格位，depth 拖过阈值换卡并回弹归零，wall 持续漂移且可拖动，牌堆可拖 / 甩 / 点且甩出的牌绕到最下面，bounce 拖动改展开角度、悬停或选中扶正；卡池 / 选中 / 拖拽 / 键盘共用一套 |
| `UiTabBar` | `:items` 传 `{ value, label, icon }`（icon 是 24x24 viewBox 内的 SVG 标记），`v-model` + `@change`；移动端贴底横排、背景铺满整屏宽度（tab 各自上限 96px），桌面端贴左竖排、背景铺满整个高度、tab 从顶部固定间距往下排 |
| `UiWheel` | 通用波轮基座：`:columns` 为 `[{ items, value, separator?, label?, min?, max? }]`，列数与分隔符自定义；高亮块固定居中、数字层移动、140ms 吸附；**列级 `min` / `max` 把越界行禁用并把滚动钉在合法范围**——有限制时滚不出界；首次展开先定位再画景深（ready 闸门），不会整列糊住 |
| `UiMorphPanel` | 泛用「按钮 ⇄ 任意组件」形变容器：`#trigger` 是收起态按钮，默认插槽放展开内容（作用域带 `close`）；外壳只动几何、内容从模糊中浮现，点外部 / Esc 收起 |
| `UiModal` | `v-model`；插槽 `#header` / `#title` / 默认 / `#footer`，作用域都带 `close`；遮罩压暗 + 5px 模糊 |
| `UiBottomSheet` | `v-model` + `title` `max-height` `close-on-backdrop`；`#footer` 插槽；**把手可拖拽**：拖把手实时改高度（跟手、禁 transition），松手按位移 + 速度吸附锚点；`anchors` 默认随 `scrim`：无背景版 `[0.2, 0.6]`、有背景版 `[0.6]`（压暗背景不放 20% 档）+ 自动追加「全内容」档，全内容不足 60% 时 60% 档不出现；拖到最低锚点之下直接关闭；面板外还有一段约 **50dvh 的「弹簧裙边」**（`.ui-sheet-skirt`，正常被 root 裁掉），活泼模式上冲、面板下沿离开视口底时用它补住缺口，不会露出页面背景；`scrim=false` 为无背景版（不压暗不模糊，但透明拦截层 + Esc + 锁滚动 + aria-modal 的模态性质保持） |
| `UiFloatingMenu` | `v-model`(当前值) + `:items` + `@select`；按钮原地长成浮动面板 |
| `UiToolMenu` | 只有 `@select`，**回传整个 item 对象**（不是 value），无 v-model，选中值自己同步到 `label` |
| `UiGauge` | `:value` 0–100 + `label` + `stroke` 档位；220° 圆弧，大数字居中偏上（数字变化走统一滚动动效）。弧线宽度全库只有两档：`'thin'`(10px) / `'bold'`(12px)，也可传具体数值；一律 `vector-effect="non-scaling-stroke"`，宽度是 CSS 像素，不随组件尺寸缩放 |
| `UiRingProgress` | `:value` 0–100、`label`、`size`(默认 116)、`stroke` 档位（默认 `'thin'`）；中心数字走滚动动效 |
| `UiRangeSlider` | `v-model` 为 `[lo, hi]` 数组 + `min max step precision unit`；点击轨道移动更近的拖拽头，距离相等默认移左侧（lo）；两头互不交叉且至少间隔一个步进（把手不重合）；读数走 `UiRollNumber` |
| `UiRingSlider` | `v-model` 0–100；圆环从 12 点顺时针 360°；`stroke` 档位同圆环族；只有环带（描边 ±13px）接受指针，环内环外不捕获触控与滚动；中心数字滚动 |
| `UiGaugeSlider` | `v-model` 0–100；UiGauge 同款 220° 弧 + 拖拽 thumb，中心数字复用仪表盘显示逻辑；`stroke` 档位；只有弧带接受指针（弧内大片区域不再吞触控）；`show-scale` 显示底部 0/100 刻度行 |
| `UiRangeDatePicker` | `v-model` 为 `{ start, end }`（`YYYY-MM-DD`）；第一次点选起点、第二次点选终点，区间铺浅主色底、两端实心；`清除` 回传空对象 |
| `UiWheelDatePicker` | `v-model` 字符串（`YYYY-MM-DD`）；年 / 月 / 日三列滚轮（高亮块固定中间），`startYear endYear` 控制年范围，日列随年月伸缩 |
| `UiRangeTimePicker` | `v-model` 为 `{ start, end }`（`HH:mm`）；内部直接拼两个 `UiTimePicker`（`label` 传空即不显示标签行）+ 浅色箭头；时长文本（1h03m03s 规则）显示在箭头正上方，精度由 `precision`（h/m/s，最小显示单位）决定 |
| `UiRollNumber` | 全库统一数字变化动效，可暴露属性：`value`（数字或已格式化字符串）、`directionKey`（参与大小比较）、`size`（字号，任意 CSS 长度）、`reverse`（大小方向是否反向）、`distance`（滚动位移 CSS 长度，缺省按变化量自动缩放）、`step`（换算步数用）、`instant`（拖拽等高频连续变化：只缩短时长与位移，**不跳过动画**）。任何值变化都必须播放上下位移 + 模糊渐变；数字一律等宽（tabular-nums） |
| `UiAlert` | `tone`: warning / danger / success / info；`title`；默认插槽放正文 |
| `UiEmptyState` | `title` `description` + `#action` 插槽 |
| `UiToastHost` | `<UiToastHost ref="toast" />` 后 `toast.value.show('文案', 'success' | 'info' | 'danger')` |
| `RouteExpandCard` | 见第 4 节 |
| `UiCodeEditor` | `v-model` + `language`(js/json/css/html/md)；行号、Tab 插空格、`format-json` 失焦格式化；`lines` 可视行数 |
| `UiTerminalOutput` | `:text` 原始日志（自动解析 ANSI 16/256 色）；`follow` 自动贴底，向上翻看自动暂停；`复制全部` |
| `UiTagInput` | `v-model` 字符串数组；回车 / 逗号 / Tab 生成 chip，退格删末尾，重复自动去重 |
| `UiKeyValueEditor` | `v-model` 为 `[{ key, value }]`；headers / env 录入用；`secret` 把值列变密码点 |
| `UiSchemaForm` | `:schema` JSON Schema（properties / required / enum / type）自动生成表单，`@submit` 回传收敛后的值 |
| `UiDataTable` | `:columns` `{ key, label, width?, align?, sortable?, hidden? }` + `:rows`；粘性表头、三态排序、`max-height` 内滚动、`#cell-<key>` 插槽。增强：`group-by` 分组（组标题整行合并，`#group` 可自定义）、`server` 服务端模式（`sort-change` / `page-change` 只发事件，不动本地顺序）、`v-model:page` + `total` + `page-size` 分页条、`v-model:visible` 列显隐（**直接复用 UiSelect 的 `multiple` 下拉**，不再自建复选框浮层）、`selection="single\|multiple"` + `v-model:selected` 多选（表头全选、半选）；增强项与基础表格是同一个组件、同一套实现，不另起第二个表格 |
| `UiTreeView` | `:nodes` 递归树（folder / file / md / json / image 图标分色），箭头旋转变形、`default-open` 初始展开；分组用 `grid-template-rows: 0fr ↔ 1fr` 过渡（嵌套子树也连续，不靠 JS 量像素）。增强：`filter` 关键字过滤（命中节点与祖先保留、命中分支自动展开）、`multi` + `cascade` 级联多选（勾目录 = 整棵子树，父级半选）、`draggable` 拖拽换父（`@move` 回传 `{ from, to }`，目录行高亮） |
| `UiVirtualList` | 定高虚拟滚动（`item-height` `height`），几百上千行只渲染窗口；勾选标记在行首，**勾选有笔画抽出动画 + 行底色从左铺开**；`selection="single|multiple"` 决定单击语义；`drag-select`（多选）长按某行后竖向拖动连续勾选 —— 锚点初始状态决定这段是选中还是取消，往回拖可改终点，拖到边缘自动滚动（限速 12px/帧），期间容器 `touch-action: none` 接管原生滚动 |
| `UiFileDropzone` | 拖入 / 点击收 `File` 列表，`accept` `max-size`(MB) 过滤，不合格文件走 `@reject` |
| `UiSearchField` | 图标 ⇄ 输入框原地形变：外壳宽度走 view 弹簧，同一个搜索图标平移到尾部成为搜索按钮；Enter / 点图标 `@search`，Esc 先清空后收起，点外部收起 |
| `confirmDialog` | `const ok = await confirmDialog({ title, message, danger })`，统一替代 `window.confirm`。**有意不接 Esc / Enter**：确认必须显式点击按钮，防键盘误触发危险操作（普通对话框不受此限制） |
| `UiToastHost` | 除 `show / dismiss` 外补语义 API：`success / error / warning / info`，`max` 条数外自动排队 |

| `UiColorPicker` | `v-model` 颜色 + `label` `swatches` `disabled`；**自绘取色盘**（结构照 Nuxt UI）：饱和度 × 明度面 + 竖直色相轨道 + 拖动 / 方向键 + HEX 输入 + 预设色板，不调用系统 `<input type="color">`；HSV / RGB / HEX 换算在组件内完成 |
| `UiAutocomplete` | `v-model` + `options`；**与 UiSelect 同一套形变展开**：点击后外壳固定定位长成面板，输入框在展开层里重新实现（盖住原字段），输入即时过滤、↑↓ / Enter / Esc、点外部收起；`free` 允许自由输入 |
| `UiForm` / `UiFormField` | Form 管提交与校验（`validate-on-submit`、`@submit` / `@invalid`）；FormField 提供 label / hint / rules / required / `pattern`（格式正则，失焦才判红、改对立刻变绿勾）；**必填星号是强调色不是红色**；错误平时不显示，点提交才校验：滚到第一处错误 + 轮廓高亮 + 抖动 + **右侧气泡**说明原因（窄屏自动落到下方） |
| `UiBreadcrumb` | `items` 为 `[{ label, value? }]`；最后一项是当前页，点击 `@select` 回传 |
| `UiPagination` | `v-model` 页码 + `total` `page-size` `siblings`；中间用省略号折叠 |
| `UiSideNav` | 预制响应式导航：**桌面端渲染为常驻侧栏（可折叠）**，**移动端渲染为左侧滑抽屉**（压暗模糊遮罩、选中即收、Esc 关闭、打开锁 `#scrollArea`）；`items` 为 `{ value, label, icon }`，`active` 当前项，`v-model` 抽屉开合，`v-model:collapsed` 桌面折叠，`breakpoint`（默认 900），`width` / `collapsed-width`，`title` / `#head`，`contain` 在父容器内 absolute 渲染（预览用，不锁滚动），`@select` 回传 value |
| `UiSidebar` | `v-model` 展开态；`width` / `collapsed-width`；`#head` + 默认插槽（作用域带 `collapsed`）；展开 / 收起走 view 弹簧，内容随宽度收拢淡出、箭头翻转 |
| `UiSlideover` | `v-model`；`title` `side` `width`；点遮罩或关闭键收起，`#footer` 可选；面板从指定侧整块推入 / 推出（先提交视口外一帧，再走弹簧），内容随后浮入，收起播完才卸载 |
| `UiNavigationMenu` | `items` 为 `[{ label, value, children? }]`；悬停 / 聚焦展开子面板，`@select` 回传子项 |
| `UiGrid` | `min` 最小列宽 + `gap`；auto-fill 按容器宽度自动决定列数，不写断点 |
| `UiRow` / `UiCol` | 12 栅格：Row 是 `repeat(12, minmax(0, 1fr))` 的 grid，Col 只负责 `grid-column: span N`；`span` / `offset` 加 `sm md lg` 覆盖，Row 管 `gap` `align` `justify`。gap 由轨道间距承担，span 怎么组合都不会撑破容器 |
| `UiSplitter` | `v-model` 占比（0~1；误传 20 / 80 这类百分数会自动换算）；`direction` 横向 / 纵向，`#first` 与默认插槽分居两侧，拖分隔条实时改比例；第一面板只占「总长 - 分隔条」的份额，分隔条固定宽度，永远不会把容器撑出滚动条；**吸附（可选开启）**：`snap-count` 等分或 `stops` 指定点位，松手弹到最近分段值（拖动零过渡跟手、松手走 view 弹簧） |
| `UiScrollArea` | `max-height` / `height` + `shadows`；自定义滚动条，贴边时出现渐隐阴影 |
| `UiContextMenu` | 包住任意内容，右键 / 长按弹 `items`（`value tone icon shortcut divider`） |
| `UiCommandPalette` | `v-model` 开关 + `items`；输入过滤、上下键移动、Enter 执行，Esc 关闭 |
| `UiTour` | `v-model` + `steps`（`{ target, title, text, placement? }`）；高亮真实元素，气泡自动避让；**进场高亮孔先铺满整屏再收拢到目标**（整体聚焦到一点），换步时孔在目标之间连续移动，退场再张回整屏 |
| `UiPopover` | `v-model` + `placement`；`#trigger` 放触发器，默认插槽放面板内容 |
| `UiKbd` | `keys` 字符串或数组，`size` sm / md |
| `UiIcon` | `name` **先查库内 ICONS 注册表，未命中则按 Iconify 名字渲染**（`pack:icon` / `pack/icon` / `pack--icon` / `i-pack:icon` 都自动归一化成 `pack:icon`），`size`（像素或 `1em` 内联用）`filled` `stroke-width` `label` |
| `UiCalendar` | `v-model` 日期 + `events`（按 ISO 日期给数组）；`view` **month / week / year / agenda** 四种视图（`switchable` 显示切换器）：年视图 12 个月总览点月**下钻**、日程视图按日期列事件；切换 = 精细度改变的 **ZoomTo**（下钻推近 scale .72 到 1、拉远反向，配模糊） |
| `UiTimeline` | `items` 为 `[{ title, time?, text?, tone? }]`；`time-position`="left" 时时间排在**竖线的左侧**（独立列、右对齐贴线），默认 `right` 在标题行右侧，`none` 不显示 |
| `UiCarousel` | `items` + `v-model` 索引；`autoplay` `interval` `loop` `height`，可拖拽翻页；轨道走 view 弹簧，非当前页缩小 / 变暗 / 轻模糊；翻页指示器引用独立的 `UiPagerDots`；**两种回环变体 `loop-mode`**：`cycle` = 最后一张点下一张**回到第一张的位置**（倒带）；`infinite` = 首尾克隆衔接，最后一张的下一张**从右边划进来**（永远同向延伸，过渡播完在克隆位无感瞬移归位）；**手动翻页（箭头 / 圆点 / 拖动）重置自动计时器**；圆角在卡片不在外层视口 |
| `UiPagerDots` | 独立翻页指示器：`total` + `v-model` 当前页，`clickable` `size="sm\|md"`；当前页是拉长的胶囊，轮播 / 卡片组 / 任何分页视图都能引用 |
| `UiMarquee` | `text` `speed` `direction` `gap` `pause-on-hover` |
| `UiLink` | 文字链接（参照 Nuxt UI）：默认 primary 无下划线、悬停才出；`href` 外链自动带 ↗ 角标 + `target=_blank rel=noopener`；`tone` primary / muted / danger，`underline` 常显下划线，`disabled`；`to` 传应用内路由 |
| `MarkdownView` | Markdown 渲染器（marked 解析 → DOM 树 → Vue 元素，不用 v-html，天然防注入）：标题 / 强调 / 列表 / 引用 / 表格 / 代码全部走库令牌。**内联图标**（`icons` 默认开）支持 `pack:icon`、`pack/icon`、`pack--icon`、`i-pack:icon` 四种裸写法与 `::pack:icon::` 显式标记（显式优先）；**本地注册表（registerIcons）优先于 Iconify**；代码块与行内代码是字面量不解析。**@ 提及**（`mentions` 开启）渲染成 `UiAvatarTag` 药丸，`mentionResolver(username)` 返回 `{ username, showname, type: 'normal'\|'agent', image, shape }`；`tagSize` 控制药丸尺寸。**流式更新**（`streaming`）：**按词拆 motion.span + 弹簧入场**——流式文本按空格分词（无空白 CJK 每 3 字一组），每个词一个 motion.span（class "stream-word"，inline-block——inline 元素 transform 无效）；帧间只比词前缀：词壳 key 稳定（节点复用、motion 实例不重建），已入场词不重播；新词挂载即从初始态（透明 + 上浮 .9em≈12px + blur 6px）弹向落定态——view 场景弹簧（比 feedback 柔和，位移才读得出来）+ 同批新增词按序级联延迟（每词 18ms、封顶 24 步），逐个蹦出来；透明度 / 位移 / 模糊全部由 motion 驱动，CSS 不再持有初始态与过渡。词一旦成壳就永远是壳（不回并纯文本），动画不会被下一帧结构变化打断（闪现根因）。`stream-effect` 选 rise（上浮 + 模糊）/ blur / fade 三种初始态；整块首次出现同样逐词级联，不再单独播块级动画；`min-height` 预留只随增长抬高、内容变短自动收缩。|

通用约定：所有浮层都能点外部收起、按 Esc 收起；`items` 形如 `[{ value, label, description?, tone? }]`。

## 3. 交互约定（照抄即可，别自己发明）

- **按下必收缩**：可展开按钮按下时 `scale(.97)`，松手才展开；长按保持收缩态。
- **动作按钮三个变体**（`UiButton`）：`fuse` 点一下进入「可撤销」，倒计时用与 `hold` 同语言的**实心进度条、方向相反**（铺满 → 缩回 0，线性烧完 `undo-window`）；进度条 **idle 期间完全不显示，点击后才淡入**（未触发就铺满进度是错的）；烧完落定；`hold` 按住填充上涨（纯色实心条，**没有前端圆球 / 光晕 / 渐变**），抬手过早就缩回，涨满才确认；`slide` 拖滑块过阈值确认，跑动时只有把手转圈（不再叠加通用 spinner），完成后把手回到最左铺满成整颗药丸。
- **图标的两种放法**：`leading`（文字前端，布局完全不变）与 `top`（文字上方，卡片网格）；分段与下拉都支持，图标标记统一用 24x24 viewBox 内的 SVG 内容。`UiSegmented` 单行装不下会自动转多行网格，多行布局下取消滑动指示器、改由选中项自己填底色（指示器跨行会乱跑）。
- **内容替换**：旧内容留在原位 `opacity→0 + blur(8px)`，新内容从 `blur(10px)` 浮现；外壳只做几何（宽高/圆角/底色）过渡。
- **可打断**：`UiToolMenu` / `UiFloatingMenu` / `UiSelect` / `UiDatePicker` / `UiTimePicker` 在收起动画途中再次点击，会直接反向长回展开态。
- **不占位的形变**：`UiSelect` / 日期 / 时间选择器展开时临时改固定定位并插入占位块，父容器**不要** `overflow: hidden`。
- **数字滑轨**（`UiStepper`）：旧值按「新旧值大小关系」方向滑出并模糊，新值从反向滑入，位移量随变化量缩放；单位不滚动、与数字底部对齐；到上下限再点有轻微「碰壁」回弹。
- **滚轮**（`UiWheel`，时间 / 日期波轮共用）：高亮块固定在中间不动，点击和滑动移动的是背后的数字层；字段数量由列配置决定。
- **按钮 ⇄ 组件的形变泛用化**：`UiMorphPanel` 把「点一下切换成另一个组件」做成通用容器，不再局限于「按钮变输入框」；`UiSearchField` 也走同一语言（图标平移到尾部作动作按钮）。
- **状态类组件一律受控**：`UiStatusMark` / `UiStepFlow` 的状态由外部传入，组件只负责把动效衔接好，不自己猜业务阶段。
- **确认统一走 `confirmDialog`**：应用里不要再调 `window.confirm`，样式断层且阻塞；`await` 拿到布尔结果即可。
- **返回只有一种写法**：Tab 用 replace、展开用 push、收起用 back()（动画播完再退），见 4.5。
- **弧线宽度只有两档**：`--arc-stroke-thin`(10) / `--arc-stroke-bold`(12)，圆环族与仪表盘族共用，配合 `non-scaling-stroke` 保证宽度是 CSS 像素、与组件尺寸无关。
- **动效令牌**：不要写死 duration，用 `--t-fade` / `--t-panel` / `--t-sheet` / `--t-exit`；弹簧曲线是 `--spring-*`。
  **`--t-*` 是「时长 + 曲线」的完整 transition 值，直接写 `transition: transform var(--t-panel)`**；再拼一条 `var(--spring-view)` 会让整条声明解析失败、动画直接跳变（浏览器静默丢弃）。需要自定义时长时用 `--spring-*-dur` + `--spring-*` 两条分开写。
  小控件（开关把手、勾选框、Chip、滑块把手、浮层进出、胶囊按钮、验证码落位…）统一用 `--t-pop` / `--spring-pop`：**克制模式不回弹，活泼模式强过冲** —— 这样「原本不生硬的控件」也会随气质一起弹。`prefers-reduced-motion` 时库内已自动降级。
- **动效气质（motion tone）——产品调性，不是用户偏好**：两档 `calm`（默认，稳、短、几乎不过冲）与 `lively`（弹簧更陡、回弹与缩放幅度更大、位移更远、模糊更重）。它只换一组令牌：`--spring-*` / `--spring-*-dur`、`--motion-scale|bounce|distance|blur`、`--pop-scale`、`--press-scale`。
  活泼档的幅度更大，时长也统一放宽 **25%**（`core/spring.js` 的 `LIVELY_DURATION_SCALE`），既撑得住过冲、又不拖沓；小把手的圆角固定 `999px`，放大缩小时不会跑形。
  **按应用定位在代码里预置**：`setMotionTone('lively')`，或写进 `zero.config.yaml` 的 `ui.motion`。**不要做成设置项暴露给终端用户** —— 示例应用把这个切换放在 **Playground 设置弹层**里，仅用于演示，正式应用不要照抄到用户设置页。

## 4. 可展开卡片（列表 → 详情）

路由约定：**父路由 = 页面，子路由 = 某张卡片的展开态**，URL 保持 `父/子` 层级，浏览器后退即收起。

```js
// router/index.js
import { EmptyRoute } from 'zero-ai-ui-lib'

{
  path: '/records',
  name: 'records',
  component: RecordsView,
  children: [
    // /records/:recordId —— 子路由只需要占位组件
    { path: ':recordId', name: 'records-record', component: EmptyRoute, meta: { expandKey: 'record' } }
  ]
}
```

```vue
<RouteExpandCard
  section="records"
  :card-key="record.id"
  route-name="records-record"
  :params="{ recordId: record.id }"
  tag="div"
  variant="list-item"
  :content="ExpandRecord"
  :content-props="{ title: record.title, meta: record.date }"
>
  <div class="list-body"><b>{{ record.title }}</b></div>
</RouteExpandCard>
```

- `variant`：`card`（整卡）/ `metric`（格子）/ `list-item`（列表行）——三者的背景、描边、圆角、内边距都由库样式提供，应用只管往里塞内容。
- 展开内容里放关闭按钮：`<UiButton data-close>返回</UiButton>`。
- 卡片内可交互元素（按钮、输入框、图表）默认已被忽略，不会误触发展开；额外元素加 `data-no-expand`。
- 桌面端（≥900px）展开成居中模态 + 背景压暗模糊；移动端铺满整屏，但**展开遮罩两端都铺**（`.expand-backdrop` 满档 = 20% 黑 + 5px 模糊）：移动端卡片收起 / 侧滑的过程中遮罩露出来，承担同一段「由黑转不黑 + 由模糊转清晰」的过渡（`--edge-fade` 乘算系数控制强度）。
- 更多细节见仓库 `docs/route-expand-card.md`。

## 4.5 历史栈与返回（硬规则）

- **底部 Tab 切换用 `replace`**：Tab 是平级视图，不往历史里堆（`router.replace({ name: id })`）。
- **卡片展开用 `push`**：产生一条历史记录，系统返回 = 收起卡片。
- **卡片内返回按钮和系统返回统一 `back()`**：不要 `push('/父')`、也不要 `replace('/父')`（后者会把展开历史抹掉，返回语义断裂）。
- **先播弹簧收起动画，动画完成后再 `back()`**：`ExpandableCard` 内部已按 `--spring-exit-dur` + 缓冲等待后再退历史。
- 例外：深链直达展开态时没有我们压入的历史条目，`back()` 会退出应用，此时才允许 `replace` 回父路由。

## 4.6 iOS 侧滑跟手（core/edgeSwipeBack）

完全由 JS 接管左边缘手势，**不依赖任何返回拦截插件**：

```js
import { useEdgeSwipeBack } from 'zero-ai-ui-lib'

const swipe = useEdgeSwipeBack({
  container: () => document,
  target: () => getActive()?.card || document.getElementById('viewRoot'),
  shouldHandle: () => !!getActive(),   // 只在有展开卡片时接管
  onBack: () => router.back()
})
```

- 仅移动端接管（应用侧 `shouldHandle` 里加 `matchMedia('(min-width: 900px)')` 判断即可）；`touchstart` 只落在左边缘 `edgeWidth`（默认 26px）内才开始拖拽；明显纵向滑动立即让位给页面滚动。
- `touchmove` 按 `deltaX` 实时写 `translate3d / scale / border-radius`，期间 `transition: none` 完全跟手；遮罩**优先复用展开卡片的 `.expand-backdrop`**（有就乘算 `--edge-fade`），没有才自建一层 —— 侧滑时下层经历的是与收起一致的「由 20% 黑 + 5px 模糊淡向全亮」。`--edge-fade = 1 - 进度`：越滑越亮越清晰，松手弹回时回到满档。
- **跟手有限度**：位移到 `travelLimit`（默认 78% 宽度）为止，超出走橡皮筋（最多再 12%），拖不到屏幕外；到底时缩放 `maxScale`（默认 .86）、圆角 `maxRadius`（默认 **32px**）都取最大，中途连续变化。
- `touchend` 按位移比例（默认 34% × 上限）+ 速度（默认 0.62px/ms）判断：过阈值 -> **从当前跟手位置继续滑出**（圆角同时加到 32px，先提交当前帧再过渡，绝不回原位重放），落定后 `back()`，并在路由切换绘制完成后才清掉内联样式。
- **弹回按距离给弹性**：未过阈值时从松手的确切位置 / 缩放 / 圆角续接（显式落值 + 强制一帧，不会重放），离得越远时长越长（`revertDuration` 340ms → `revertDurationFar` 520ms）、过冲越大（cubic-bezier 的 y2 从 `revertOvershootNear` 1.02 线性升到 `revertOvershootFar` 1.42），近处几乎不回弹。
- 卡片展开态下侧滑完成时会给卡片打 `uiSwipeClose` 标记，`ExpandableCard` 看到标记**不直接落定**，而是把跟手留下的 `translate / scale / 圆角` 当作收起动画的起点，走与「点返回按钮」完全相同的弹簧路径（只是多过渡一个 transform）—— 卡片从松手的位置连续收回列表原位，不会「先消失再在目标位置淡入」。
- 手感参数（阈值 / 上限 / 橡皮筋 / 缩放 / 圆角 / 遮罩 / 时长）全部可配，见 `DEFAULTS`。

**宿主（原生 WebView 壳）必须配套两件事**，否则手势会被系统抢走：

```rust
// 1) 关掉系统自带的前进 / 后退滑动（WKWebView allowsBackForwardNavigationGestures = false）
webview.set_navigation_gestures_enabled(false);
// 2) 左边缘系统手势优先交给 WebView
window.with_preferred_screen_edges_deferring_system_gestures(ScreenEdge::LEFT);
```

## 5. 主题

库自带浅色令牌。换主题只改 CSS 变量（放应用根节点）：

```css
:root {
  --primary: #3f5f90;
  --primary-container: #d7e2ff;
  --on-primary-container: #001b3c;
  --background: #faf9fd;
  --surface-container-low: #f4f3f7;
  --surface-container-high: #e9e7eb;
  --on-surface: #1b1b1f;
  --on-surface-variant: #46464f;
  --outline-variant: #c7c5d0;
  --radius-scale: 1;
  --press-scale: 0.97;
  /* 换字库：只覆盖这两个变量，别改组件里的 font-family */
  --font-sans-custom: 'YourSans';
  --font-mono-custom: 'YourMono';
}
```

深色：`--background` 取很深的色、`--on-surface` 取浅色、`--surface-container-*` 依次调亮一档，并给 `<html>` 设 `color-scheme: dark`。
示例应用的整套配色由**官方 `@material/material-color-utilities` 本地依赖**生成（`src/core/theme.js` 里 `Hct` + `SchemeVibrant`），不请求任何 CDN：断网、内网、CSP 禁外链都能正常出主题色。
深色不要照搬 MD3 默认层级（6 / 10 / 12 / 17 / 22）：卡片和页面底色只差几个灰阶，几乎粘在一起。示例应用改成 **6 / 14 / 17 / 22 / 27**（描边 tone 36），卡片与背景的亮度比约 1.2:1、高层约 1.5:1；纯黑外观用 #000 / #151518 / #1d1d21 / #27272d / #32323a。
首帧防闪：在 `<head>` 里同步读 localStorage 落 `--background` 与 `data-appearance`，别等模块脚本。

## 5.1 应用级配置：zero.config.yaml / zero.config.json

应用根目录（与 `index.html` 同级）放一份配置，库启动时读 **根部 `ui`** 段并落成令牌；文件不存在时全部走默认，不算错。查找顺序：`zero.config.yaml` → `zero.config.yml` → `zero.config.json`。

```yaml
ui:
  motion: lively          # calm | lively（动效气质，产品调性）
  appearance: light       # light | dark | auto
  radiusScale: 1          # → --radius-scale
  density: 0.93           # → --density / --space-*
  pressScale: 0.97        # → --press-scale
  fontScale: 1            # → html 字号基准（rem 整体缩放）
  colors:                 # camelCase 或 kebab-case 均可，未知键忽略
    primary: "#3f5f90"
    primaryContainer: "#d7e2ff"
    background: "#faf9fd"
  tokens:                 # 逃生口：任意 CSS 变量
    --focus-w: 2px
```

用法（二选一）：

```js
// 1) 库自动读：应用启动时调一次即可
import { initZeroConfig } from 'zero-ai-ui-lib'
initZeroConfig()          // 默认从 BASE_URL 取配置；可传 { base: '/sub/' }

// 2) 已经自己拿到配置对象（SSR 注入 / 远程下发）
import { useZeroConfig } from 'zero-ai-ui-lib'
useZeroConfig({ ui: { motion: 'lively', colors: { primary: '#0f766e' } } })
```

组件库内的模块会读取解析结果：`getZeroConfig()` 拿原始对象，`getAppliedZeroConfig()` 拿「实际写入了哪些键」，便于调试。完整字段注释见仓库根目录 `zero.config.example.yaml`。

## 6. 响应式 / 桌面端

库内组件本身是响应式的，页面布局自己写：

```css
@media (min-width: 900px) {
  .app { max-width: none; }
  #scrollArea { padding: 24px clamp(24px, 4vw, 64px) 110px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .grid > .feature { grid-column: 1 / -1; }
}
```

底部导航：直接用 `UiTabBar`（`:items` 传 `{ value, label, icon }`，`@change` 里做 replace 跳转）。移动端背景铺满整屏宽度（不设 max-width），tab 总宽各自上限 96px；桌面端贴左竖排、背景铺满整个高度，tab 从顶部按固定间距往下排。两套定位在互斥的 media 查询里，永不互相污染。

## 7. 日期与数字显示约定

- 相对今天 **±3 天以内**只显示称呼：大前天 / 前天 / 昨天 / 今天 / 明天 / 后天 / 大后天，**不显示具体日期**。
- 与今天**同一年**不显示年份，只显示「12月17日」。
- 需要折行时从「年」之后断开，「X月X日」尽量保持在同一行（拆成两个 `white-space: nowrap` 的 inline-block）。
- 数字一律 `font-variant-numeric: tabular-nums`；大数字用 `--w-heading` + 轻微负字距。

## 8. 常见坑

1. `inert`：库用 `inert` 屏蔽未展开面板的焦点，需要 Chrome 102+ / Safari 15.5+。
2. 浮层都是 `position: fixed`：祖先元素不要加 `transform` / `filter` / `backdrop-filter` / `will-change`，否则包含块会变成那个祖先，`left/top` 整体偏一段（还会被裁剪）。`UiSelect` / `useMorphWindow` 已经用 `core/fixedBox` 做包含块补偿，自定义浮层建议沿用同一个工具；纯 CSS 浮层则避开这类祖先。
3. 忘写外壳高度（`#app` / `.app` / `#scrollArea`）→ 弹层贴不到底。
4. 骨架里不带 `<link rel="icon" href="data:," />` 会产生一条 404 console error，和「无报错」验收冲突。
5. 本机 Vite 的 `localhost` 可能只监听 `::1`：用 `server.host = '0.0.0.0'`，验收走 `http://127.0.0.1:<port>`。
6. pnpm 用本地 tarball 时先复制进项目（`vendor/*.tgz`）再写 `file:vendor/...`；指向仓库外路径会随文件移动而失效。
7. `UiToastHost` 在最上层，底部面板打开时可能盖住表单底部，可在打开前 dismiss。
8. `UiToolMenu` 展开时会在文档流里占位、把下方内容推开；不想位移就换 `UiFloatingMenu`。
9. 调试用的无头 Chrome profile 目录（`.chrome-*/`，含 `.chrome-color`）与根目录截图（`.shot*`）会被写大量文件，`.gitignore` 已忽略，`vite.config.js` 的 `server.watch.ignored` 也排除了它们，否则 dev/preview 会被热更风暴拖垮。
10. 给展开卡片做「滑出式关闭」时，动画必须**从当前跟手位置续接**（先 `void offsetWidth` 提交当前帧再写 transition），并在路由切换绘制后才清内联样式；否则完成动画会像从原位重新开始。
11. 动效气质不要做成用户设置：它是产品定位（工具类用 `calm`、娱乐社交类用 `lively`），应在代码或 `zero.config` 里预置。做成「设置 → 动效风格」会让同一产品的手感随用户漂移，动效语言就散了。
12. 手势组件里的 `setPointerCapture` 必须 try/catch：指针在回调前已失效时（系统取消、合成事件）会抛 `NotFoundError`，一旦抛在回调中间，后续的吸附 / 收尾逻辑会被整段跳过。

## 9. 交付前自查

- `npm run dev` 起得来，控制台 0 error；
- 至少用 6 个库组件，且没有手写重复的按钮 / 输入框样式；
- 下拉、日期、时间、两类形变菜单：能展开、能选、能收起，收起途中能打断；
- 弹窗打开时背景压暗模糊，关闭后页面能滚动；
- 1200px 宽内容铺满、无横向滚动；375px 宽不溢出；
- 日期显示符合第 7 节（相对称呼 / 同年省年份 / 折行位置）；
- TS 项目直接 `import { … } from 'zero-ai-ui-lib'` 有 props 类型（包自带 d.ts），不要再写 `declare module` 兜底。

## 10. 本仓库（库源码）相关

```bash
npm run build        # 演示应用 -> dist-app/
npm run preview      # 预览 dist-app
npm run build:lib    # 库产物 -> dist/
```

发布新版本需要人工确认（改 `package.json` 的 `version` → `npm publish`），不要自动执行。

> **skill 随包分发**：npm 包内自带 `skills/zero-ai-ui/SKILL.md`（速查版约定）与 `AGENTS.md`（完整规范）。消费端的 AI Agent 先加载 SKILL.md / AGENTS.md 再动手，就不会发明样式或踩已知坑；两个文件随包一起更新。
