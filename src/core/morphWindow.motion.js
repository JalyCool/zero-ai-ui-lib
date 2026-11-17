/* ============================================================
   形变窗口 (motion-v 版本)
   使用 motion-v 的 useAnimate 和 spring 配置替代 CSS transition
   ============================================================ */
import { nextTick, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { toFixedBox } from './fixedBox'
import { useProjectAnimate, getSpringConfig } from '../composables/useMotion'

export const MORPH_MARGIN = 16

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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

  /* motion-v animation scope */
  const [scope, animate] = useProjectAnimate()

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
    pressedReset()
    if (!floating.value || !openedBox) {
      closing.value = false
      open.value = false
      openWindow()
      return
    }
    closing.value = false
    compressed.value = false
    floating.value = true
    style.value = { ...openedBox }
    open.value = true
    options.onOpened?.()
  }

  function pressedReset() {
    compressed.value = false
  }

  /* 立即回到文档流：用于收起途中页面滚动、或视图被缓存的情况。 */
  function finishClose(notify = true) {
    clearTimers()
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

    // 先把按钮尺寸写成显式像素：auto 尺寸无法参与过渡。
    const startBox = toFixedBox(node, { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    style.value = {
      left: startBox.left + 'px',
      top: startBox.top + 'px',
      width: startBox.width + 'px',
      height: startBox.height + 'px'
    }
    viewStyle.value = {
      width: innerW + 'px',
      height: innerH + 'px'
    }
    floating.value = true

    await nextTick()
    const el = surfaceEl()
    if (el) void el.offsetWidth

    // 阶段一：输入框先按下收缩，再放大成窗口。
    // 使用 motion-v 的 spring 动画
    compressed.value = true

    // Animate the compression
    if (!prefersReducedMotion() && scope.current) {
      const compressionConfig = getSpringConfig('feedback')
      await animate(scope.current, { scale: [1, 0.95] }, compressionConfig)
    }

    shrinkTimer = setTimeout(() => {
      shrinkTimer = null
      if (!floating.value) return
      compressed.value = false
      
      // Animate to expanded state using motion-v
      const openBox = toFixedBox(node, { left, top, width, height })
      openedBox = { left: openBox.left + 'px', top: openBox.top + 'px', width: openBox.width + 'px', height: openBox.height + 'px' }
      
      if (!prefersReducedMotion() && scope.current) {
        const expandConfig = getSpringConfig('expand')
        animate(scope.current, {
          left: openedBox.left,
          top: openedBox.top,
          width: openedBox.width,
          height: openedBox.height
        }, expandConfig).then(() => {
          style.value = { ...openedBox }
        })
      } else {
        style.value = { ...openedBox }
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

    const anchor = currentAnchor()
    closing.value = true
    open.value = false
    compressed.value = false

    await nextTick()
    const el = surfaceEl()
    if (el) void el.offsetWidth

    if (anchor) {
      const closeBox = toFixedBox(surfaceEl(), anchor)
      
      if (!prefersReducedMotion() && scope.current) {
        const exitConfig = getSpringConfig('exit')
        await animate(scope.current, {
          left: closeBox.left + 'px',
          top: closeBox.top + 'px',
          width: closeBox.width + 'px',
          height: closeBox.height + 'px'
        }, exitConfig)
      }
      
      style.value = {
        left: closeBox.left + 'px',
        top: closeBox.top + 'px',
        width: closeBox.width + 'px',
        height: closeBox.height + 'px'
      }
    }

    const ms = prefersReducedMotion() ? 0 : 650 // fallback
    closeTimer = setTimeout(() => {
      closeTimer = null
      finishClose()
    }, ms + 80)
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