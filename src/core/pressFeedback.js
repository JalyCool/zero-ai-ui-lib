import { onBeforeUnmount } from 'vue'

/* ============================================================
   按压反馈
   菜单/下拉的按钮按下时外壳立刻收缩（和普通按钮的 :active 一致），
   松手后由组件自己决定展开；手指先移动（想滚动）就取消这次按压。
   ============================================================ */

const MOVE_TOLERANCE = 12

export function usePress(options) {
  let state = 'idle'
  let startX = 0
  let startY = 0
  let pointerEl = null
  let pointerId = null

  function detach() {
    if (!pointerEl) return
    pointerEl.removeEventListener('pointermove', onPointerMove)
    pointerEl.removeEventListener('pointerup', onPointerUp)
    pointerEl.removeEventListener('pointercancel', onPointerCancel)
    pointerEl = null
    pointerId = null
  }

  function cancelPress() {
    if (state !== 'pressing') return
    state = 'idle'
    detach()
    options.onPressEnd?.()
  }

  function onPointerDown(event) {
    if (state !== 'idle') return
    if (event.isPrimary === false) return
    if (typeof event.button === 'number' && event.button !== 0) return
    if (options.canPress && !options.canPress()) return

    startX = event.clientX
    startY = event.clientY
    state = 'pressing'
    pointerEl = event.currentTarget
    pointerId = event.pointerId

    pointerEl.addEventListener('pointermove', onPointerMove)
    pointerEl.addEventListener('pointerup', onPointerUp)
    pointerEl.addEventListener('pointercancel', onPointerCancel)
    try {
      try { pointerEl.setPointerCapture(event.pointerId) } catch (error) { /* 指针已失效，忽略 */ }
    } catch (error) {
      // 个别环境不支持捕获，退化成普通监听。
    }

    options.onPressStart?.()
  }

  function onPointerMove(event) {
    if (state !== 'pressing') return
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_TOLERANCE) {
      cancelPress()
    }
  }

  function onPointerUp() {
    if (state !== 'pressing') return
    const el = pointerEl
    const id = pointerId
    state = 'idle'
    detach()
    if (el && id !== null) {
      try { el.releasePointerCapture(id) } catch (error) { /* 已释放 */ }
    }
    options.onPressEnd?.()
    options.onRelease?.()
  }

  function onPointerCancel() {
    cancelPress()
  }

  onBeforeUnmount(() => {
    cancelPress()
    detach()
  })

  return { onPointerDown, cancelPress }
}
