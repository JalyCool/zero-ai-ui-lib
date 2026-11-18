/* ============================================================
   zero-ai-ui-lib 入口
   导出全部预制组件 + 卡片展开相关组件 + 交互 composables。
   样式在 ./style.css 里，使用方需要单独引入一次。
   ============================================================ */
import './style.css'

export * from '../components/ui/index.js'
export * from '../components/layout/index.js'
export { useScrollEdges } from '../composables/useScrollEdges.js'
export { useSurfaceTier } from '../composables/useSurfaceTier.js'
export { useHeadFuse } from '../composables/useHeadFuse.js'
export { useAppHead, setPageHeadActions, setPageHeadCenter, appHeadState } from '../composables/useAppHead.js'
export { default as ExpandableCard } from '../components/ExpandableCard.vue'
export { default as RouteExpandCard } from '../components/expand/RouteExpandCard.vue'
/* 子路由占位组件：可展开卡片的子路由直接用它，不要再自己写一份。 */
export { default as EmptyRoute } from '../router/EmptyRoute.js'
export { usePress } from '../core/pressFeedback'
export { useMorphWindow } from '../core/morphWindow'
/* iOS 侧滑跟手接管（宿主 WebView 需关闭系统滑动返回并让出左边缘手势）。 */
export { useEdgeSwipeBack } from '../core/edgeSwipeBack'
/* 无障碍：焦点圈定与方向键漫游。 */
export { useFocusTrap, useRovingTabindex, srOnly } from '../core/a11y'
/* 指令集插件：ripple / intersect / resize / click-outside。 */
export { zeroDirectives, vRipple, vIntersect, vResize, vClickOutside } from '../core/directives'
/* 声明式快捷键。 */
export { defineShortcuts, createShortcuts } from '../core/shortcuts'
/* 图标注册表（UiIcon 按名字取图标；本地名字优先于 Iconify）。 */
export { ICONS, registerIcons, iconMarkup } from '../core/icons'
/* Iconify 名字归一化（pack/icon、pack--icon、i-pack:icon -> pack:icon）与内联标记。 */
export { normalizeIconName, ICON_EXPLICIT_RE, ICON_INLINE_RE, MENTION_RE } from '../core/iconify'

/* 动效气质（calm / lively）：产品调性，代码里预置，不做用户设置。 */
export {
  MOTION_TONES, setMotionTone, getMotionTone, toggleMotionTone, isLively,
  motionFactor, springDuration
} from '../core/motionTone'
/* zero.config.yaml / json 的根部 ui 段解析与应用。 */
export {
  initZeroConfig, useZeroConfig, getZeroConfig, getAppliedZeroConfig,
  applyZeroConfig, parseSimpleYaml
} from '../core/zeroConfig'

/* 时长文本（00h00m00s 规则）与时刻解析。 */
export { formatDuration, formatDurationBetween, parseClockTime } from '../core/duration'
/* motion-v 桥接层：项目弹簧令牌 ↔ Motion for Vue，动画原语统一出口。 */
export {
  getSpringConfig, getSpringTokens, useProjectSpring, prefersReducedMotion,
  animate, AnimatePresence, isMotionValue, motion, useAnimate,
  useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring,
  useTransform, useVelocity
} from '../composables/useMotion'
/* 库级确认对话框：await confirmDialog({ title, message }) -> boolean。 */
export { confirmDialog, disposeConfirmDialog } from '../core/confirm'
/* 高亮与 ANSI 解析（UiCodeEditor / UiTerminalOutput 的底层，按需自取）。 */
export { highlightToHtml, tokenize } from '../core/highlight'
export { ansiToHtml, ansiLineToHtml } from '../core/ansi'
/* 码制注册中心：校验 / 参数解析 / 降级候选，供 CodeImage 与业务复用。 */
export { CODE_FORMATS, FORMAT_ICONS, iconOf, supports, resolveOptions, renderMode, fallbackCandidates, familyOf } from '../core/codeFormats'
