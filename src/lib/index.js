/* ============================================================
   zero-ai-ui-lib 入口
   导出全部预制组件 + 卡片展开相关组件 + 交互 composables。
   样式在 ./style.css 里，使用方需要单独引入一次。
   ============================================================ */
import './style.css'

export * from '../components/ui/index.js'
export { default as ExpandableCard } from '../components/ExpandableCard.vue'
export { default as RouteExpandCard } from '../components/expand/RouteExpandCard.vue'
/* 子路由占位组件：可展开卡片的子路由直接用它，不要再自己写一份。 */
export { default as EmptyRoute } from '../router/EmptyRoute.js'
export { usePress } from '../core/pressFeedback'
export { useMorphWindow } from '../core/morphWindow'
/* 时长文本（00h00m00s 规则）与时刻解析。 */
export { formatDuration, formatDurationBetween, parseClockTime } from '../core/duration'
/* 库级确认对话框：await confirmDialog({ title, message }) -> boolean。 */
export { confirmDialog, disposeConfirmDialog } from '../core/confirm'
/* 高亮与 ANSI 解析（UiCodeEditor / UiTerminalOutput 的底层，按需自取）。 */
export { highlightToHtml, tokenize } from '../core/highlight'
export { ansiToHtml, ansiLineToHtml } from '../core/ansi'
