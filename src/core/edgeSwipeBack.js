/* ============================================================
   iOS 侧滑返回跟手接管
   ------------------------------------------------------------
   完全由 JS 接管左边缘手势，不依赖任何返回拦截插件：

   1. 原生层（wry / WKWebView 宿主）必须做两件事：
      · 关掉系统自带的前进 / 后退滑动：
        webview.set_navigation_gestures_enabled(false)（WKWebView
        allowsBackForwardNavigationGestures = false）
      · 把左边缘的系统手势优先交给 WebView，否则边缘滑动会被
        iOS 的返回桌面 / 侧边栏抢走：
        window.with_preferred_screen_edges_deferring_system_gestures(
          ScreenEdge::LEFT)

   2. JS 层监听 touchstart / touchmove / touchend：
      · 只有 touchstart 落在左边缘（edgeWidth 内）才开始拖拽；
      · touchmove 按 deltaX 实时算 scale / translateX，并禁用 transition；
      · touchend 按位移 + 速度判断：过阈值 -> 播完收起动画后 back()；
        未过阈值 -> 恢复 transition 弹回原位。

   手感参数（阈值 / 阻尼 / 缩放幅度）全部可配，宿主按需调。
   ============================================================ */

const DEFAULTS = {
  /* 左边缘热区宽度（px）：只有从这里起手的滑动才算侧滑返回 */
  edgeWidth: 26,
  /* 位移阈值：拖到目标宽度的这个比例即判定完成 */
  distanceRatio: 0.34,
  /* 速度阈值（px/ms）：短促快滑也能完成 */
  velocityThreshold: 0.62,
  /* 完成时最小位移（px）：低于它即使速度快也只弹回，避免误触 */
  minTravel: 46,
  /* 跟手时的最大缩放，模拟 iOS 上层卡片后退时轻微缩小 */
  maxScale: 0.94,
  /* 起始阻尼：前段位移需要多拖一点才动（0 = 完全线性跟手） */
  startDeadZone: 4,
  /* 完成动画时长（ms） */
  finishDuration: 240,
  /* 弹回动画时长（ms） */
  revertDuration: 320
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useEdgeSwipeBack(options = {}) {
  const config = { ...DEFAULTS, ...options }
  const target = config.target
  const onBack = config.onBack

  let el = null
  let tracking = false
  let startX = 0
  let startY = 0
  let deltaX = 0
  let lastX = 0
  let lastT = 0
  let velocity = 0
  let width = 1
  let activeTouchId = null
  let rafId = 0
  let animating = false
  let disposed = false

  function resolveTarget() {
    if (typeof target === 'function') return target()
    return target
  }

  function enabled() {
    /* 宿主可以给出条件（例如首页 / 根路由不接管）。 */
    return !config.shouldHandle || config.shouldHandle()
  }

  function applyTransform(x) {
    if (!el) return
    const progress = width > 0 ? Math.min(1, Math.max(0, x / width)) : 0
    const scale = 1 - (1 - config.maxScale) * progress
    el.style.transition = 'none'
    el.style.transform = 'translate3d(' + x + 'px,0,0) scale(' + scale + ')'
    if (config.onProgress) config.onProgress(progress)
  }

  function restoreStatic() {
    if (!el) return
    el.style.transform = ''
    el.style.transition = ''
    if (config.onProgress) config.onProgress(0)
  }

  function onTouchStart(event) {
    if (disposed || tracking || animating) return
    if (event.touches.length !== 1) return
    if (!enabled()) return
    const point = event.touches[0]
    if (point.clientX > config.edgeWidth) return
    el = resolveTarget()
    if (!el) return
    const rect = el.getBoundingClientRect()
    width = rect.width || window.innerWidth
    tracking = true
    activeTouchId = point.identifier
    startX = point.clientX
    startY = point.clientY
    lastX = point.clientX
    lastT = event.timeStamp
    velocity = 0
    /* 起手时先让出一点死区，避免和纵向滚动抢手。 */
    applyTransform(0)
  }

  function onTouchMove(event) {
    if (!tracking) return
    const point = findTouch(event.touches)
    if (!point) return
    const dx = point.clientX - startX
    const dy = point.clientY - startY
    /* 明显是纵向滚动：放弃接管，把手势还给页面。 */
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 14) {
      cancelTracking()
      return
    }
    const travelled = Math.max(0, dx - config.startDeadZone)
    deltaX = travelled
    velocity = (point.clientX - lastX) / Math.max(1, event.timeStamp - lastT)
    lastX = point.clientX
    lastT = event.timeStamp
    /* 只跟手向右（后退方向）；向左不回拉。 */
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = 0
      applyTransform(Math.min(deltaX, width))
    })
    /* 阻止页面横向滚动 / 弹性滚动跟手打架。 */
    if (event.cancelable && travelled > 0) event.preventDefault()
  }

  function findTouch(list) {
    for (const touch of list) {
      if (touch.identifier === activeTouchId) return touch
    }
    return list[0] || null
  }

  function onTouchEnd(event) {
    if (!tracking) return
    const point = event.changedTouches ? findTouch(event.changedTouches) : null
    tracking = false
    activeTouchId = null
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

    const distance = point ? Math.max(0, point.clientX - startX - config.startDeadZone) : deltaX
    const finished =
      (distance >= width * config.distanceRatio) ||
      (velocity >= config.velocityThreshold && distance >= config.minTravel)

    if (finished) finishBack()
    else revert()
  }

  function cancelTracking() {
    if (!tracking) return
    tracking = false
    activeTouchId = null
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    revert()
  }

  /* 完成：把动画交给宿主（CSS transition 或 JS 补间），结束后 back()。 */
  function finishBack() {
    if (!el) { callBack(); return }
    animating = true
    const from = deltaX
    const to = width
    if (reduceMotion()) {
      restoreStatic()
      animating = false
      callBack()
      return
    }
    el.style.transition = 'transform ' + config.finishDuration + 'ms cubic-bezier(.32,.72,.3,1)'
    el.style.transform = 'translate3d(' + to + 'px,0,0) scale(' + config.maxScale + ')'
    if (config.onProgress) config.onProgress(1)
    const settle = () => {
      animating = false
      restoreStatic()
      callBack()
    }
    window.setTimeout(settle, config.finishDuration + 16)
  }

  /* 未过阈值：恢复 transition 弹回原位。 */
  function revert() {
    if (!el) return
    if (reduceMotion()) { restoreStatic(); return }
    animating = true
    el.style.transition = 'transform ' + config.revertDuration + 'ms cubic-bezier(.25,.1,.25,1)'
    el.style.transform = 'translate3d(0,0,0) scale(1)'
    if (config.onProgress) config.onProgress(0)
    window.setTimeout(() => {
      animating = false
      restoreStatic()
    }, config.revertDuration + 16)
  }

  function callBack() {
    if (onBack) onBack()
  }

  function attach(node) {
    /* passive:false 才能 preventDefault 掉横向滚动。 */
    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd, { passive: true })
    node.addEventListener('touchcancel', cancelTracking, { passive: true })
    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', cancelTracking)
    }
  }

  let detach = null
  function mount() {
    const node = config.container ? config.container() : document
    if (!node || !node.addEventListener) return
    detach = attach(node)
  }

  function unmount() {
    disposed = true
    if (detach) { detach(); detach = null }
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    if (el) restoreStatic()
    el = null
  }

  mount()

  return {
    unmount,
    /* 手动触发一次「完成」，用于调试或无障碍按钮。 */
    complete: () => { deltaX = width; finishBack() },
    isTracking: () => tracking,
    config
  }
}
