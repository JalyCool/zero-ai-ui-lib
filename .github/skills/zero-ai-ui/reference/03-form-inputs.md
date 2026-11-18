# 表单与输入：Button / Input / Select / Menu / DatePicker / TimePicker

## UiButton

`variant`: primary / tonal / outline / text / danger / icon；`size`: sm / md / lg；`block` `loading` `disabled`。

动作按钮三个变体（危险操作别用普通按钮）：

- `fuse`：点一下进入「可撤销」，实心进度条铺满→缩回烧完落定（倒计时 `undo-window`）
- `hold`：按住填充上涨，抬手过早缩回，涨满才确认
- `slide`：拖滑块过阈值确认

## 输入族

| 组件 | 用途 | 关键点 |
| --- | --- | --- |
| `UiInput` | 单行文本 | `label` / `hint` / 前缀后缀插槽 |
| `UiTextarea` | 多行 | `rows`；自动增高自己算 |
| `UiSearchField` | 图标 ⇄ 输入框形变 | `@search`，Esc 先清空后收起 |
| `UiTagInput` | 标签录入 | `v-model` 字符串数组；回车 / 逗号 / Tab 生成，重复去重 |
| `UiScrubField` | 横向拖动改数字读数 | `pixels-per-range`；点击切输入框 |
| `UiKeyValueEditor` | key/value 录入 | `v-model="[{key,value}]"`；`secret` 值列变密码点 |
| `UiSchemaForm` | JSON Schema 自动生成表单 | `@submit` 收敛后的值 |
| `UiColorPicker` | 自绘取色盘 | HSV/RGB/HEX 内置换算，不调系统控件 |

## UiSelect（单选 / 多选）

```vue
<UiSelect v-model="v" :options="[{ label, value, icon?, disabled? }]" />
<UiSelect v-model="list" multiple :options="cols" />   <!-- 字段列显隐等 -->
```

- 原地展开成列表；**展开宽度 = max(字段宽, 最长选项自然宽)**，封顶视口可用宽
- `icon-placement="leading|top"`；单项 `disabled` 可见不可选
- 多选不收回面板，字段里显示已选摘要

**要「输入为主、可自由输入」→ `UiAutocomplete`**（同一套形变展开，`free` 允许提交非选项值）。

## UiMenu —— 所有「弹出选项」的统一入口

```vue
<UiMenu variant="floating" v-model="sortMode" label="排序" :items="items" title="排序方式" />
<UiMenu variant="tool" :items="items" label="更多操作" @select="onPick" />
<UiMenu variant="context" :items="items" @select="onPick">任意内容</UiMenu>
```

- `floating`：有当前选中值（`v-model`），原地长成面板；触发器三段可配：`#icon` 插槽 / `icon` prop（空串关默认）、默认插槽改文字、`show-icon`/`show-label`/`show-chevron` 任意关闭
- `tool`：无 v-model，`@select` **回传整个 item 对象**
- `context`：包裹型，右键 / 长按在指针处弹
- `items` 形如 `[{ value?, label, description?, tone?, icon?, shortcut?, divider? }]`

> 选择值 → `UiSelect`；执行操作 → `UiMenu`。别用 Select 做「编辑 / 删除」。

## UiDatePicker / UiTimePicker

```vue
<UiDatePicker v-model="d" />                              <!-- grid 弹层日历 -->
<UiDatePicker v-model="d" mode="wheel" label="出生日期" /> <!-- 年月日滚轮 -->
<UiDatePicker v-model="range" mode="range" />              <!-- { start, end } -->

<UiTimePicker v-model="t" />                        <!-- 波轮单值 -->
<UiTimePicker v-model="range" mode="range" />       <!-- { start, end }，两个波轮 + 箭头 -->
```

除 `mode` 与 `modelValue` 外 **props 原样透传**：`label` / `precision`（day/month/year 或 h/m/s）/ `min` / `max`（级联到每一列，越界禁用且滚动钉住）/ `startYear` / `endYear` / `presets` / `displayPrecision`。

- `UiDatePicker` 有三级状态机：年 / 月可点击下钻，网格点击推近（缩放 + 模糊）；三视图常驻不销毁
- `UiTimePicker` 的 `min`/`max` 会限制可选时间

## 其他选择类

- `UiSwitch`：立即生效的布尔开关；`label-placement="left|right"` 控制文案侧、`align-end` 让开关贴行尾（两维度独立）
- `UiCheckbox` / `UiRadioGroup`：多选 / 互斥单选
- `UiSlider` / `UiRangeSlider`：单值（带刻度吸附、橡皮筋）/ 区间 `[lo,hi]`
- `UiStepper`：离散数量（+/-、单位、上下限碰壁回弹）
- `UiRating`：整星 / 半星；`half` 时点星先弹小浮层选「半颗 / 整颗」（Esc / 点外部收起，←/→ 选）
- `UiSegmented`：分段控件，放不下自动转多行网格（同一轨道 + 同一滑动指示器）
- `UiFileDropzone`：拖入 / 点击收文件，`accept` / `max-size` 过滤，不合格走 `@reject`
