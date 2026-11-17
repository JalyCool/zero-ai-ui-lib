---
name: zero-ai-ui-lib
description: 用 zero-ai-ui-lib（Vue 3 · Material 3 风格组件库，96 组件 + 形变动效 + CSS 令牌）正确地创建应用、页面或组件。只要目标项目会 import 这个包，先加载本 skill 再动手，避免发明样式 / 忽略交互约定 / 踩已知坑。
---

# zero-ai-ui-lib 使用约定

本 skill 是速查版；完整规范在包根目录的 `AGENTS.md`（与 skills/ 同级随包分发），冲突时以 AGENTS.md 为准。

## 五分钟起步

```bash
npm i vue vue-router zero-ai-ui-lib
npm i -D vite @vitejs/plugin-vue
```

```js
import { createApp } from 'vue'
import 'zero-ai-ui-lib/style.css'
import './shell.css'
import App from './App.vue'
createApp(App).mount('#app')
```

## 硬规则（违反必返工）

1. **外壳三件套**：`#app` 高度 100dvh，滚动容器 id 必须叫 `#scrollArea`——UiModal / UiBottomSheet / ExpandableCard 靠它锁滚动。骨架里带 `<link rel="icon" href="data:," />` 防 404。
2. **历史栈**：底部 Tab 切换一律 `router.replace`（不堆历史）；卡片展开 `push`、收起 `back()`。
3. **危险确认统一 `confirmDialog`**：不要 `window.confirm`。`await confirmDialog({ title, message, danger })`。
4. **按下必收缩**：可展开按钮按下 scale(.97)，松手才展开——库已内置，别再手写。
5. **动效令牌**：不写死 duration。`transition: transform var(--t-panel)`；`--t-*` 是完整值，**绝不再拼 `var(--spring-*)`**（解析失败、动画静默跳变）。小控件用 `--t-pop`。
6. **motion tone 是产品调性不是用户设置**：工具类 `calm`、娱乐社交 `lively`，写进 `zero.config.yaml` 的 `ui.motion` 或 `setMotionTone`，不做成设置项。
7. **图标两种放法**：`leading`（文字前）/`top`（上方卡片）；icon 属性吃 24×24 viewBox 的 SVG 内部标记，不是图标名。
8. **浮层祖先**：不要给浮层的祖先加 transform / filter / will-change（fixed 包含块会偏移被裁剪）。
9. **日期显示**：±3 天内用称呼（今天 / 明天…），同年省年份；数字一律 `tabular-nums`。
10. **不重复造控件**：按钮 / 输入 / 弹窗 / toast 全用库的；确认弹层 / 操作反馈分别走 confirmDialog 与 UiToastHost 语义 API（success / error / warning / info）。
11. **描边克制**：能没有描边的地方就不要有描边——层次靠表面色阶与圆角分档；描边只保留在输入框 / 开关复选框类控件 / `variant="outline"` / 分隔线 / 浮层边界。别给卡片、告警、面板加装饰性 outline。
12. **阴影只有 TabBar**：全库唯一投影在 UiTabBar（移动端向上 / 桌面端向右的淡分离影）；其他组件一律不投影，浮层靠边界 + 压暗遮罩分离，别加 `box-shadow`。
13. **图标走 Iconify**：UiIcon 先查本地注册表（registerIcons），未命中按 Iconify 名渲染；`pack:icon` / `pack/icon` / `pack--icon` / `i-pack:icon` 等价。Markdown 里四种裸写法与 `::pack:icon::` 都能识别（显式优先），代码块内保持字面量。
14. **流式内容**：MarkdownView / UiText 都支持 `streaming`——MarkdownView 逐 **token** 上浮 + 模糊级联入场（motion 弹簧，位移约 0.9em 才读得出来），并预留高度防跳动；UiText 只给新增片段播进场；打字机无光标时默认 `reserve` 占位。
15. **链接用 UiLink**（默认 primary 无下划线、悬停才出，外链自动 ↗ 角标），不要在 Markdown 或页面里手写裸 `<a>` 样式。
16. **字体只引用变量**：`--font-sans` / `--font-mono` / `--font-numeric` 是唯一来源，别处不写死字体名；等宽数字永远两条一起给——`font-variant-numeric: tabular-nums` + `font-feature-settings: var(--font-feat-tnum)`（兼容老浏览器）。换字库只覆盖 `--font-sans-custom` / `--font-mono-custom`。
17. **Tailwind（应用侧，可选）**：v4 CSS-first，`@theme` 已把库令牌映射成工具类（`bg-primary` / `rounded-card` / `rounded-13` / `text-tiny` / `font-heading`…），随主题自动切换；无 preflight、utilities 进 layer（组件样式天然优先，工具类只用于新布局）；组件内部仍写令牌 CSS；`--density` 联动的间距工具类表达不了，用令牌。
18. **对话流用 Chat 组件族**：`UiChatThread`（自带滚动 + 贴底 + 跟随）+ `UiChatMessage`（assistant 无气泡 / user 右上收窄 / agent 左上收窄，收窄角指向说话人）+ `UiChatSystemLine`（0.4 不透明度的活动行 / 状态行）。**正文走 MarkdownView**（`content` + `mention-resolver`），`@名字` 由它渲染成 `UiAvatarTag`（`reveal` 入场：头像弹出 + 标签左→右展开）——不要另写 mention 组件，也不要给消息头像加圆形底或裁切。
19. **页面顶 / 底渐变模糊用 `UiProgressiveBlur`**：N 层 backdrop-filter + 软边 mask，模糊向内线性衰减；全部 pointer-events:none，不会挡住滚动内容。
17. **Markdown 用 MarkdownView**：需要 @ 提及时传 `mentions` + `mentionResolver`，返回 `{ username, showname, type: 'normal'|'agent', image, shape }`，自动渲染成 UiAvatarTag。

## 组件速查（完整 99 个见 AGENTS.md 第 2 节）

按钮 UiButton（含 fuse / hold / slide 动作变体）· 输入族 UiInput / UiSelect / UiDatePicker / UiTimePicker · 反馈 UiToastHost / UiAlert / confirmDialog · 布局 UiTabBar / UiSidebar / UiBottomSheet / UiModal · 列表 UiSwipeRow / UiDataTable / UiTreeView / UiVirtualList · 数字 UiRollNumber（库内一切数字动效的底座）· 可展开卡片 ExpandableCard / RouteExpandCard。

## 常见坑速记

- `--t-*` 拼接弹簧 → 整条 transition 失效（浏览器静默丢弃）。
- 忘写外壳高度 → 弹层贴不到底。
- 深色模式按 6/14/17/22/27 灰阶分档，别照搬 MD3 的 6/10/12/17/22（卡片和底色会粘在一起）。
- TS 项目直接具名 import，包自带 d.ts，不要写 `declare module` 兜底。
