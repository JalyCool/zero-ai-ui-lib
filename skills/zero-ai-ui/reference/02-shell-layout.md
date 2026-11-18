# 骨架与滚动：ZeroApp / ZeroScroll / AppHead / UiProgressiveBlur

这一族决定「页面长什么样、怎么滚、边缘怎么糊」。**默认全用 `ZeroApp` + `AppHead`**，不要自己拼。

## ZeroApp —— 应用外壳根组件

```vue
<ZeroApp :tabbar-space="72" :max-width="0" padding="none">
  <router-view />
  <template #edge-top><AppHead fuse-only :title="meta.title" /></template>
  <template #tabbar><UiTabBar id="tabbar" :items="tabs" v-model="tab" @change="selectTab" /></template>
</ZeroApp>
```

内建（不需要逐页配置）：

- `#scrollArea` 滚动容器（弹层锁滚动依赖它）
- 页面上下边缘溢出时的渐进式模糊（随滚动自动淡入淡出）
- TabBar 占位；**底部模糊带以 TabBar 顶边为底边**（不糊进 TabBar）
- `#edge-top` / `#edge-bottom` 插槽：渲染在模糊带**上层**的固定内容（z-55），用于悬浮标题条、钉住的输入区
- 居中限宽 `max-width`（0 = 不限）；`padding="none"` 表示内联不写 padding，交给应用自己的 `#scrollArea` 规则（含 media query）

暴露 `scrollTo` / `scrollTop`。需要更细控制就退回 `ZeroScroll`。

## ZeroScroll —— 局部滚动区

用于卡片内、弹层内的独立滚动区，同样「溢出即模糊」：

```vue
<ZeroScroll :fade="64" :fade-blur="6" :fade-layers="12" :bottom-inset="64">
  …内容…
  <template #edge-bottom>悬浮输入条</template>
</ZeroScroll>
```

- `fade`（带高，0 关闭）/ `fade-blur` / `fade-layers` / `fade-tint`
- `bottom-inset`：底部有 fixed 覆盖层（TabBar、输入条）时，底部模糊带与 `#edge-bottom` 抬升到覆盖层之上
- 模糊层**常驻不销毁**（只切不透明度），不会闪
- flex 父级下 `flex: 1 1 0` 撑满剩余空间；普通块级父级用 `height: 100%`

## AppHead —— 页面头部（默认大标题 ⇄ 上滑融合条）

顶部一行**常驻动作**（左 `#leading` 放返回键，右 `#actions` 放功能按钮），中间是标题区。滚出视口后默认头消失，一个固定条淡入——它的底就是顶部渐变模糊带（再加一层极淡 surface 渐变，形成"白→透明"柔光），按钮原位不动，中间换成 20px 迷你标题。

**外壳成对使用两个实例**（少一个都不对）：

```vue
<template #edge-top>
  <AppHead fuse-only :title="meta.title">
    <template #leading><button v-if="canBack" @click="$router.back()">←</button></template>
    <template #actions><!-- 全局按钮 --></template>
  </AppHead>
</template>

<AppHead :title="meta.title" :sub="meta.sub">
  <template #actions><!-- 与上面同一组 --></template>
</AppHead>
```

- `fuse-only`：只渲染固定条（放 `#edge-top`）；不带该 prop 只渲染流内默认态
- 融合状态由 `useHeadFuse` **单例**管理 —— 两个实例各自算状态会出现两条固定条
- 插槽：`#leading` / `#actions` / `#title` / `#sub` / `#logo`（默认态 `show-logo`、融合态 `show-logo-in-fuse`）/ `#badge`
- 阈值 = 默认头完全离场的位置；内容不足一屏 → 不滚 → 不融合

**页面加自己的按钮**：注册到外壳，它会和全局按钮（命令面板/设置）并排，两态都在：

```js
import { h, onActivated, onDeactivated, onMounted } from 'vue'
import { setPageHeadActions } from 'zero-ai-ui-lib'

onMounted(() => setPageHeadActions(() => h(UiButton, { onClick: goAdd }, () => '新增')))
onActivated(() => setPageHeadActions(/* 同上 */))
onDeactivated(() => setPageHeadActions(null))   // keep-alive 切走只触发这个！
```

> 不要每个页面自造 `.view-head` —— 那会和外壳标题重复。

## UiProgressiveBlur —— 手搭边缘模糊时才用

`ZeroApp` / `ZeroScroll` 已经包好了，正常不需要直接用。三条设计铁律（踩坑换来的）：

1. **遮罩必须光滑**：分段线性遮罩会让总强度不连续，逼得所有半径相等（渐变消失）。用共享升余弦曲线 P，第 i 层取 P^i。
2. **幂次压在 1~2.4**：直接用 P^i 会把过渡区压成几像素。
3. **半径按 1/i^0.7 递减并归一化到 Σr²=maxBlur²**（叠加模糊按方差相加）。

参数：`placement` top/bottom、`height`、`maxBlur`、`layers`、`precision`（`soft` 默认，过渡区最宽可见台阶最少；`high` / `sharp`）、`tint` + `tintStrength`、`visible`（只切不透明度，不销毁层）。层全部 `pointer-events:none`。

## UiScrollArea

自定义滚动条 + 贴边渐隐阴影，`max-height` / `height`。**注意**：它只是滚动条皮肤，不带「溢出即模糊」；要模糊用 `ZeroScroll`。

## UiTabBar / UiSideNav

- `UiTabBar`：`:items="[{ value, label, icon }]"` + `v-model` + `@change`；移动端贴底横排、桌面端贴左竖排。`@change` 里做 `router.replace`。
- `UiSideNav`：常驻侧栏（桌面）/ 左侧滑抽屉（移动），`active` 当前项，`@select` 回传 value，打开锁 `#scrollArea`。
