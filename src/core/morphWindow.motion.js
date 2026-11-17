/* ============================================================
   形变窗口（motion-v 评估版）
   状态机与 CSS 版（core/morphWindow.js）完全一致：
   占位块保布局、收起途中可打断、滚动/缓存立即回落文档流。
   唯一区别：位移引擎从「响应式 style.value + CSS transition 令牌」
   换成 motion 的 animate() 弹簧（getSpringConfig 的场景参数）。

   引擎切换的三个要点：
   · 飞行中 WAAPI 动画的优先级高于 inline style，style.value 只是
     「静止姿态」；每段动画结束时把 style.value 同步到终值，
     Vue 状态与真实渲染才不会漂移。
   · 动画句柄要持有并在 finishClose / 打断时 stop() —— 不停掉的话
     fill 残效会把元素钉在旧位置。
   · motion 的 animate() 起点自动取元素当前渲染值（含 fill），
     所以「从当前位置续接」不需要任何手工起点计算。
   ============================================================ */
import { nextTick, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { toFixedBox } from './fixedBox'
import { animate, getSpringConfig, prefersReducedMotion } from '../composables/useMotion'

export const MORPH_MARGIN = 16

export function useMorphWindow(options) {
  const open = ref(false)
  const closing = ref(false)
  const floating = ref(false)
  const compressed = ref(false)
  const style = ref({})
  const viewStyle = ref({})

  let placeholder = null
  let shrinkTimer = null
  let closeTimer = null
  let closedBox = null
  let openedBox = null
  let borderX = 0
  let borderY = 0

  /* 在飞的动画句柄：几何（left/top/width/height）与压缩（scale）。 */
  let boxControls = null
  let scaleControls = null

  /* 还原未缩放的小数矩形：offsetWidth 是取整的，直接用会让收起后的
     尺寸与真实布局尺寸差 1px，收尾时跳一下。这里按当前 transform 反解。 */
  function naturalRect(el) {
    const rect = el.getBoundingClientRect()
    let sx = 1
    let sy = 1
    const transform = getComputedStyle(el).transform
    if (transform && transform !== 'none' && typeof DOMMatrixReadOnly === 'function') {
      const m = new DOMMatrixReadOnly(transform)
      sx = m.a || 1
      sy = m.d || 1
    }
    const width = Math.max(1, rect.width / sx)
    const height = Math.max(1, rect.height / sy)
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width,
      height
    }
  }

  function surfaceEl() {
    return options.surface?.() ?? null
  }

  function contentBoxHeight(width) {
    const layer = options.panel?.()
    const inner = options.content?.()
    if (!layer || !inner) return 0

    const previous = layer.style.width
    layer.style.width = width + 'px'
    const height = inner.offsetHeight
    layer.style.width = previous
    return Math.ceil(height)
  }

  function mountPlaceholder(rect) {
    const node = surfaceEl()
    if (placeholder || !node?.parentNode) return
    placeholder = document.createElement('div')
    placeholder.setAttribute('aria-hidden', 'true')
    placeholder.style.cssText = 'display:block;visibility:hidden;pointer-events:none;flex-shrink:0;'
    placeholder.style.width = Math.round(rect.width) + 'px'
    placeholder.style.height = Math.round(rect.height) + 'px'
    node.parentNode.insertBefore(placeholder, node)
  }

  function removePlaceholder() {
    if (!placeholder) return
    placeholder.remove()
    placeholder = null
  }

  function currentAnchor() {
    if (placeholder?.isConnected) {
      const rect = placeholder.getBoundingClientRect()
      if (rect.width > 0) return rect
    }
    return closedBox
  }

  function stopAnimations() {
    if (boxControls) { boxControls.stop(); boxControls = null }
    if (scaleControls) { scaleControls.stop(); scaleControls = null }
  }

  function clearTimers() {
    if (shrinkTimer) clearTimeout(shrinkTimer)
    if (closeTimer) clearTimeout(closeTimer)
    shrinkTimer = null
    closeTimer = null
  }

  function boxToStyle(box) {
    return {
      left: box.left + 'px',
      top: box.top + 'px',
      width: box.width + 'px',
      height: box.height + 'px'
    }
  }

  function animateBoxTo(node, box, config) {
    stopAnimations()
    if (prefersReducedMotion()) return null
    boxControls = animate(node, boxToStyle(box), config)
    return boxControls
  }

  /* 收起被打断：取消卸载，直接长回展开态。 */
  function interruptOpen() {
    clearTimers()
    stopAnimations()
    compressed.value = false
    if (!floating.value || !openedBox) {
      closing.value = false
      open.value = false
      openWindow()
      return
    }
    closing.value = false
    floating.value = true
    /* inline 先落终值：WAAPI 从当前位置续接到终值，中断不重播。 */
    style.value = { ...openedBox }
    const node = surfaceEl()
    if (node && !prefersReducedMotion()) {
      boxControls = animate(node, openedBox, getSpringConfig('expand'))
      boxControls.then?.(() => { if (open.value) style.value = { ...openedBox } })
    }
    open.value = true
    options.onOpened?.()
  }

  /* 立即回到文档流：用于收起途中页面滚动、或视图被缓存的情况。 */
  function finishClose(notify = true) {
    clearTimers()
    /* 先停动画再清 inline：fill 残效会把元素钉在旧位置。 */
    stopAnimations()
    const wasVisible = floating.value || open.value
    closing.value = false
    open.value = false
    floating.value = false
    compressed.value = false
    style.value = {}
    viewStyle.value = {}
    closedBox = null
    openedBox = null
    removePlaceholder()
    if (notify && wasVisible) options.onClosed?.()
  }

  async function openWindow() {
    if (open.value) return
    closing.value = false
    const node = surfaceEl()
    if (!node) return

    // 视图入场动画的 transform 会改变固定定位的参照系。
    const viewport = node.closest('.view')
    if (viewport && typeof viewport.getAnimations === 'function') {
      try {
        viewport.getAnimations().forEach(animation => animation.finish())
      } catch (error) {
        // 个别环境无法立即收束视图动画，继续展开即可。
      }
    }

    const rect = naturalRect(node)
    if (!rect.width || !rect.height) return
    const computed = getComputedStyle(node)
    borderX = parseFloat(computed.borderLeftWidth) || 0
    borderY = parseFloat(computed.borderTopWidth) || 0

    const width = Math.max(180, Math.round(Math.min(options.width(), window.innerWidth - MORPH_MARGIN * 2)))
    const innerWidth = Math.max(1, Math.round(width - borderX * 2))
    const height = Math.max(
      Math.round(rect.height),
      Math.round(Math.min(contentBoxHeight(innerWidth) + borderY * 2, window.innerHeight - MORPH_MARGIN * 2))
    )

    // 贴着输入框展开，而不是飞到屏幕中央。
    let left = Math.round(rect.left)
    left = Math.max(MORPH_MARGIN, Math.min(left, window.innerWidth - MORPH_MARGIN - width))

    let top = Math.round(rect.top)
    top = Math.max(MORPH_MARGIN, Math.min(top, window.innerHeight - MORPH_MARGIN - height))

    closedBox = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    const innerW = Math.max(1, rect.width - borderX * 2)
    const innerH = Math.max(1, rect.height - borderY * 2)
    mountPlaceholder(rect)

    // 先把按钮尺寸写成显式像素：motion 的起点从这里解析。
    const startBox = toFixedBox(node, { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    style.value = boxToStyle(startBox)
    viewStyle.value = {
      width: innerW + 'px',
      height: innerH + 'px'
    }
    floating.value = true

    await nextTick()
    const el = surfaceEl()
    if (el) void el.offsetWidth

    // 阶段一：输入框先按下收缩（feedback 弹簧，可被后续动画随时接管）。
    compressed.value = true
    if (el && !prefersReducedMotion()) {
      scaleControls = animate(el, { scale: 0.95 }, getSpringConfig('feedback'))
    }

    shrinkTimer = setTimeout(() => {
      shrinkTimer = null
      if (!floating.value) return
      compressed.value = false
      const openBox = toFixedBox(node, { left, top, width, height })
      openedBox = boxToStyle(openBox)
      /* inline 与 WAAPI 同步落终值：动画接管飞行，inline 管静止姿态。 */
      style.value = { ...openedBox }
      if (el && !prefersReducedMotion()) {
        stopAnimations()
        /* scale 从压缩态续接回 1；几何走 expand 弹簧。 */
        scaleControls = animate(el, { scale: 1 }, getSpringConfig('feedback'))
        boxControls = animate(el, openedBox, getSpringConfig('expand'))
        boxControls.then?.(() => {
          if (open.value) style.value = { ...openedBox }
        })
      }
      open.value = true
      options.onOpened?.()
    }, prefersReducedMotion() ? 0 : 110)
  }

  async function closeWindow() {
    if (closing.value) return
    if (!floating.value || (!open.value && !compressed.value)) {
      finishClose()
      return
    }
    clearTimers()
    stopAnimations()

    const anchor = currentAnchor()
    closing.value = true
    open.value = false
    compressed.value = false

    await nextTick()
    const el = surfaceEl()
    if (el) void el.offsetWidth

    let exitMs = 0
    if (anchor) {
      const closeBox = toFixedBox(surfaceEl(), anchor)
      const target = boxToStyle(closeBox)
      if (el && !prefersReducedMotion()) {
        /* inline 先落终值；WAAPI 从当前位置飞回去（可被打断续接）。 */
        style.value = { ...target }
        boxControls = animate(el, target, getSpringConfig('exit'))
        exitMs = getSpringConfig('exit').duration * 1000
      } else {
        style.value = { ...target }
      }
    }

    closeTimer = setTimeout(() => {
      closeTimer = null
      finishClose()
    }, exitMs + 80)
  }

  function toggleWindow() {
    if (open.value) {
      closeWindow()
      return
    }
    if (closing.value || compressed.value) {
      interruptOpen()
      return
    }
    openWindow()
  }

  function resetWindow() {
    finishClose(false)
  }

  /* 窗口是固定定位的，页面一滚动就会与输入框错位：直接收起更可预期。
     收起途中滚动则立刻回落到文档流，按钮跟着页面一起滚。 */
  function onScroll(event) {
    if (!floating.value) return
    if (surfaceEl()?.contains(event.target)) return
    if (closing.value || !open.value) {
      finishClose()
      return
    }
    closeWindow()
  }

  function onPointerDown(event) {
    if (!floating.value || closing.value) return
    if (surfaceEl()?.contains(event.target)) return
    closeWindow()
  }

  function onKeydown(event) {
    if (event.key !== 'Escape' || (!floating.value && !closing.value)) return
    event.stopPropagation()
    closeWindow()
  }

  function onResize() {
    if (floating.value || closing.value) closeWindow()
  }

  onMounted(() => {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
  })

  onBeforeUnmount(() => {
    finishClose(false)
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
  })

  onDeactivated(() => {
    finishClose(false)
  })

  return {
    open,
    closing,
    floating,
    compressed,
    style,
    viewStyle,
    openWindow,
    closeWindow,
    toggleWindow,
    interruptOpen,
    resetWindow
  }
}