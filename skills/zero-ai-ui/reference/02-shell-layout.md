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

对应设计稿的两个状态：顶部是 32px 大标题 + 12px 副标题（40% 透明度）+ 动作按钮行；上滑把默认 head 滚出视口后，一个固定条淡入——它的底**就是顶部渐变模糊带本身**（不再另画底色），中间一行 20px 迷你标题（可选 `#logo`），左右仍是同一组按钮。

```vue
<!-- 分开放（推荐）：默认态真正在页面流内 -->
<template #edge-top>
  <AppHead fuse-only title="运动记录">…</AppHead>
</template>
<AppHead title="运动记录" :sub="`${records.length} 条记录`">
  <template #actions>
    <UiMenu variant="floating" v-model="sortMode" label="排序" :items="sortItems" />
    <UiButton size="sm" variant="tonal" @click="goAdd">新增</UiButton>
  </template>
</AppHead>
```

- 插槽：`#actions`（右侧动作）、`#actions-left`（返回键等）、`#title` / `#sub`、`#logo`（迷你条里的头像 / 徽标）、`#badge`
- `fuse-height` 融合条高度（默认 84）；`show-logo-in-fuse` 是否显示 logo 位
- **不要再为每个页面自造 `.view-head`**——页面动作走 `#actions`，两态共享同一组插槽内容
- 滚动容器由 AppHead **向上找最近的可滚动祖先**，零接线；阈值 = 默认态完全离场的位置（不同内边距都正确）
- 内容不足一屏 → 没有滚动 → 不融合（无溢出就没有模糊，符合直觉）

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
