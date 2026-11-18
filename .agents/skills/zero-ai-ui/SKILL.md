---
name: zero-ai-ui-lib
description: 用 zero-ai-ui-lib（Vue 3 · Material 3 风格组件库，92 个组件 + 形变动效 + CSS 令牌）正确地创建应用、页面或组件。只要目标项目会 import 这个包，先加载本 skill；需要「某个场景该用哪个组件」时读 reference/08-component-choice.md。避免发明样式 / 忽略交互约定 / 踩已知坑。
---

# zero-ai-ui-lib

装：`npm i vue vue-router zero-ai-ui-lib`，`import 'zero-ai-ui-lib/style.css'`。

## 按任务读一篇就够（不要全读）

| 要做什么 | 读 |
| --- | --- |
| 新建项目 / 换主题 / 表面层级取色 / zero.config / 审计脚本 | `reference/01-getting-started.md` |
| 页面骨架、滚动与边缘模糊、头部（AppHead）、TabBar | `reference/02-shell-layout.md` |
| 表单、输入、选择器、菜单、日期时间、滑块评分 | `reference/03-form-inputs.md` |
| 弹窗、抽屉、toast、提示、引导 | `reference/04-overlays-feedback.md` |
| 图表、表格、树、虚拟列表、卡片组、日历 | `reference/05-data-display.md` |
| 对话流、Markdown、@ 提及 | `reference/06-chat-markdown.md` |
| 动效令牌、弹簧、motion tone、可展开卡片与历史栈 | `reference/07-motion-tokens.md` |
| **不知道该用哪个 / 相似组件怎么区分** | `reference/08-component-choice.md` |

完整规范：包根目录 `AGENTS.md`（随包分发），冲突以它为准。

## 五条最容易翻车的规则

1. **滚动容器 id 必须叫 `#scrollArea`**（弹层靠它锁滚动）；骨架带 `<link rel="icon" href="data:," />`。
2. **外壳用 `ZeroApp` + `AppHead`**：页面不用自己拼滚动容器/边缘模糊/标题头，页面专属按钮用 `setPageHeadActions()` 注入，头部第二行用 `setPageHeadAfter()`。
3. **浮层祖先不要有 `transform` / `filter` / `backdrop-filter` / `will-change`**——fixed 包含块会被劫持，弹层坐标偏移还会被裁。
4. **动效用 `--t-*` 完整值**，绝不再拼 `var(--spring-*)`（整条 transition 会静默失效）。
5. **表面色按 MD3 变体取**：直接放页面 → `--surface-container-low`；嵌套 → `container/high`；浮层 → `highest`。自定义属性里不要存 `var(--x)`（会变 `var(var(...))` 让背景消失）。

改完跑仓库根目录的 `node audit-imports.cjs && node audit-props.cjs`（模板组件漏导入 = 白屏，Vue 只告警）。
