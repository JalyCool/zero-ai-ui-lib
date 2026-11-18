# 对话流与 Markdown：ChatThread / ChatMessage / SystemLine / Composer / AvatarTag / MarkdownView

## 组件分工

| 组件 | 职责 |
| --- | --- |
| `UiChatThread` | 对话流容器：**自己就是滚动容器**，`gap` + `padding`，`auto-scroll` 新消息贴底（用户上滑暂停、滚回底部恢复），暴露 `scrollToBottom()`；顶/底边缘模糊内建 |
| `UiChatMessage` | 一条消息：`assistant` 无气泡左对齐 / `user` 深色气泡右对齐（右上收窄）/ `agent` 品牌色气泡（`color`）+ 左侧头像（左上收窄）。**收窄角指向说话人** |
| `UiChatSystemLine` | 非消息行：活动行（`align="start"` + `icon`）/ 状态行（`align="center"` + `size="sm"`）；整行 `opacity: 0.4`，永不抢注意力 |
| `UiChatComposer` | 输入区：输入框 + 发送 + 附件（图/视频/文件，长文本粘贴自动转 `.txt`）+ `#left-start`/`#left-end`/`#right-start`/`#right-end` 四个插槽 |

## 基本用法

```vue
<UiChatThread :auto-scroll="true" padding="10px 14px 12px">
  <template v-for="m in messages" :key="m.id">
    <UiChatSystemLine v-if="m.role === 'system'" :agents="AGENTS">
      {{ m.text }}
      <template v-if="m.trailing" #trailing>{{ m.trailing }}</template>
    </UiChatSystemLine>
    <UiChatMessage
      v-else
      :role="m.role"
      :content="m.content"
      :mention-resolver="resolveMention"
      :name="m.name"
      :color="m.color"
    />
  </template>
</UiChatThread>

<UiChatComposer v-model="draft" v-model:attachments="files" @send="send">
  <template #left-start><button class="toggle">联网</button></template>
  <template #right-start><UiButton variant="text" size="sm">流式回复</UiButton></template>
</UiChatComposer>
```

## 关键约定

- **正文一律走 `MarkdownView`**（`content` + `mentions` + `mention-resolver`）：`@名字` 由它渲染成 `UiAvatarTag`。**不要**在消息组件里另做一套 mention。
- **头像直接放标准 `UiAgentAvatar` / `UiAvatar` 本体**——不加圆形底、不做圆角裁切。
- `UiChatMessage` 的 agent 气泡前景按 WCAG 亮度自动选黑/白（浅色品牌色配黑字）；`UiAvatarTag` 会在彩色背景上自动验算对比度，不达标就换近实色药丸底 + 高对比墨色。
- `UiChatSystemLine` 的 `@名字` 命中 `agents` 映射时渲染 **`UiAgentAvatar` 裸头像**（不是 AvatarTag 药丸）；未命中保持文本。映射对象同时供 Markdown 提及使用，一处定义两处渲染。
- 流式回复传 `streaming` + `stream-effect="rise"`；只有新增片段播入场，不重播整段。

## UiChatComposer 细节

- 加号展开四格入口（图片 / 视频 / 文件 / 文本）；图片视频有本地预览
- 长粘贴（默认 > 2000 字符）自动转 `.txt` 附件
- `⌘/Ctrl + Enter` 发送；Enter 只换行
- `max-attachments`（9）/ `max-attachment-mb`（25），超限走 `@error`
- 自动增高（1~6 行）

## MarkdownView

marked 解析 → DOM 树 → Vue 元素（**不用 v-html，天然防注入**）；标题 / 强调 / 列表 / 引用 / 表格 / 代码全走库令牌。

- 内联图标只认 `::pack:icon::` 显式标记（裸写法易与路径撞车）；本地注册表优先于 Iconify
- 代码块与行内代码是字面量
- `mentions` 开启后 `@名字` → `UiAvatarTag`，`mentionResolver(username)` 返回 `{ username, showname, type:'normal'|'agent', image, shape, color }`
- `streaming`：按词拆 motion.span 级联入场（每词 18ms、封顶 24 步），只对新增内容生效；**代码块与表格不做逐词**

## UiText

文字动效包装器：`variant="type"` 打字机（`cps`、`type-effect`、无光标时默认 `reserve` 提前占位防抖）、`shiny` 掠光、`gradient` 流动渐变。
