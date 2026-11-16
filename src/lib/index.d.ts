/* ============================================================
   zero-ai-ui-lib 类型声明（手写版）
   组件 props 用「已知键 + 宽松兜底」模式：常用 prop 精确标注，
   其余透传属性不报错；模板里不会出现隐式 any。
   ============================================================ */
import type { App, DefineComponent, ObjectDirective } from 'vue'

type AnyProps = Record<string, unknown>

declare const UiCardGroup: DefineComponent<{
  variant?: 'gallery' | 'circular' | 'depth' | 'wall' | 'scroll-stack' | 'stack' | 'swap' | 'bounce'
  items?: { title: string; meta?: string; tone?: string; image?: string }[]
  height?: number; cardWidth?: number; gap?: number; auto?: boolean; interval?: number
  modelValue?: number
}, AnyProps, unknown>
declare const UiCodeSlots: DefineComponent<{
  length?: number; modelValue?: string; autofocus?: boolean; disabled?: boolean; mask?: boolean; label?: string
}, AnyProps, unknown>
declare const UiScrubField: DefineComponent<{
  modelValue?: number; min?: number; max?: number; step?: number; precision?: number
  unit?: string; label?: string; pixelsPerRange?: number; rubber?: number; disabled?: boolean
}, AnyProps, unknown>
declare const UiStatusMark: DefineComponent<{
  /** none（只有底部空槽）/ pending / progress / done / failed；兼容旧名 idle / running / error */
  status?: 'none' | 'pending' | 'progress' | 'done' | 'failed' | 'idle' | 'running' | 'error'
  /** 实际进度 0~1；传 null = 没有实际进度，显示转圈 */
  progress?: number | null
  size?: number
  dashes?: number
  arcLength?: number
  spinDuration?: number
  drawDuration?: number
}, AnyProps, unknown>
declare const UiStepFlow: DefineComponent<{
  steps?: { label: string; description?: string; icon?: string }[]
  modelValue?: number; orientation?: 'horizontal' | 'vertical'; clickable?: boolean
  controls?: boolean; nextLabel?: string; prevLabel?: string; finishLabel?: string
}, AnyProps, unknown>
declare const UiSwipeRow: DefineComponent<{
  actions?: { label: string; tone?: 'neutral' | 'danger'; icon?: string }[]
  threshold?: number; fullSwipeAction?: boolean; once?: boolean; disabled?: boolean; open?: boolean | null
}, AnyProps, unknown>
declare const UiText: DefineComponent<{
  variant?: 'type' | 'shiny' | 'gradient'; text?: string
  cps?: number; cursor?: boolean; loop?: boolean; startDelay?: number
  sheen?: 'soft' | 'chrome'; sweep?: number
  gradient?: 'sweep' | 'mesh' | 'conic'; colors?: string[]
}, AnyProps, unknown>
declare const UiRotatingText: DefineComponent<{
  phrases?: string[]; interval?: number; transition?: 'rotate' | 'flip' | 'slide'
  pauseOnHover?: boolean; paused?: boolean
}, AnyProps, unknown>
declare const UiToolCallChip: DefineComponent<{
  name?: string; detail?: string; status?: 'running' | 'success' | 'error'
  expected?: number; showTime?: boolean
}, AnyProps, unknown>
declare const UiTooltipGroup: DefineComponent<{
  items?: { label: string; tip: string }[]; wait?: number; warmWindow?: number; linger?: number
}, AnyProps, unknown>
declare const UiButton: DefineComponent<{
  variant?: 'primary' | 'tonal' | 'outline' | 'text' | 'danger' | 'icon' | 'fuse' | 'hold' | 'slide'
  size?: 'sm' | 'md' | 'lg'; type?: string; block?: boolean; disabled?: boolean; loading?: boolean
  fuseDuration?: number; undoLabel?: string; doneLabel?: string
  holdDuration?: number; slideThreshold?: number
}, AnyProps, unknown>
declare const UiAccordion: DefineComponent<{ title?: string; open?: boolean; modelValue?: boolean }, AnyProps, unknown>
declare const UiAlert: DefineComponent<{ tone?: 'warning' | 'danger' | 'success' | 'info'; title?: string }, AnyProps, unknown>
declare const UiAvatar: DefineComponent<{ name?: string; src?: string; size?: 'sm' | 'md' | 'lg' | ''; status?: boolean }, AnyProps, unknown>
declare const UiAvatarGroup: DefineComponent<{
  /** 统一给组内头像设置尺寸；单项自己写了 size 就以单项为准 */
  size?: 'sm' | 'md' | 'lg' | ''
  /** 超出 max 折叠成 +N；0 = 全部显示 */
  max?: number
}, AnyProps, unknown>
declare const AGENT_SHAPES: Record<string, { key: string; label: string; faceY: number; markup: string }>
declare const UiAgentAvatar: DefineComponent<{
  /** none 不带设备 | laptop 电脑 | phone 手机（UsingDevice 变体，归 AgentAvatar 本体） */
  device?: 'none' | 'laptop' | 'phone'
  /** 设备上色：替换底图 #FF00FF 占位；空 = 纯白 W 版；#FFFFFF = 原色；最深 #444444（multiply 下禁用 #000000） */
  deviceColor?: string
  /** 设备位置（容器左上原点 px）；不传用各设备推荐位 */
  deviceDx?: number | null
  deviceDy?: number | null
  /** 设备宽度 = size * deviceScale */
  deviceScale?: number | null
  /** 手直径 = size * handScale */
  handScale?: number | null
  /** 电脑：敲击手偏移 */
  laptopHandDx?: number
  laptopHandDy?: number
  /** 手机：持机手（手机前方固定）偏移 */
  holdDx?: number
  holdDy?: number
  /** 滑动手轨迹：起点来回滑到终点（容器左上原点 px）；不传用推荐值 */
  swipeStartX?: number | null
  swipeStartY?: number | null
  swipeEndX?: number | null
  swipeEndY?: number | null
  /** 注视压缩系数：距离 → 眼偏移的换算比例 */
  gazeScale?: number
  /** 眼整体基础偏移（24 盒内，默认略偏右上） */
  eyesOffsetX?: number
  eyesOffsetY?: number
  /** 内置形状 key（AGENT_SHAPES：circle / squircle / triangle / diamond / hexagon / flower / tilt / star / sparkle / scallop）或纯剪影 SVG 标记 */
  shape?: string
  /** 形状主色 */
  color?: string
  eyeColor?: string
  /** px */
  size?: number | string
  /** idle | listening | thinking | happy | confused | surprised | sleepy | speaking */
  state?: string
  /** mouse 跟随指针 | none 只做微扫视 */
  gaze?: 'mouse' | 'none'
  /** false 时摆出当前状态的静止姿势，不跑动画循环 */
  animated?: boolean
  /** speaking 状态的外部音量包络 0~1（给了才调制开合，不给眼大小稳定） */
  level?: number
  /** 眼睛基准高度（viewBox 24 内）；不传时用内置形状的推荐 faceY */
  eyesY?: number | null
}, AnyProps, unknown>
declare const UiBadge: DefineComponent<{ tone?: 'primary' | 'success' | 'warning' | 'danger'; dot?: boolean; label?: string }, AnyProps, unknown>
declare const UiBarChart: DefineComponent<{ data?: number[]; labels?: string[]; height?: number }, AnyProps, unknown>
declare const UiBottomSheet: DefineComponent<{ modelValue?: boolean; title?: string; maxHeight?: string; closeOnBackdrop?: boolean; scrim?: boolean; anchors?: number[] }, AnyProps, unknown>
declare const UiCheckbox: DefineComponent<{ modelValue?: boolean; label?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiAvatarTag: DefineComponent<{
  name?: string
  src?: string
  /** SVG 内部标记；图标模式不做遮罩 */
  icon?: string
  iconViewBox?: string
  shape?: 'circle' | 'squircle' | 'square' | 'hexagon' | 'diamond' | 'blob'
  size?: 'sm' | 'md' | 'lg'
  /** 品牌强调色：药丸底色取 10%，文字压暗 / 提亮 */
  accent?: string
  /** 头像本体改用 UiAgentAvatar 渲染（带眼睛的智能体头像） */
  agent?: boolean
  agentShape?: string
  agentColor?: string
  agentState?: string
}, AnyProps, unknown>
declare const UiCard: DefineComponent<{
  title?: string
  description?: string
  /** 24x24 viewBox 内的 SVG 内部标记 */
  icon?: string
  divider?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'filled' | 'plain' | 'product'
  clickable?: boolean
  /* ---------- variant=product（产品授权卡） ---------- */
  productName?: string
  /** SVG 内部标记；viewBox 可自定义（品牌图标多半不是 24×24） */
  productIcon?: string
  productIconViewBox?: string
  /** 品牌强调色：图标底色、底部光晕、渐变文字与动作按钮 */
  accent?: string
}, AnyProps, unknown>
declare const UiCodeImage: DefineComponent<{ type: string | string[]; options?: Record<string, Record<string, unknown>>; width?: number }, AnyProps, unknown>
declare const UiChip: DefineComponent<{ variant?: string; selected?: boolean; removable?: boolean; dot?: boolean }, AnyProps, unknown>
declare const UiCodeEditor: DefineComponent<{
  modelValue?: string
  language?: 'js' | 'json' | 'css' | 'html' | 'md' | 'plain'
  label?: string; hint?: string; error?: string; placeholder?: string
  readonly?: boolean; disabled?: boolean; tabSize?: number; lines?: number; formatJson?: boolean
}, AnyProps, unknown>
declare const UiConfirmDialog: DefineComponent<Record<string, never>, AnyProps, unknown>
declare const UiDataTable: DefineComponent<{
  columns: { key: string; label?: string; width?: string; align?: 'left' | 'center' | 'right'; sortable?: boolean; hidden?: boolean }[]
  rows?: unknown[]
  rowKey?: string; maxHeight?: number; striped?: boolean; clickable?: boolean; emptyText?: string
  /* 分组 / 服务端分页 / 列显隐 / 多选 */
  groupBy?: string
  server?: boolean; page?: number; pageSize?: number; total?: number
  visible?: string[] | null
  selection?: 'none' | 'single' | 'multiple'
  selected?: (string | number)[]
}, AnyProps, unknown>
declare const UiDatePicker: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiEmptyState: DefineComponent<{ title?: string; description?: string }, AnyProps, unknown>
declare const UiFileDropzone: DefineComponent<{ label?: string; hint?: string; accept?: string; multiple?: boolean; disabled?: boolean; maxSize?: number }, AnyProps, unknown>
declare const UiFloatingMenu: DefineComponent<{ modelValue?: string | number; items?: { value?: string | number; label?: string }[] }, AnyProps, unknown>
declare const UiGauge: DefineComponent<{ value?: number; label?: string }, AnyProps, unknown>
declare const UiGaugeSlider: DefineComponent<{
  modelValue?: number; label?: string; unit?: string; precision?: number | null
  showScale?: boolean; showBubble?: boolean; spring?: Record<string, number> | null
}, AnyProps, unknown>
declare const UiHeatmap: DefineComponent<{ data?: number[][]; labels?: string[] }, AnyProps, unknown>
declare const UiInput: DefineComponent<{
  modelValue?: string | number; label?: string; type?: string; placeholder?: string
  hint?: string; error?: string; disabled?: boolean; autocomplete?: string
  min?: string | number; max?: string | number; step?: string | number; inputmode?: string
}, AnyProps, unknown>
declare const UiKeyValueEditor: DefineComponent<{
  modelValue?: { key: string; value: string }[]
  label?: string; keyPlaceholder?: string; valuePlaceholder?: string; addLabel?: string; secret?: boolean
}, AnyProps, unknown>
declare const UiLineChart: DefineComponent<{ series?: number[][]; labels?: string[]; height?: number }, AnyProps, unknown>
declare const UiModal: DefineComponent<{ modelValue?: boolean; title?: string; width?: string }, AnyProps, unknown>
declare const UiMorphPanel: DefineComponent<{ open?: boolean; label?: string; disabled?: boolean; minWidth?: number; minHeight?: number; closeOnOutside?: boolean }, AnyProps, unknown>
declare const UiProgress: DefineComponent<{ value?: number; label?: string }, AnyProps, unknown>
declare const UiRadioGroup: DefineComponent<{ modelValue?: string | number; options?: { label: string; value: string | number }[]; name?: string }, AnyProps, unknown>
declare const UiRangeDatePicker: DefineComponent<{ modelValue?: { start?: string; end?: string } | null; label?: string; presets?: number[] }, AnyProps, unknown>
declare const UiRangeSlider: DefineComponent<{
  modelValue?: [number, number]; min?: number; max?: number; step?: number
  precision?: number | null; label?: string; unit?: string; showValue?: boolean
  spring?: Record<string, number> | null
  /** @deprecated */ stiffness?: number; /** @deprecated */ dampingRatio?: number
  /** @deprecated */ flingTime?: number; /** @deprecated */ rubber?: number; /** @deprecated */ maxOverscroll?: number
}, AnyProps, unknown>
declare const UiRangeTimePicker: DefineComponent<{ modelValue?: { start?: string; end?: string }; precision?: 'h' | 'm' | 's' }, AnyProps, unknown>
declare const UiRating: DefineComponent<{ modelValue?: number; max?: number; readOnly?: boolean }, AnyProps, unknown>
declare const UiRingProgress: DefineComponent<{ value?: number; label?: string; size?: number; stroke?: number }, AnyProps, unknown>
declare const UiRingSlider: DefineComponent<{
  modelValue?: number; label?: string; unit?: string; precision?: number | null
  size?: number; stroke?: number; spring?: Record<string, number> | null
}, AnyProps, unknown>
declare const UiRollNumber: DefineComponent<{ value?: number | string; directionKey?: number | null; reverse?: boolean; distance?: string; step?: number; instant?: boolean }, AnyProps, unknown>
declare const UiSchemaForm: DefineComponent<{ schema: Record<string, unknown>; modelValue?: Record<string, unknown>; arrayMode?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiSearchField: DefineComponent<{ modelValue?: string; placeholder?: string; keepValue?: boolean; disabled?: boolean }, AnyProps, unknown>
declare const UiPagerDots: DefineComponent<{
  /** 总页数 */
  total?: number
  modelValue?: number
  clickable?: boolean
  /** sm | md */
  size?: 'sm' | 'md'
  label?: string
}, AnyProps, unknown>

declare const UiSelect: DefineComponent<{
  modelValue?: string | number | (string | number)[]
  options?: { label: string; value: string | number; icon?: string; disabled?: boolean }[]
  /** 多选：modelValue 为数组，勾选不收回面板 */
  multiple?: boolean
  label?: string; placeholder?: string; disabled?: boolean
  /** 选项图标位置：leading 在文字前端；top 在文字上方（面板变卡片网格） */
  iconPlacement?: 'leading' | 'top'
}, AnyProps, unknown>
declare const UiSegmented: DefineComponent<{
  modelValue?: string | number
  options?: { label: string; value: string | number; icon?: string; disabled?: boolean }[]
  label?: string
  layout?: 'stack' | 'one-line'
  /** 图标位置：leading 在文字前端（布局不变）；top 在文字上方 */
  iconPlacement?: 'leading' | 'top'
  /** false 时只显示图标 */
  showLabels?: boolean
  /** 单行装不下时自动切多行网格 */
  autoMultiline?: boolean
  minItemWidth?: number
}, AnyProps, unknown>
declare const UiSkeleton: DefineComponent<{ width?: string; height?: string; radius?: string }, AnyProps, unknown>
declare const UiSlider: DefineComponent<{
  modelValue?: number; min?: number; max?: number; step?: number
  label?: string; unit?: string; showValue?: boolean
  stops?: number[] | null; snapCount?: number; precision?: number | null
  majorTicks?: number; minorTicks?: number; showScale?: boolean
  spring?: Record<string, number> | null; showBubble?: boolean
  /** @deprecated */ stiffness?: number; /** @deprecated */ dampingRatio?: number
  /** @deprecated */ flingTime?: number; /** @deprecated */ rubber?: number; /** @deprecated */ maxOverscroll?: number
}, AnyProps, unknown>
declare const UiSparkline: DefineComponent<{ data?: number[]; width?: number; height?: number }, AnyProps, unknown>
declare const UiSpinner: DefineComponent<{ size?: number }, AnyProps, unknown>
declare const UiStepper: DefineComponent<{
  modelValue?: number; min?: number; max?: number; step?: number
  unit?: string; label?: string; fieldLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'; controls?: 'sides' | 'bottom'; roll?: 'standard' | 'reverse'
  disabled?: boolean
}, AnyProps, unknown>
declare const UiSwitch: DefineComponent<{ modelValue?: boolean; label?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiTabBar: DefineComponent<{ items?: { value: string | number; label: string; icon?: string }[]; modelValue?: string | number; label?: string; desktopAt?: number }, AnyProps, unknown>
declare const UiTagInput: DefineComponent<{ modelValue?: string[]; label?: string; placeholder?: string; hint?: string; max?: number; delimiters?: string[] }, AnyProps, unknown>
declare const UiTerminalOutput: DefineComponent<{ text?: string; label?: string; height?: number; follow?: boolean }, AnyProps, unknown>
declare const UiTextarea: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; rows?: number; disabled?: boolean }, AnyProps, unknown>
declare const UiTimePicker: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiToastHost: DefineComponent<{ max?: number }, AnyProps, unknown>
declare const UiToolMenu: DefineComponent<{ items?: AnyProps[]; label?: string }, AnyProps, unknown>
declare const UiTooltip: DefineComponent<{ text?: string; placement?: 'top' | 'bottom' | 'left' | 'right' }, AnyProps, unknown>
declare const UiTreeView: DefineComponent<{
  nodes?: { label: string; value?: string | number; children?: unknown[]; kind?: string }[]
  modelValue?: string | number | (string | number)[]
  defaultOpen?: string[] | null; indent?: number
  multi?: boolean; cascade?: boolean; filter?: string; draggable?: boolean
}, AnyProps, unknown>
declare const UiVirtualList: DefineComponent<{
  items?: unknown[]; itemHeight?: number; height?: number; buffer?: number
  swipeSelect?: boolean; modelValue?: number[]; itemKey?: string
}, AnyProps, unknown>
declare const UiWheel: DefineComponent<{ columns?: { items?: unknown[]; value?: string | number; separator?: string; label?: string }[]; interactive?: boolean; itemHeight?: number }, AnyProps, unknown>
declare const UiWheelColumn: DefineComponent<{ items?: unknown[]; modelValue?: string | number; label?: string; interactive?: boolean }, AnyProps, unknown>
declare const UiWheelDatePicker: DefineComponent<{ modelValue?: string; label?: string; startYear?: number; endYear?: number }, AnyProps, unknown>

declare const ExpandableCard: DefineComponent<AnyProps, AnyProps, unknown>
declare const RouteExpandCard: DefineComponent<{
  section?: string; cardKey?: string | number; routeName?: string; params?: Record<string, unknown>
  tag?: string; variant?: 'card' | 'metric' | 'list-item'; content?: unknown; contentProps?: Record<string, unknown>
}, AnyProps, unknown>
declare const EmptyRoute: DefineComponent<Record<string, never>, AnyProps, unknown>

/* ---------- composables ---------- */
export interface MorphWindowOptions {
  width?: () => number
  height?: () => number
  [key: string]: unknown
}
export interface MorphWindowReturn {
  open: { value: boolean }
  closing: { value: boolean }
  floating: { value: boolean }
  compressed: { value: boolean }
  style: unknown
  viewStyle: unknown
  openWindow(): void
  closeWindow(): void
  toggleWindow(): void
}
export declare function useMorphWindow(options?: MorphWindowOptions): MorphWindowReturn
export interface EdgeSwipeBackOptions {
  target?: HTMLElement | null | (() => HTMLElement | null | undefined)
  container?: () => EventTarget | null
  shouldHandle?: () => boolean
  onBack?: () => void
  onProgress?: (progress: number) => void
  edgeWidth?: number
  distanceRatio?: number
  velocityThreshold?: number
  minTravel?: number
  maxScale?: number
  startDeadZone?: number
  finishDuration?: number
  revertDuration?: number
}
export interface EdgeSwipeBackHandle {
  unmount(): void
  complete(): void
  isTracking(): boolean
  config: Required<EdgeSwipeBackOptions>
}
export declare function useEdgeSwipeBack(options?: EdgeSwipeBackOptions): EdgeSwipeBackHandle
export declare function usePress(element?: HTMLElement | null): { pressed: { value: boolean } }

/* ---------- utils ---------- */
export type DurationPrecision = 'h' | 'm' | 's'
export declare function parseClockTime(text: string | null | undefined): number | null
export declare function formatDuration(totalSeconds: number, options?: { precision?: DurationPrecision }): string
export declare function formatDurationBetween(start: string, end: string, options?: { precision?: DurationPrecision }): string
export interface ConfirmDialogOptions {
  title?: string
  message?: string
  detail?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}
export declare function confirmDialog(options?: ConfirmDialogOptions): Promise<boolean>
export declare function disposeConfirmDialog(): void
export declare function tokenize(text: string, lang: string): { type: string; text: string }[]
export declare function highlightToHtml(text: string, lang: string): string
export declare function ansiLineToHtml(line: string): string
export declare function ansiToHtml(text: string): string
export interface CodeFormatMeta { family: 'qr' | 'bar'; label: string; render?: string; validate: (text: string) => boolean; defaults: Record<string, unknown>; normalize: (options: AnyProps) => AnyProps }
export declare const CODE_FORMATS: Record<string, CodeFormatMeta>
/** 族图标：24x24 viewBox 内的 SVG 内部标记 */
export declare const FORMAT_ICONS: Record<'qr' | 'bar', string>
/** 取某码制的图标标记；未知码制返回空串 */
export declare function iconOf(format: string): string
export declare function supports(format: string, text: string): boolean
export declare function resolveOptions(format: string, options?: Record<string, AnyProps>, isDev?: boolean): AnyProps
export declare function renderMode(formats: string[]): 'icon' | 'text'
export declare function fallbackCandidates(formats: string[], text: string): string[]
export declare function familyOf(format: string): 'qr' | 'bar' | null

/* ---------- core：无障碍 / 指令 / 快捷键 / 图标 / 弹簧求解 ---------- */
export interface FocusTrapOptions {
  /** 为 false 时暂时不接管 Tab；默认恒为 true */
  active?: () => boolean
  /** 传入布尔 ref：打开时激活、关闭时还原焦点 */
  model?: { value: boolean }
}
export declare function useFocusTrap(
  elRef: { value: HTMLElement | null | undefined },
  options?: FocusTrapOptions
): { activate(): Promise<void>; deactivate(): void }

export interface RovingTabindexOptions {
  orientation?: 'horizontal' | 'vertical' | 'both'
  selector?: string
  onSelect?: (index: number, element: HTMLElement) => void
}
export declare function useRovingTabindex(
  itemsRef: { value: HTMLElement | HTMLElement[] | null | undefined },
  options?: RovingTabindexOptions
): { move(index: number): void; refresh(): void; detach: () => void }

/** 视觉隐藏但读屏可读的样式对象（配合 :style 使用） */
export declare const srOnly: Record<string, string>

export declare const vRipple: ObjectDirective
export declare const vIntersect: ObjectDirective
export declare const vResize: ObjectDirective
export declare const vClickOutside: ObjectDirective
export declare const zeroDirectives: { install(app: App): void }

export interface ShortcutOptions {
  target?: EventTarget | null
  preventDefault?: boolean
}
/** 组合键写法：'mod+k' / 'shift+enter' / 'escape'；返回解绑函数 */
export declare function createShortcuts(
  map: Record<string, (event: KeyboardEvent) => void>,
  options?: ShortcutOptions
): () => void
export declare function defineShortcuts(
  map: Record<string, (event: KeyboardEvent) => void>,
  options?: ShortcutOptions
): { stop(): void }

/** 24x24 viewBox 内的 SVG 内部标记 */
export declare const ICONS: Record<string, string>
export declare function registerIcons(map: Record<string, string>): void
export declare function iconMarkup(name: string): string

export interface SpringPreset { stiffness: number; damping: number }
export declare const SPRINGS: Record<'place' | 'settle' | 'tuck' | 'fling' | 'lean' | 'press', SpringPreset>
export interface AnimateSpringOptions {
  from?: number
  to?: number
  velocity?: number
  stiffness?: number
  damping?: number
  /** 默认按行程推导（range * 0.0012），小行程动画不会被一帧掐断 */
  precision?: number
  onUpdate?: (value: number) => void
  onDone?: () => void
}
export declare function animateSpring(options?: AnimateSpringOptions): () => void

/* ---------- 动效气质（产品调性，非用户偏好） ---------- */
export declare const MOTION_TONES: Record<'calm' | 'lively', { value: 'calm' | 'lively'; label: string; hint: string }>
export declare function setMotionTone(tone: 'calm' | 'lively'): 'calm' | 'lively'
export declare function getMotionTone(): 'calm' | 'lively'
export declare function toggleMotionTone(): 'calm' | 'lively'
export declare function isLively(): boolean
export declare function motionFactor(name?: 'scale' | 'bounce' | 'distance', fallback?: number): number
export declare function springDuration(name?: string, fallback?: number): number

/* ---------- zero.config.yaml / json ---------- */
export interface ZeroUiConfig {
  motion?: 'calm' | 'lively'
  appearance?: 'light' | 'dark' | 'auto' | string
  radiusScale?: number
  density?: number
  pressScale?: number
  fontScale?: number
  colors?: Record<string, string>
  tokens?: Record<string, string | number>
}
export interface ZeroConfig { ui?: ZeroUiConfig }
export declare function parseSimpleYaml(text: string): ZeroConfig
export declare function applyZeroConfig(config: ZeroConfig): { ui: ZeroUiConfig; keys: string[] }
export declare function initZeroConfig(options?: { base?: string }): Promise<{ source: string | null; ui: ZeroUiConfig; keys: string[] } | null>
export declare function useZeroConfig(config?: ZeroConfig): { ui: ZeroUiConfig; keys: string[] }
export declare function getZeroConfig(): ZeroConfig | null
export declare function getAppliedZeroConfig(): { source: string | null; ui: ZeroUiConfig; keys: string[] } | null

/* ---------- 第二批：表单 / 导航 / 浮层 / 数据展示 ---------- */
declare const UiColorPicker: DefineComponent<{ modelValue?: string; label?: string; disabled?: boolean; swatches?: string[] }, AnyProps, unknown>
declare const UiAutocomplete: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; options?: { label: string; value: string | number; hint?: string }[]; free?: boolean; max?: number }, AnyProps, unknown>
declare const UiForm: DefineComponent<{ validateOnSubmit?: boolean }, AnyProps, unknown>
declare const UiFormField: DefineComponent<{ label?: string; hint?: string; rules?: ((value: unknown) => true | string)[]; value?: unknown; required?: boolean }, AnyProps, unknown>
declare const UiBreadcrumb: DefineComponent<{ items?: { label: string }[]; separator?: string }, AnyProps, unknown>
declare const UiPagination: DefineComponent<{ modelValue?: number; total?: number; pageSize?: number; siblings?: number }, AnyProps, unknown>
declare const UiSidebar: DefineComponent<{ modelValue?: boolean; collapsedWidth?: number; width?: number; label?: string }, AnyProps, unknown>
declare const UiSlideover: DefineComponent<{ modelValue?: boolean; title?: string; side?: 'left' | 'right'; width?: string }, AnyProps, unknown>
declare const UiNavigationMenu: DefineComponent<{ items?: { label: string; value?: string; children?: { label: string; description?: string; value?: string; icon?: string }[] }[]; modelValue?: string }, AnyProps, unknown>
declare const UiGrid: DefineComponent<{ min?: number; gap?: number }, AnyProps, unknown>
declare const UiRow: DefineComponent<{ gap?: number; align?: string; justify?: string }, AnyProps, unknown>
declare const UiCol: DefineComponent<{ span?: number; sm?: number; md?: number; lg?: number; offset?: number }, AnyProps, unknown>
declare const UiSplitter: DefineComponent<{ modelValue?: number; direction?: 'horizontal' | 'vertical'; min?: number; max?: number; handle?: number }, AnyProps, unknown>
declare const UiScrollArea: DefineComponent<{ maxHeight?: string; height?: string; shadows?: boolean; axis?: 'x' | 'y' }, AnyProps, unknown>
declare const UiContextMenu: DefineComponent<{ items?: { label: string; value?: string; disabled?: boolean; tone?: string; icon?: string; divider?: boolean; shortcut?: string }[]; disabled?: boolean }, AnyProps, unknown>
declare const UiCommandPalette: DefineComponent<{ modelValue?: boolean; items?: { label: string; value: string; hint?: string; icon?: string; keywords?: string }[]; placeholder?: string; shortcut?: string }, AnyProps, unknown>
declare const UiTour: DefineComponent<{ modelValue?: boolean; steps?: { target: string; title: string; text: string; placement?: 'top' | 'bottom' }[]; startAt?: number }, AnyProps, unknown>
declare const UiPopover: DefineComponent<{ modelValue?: boolean; placement?: 'top' | 'bottom' | 'left' | 'right'; trigger?: string; offset?: number; label?: string }, AnyProps, unknown>
declare const UiKbd: DefineComponent<{ keys?: string | string[]; size?: 'sm' | 'md' }, AnyProps, unknown>
declare const UiIcon: DefineComponent<{ name: string; size?: number | string; filled?: boolean; strokeWidth?: number | string; label?: string }, AnyProps, unknown>
declare const UiCalendar: DefineComponent<{ modelValue?: string; events?: Record<string, { title: string; tone?: string }[]>; view?: 'month' | 'week' }, AnyProps, unknown>
declare const UiTimeline: DefineComponent<{ items?: { title: string; time?: string; text?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }[] }, AnyProps, unknown>
declare const UiCarousel: DefineComponent<{ items?: { title?: string; text?: string; image?: string }[]; modelValue?: number; autoplay?: boolean; interval?: number; loop?: boolean; height?: number }, AnyProps, unknown>
declare const UiMarquee: DefineComponent<{ text?: string; speed?: number; direction?: 'left' | 'right'; gap?: number; pauseOnHover?: boolean }, AnyProps, unknown>

/* ---------- components ---------- */
export {
  UiColorPicker, UiAutocomplete, UiForm, UiFormField, UiBreadcrumb, UiPagination, UiSidebar, UiSlideover, UiNavigationMenu, UiGrid, UiRow, UiCol, UiSplitter, UiScrollArea, UiContextMenu, UiCommandPalette, UiTour, UiPopover, UiKbd, UiIcon, UiCalendar, UiTimeline, UiCarousel, UiPagerDots, UiMarquee,
  UiAvatarTag, UiCard, UiAccordion, UiAlert, UiAvatar, UiAvatarGroup, UiAgentAvatar, AGENT_SHAPES, UiBadge, UiBarChart, UiBottomSheet, UiButton,
  UiCheckbox, UiCodeImage, UiChip, UiCodeEditor, UiConfirmDialog, UiDataTable, UiDatePicker, UiInput, UiKeyValueEditor, UiLineChart, UiModal,
  UiEmptyState, UiFileDropzone, UiFloatingMenu, UiGauge, UiGaugeSlider, UiHeatmap,
  UiProgress, UiRadioGroup, UiRangeDatePicker, UiRangeSlider, UiRangeTimePicker,
  UiCardGroup, UiCodeSlots, UiRotatingText, UiScrubField, UiStatusMark,
  UiStepFlow, UiSwipeRow, UiText, UiToolCallChip, UiTooltipGroup,
  UiRating, UiRingProgress, UiRingSlider, UiRollNumber, UiSchemaForm,
  UiSearchField, UiSelect, UiSegmented, UiSkeleton, UiSlider, UiMorphPanel, UiSparkline, UiSpinner,
  UiStepper, UiSwitch, UiTabBar, UiTagInput, UiTerminalOutput, UiTextarea, UiTimePicker,
  UiToastHost, UiToolMenu, UiTooltip, UiTreeView, UiVirtualList, UiWheelColumn,
  UiWheel, UiWheelDatePicker,
  ExpandableCard, RouteExpandCard, EmptyRoute,
  useFocusTrap, useRovingTabindex, srOnly,
  vRipple, vIntersect, vResize, vClickOutside, zeroDirectives,
  createShortcuts, defineShortcuts,
  ICONS, registerIcons, iconMarkup,
  SPRINGS, animateSpring
}
