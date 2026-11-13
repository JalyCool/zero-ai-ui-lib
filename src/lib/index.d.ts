/* ============================================================
   zero-ai-ui-lib 类型声明（手写版）
   组件 props 用「已知键 + 宽松兜底」模式：常用 prop 精确标注，
   其余透传属性不报错；模板里不会出现隐式 any。
   ============================================================ */
import type { DefineComponent } from 'vue'

type AnyProps = Record<string, unknown>

declare const UiAccordion: DefineComponent<{ title?: string; open?: boolean; modelValue?: boolean }, AnyProps, unknown>
declare const UiAlert: DefineComponent<{ tone?: 'warning' | 'danger' | 'success' | 'info'; title?: string }, AnyProps, unknown>
declare const UiAvatar: DefineComponent<{ name?: string; src?: string; size?: number }, AnyProps, unknown>
declare const UiBadge: DefineComponent<{ tone?: 'primary' | 'success' | 'warning' | 'danger'; dot?: boolean; label?: string }, AnyProps, unknown>
declare const UiBarChart: DefineComponent<{ data?: number[]; labels?: string[]; height?: number }, AnyProps, unknown>
declare const UiBottomSheet: DefineComponent<{ modelValue?: boolean; title?: string; maxHeight?: number; closeOnBackdrop?: boolean }, AnyProps, unknown>
declare const UiButton: DefineComponent<{
  variant?: 'primary' | 'tonal' | 'outline' | 'text' | 'danger' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean; loading?: boolean; disabled?: boolean; type?: string
}, AnyProps, unknown>
declare const UiCheckbox: DefineComponent<{ modelValue?: boolean; label?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiChip: DefineComponent<{ variant?: string; selected?: boolean; removable?: boolean; dot?: boolean }, AnyProps, unknown>
declare const UiCodeEditor: DefineComponent<{
  modelValue?: string
  language?: 'js' | 'json' | 'css' | 'html' | 'md' | 'plain'
  label?: string; hint?: string; error?: string; placeholder?: string
  readonly?: boolean; disabled?: boolean; tabSize?: number; lines?: number; formatJson?: boolean
}, AnyProps, unknown>
declare const UiConfirmDialog: DefineComponent<Record<string, never>, AnyProps, unknown>
declare const UiDataTable: DefineComponent<{
  columns: { key: string; label?: string; width?: string; align?: 'left' | 'center' | 'right'; sortable?: boolean }[]
  rows?: unknown[]
  rowKey?: string; maxHeight?: number; striped?: boolean; clickable?: boolean; emptyText?: string
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
declare const UiImageViewer: DefineComponent<{ modelValue?: boolean; src: string; alt?: string }, AnyProps, unknown>
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
declare const UiSelect: DefineComponent<{
  modelValue?: string | number
  options?: { label: string; value: string | number }[]
  label?: string; placeholder?: string; disabled?: boolean
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
declare const UiTagInput: DefineComponent<{ modelValue?: string[]; label?: string; placeholder?: string; hint?: string; max?: number; delimiters?: string[] }, AnyProps, unknown>
declare const UiTerminalOutput: DefineComponent<{ text?: string; label?: string; height?: number; follow?: boolean }, AnyProps, unknown>
declare const UiTextarea: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; rows?: number; disabled?: boolean }, AnyProps, unknown>
declare const UiTimePicker: DefineComponent<{ modelValue?: string; label?: string; placeholder?: string; disabled?: boolean }, AnyProps, unknown>
declare const UiToastHost: DefineComponent<{ max?: number }, AnyProps, unknown>
declare const UiToolMenu: DefineComponent<{ items?: AnyProps[]; label?: string }, AnyProps, unknown>
declare const UiTooltip: DefineComponent<{ text?: string; placement?: 'top' | 'bottom' | 'left' | 'right' }, AnyProps, unknown>
declare const UiTreeView: DefineComponent<{
  nodes?: { label: string; value?: string | number; children?: unknown[]; kind?: string }[]
  modelValue?: string | number; defaultOpen?: string[] | null; indent?: number; multi?: boolean
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

/* ---------- components ---------- */
export {
  UiAccordion, UiAlert, UiAvatar, UiBadge, UiBarChart, UiBottomSheet, UiButton,
  UiCheckbox, UiChip, UiCodeEditor, UiConfirmDialog, UiDataTable, UiDatePicker,
  UiEmptyState, UiFileDropzone, UiFloatingMenu, UiGauge, UiGaugeSlider, UiHeatmap,
  UiProgress, UiRadioGroup, UiRangeDatePicker, UiRangeSlider, UiRangeTimePicker,
  UiRating, UiRingProgress, UiRingSlider, UiRollNumber, UiSchemaForm,
  UiSearchField, UiSelect, UiSkeleton, UiSlider, UiMorphPanel, UiSparkline, UiSpinner,
  UiStepper, UiSwitch, UiTagInput, UiTerminalOutput, UiTextarea, UiTimePicker,
  UiToastHost, UiToolMenu, UiTooltip, UiTreeView, UiVirtualList, UiWheelColumn,
  UiWheel, UiWheelDatePicker,
  ExpandableCard, RouteExpandCard, EmptyRoute
}
