# skills/ —— 可发布的 Agent Skill 目录

这个目录是一个**标准的 Agent Skill**：仓库根的 `skills/<skill-name>/SKILL.md`，带 YAML frontmatter（`name` 与目录名一致）。

- **Vercel Agents Skills / 通用 agentskills 规范**：扫描仓库根 `skills/`，命中 `skills/zero-ai-ui/SKILL.md`
- **GitHub Copilot（项目技能）**：读 `.github/skills/`、`.claude/skills/` 或 `.agents/skills/`；本仓库的副本在 `.github/skills/zero-ai-ui/`

## 结构

```
skills/zero-ai-ui/
├─ SKILL.md                     # 主入口：索引 + 硬规则（上下文占用最小）
└─ reference/
   ├─ 01-getting-started.md     安装 / 外壳 / 主题 / zero.config / 审计
   ├─ 02-shell-layout.md        ZeroApp / ZeroScroll / AppHead / UiProgressiveBlur
   ├─ 03-form-inputs.md         输入 / 选择器 / 菜单 / 日期时间 / 滑块评分
   ├─ 04-overlays-feedback.md   弹窗 / 抽屉 / toast / alert / 提示 / 确认
   ├─ 05-data-display.md        图表 / 表格 / 树 / 虚拟列表 / 卡片组 / 日历
   ├─ 06-chat-markdown.md       对话流 / Markdown / @ 提及
   ├─ 07-motion-tokens.md       令牌 / 弹簧 / motion tone / 可展开卡片
   └─ 08-component-choice.md    【选用规范】该用哪个 / 何时不用 / 相似组件区别
```

拆分粒度：主入口只放索引与硬规则；每个分域一篇，AI 按任务读 1~2 篇即可，不需要十几次调用。

## 维护

改动只需编辑 `skills/zero-ai-ui/`，然后同步到 GitHub 检索位置：

```bash
npm run sync:skills      # skills/zero-ai-ui → .github/skills/zero-ai-ui
```

`skills/` 同时随 npm 包分发（`package.json` 的 `files` 已含），因此消费端 `import 'zero-ai-ui-lib'` 的项目也能读到同一份 skill。

## 命名约定（新增组件时）

- 对外组件统一 `Ui` 前缀；外壳/布局类用角色名（`ZeroApp` / `ZeroScroll` / `AppHead`）
- 一种能力只保留一个名字：形态差异用属性表达（`UiChart type`、`UiMenu variant`、`UiDatePicker mode`），不再并列多个同义组件
- 被合并的实现放 `src/components/ui/internal/`，不导出
