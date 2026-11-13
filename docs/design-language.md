# 设计语言总结 · Vital / zero-ai-ui-lib

一句话：**平面化的材料式（MD3 血统）健康应用语言** —— 用表面色阶和 0.75px 细描边做层次，
不用阴影和渐变堆叠；所有动效都服务一个动作的“生长/形变”，而不是元素淡入淡出。

## 1. 基础变量（都在 `src/styles/tokens.css`）

| 类别 | 令牌 | 值 |
| --- | --- | --- |
| 圆角 | `--r-card` / `--r-metric` / `--r-button` / `--r-list` / `--r-preview` | 22 / 18 / 14 / 18 / 16 px，统一乘 `--radius-scale` |
| 密度 | `--density` | 0.93（所有间距按它缩放） |
| 间距 | `--space-gap` / `--space-card` / `--space-metric` / `--space-item` | 18.6 / 14.88 / 13.02 / 11.16 px |
| 描边 | `--border-w` | 0.75px（比 1px 轻，靠色阶分层） |
| 焦点 | `--focus-w` | 2px，`outline-offset: 2px` |
| 按压 | `--press-scale` / `--press-card-scale` | 0.97 / 0.985 |
| 层次 | `--elev-card` / `--elev-sheet` / `--elev-tip` | 全部 `none` |
| 按钮尺寸档 | `--btn-h-*` / `--btn-pad-*` / `--btn-fs-*` | sm 28 / md 34 / lg 42 px |

## 2. 颜色

- 结构：Material 3 **Vibrant** 方案，从种子色生成整套 tone（`--primary/-container`、`--surface-container-*`、`--outline*`、`--on-*`）。
- 回退：CDN 上的 MD3 库异步加载；未就绪时用 OKLCH 近似（保证色相方向一致），算出的令牌会缓存到 localStorage，下次首帧直接用缓存值。
- 外观：`light / dark / white / black` 四档；`white` / `black` 额外覆盖背景与表面色阶。
- 首帧：`index.html` 里的引导脚本在渲染前落 `data-appearance`、`--background/--surface`、`color-scheme`，避免“先白后深”。
- 用法约定：颜色一律走令牌，不写死 hex；语义色用 `--primary`（主操作）、`--error`、`--ui-success/--ui-warning`。

## 3. 排版

| 令牌 | 值 | 场景 |
| --- | --- | --- |
| `--fs-h1` | 1.35rem | 页面大标题 |
| `--fs-value` | 1.2rem | 指标大数字 |
| `--fs-big` | 1.1rem | 卡片标题、面板标题 |
| `--fs-body` | 0.86rem | 正文 |
| `--fs-small` | 0.78rem | 控件文字 |
| `--fs-tiny` | 0.68rem | 辅助说明 |
| `--fs-micro` | 0.62rem | 标签、脚注 |

字重 650 / 600 / 400 / 600（标题 / 标签 / 正文 / 强调），行高 1.4、字间距 0；
数字用 `font-variant-numeric: tabular-nums` + 负字距（大数字更有密度感）。
字体栈：系统 UI 字体（`-apple-system / Segoe UI / Roboto / PingFang SC`）。

## 4. 层次与形状

- **不用投影**：`--elev-*` 全为 none，层次靠 `--surface-container-low → high` 的色阶 + 0.75px 描边 + 圆角差异。
- 圆角分档：整卡 22、指标卡 18、列表行 18、输入/按钮 13–14、内层项 8–11、胶囊 999。
- 交互态靠色阶：hover 上浮一档表面色（`--surface-container`），选中/激活用 `--primary-container`。

## 5. 动效（核心资产）

### 5.1 弹簧曲线

`src/core/spring.js` 用响应/阻尼参数生成 `linear(...)` 缓动并写入 `--spring-*`，时长 = response × 1.5：

| 场景 | response / damping | 时长 | 用途 |
| --- | --- | --- | --- |
| feedback | 0.32 / 0.90 | 0.48s | 按压、轻反馈 |
| view | 0.42 / 1.00 | 0.63s | 视图切换、外壳几何 |
| sheet | 0.55 / 1.00 | 0.825s | 底部面板进场 |
| expand | 0.42 / 1.00 | 0.63s | 卡片展开 |
| exit | 0.435 / 0.95 | 0.6525s | 退场（略快、略带回弹） |
| fade | 0.30 / 1.00 | 0.45s | 颜色/透明度 |

