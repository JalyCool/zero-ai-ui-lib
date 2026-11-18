# 起步：安装、外壳、主题、配置、审计

## 安装与最小工程

```bash
mkdir my-app && cd my-app
npm init -y
npm i vue vue-router zero-ai-ui-lib
npm i -D vite @vitejs/plugin-vue
```

```
src/
├─ main.js
├─ App.vue            # 外壳：ZeroApp
├─ router/index.js
└─ views/*.vue
```

`main.js`

```js
import { createApp } from 'vue'
import 'zero-ai-ui-lib/style.css'
import './shell.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

`vite.config.js`（`host: '0.0.0.0'` 才能被局域网设备访问）

```js
export default defineConfig({
  plugins: [vue()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true }
})
```

`index.html` 必须有 `<link rel="icon" href="data:," />`，否则多一条 404 console error。

## 外壳：两种写法

**A. 用 `ZeroApp`（推荐）** —— 内建 `#scrollArea`、顶底溢出模糊、TabBar 占位、居中限宽：

```vue
<ZeroApp :tabbar-space="72" :max-width="0" padding="none">
  <router-view />
  <template #edge-top><AppHead fuse-only title="标题" /></template>
  <template #tabbar><UiTabBar :items="tabs" v-model="tab" @change="onTab" /></template>
</ZeroApp>
```

**B. 手写外壳 CSS**（老项目要保留自己的响应式内边距时）：

```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; }
body { background: var(--background); color: var(--on-surface);
       font-family: var(--font-sans); line-height: var(--line-height); }
#app { height: 100dvh; }
.app { display: flex; flex-direction: column; height: 100dvh; max-width: 480px; margin: 0 auto; }
#scrollArea { flex: 1; overflow-y: auto; padding: 20px clamp(16px,4vw,48px) 110px; scrollbar-width: none; }
.view { display: flex; flex-direction: column; gap: var(--space-gap); min-width: 0; }
```

> `#scrollArea` 这个 id 有含义：弹层靠它锁滚动。局部滚动区（卡片内、弹层内）用 `ZeroScroll`，同样自带「溢出即模糊」。

## 主题

库自带浅色令牌；换肤只改 CSS 变量（应用根节点）：

```css
:root {
  --primary: #3f5f90;
  --background: #faf9fd;
  --surface-container-low: #f4f3f7;
  --surface-container-high: #e9e7eb;
  --on-surface: #1b1b1f;
  --outline-variant: #c7c5d0;
  --radius-scale: 1; --press-scale: 0.97;
  --font-sans-custom: 'YourSans';   /* 换字库只覆盖这两个 */
  --font-mono-custom: 'YourMono';
}
```

深色：`--background` 取很深的色、表面色阶**按 6 / 14 / 17 / 22 / 27** 分档（别照搬 MD3 的 6/10/12/17/22，卡片会和底色粘住），并给 `<html>` 设 `color-scheme: dark`。首帧防闪：`<head>` 里同步读 localStorage 落 `--background` 与 `data-appearance`。

## 应用级配置 zero.config.yaml

放应用根目录（与 index.html 同级），库启动时读根部 `ui` 段落成令牌；文件不存在全走默认。查找顺序 `yaml → yml → json`。

```yaml
ui:
  motion: lively        # calm | lively（产品调性）
  appearance: light     # light | dark | auto
  radiusScale: 1
  density: 0.93
  pressScale: 0.97
  fontScale: 1
  colors: { primary: "#3f5f90", background: "#faf9fd" }
  tokens: { "--focus-w": 2px }
```

```js
import { initZeroConfig } from 'zero-ai-ui-lib'
initZeroConfig()          // 或 useZeroConfig({ ui: {...} }) 直接喂对象
```

## 响应式

库组件自身响应式，页面布局自己写：

```css
@media (min-width: 900px) {
  .app { max-width: none; }
  #scrollArea { padding: 24px clamp(24px,4vw,64px) 110px; }
}
```

## 日期与数字显示约定

- 相对今天 ±3 天内只显示称呼（大前天 / 昨天 / 今天 / 明天 / 大后天…），不显示具体日期。
- 与今年同年不显示年份，只「12月17日」；折行从「年」之后断开，「X月X日」保持同一行（两个 `white-space:nowrap` 的 inline-block）。
- 数字一律 `font-variant-numeric: tabular-nums`，大数字用 `--w-heading` + 轻微负字距。

## 交付前自查 & 审计脚本

```bash
node audit-imports.cjs   # 模板里的 <UiXxx> 是否都 import 了（缺失 = 白屏，Vue 只告警）
node audit-props.cjs     # 静态属性值与 prop 声明类型是否匹配
node audit-scene.cjs     # 哪些组件还没进入真实场景页
```

自查清单：dev 起得来控制台 0 error；至少 6 个库组件且无手写重复控件；下拉 / 日期 / 时间能展开、能选、能收起且收起途中可打断；弹窗打开压暗模糊、关闭后能滚；1200px 铺满无横向滚动，375px 不溢出；TS 直接具名 import（包自带 d.ts）。
