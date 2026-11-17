/* ============================================================
   形变窗口（motion-v 版）
   状态机与 CSS 版（core/morphWindow.js）完全一致：
   占位块保布局、收起途中可打断、滚动/缓存立即回落文档流。
   位移引擎换成 MotionValue：animate(mv, target, config) 从当前值
   续接（可打断），change 监听把数值写进响应式 style.value，
   消费组件照旧绑定 :style="style"（消费方元素无须是 motion 组件）。

   ⚠️ 消费方注意：浮动元素的 CSS 里不要再给 left/top/width/height
   配 transition——引擎逐帧写 style，CSS 过渡会叠加成拖影。

   单位：getSpringConfig 的 duration 是秒（animate()/组件路径）；
   MotionValue 路径（animateSingleValue）经 animateMotionValue 归一化，
   同样收秒，见 ANIMATION_MIGRATION.md。
   ============================================================ */
import { nextTick, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { toFixedBox } from './fixedBox'
import { animate, getSpringConfig, prefersReducedMotion, useMotionValue } from '../composables/useMotion'

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

  /* 几何 MotionValue：动画驱动数值，change 监听同步进 style.value。 */
  const boxLeft = useMotionValue(0)
  const boxTop = useMotionValue(0)
  const boxWidth = useMotionValue(0)
  const boxHeight = useMotionValue(0)
  const boxScale = useMotionValue(1)

  let controls = []

  function syncStyle() {
    style.value = {
      left: boxLeft.get() + 'px',
      top: boxTop.get() + 'px',
      width: boxWidth.get() + 'px',
      height: boxHeight.get() + 'px',
      transform: boxScale.get() === 1 ? 'none' : `scale(${boxScale.get().toFixed(4)})`
    }
  }
  boxLeft.on('change', syncStyle)
  boxTop.on('change', syncStyle)
  boxWidth.on('change', syncStyle)
  boxHeight.on('change', syncStyle)
  boxScale.on('change', syncStyle)

  function stopControls() {
    controls.forEach(control => control.stop?.())
    controls = []
  }

  /* 把几何从当前值弹到目标（可打断）；reduced-motion 直接跳变。 */
  function animateBoxTo(box, config) {
    stopControls()
    if (prefersReducedMotion()) {
      boxLeft.jump(box.left)
      boxTop.jump(box.top)
      boxWidth.jump(box.width)
      boxHeight.jump(box.height)
      boxScale.jump(1)
      syncStyle()
      return
    }
    controls = [
      animate(boxLeft, box.left, config),
      animate(boxTop, box.top, config),
      animate(boxWidth, box.width, config),
      animate(boxHeight, box.height, config)
    ]
  }

  function animateScaleTo(value, config) {
    if (prefersReducedMotion()) {
      boxScale.jump(value)
      syncStyle()
      return
    }
    const control = animate(boxScale, value, config)
    return control
  }

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

  function clearTimers() {
    if (shrinkTimer) clearTimeout(shrinkTimer)
    if (closeTimer) clearTimeout(closeTimer)
    shrinkTimer = null
    closeTimer = null
  }

  /* 收起被打断：取消卸载，直接长回展开态。 */
  function interruptOpen() {
    clearTimers()
    if (!floating.value || !openedBox) {
      closing.value = false
      open.value = false
      openWindow()
      return
    }
    closing.value = false
    compressed.value = false
    floating.value = true
    /* animate 从当前值续接到展开框，中断不重播。 */
    animateBoxTo(openedBox, getSpringConfig('expand'))
    animateScaleTo(1, getSpringConfig('feedback'))
    open.value = true
    options.onOpened?.()
  }

  /* 立即回到文档流：用于收起途中页面滚动、或视图被缓存的情况。 */
  function finishClose(notify = true) {
    clearTimers()
    stopControls()
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

    // 先把按钮尺寸写成显式像素（MotionValue 跳变落位，无动画）。
    const startBox = toFixedBox(node, { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    boxLeft.jump(startBox.left)
    boxTop.jump(startBox.top)
    boxWidth.jump(startBox.width)
    boxHeight.jump(startBox.height)
    boxScale.jump(1)
    syncStyle()
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
    animateScaleTo(0.95, getSpringConfig('feedback'))

    shrinkTimer = setTimeout(() => {
      shrinkTimer = null
      if (!floating.value) return
      compressed.value = false
      const openBox = toFixedBox(node, { left, top, width, height })
      openedBox = { left: openBox.left, top: openBox.top, width: openBox.width, height: openBox.height }
      /* 几何走 expand 弹簧；scale 从压缩态续接回 1（feedback）。 */
      animateBoxTo(openedBox, getSpringConfig('expand'))
      animateScaleTo(1, getSpringConfig('feedback'))
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
      animateBoxTo(closeBox, getSpringConfig('exit'))
      exitMs = getSpringConfig('exit').duration * 1000
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