### 5.2 内容替换（“像卡片展开”）

- 旧内容：留在原位，`opacity → 0` + `filter: blur(8px)`，220–240ms；收起时延迟 60ms 回来。
- 新内容：从 `opacity 0 / blur(10px) / translateY(8px) scale(.985)` 浮现，延迟 70–90ms，约 300–340ms。
- 外壳本身只做几何（宽高/圆角/底色）过渡，不整体淡入淡出。

### 5.3 形变（morph）

- **形变菜单**：按钮外壳就是载体，按下 `scale(.97)`，松手后从按钮尺寸原地长成面板（fixed + 占位块），列表在长出来的外壳里浮现。
- **自绘下拉**：外壳长成列表，输入框里的内容**平移到当前选中项那一行**再淡出，由真实列表项接手。
- **日期/时间选择器**：按下收缩 → 贴着输入框展开成窗口（不压暗背景）；时间滚轮的高亮块固定在中央，只有数字层在动。
- **卡片展开**：卡片元素从原位生长；移动端铺满整页，桌面端（≥900px）生长成居中模态 + 16% 压暗 + 5px 背景模糊。

### 5.4 遮罩（scrim）

`--t-fade` 淡入 + `backdrop-filter: blur(0px → 5px)` 420ms；只压暗 16%，够分层不抢内容。
口部：对话框、底部面板、桌面端卡片展开共用同一套遮罩。

### 5.5 降级

`prefers-reduced-motion: reduce` 时所有动效压到 0.01ms、展开内容去掉模糊；JS 侧计时也归零。

## 6. 布局与响应式

- 移动端：单列容器，最大 480px；`#scrollArea` 是唯一滚动容器（`body` 固定，弹层锁它）。
- 桌面端（≥900px）：内容铺满窗口宽度；首页两列卡片 + 四列指标；tabbar 从底部横排改成**左侧竖排侧栏**，外观参数不变。
- 卡片/面板结构：`view`（页面）→ `card / metric / list-item`（可展开）→ `expand-content`（详情）。

## 7. 组件约定

- 变体：`primary / tonal / outline / text / danger / icon`；尺寸 `sm / md / lg`。
- 状态：默认 → hover（仅精细指针）→ active（缩放）→ disabled（opacity .42）→ loading（转圈 + 保持宽度）。
- 输入类：`label + 控件 + hint/error` 三段式；错误态描边 `--error` 并带 3px 柔光环。
- 焦点：只用 `:focus-visible` 的 2px 主色外框，鼠标点击不出现焦点环。
- 可展开元素：`aria-expanded` + `role` 对应（menu / dialog / listbox），未展开内容用 `inert` 屏蔽焦点。

## 8. 这套语言的“性格”

1. **安静**：无阴影、无渐变噪点、低饱和表面色阶，信息密度靠排版而不是装饰。
2. **连贯**：所有展开/收起都是同一个元素的形变，不是“关闭一个、打开另一个”。
3. **有触感**：按压必缩小、松手必回弹，长按保持压缩态。
4. **可预期**：动效场景固定成 6 组弹簧，不会每个组件各写一套 duration。
5. **可主题化**：换一个种子色 + 一个外观值，整套应用（含浮层与卡片）一起变。

## 9. 落文件对照

| 关注点 | 文件 |
| --- | --- |
| 令牌 | `src/styles/tokens.css` |
| 弹簧 | `src/core/spring.js`，消费方读 `--spring-*` / `--t-*` |
| 排版 / 视觉常量 | `src/core/typography.js`、`src/core/visual.js` |
| 主题与 MD3 | `src/core/theme.js` |
| 内容替换与外壳动效 | `src/styles/ui.css`（`.ui-morph*`）、`src/styles/expand.css` |
| 外壳布局 | `src/styles/base.css`、`src/styles/components.css`、`src/styles/responsive.css` |
