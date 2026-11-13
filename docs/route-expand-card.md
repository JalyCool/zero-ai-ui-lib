# 路由展开卡片 · 接入指南

把「卡片点开后展开成详情页」做成组件，需要三块拼在一起：**路由约定 + 展开组件 + 卡片外壳**。
这三块职责不同，所以没法塞进一个纯展示组件里，本仓库用下面这套组合来完成。

- 外壳 / 动画 / 路由联动：[ExpandableCard.vue](../src/components/ExpandableCard.vue)
- 路由约定封装：[RouteExpandCard.vue](../src/components/expand/RouteExpandCard.vue)
- 空子路由组件：`EmptyRoute`（包已导出，直接 `import { EmptyRoute } from 'zero-ai-ui-lib'`；
  仓库源码在 [EmptyRoute.js](../src/router/EmptyRoute.js)，也可以自己写一个 `render: () => null` 的两行组件）

## 1. 路由约定

每个 Tab 是父路由，卡片的展开态是它的子路由。子路由只需要占位组件 `EmptyRoute`，
真正的展开内容由卡片组件自己渲染。

```js
import { EmptyRoute } from 'zero-ai-ui-lib'

{
  path: '/home',
  name: 'home',
  component: HomeView,
  children: ['steps', 'heart', 'sleep'].map((name) => ({
    path: name,
    name: `home-${name}`,   // 默认命名：父路由名 + '-' + 展开键
    component: EmptyRoute,
    meta: { expandKey: name }
  }))
}
```

带参数的子路由（记录详情）同样只需要占位组件：

```js
{
  path: '/activity',
  name: 'activity',
  component: ActivityView,
  children: [
    { path: ':recordId', name: 'activity-record', component: EmptyRoute, meta: { expandKey: 'record' } }
  ]
}
```

> **注意**：展开内容不通过子路由渲染，子路由只负责 URL 和浏览器历史。
> 因此页面里不需要再挂 `<router-view>` 来显示展开内容（ActivityView 里的 `router-view`
> 只是给 `activity-new` 表单用的）。

## 2. 用 RouteExpandCard 描述卡片

```vue
<RouteExpandCard section="home" card-key="steps" :content="ExpandSteps" feature>
  <!-- 这里是卡片本身的内容 -->
  <UiRingProgress :value="78" />
</RouteExpandCard>
```

- `section`：父路由名，同时是关闭时的回落路由。
- `cardKey`：展开键，也是默认子路由名的后半段（`home-steps`）。
- `routeName`：不符合默认命名时显式传入，例如活动记录会用
  `route-name="activity-record"` + `:params="{ recordId: record.id }"`。
- `content` / `contentProps`：展开内容组件与它的 props。
- `variant`：`card`（整卡）/ `metric`（指标格子）/ `list-item`（列表行）。
- `feature`：大号特性卡片。

组件结构示意：

```html
<RouteExpandCard section="trends" card-key="weekSteps" :content="ExpandMetric" :content-props="...">
  <div class="card-title">本周步数</div>
  <UiLineChart ... />
</RouteExpandCard>
```

## 3. 展开/收起的行为

| 场景 | 行为 |
| --- | --- |
| 点击卡片 | 推入子路由，卡片从原位置生长成展开尺寸 |
| 点击关闭 / 返回 | 回到父路由，卡片收回原位置 |
| 浏览器前进后退 | 与路由同步，URL 始终是 `父/子` 层级 |
| 页面切换 | 视图被 `<keep-alive>` 缓存，展开态跟着路由一起恢复 |
| 桌面端（≥ 900px） | 不铺满整页，而是生长成居中的模态尺寸，并压暗模糊背景 |
| 移动端 | 铺满整页 |

卡片内容与展开内容同时留在 DOM 里，只切换透明度和模糊；`Esc`、页面锁滚动、
焦点恢复都由组件内部处理。

**展开内容里怎么加关闭按钮**：给按钮加 `data-close` 即可（例如
`<UiButton data-close>收起</UiButton>`），组件会拦截点击并走路由回退；
`Esc`、点背景遮罩、浏览器后退同样可以收起。

**外观约定**：`variant="card"` / `"metric"` / `"list-item"` 的背景、描边、圆角、
内边距都已由库样式提供（`components.css`），应用只需要写行内内容。

## 4. 常见接入错误

1. **子路由没有登记**：点击卡片会 push 失败，此时组件会退化成直接展开，
   但 URL 不会变化，浏览器后退也无法收起。请先在 router 里加子路由。
2. **父路由名写错**：`section` 必须是父路由的 `name`，否则关闭时回不去。
3. **在页面里再放一个 `<router-view>`**：会重复渲染子路由占位组件，
   展开内容由卡片自己渲染，不要重复。
4. **展开内容组件依赖父页面的 props**：展开内容只通过 `contentProps` 收参数，
   需要上下文请放进 `contentProps` 或改用共享 store。
5. **卡片内部的可交互元素**：按钮、输入框、图表应带 `data-no-expand`，
   否则点击它们也会触发展开。组件默认已忽略
   `button / a / input / select / textarea / [data-no-expand]`。
