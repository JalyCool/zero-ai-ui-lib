# 数据展示：Chart / Table / Tree / VirtualList / CardGroup / Calendar

## UiChart —— 所有图表的统一入口

```vue
<UiChart type="bar"   :data="week" :labels="labels" unit="小时" :highlight="8" />
<UiChart type="line"  :data="metric.data" :labels="metric.labels" :view-box-height="140" />
<UiChart type="spark" :data="steps" />                    <!-- 卡片角标迷你趋势 -->
<UiChart type="heat"  :data="activity" :columns="7" />    <!-- 热力图 -->
<UiChart type="ring"  :data="[78]" label="今日目标" :size="96" />
<UiChart type="gauge" :data="[72]" label="恢复指数" />
```

**prop 名全族统一**：`data`（不再有 `values`）、`labels`、`unit`、`decimals`、`highlight`、`size`、`stroke`（`thin`/`bold`/具体数值）、`weeks`/`columns`、`gridY`/`viewBoxHeight`。未声明的 prop 不会自动传给内部实现，所以别拿 UiChart 当透传壳。

选择：装饰性趋势 → `spark`；读数/交互 → `line`；离散比较 → `bar`；进度比例 → `ring`；仪表读数 → `gauge`；时间密度 → `heat`（少于 4 周就别用）。

## UiDataTable

```vue
<UiDataTable :columns="[{ key, label, width?, align?, sortable?, hidden? }]" :rows="rows" />
```

粘性表头、三态排序、`max-height` 内滚动、`#cell-<key>` 插槽。增强：`group-by`（`#group`）、`server`（`sort-change`/`page-change` 只发事件）、`v-model:page` + `total` + `page-size`、`v-model:visible` 列显隐（复用 `UiSelect multiple`）、`selection="single|multiple"` + `v-model:selected`。

只有两三列的简单列表别上表格；5 列以上或有排序需求才用。

## UiTreeView

`:nodes` 递归树（folder/file/md/json/image 图标分色）；箭头旋转、`default-open`。展开高度由 motion 弹簧驱动，DOM 常驻不销毁。增强：`filter`、`multi`+`cascade` 级联多选、`draggable` 拖拽换父（`@move`）。

## UiVirtualList

定高虚拟滚动（`item-height` / `height`），几百上千行只渲染窗口。`selection` 决定单击语义，`drag-select` 长按后竖向拖动连续勾选（锚点初始状态决定选中还是取消，往回拖改终点，拖到边缘自动滚动）。**行数 < 100 直接 v-for**。

## UiSwipeRow

划开式列表行，双侧操作：`actions`（向左划露右侧）、`leftActions`（向右划）。`fullSwipe` 默认关闭（慎开，会整行滑出折叠）；`collapseOnAction` 操作后折叠消失；`@commit` 回传 `{ action, full }`、`@action` 回传裸 action（语义不同别混用）；作用域插槽带 `close()`。

> **在受限容器（滑动行、卡片）里放浮层**：展开时把根搬到 `document.body` 下再固定定位（`UiMenu` 已内置）。否则带 `transform` 的祖先会劫持 fixed，面板坐标错乱还被 `overflow:hidden` 裁掉。

## UiCardGroup

`variant` 8 种形态：`gallery`（横向平铺循环）/ `circular`（3D 圆环）/ `depth`（Z 轴轨道）/ `wall`（透视墙漂移）/ `scroll-stack` / `stack`（牌堆拖甩）/ `swap`（定时轮换）/ `bounce`（扇形弹入）。吸附与惯性走真弹簧（`core/springPhysics`），松手速度作为初速度注入。

只是静态展示一组卡片 → `UiGrid` + `UiCard`，别上 CardGroup。

## UiCalendar

`v-model` 日期 + `events`（按 ISO 日期给数组）；`view` month / week / year / agenda（`switchable` 显示切换器）；切换是精细度改变的 ZoomTo（下钻推近 + 模糊）。

## UiTimeline / UiCarousel / UiPagerDots / UiMarquee / UiGrid / UiRow / UiCol

- `UiTimeline`：`items` 为 `[{title,time?,text?,tone?}]`；`time-position="left|right|none"`
- `UiCarousel`：`items` + `v-model`；`autoplay`/`interval`/`loop`（`cycle` 倒带 | `infinite` 同向延伸）；**翻页指示器自带 `UiPagerDots`，别再手动加一组**
- `UiMarquee`：跑马灯文字
- `UiGrid`：`min` 最小列宽 auto-fill，不写断点；`UiRow`/`UiCol` 是 12 栅格（`span`/`offset` + `sm md lg` 覆盖）
