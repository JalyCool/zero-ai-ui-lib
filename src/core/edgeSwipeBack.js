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
      · touchmove 按 deltaX 实时写 translate / scale / 圆角，
        并驱动下层「黑色遮罩 + 背景模糊」一起渐显；位移超过
        travelLimit 后走橡皮筋，不会真的拖出屏幕；
      · touchend 按位移 + 速度判断：过阈值 -> 从当前位置继续
        滑出（不回到原位重放），落定后再 back()；
        未过阈值 -> 恢复 transition 弹回原位。

   3. 与卡片展开的衔接：滑出完成时在卡片上留 ui-swipe-close 标记，
      ExpandableCard 收起时看到标记就直接落定，不再重放
      「从展开位弹回原位」的弹簧 —— 否则视觉上就是动画从头开始。
   ============================================================ */

const DEFAULTS = {
  /* 左边缘热区宽度（px）：只有从这里起手的滑动才算侧滑返回 */
  edgeWidth: 26,
  /* 位移阈值：拖到跟手上限的这个比例即判定完成 */
  distanceRatio: 0.34,
  /* 速度阈值（px/ms）：短促快滑也能完成 */
  velocityThreshold: 0.62,
  /* 完成时最小位移（px）：低于它即使速度快也只弹回，避免误触 */
  minTravel: 46,
  /* 跟手位移上限（占目标宽度比例）：超出后进入橡皮筋，拖不动到底 */
  travelLimit: 0.78,
  /* 橡皮筋系数：越界部分每像素只走这么多 */
  rubber: 0.26,
  /* 跟手到底时的缩小幅度（越小越明显） */
  maxScale: 0.86,
  /* 跟手到底时的圆角（px）：滑动过程中圆角连续变大 */
  maxRadius: 18,
  /* 起始阻尼：前段位移需要多拖一点才动（0 = 完全线性跟手） */
  startDeadZone: 4,
  /* 完成 / 弹回动画时长（ms） */
  finishDuration: 260,
  revertDuration: 340,
  /* 下层遮罩：最大不透明度与背景模糊半径 */
  scrimOpacity: 0.36,
  scrimBlur: 10,
  /* 拖拽期间给目标元素的层级 */
  dragZIndex: 320
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useEdgeSwipeBack(options = {}) {
  const config = { ...DEFAULTS, ...options }
  const target = config.target
  const onBack = config.onBack

  let el = null
  let scrim = null
  let tracking = false
  let startX = 0
  let startY = 0
  let travelled = 0        /* 橡皮筋之后的有效位移 */
  let rawTravelled = 0     /* 手指位移（已扣死区） */
  let lastX = 0
  let lastT = 0
  let velocity = 0
  let width = 1
  let limit = 1
  let activeTouchId = null
  let rafId = 0
  let animating = false
  let disposed = false
  let savedZIndex = ''
  let savedRadius = ''

  function resolveTarget() {
    if (typeof target === 'function') return target()
    return target
  }

  function enabled() {
    /* 宿主可以给出条件（例如首页 / 根路由不接管）。 */
    return !config.shouldHandle || config.shouldHandle()
  }

  /* 遮罩：黑色压暗 + 背景模糊，随进度渐显。 */
  function ensureScrim() {
    if (scrim && scrim.isConnected) return scrim
    scrim = document.createElement('div')
    scrim.className = 'ui-edge-scrim'
    scrim.setAttribute('aria-hidden', 'true')
    scrim.style.cssText = [
      'position:fixed', 'inset:0',
      'z-index:' + (config.dragZIndex - 1),
      'pointer-events:none',
      'background:#000',
      'opacity:0',
      '-webkit-backdrop-filter:blur(0px)',
      'backdrop-filter:blur(0px)',
      'transition:none'
    ].join(';')
    document.body.appendChild(scrim)
    return scrim
  }

  function dropScrim() {
    if (scrim) { scrim.remove(); scrim = null }
  }

  /* 进度 0..1：有效位移 / 跟手上限 */
  function progressOf(value) {
    return Math.min(1, Math.max(0, value / limit))
  }

  function applyFrame() {
    if (!el) return
    const progress = progressOf(travelled)
    const scale = 1 - (1 - config.maxScale) * progress
    const radius = config.maxRadius * progress
    el.style.transition = 'none'
    el.style.transform = 'translate3d(' + travelled + 'px,0,0) scale(' + scale + ')'
    el.style.borderRadius = radius > 0.4 ? radius.toFixed(2) + 'px' : savedRadius
    if (scrim) {
      scrim.style.opacity = (config.scrimOpacity * progress).toFixed(3)
      const blur = (config.scrimBlur * progress).toFixed(2) + 'px'
      scrim.style.webkitBackdropFilter = 'blur(' + blur + ')'
      scrim.style.backdropFilter = 'blur(' + blur + ')'
    }
    if (config.onProgress) config.onProgress(progress)
  }

  /* 手指位移 -> 有效位移：上限内 1:1，超出走橡皮筋并留视觉余量。 */
  function toTravelled(raw) {
    if (raw <= limit) return raw
    /* 橡皮筋：越界部分按系数衰减，最多再走 12% 宽度。 */
    return limit + Math.min(limit * 0.12, (raw - limit) * config.rubber)
  }

  function restoreStatic() {
    if (!el) return
    el.style.transform = ''
    el.style.transition = ''
    el.style.borderRadius = savedRadius
    el.style.zIndex = savedZIndex
    if (config.onProgress) config.onProgress(0)
  }

  function onTouchStart(event) {
    if (disposed || tracking || animating) return
    if (event.touches.length !== 1) return
    if (!enabled()) return
    const point = event.touches[0]
    if (point.clientX > config.edgeWidth) return
    const node = resolveTarget()
    if (!node) return
    el = node
    const rect = el.getBoundingClientRect()
    width = rect.width || window.innerWidth
    limit = width * config.travelLimit
    tracking = true
    activeTouchId = point.identifier
    startX = point.clientX
    startY = point.clientY
    lastX = point.clientX
    lastT = event.timeStamp
    velocity = 0
    travelled = 0
    rawTravelled = 0
    savedZIndex = el.style.zIndex
    savedRadius = el.style.borderRadius
    el.style.zIndex = String(config.dragZIndex)
    ensureScrim()
    applyFrame()
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
    rawTravelled = Math.max(0, dx - config.startDeadZone)
    velocity = (point.clientX - lastX) / Math.max(1, event.timeStamp - lastT)
    lastX = point.clientX
    lastT = event.timeStamp
    travelled = toTravelled(rawTravelled)
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => { rafId = 0; applyFrame() })
    /* 阻止页面横向滚动 / 弹性滚动跟手打架。 */
    if (event.cancelable && rawTravelled > 0) event.preventDefault()
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

    const raw = point ? Math.max(0, point.clientX - startX - config.startDeadZone) : rawTravelled
    const finished =
      (raw >= limit * config.distanceRatio) ||
      (velocity >= config.velocityThreshold && travelled >= config.minTravel)

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

  /* 完成：从当前位置继续滑出（先提交当前帧，避免回跳原位重放），
     落定后再 back()，并在路由切换绘制完成后才清掉内联样式。 */
  function finishBack() {
    if (!el) { dropScrim(); callBack(); return }
    animating = true
    if (reduceMotion()) {
      const node = el
      node.dataset.uiSwipeClose = '1'
      restoreStatic()
      dropScrim()
      animating = false
      callBack()
      return
    }
    /* 关键：把当前跟手样式提交一帧，transition 才有正确的起点。 */
    void el.offsetWidth
    const to = width
    el.style.transition = [
      'transform ' + config.finishDuration + 'ms cubic-bezier(.32,.72,.24,1)',
      'border-radius ' + config.finishDuration + 'ms cubic-bezier(.32,.72,.24,1)',
      'opacity ' + config.finishDuration + 'ms ease-out'
    ].join(', ')
    el.style.transform = 'translate3d(' + to + 'px,0,0) scale(' + config.maxScale + ')'
    el.style.opacity = '0.85'
    if (scrim) {
      scrim.style.transition = 'opacity ' + config.finishDuration + 'ms ease-out'
      scrim.style.opacity = '0'
      scrim.style.webkitBackdropFilter = 'blur(0px)'
      scrim.style.backdropFilter = 'blur(0px)'
    }
    if (config.onProgress) config.onProgress(1)

    /* 通知卡片：这次收起由侧滑完成，落定即可，别再弹回原位。 */
    el.dataset.uiSwipeClose = '1'

    setTimeout(() => {
      const node = el
      animating = false
      callBack()
      /* 等路由切换绘制完再清样式，避免中途闪回原位。 */
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (node) {
          node.style.opacity = ''
          restoreStatic()
        }
        dropScrim()
      }))
    }, config.finishDuration)
  }

  /* 未过阈值：恢复 transition 弹回原位。 */
  function revert() {
    if (!el) { dropScrim(); return }
    if (reduceMotion()) { restoreStatic(); dropScrim(); return }
    animating = true
    void el.offsetWidth
    el.style.transition = [
      'transform ' + config.revertDuration + 'ms cubic-bezier(.25,.1,.25,1)',
      'border-radius ' + config.revertDuration + 'ms cubic-bezier(.25,.1,.25,1)'
    ].join(', ')
    el.style.transform = 'translate3d(0,0,0) scale(1)'
    el.style.borderRadius = savedRadius
    if (scrim) {
      scrim.style.transition = 'opacity ' + config.revertDuration + 'ms ease, backdrop-filter ' + config.revertDuration + 'ms ease'
      scrim.style.opacity = '0'
      scrim.style.webkitBackdropFilter = 'blur(0px)'
      scrim.style.backdropFilter = 'blur(0px)'
    }
    if (config.onProgress) config.onProgress(0)
    setTimeout(() => {
      animating = false
      restoreStatic()
      dropScrim()
    }, config.revertDuration + 20)
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
    dropScrim()
    el = null
  }

  mount()

  return {
    unmount,
    /* 手动触发一次「完成」，用于调试或无障碍按钮。 */
    complete: () => { travelled = limit; rawTravelled = limit; finishBack() },
    isTracking: () => tracking,
    config
  }
}
