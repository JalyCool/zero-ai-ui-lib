# 浮层与反馈：Modal / Sheet / Toast / Alert / Tooltip / 确认

## 选择哪个容器

| 场景 | 用 |
| --- | --- |
| 居中、强打断（确认 / 表单） | `UiModal` |
| 贴底、可拖拽把手、锚点吸附（移动端操作面板） | `UiBottomSheet` |
| 侧边推入、不压暗（查阅型详情） | `UiSlideover` |
| 常驻侧栏展开/收起（导航结构） | `UiSidebar` |
| 轻提示 | `UiToastHost` |
| 页面内告警条 | `UiAlert` |
| 悬浮说明 / 小面板 | `UiTooltip` / `UiPopover` |
| 首次引导 | `UiTour` |
| 命令面板 | `UiCommandPalette` |

## UiModal

```vue
<UiModal v-model="open" title="删除记录">
  <template #footer="{ close }">
    <UiButton variant="danger" @click="doDelete(close)">删除</UiButton>
  </template>
</UiModal>
```

插槽 `#header` / `#title` / 默认 / `#footer`，作用域都带 `close()`。遮罩压暗 + 5px 模糊；打开时锁 `#scrollArea`。

## UiBottomSheet

`v-model` + `title` + `max-height` + `close-on-backdrop`；`#footer` 插槽。

- **把手可拖拽**：拖把手实时改高度（跟手、禁 transition），松手按位移 + 速度吸附锚点
- `anchors` 默认随 `scrim`；拖到最低锚点之下直接关闭
- 面板外有约 50dvh「弹簧裙边」，活泼模式上冲时补住缺口，不露页面背景
- `scrim=false` = 无背景版（仍保持透明拦截 + Esc + 锁滚动 + aria-modal）

## UiToastHost

```vue
<UiToastHost ref="toast" />
```
```js
toast.value.success('已保存')
toast.value.error('同步失败')
toast.value.warning('…')   // info 同理
toast.value.dismiss()
```
`max` 条数外自动排队。底部面板打开前记得 dismiss，否则 toast 可能盖住表单底部。

## UiAlert

`tone`: warning / danger / success / info；`title` + 默认插槽正文。无装饰性描边、无阴影。

## confirmDialog —— 危险确认唯一入口

```js
import { confirmDialog } from 'zero-ai-ui-lib'
const ok = await confirmDialog({ title: '删除这条记录？', message: '删除后不可恢复', danger: true })
if (ok) { ... }
```

- **有意不接 Esc / Enter**：确认必须显式点击，防键盘误触发
- 不要再用 `window.confirm`

## UiTooltip / UiTooltipGroup / UiPopover / UiTour

- `UiTooltip`：单个气泡
- `UiTooltipGroup`：一组提示词共享一个气泡；冷态首悬停等 `wait`（默认 520ms），之后 `warm-window` 内兄弟项瞬时打开
- `UiPopover`：`v-model` + `placement`，`#trigger` + 默认面板
- `UiTour`：高亮真实元素 + 气泡自动避让；进场孔先铺满整屏再收拢到目标

## UiCommandPalette

`v-model` + `items`；输入过滤、↑↓ 移动、Enter 执行、Esc 关闭（组件自己接管 ⌘K，**应用不要再注册一次 keydown**）。

## 浮层的通用约定

所有浮层都能点外部收起、按 Esc 收起。**祖先不要加 `transform` / `filter` / `backdrop-filter` / `will-change`**——fixed 包含块会被劫持，坐标偏移还会被裁。`UiSelect` / `useMorphWindow` 已用 `core/fixedBox` 补偿，自定义浮层沿用同一工具。
