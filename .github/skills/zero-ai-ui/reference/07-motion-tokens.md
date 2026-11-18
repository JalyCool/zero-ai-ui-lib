# 动效、令牌与可展开卡片

## 令牌：唯一来源

- 颜色 / 圆角 / 字号 / 字重全部用库变量（`--primary`、`--surface-container-*`、`--on-surface*`、`--r-*`、`--fs-*`、`--w-*`）
- 字体：`--font-sans` / `--font-mono` / `--font-numeric`，**别处不写死字体名**
- 等宽数字双保险：`font-variant-numeric: tabular-nums` + `font-feature-settings: var(--font-feat-tnum)`
- 换肤只覆盖变量；换字库只覆盖 `--font-sans-custom` / `--font-mono-custom`

## 过渡写法（最易踩的坑）

```css
/* 对：--t-* 是「时长+曲线」的完整值 */
transition: transform var(--t-panel);

/* 错：再拼一条 var(--spring-*) 会让整条声明解析失败，动画静默跳变 */
transition: transform var(--t-panel) var(--spring-view);
```

需要自定义时长时分开写：`--spring-*-dur` + `--spring-*`。

可用值：`--t-fade`（通用）/ `--t-panel`（浮层与面板）/ `--t-sheet`（抽屉）/ `--t-exit`（退场）/ `--t-pop`（小控件：把手、勾选、chip、胶囊按钮、验证码落位）。弹簧曲线：`--spring-feedback|view|sheet|expand|exit|fade|pop`。

## motion tone（产品调性，不是用户偏好）

- `calm`（默认）：稳、短、几乎不过冲
- `lively`：弹簧更陡、回弹更大、位移更远、模糊更重；时长统一放宽 25%

按应用定位预置：`setMotionTone('lively')` 或 `zero.config.yaml` 的 `ui.motion`。**不要做成用户设置项**——同一产品手感随用户漂移，动效语言就散了。`prefers-reduced-motion` 时库内自动降级。

## 交互约定（照抄，别自己发明）

- **按下必收缩**：可展开按钮按下 `scale(.97)`，松手才展开；长按保持收缩（库已内置）
- **内容替换**：旧内容原位 `opacity→0 + blur(8px)`，新内容从 `blur(10px)` 浮现；外壳只做几何过渡
- **可打断**：菜单 / 选择器 / 日期时间收起途中再点，直接反向长回展开态
- **状态类组件一律受控**：`UiStatusMark` / `UiStepFlow` 由外部传状态，组件只负责衔接动效
- **数字变化一律走 `UiRollNumber`**（上下位移 + 模糊渐变）；拖拽连续变化传 `instant`（缩短到 ~220ms 但仍动画）

## 可展开卡片（列表 → 详情）

路由约定：**父路由 = 页面，子路由 = 某张卡的展开态**，URL 保持 `父/子`，浏览器后退即收起。

```js
// router
{ path: '/records', name: 'records', component: RecordsView,
  children: [{ path: ':recordId', name: 'records-record', component: EmptyRoute }] }
```

```vue
<RouteExpandCard
  section="records" :card-key="r.id" route-name="records-record"
  :params="{ recordId: r.id }" variant="list-item" :content="ExpandRecord"
>
  <div class="list-body"><b>{{ r.title }}</b></div>
</RouteExpandCard>
```

- `variant`: `card` / `metric` / `list-item`，背景描边圆角内距全由库提供
- 展开内容里放 `<UiButton data-close>返回</UiButton>`
- 卡片内可交互元素默认被忽略，不会误触发展开；额外元素加 `data-no-expand`
- 移动端铺满整屏、遮罩两端都铺；桌面端居中模态 + 压暗模糊

## 历史栈硬规则

- Tab 切换 `router.replace`（平级视图不堆历史）
- 卡片展开 `push`、收起 `back()`；**先播完收起动画再退历史**
- 别 `replace('/父')`：会把展开历史抹掉，返回语义断裂
- iOS 侧滑返回用 `useEdgeSwipeBack`（JS 接管，不依赖插件），宿主需关系统手势

## 常见坑速记

- `inert` 需要 Chrome 102+ / Safari 15.5+
- 外壳高度没写 → 弹层贴不到底
- 浮层祖先带 transform/filter → fixed 包含块偏移并被裁
- `UiToastHost` 在最上层，底部面板打开前 dismiss
