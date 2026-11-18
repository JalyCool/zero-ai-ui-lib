---
name: zero-ai-ui-lib
description: 用 zero-ai-ui-lib（Vue 3 · Material 3 风格组件库，92 个组件 + 形变动效 + CSS 令牌）正确地创建应用、页面或组件。只要目标项目会 import 这个包，先加载本 skill 再动手；需要「某个场景该用哪个组件」时读 reference/08-component-choice.md。避免发明样式 / 忽略交互约定 / 踩已知坑。
---

# zero-ai-ui-lib 使用约定

本 skill 是**索引**：装什么、外壳怎么写、哪些事必做 / 禁止做、组件清单在哪。
具体用法在 `reference/` 下按域拆分，按需读取（通常 1~2 篇就够，不必全读）：

| 什么时候 | 读哪篇 |
| --- | --- |
| 新建项目 / 换主题 / 配置 | `reference/01-getting-started.md` |
| 页面骨架、滚动、边缘模糊、顶部头部 | `reference/02-shell-layout.md` |
| 表单、输入、选择器、日期时间、菜单 | `reference/03-form-inputs.md` |
| 弹窗、抽屉、toast、提示、引导 | `reference/04-overlays-feedback.md` |
| 图表、表格、树、列表、卡片组、日历 | `reference/05-data-display.md` |
| 对话流、Markdown、@ 提及 | `reference/06-chat-markdown.md` |
| 动效令牌、弹簧、motion tone、模糊精度 | `reference/07-motion-tokens.md` |
| **不知道该用哪个组件 / 相似组件怎么选** | `reference/08-component-choice.md` |

完整规范仍在包根目录 `AGENTS.md`（随包分发）；冲突时以 AGENTS.md 为准。

## 五分钟起步

```bash
npm i vue vue-router zero-ai-ui-lib
npm i -D vite @vitejs/plugin-vue
```

```js
// main.js
import { createApp } from 'vue'
import 'zero-ai-ui-lib/style.css'
import App from './App.vue'
createApp(App).mount('#app')
```

最小骨架（不写这一整套也可以——直接用 `ZeroApp`，见下）：

```css
html, body { margin: 0; height: 100%; overflow: hidden; }
#app { height: 100dvh; }
#scrollArea { flex: 1; overflow-y: auto; scrollbar-width: none; }
.view { display: flex; flex-direction: column; gap: var(--space-gap); min-width: 0; }
```

## 推荐做法：包一层 ZeroApp

```vue
<ZeroApp :tabbar-space="72">
  <router-view />
  <template #edge-top><AppHead fuse-only title="页面标题" /></template>
  <template #tabbar><UiTabBar :items="tabs" v-model="tab" @change="onTab" /></template>
</ZeroApp>
```

它已经内建 `#scrollArea`、页面上下边缘溢出时的渐进式模糊（随滚动淡入淡出）、TabBar 占位、居中限宽、底部模糊带以 TabBar 顶边为底边。**不要**逐页手写 `overflow-y:auto` 容器和 `UiProgressiveBlur`。

## 硬规则（违反必返工）

1. **滚动容器 id 必须叫 `#scrollArea`**——`UiModal` / `UiBottomSheet` / `ExpandableCard` 靠它锁滚动；换名字这些组件就锁不住页面。骨架里带 `<link rel="icon" href="data:," />` 防一条 404。
2. **历史栈**：底部 Tab 切换一律 `router.replace`（平级视图不堆历史）；卡片展开 `push`、收起 `back()`（动画播完再退）。别 `replace('/父')`，会把展开历史抹掉。
3. **危险确认统一 `confirmDialog`**：`await confirmDialog({ title, message, danger })`，不要 `window.confirm`。操作反馈走 `UiToastHost` 的语义 API（`success/error/warning/info`）。
4. **不重复造控件**：按钮 / 输入框 / 弹窗 / toast / 菜单 / 选择器全用库的。自己写第二套样式 = 视觉断层。
5. **动效令牌**：不写死 duration。`transition: transform var(--t-panel)`；`--t-*` 是「时长+曲线」完整值，**绝不再拼 `var(--spring-*)`**（解析失败、动画静默跳变）。小控件用 `--t-pop`。
6. **motion tone 是产品调性，不是用户设置**：工具类 `calm`、娱乐社交 `lively`，写进 `zero.config.yaml` 的 `ui.motion` 或 `setMotionTone('lively')`，**不要**做成设置项暴露给用户。
7. **图标**：`UiIcon` 的 `name` 先查本地注册表，未命中按 Iconify 名渲染；`pack:icon` / `pack/icon` / `pack--icon` / `i-pack:icon` 等价。分段 / 下拉的 `icon` 属性吃的是 **24×24 viewBox 内的 SVG 内部标记**，不是图标名。
8. **浮层祖先**：不要给浮层的祖先加 `transform` / `filter` / `backdrop-filter` / `will-change`——fixed 包含块会被劫持，弹层坐标偏移还会被裁。
9. **描边克制**：能没有描边就不要有描边，层次靠表面色阶与圆角分档。描边只保留在输入框 / 开关复选框类控件 / `variant="outline"` / 分隔线 / 浮层边界。
10. **阴影只有 TabBar**：全库唯一投影在 `UiTabBar`；其他组件一律不投影，浮层靠边界 + 压暗遮罩分离。
11. **字体只引用变量**：`--font-sans` / `--font-mono` / `--font-numeric` 是唯一来源；等宽数字两条一起给（`font-variant-numeric: tabular-nums` + `font-feature-settings: var(--font-feat-tnum)`）。换字库只覆盖 `--font-sans-custom` / `--font-mono-custom`。
12. **日期显示**：相对今天 ±3 天内用称呼（今天 / 明天…），同年省年份；需要折行从「年」后断开。
13. **对话流用 Chat 组件族**：`UiChatThread` + `UiChatMessage` + `UiChatSystemLine` + `UiChatComposer`；正文走 `MarkdownView`，`@名字` 由它渲染成 `UiAvatarTag`——不要另写 mention 组件，也不要给消息头像加圆形底或裁切。
14. **改完跑审计脚本**（仓库根目录）：`node audit-imports.cjs`（模板组件未导入 = 白屏，Vue 只告警）、`node audit-props.cjs`、`node audit-scene.cjs`。

## 常见坑速记

- `--t-*` 拼接弹簧 → 整条 transition 失效（浏览器静默丢弃）。
- 忘写外壳高度（`#app` / `.app` / `#scrollArea`）→ 弹层贴不到底。
- 深色模式按 6 / 14 / 17 / 22 / 27 灰阶分档，别照搬 MD3 的 6/10/12/17/22（卡片和底色会粘在一起）。
- TS 项目直接具名 import，包自带 d.ts，不要写 `declare module` 兜底。
- 本机 Vite 的 localhost 可能只监听 `::1`：`server.host = '0.0.0.0'`，验收走 `http://127.0.0.1:<port>`。
