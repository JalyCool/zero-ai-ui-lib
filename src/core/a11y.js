import { nextTick, onBeforeUnmount, watch } from 'vue'

/* ============================================================
   无障碍小工具（参考 Vuetify / Nuxt UI 的做法，实现自写）
   · useFocusTrap：浮层打开时把 Tab 圈在容器内，关闭后把焦点还回原处；
   · useRovingTabindex：工具栏 / 列表只保留一个 tabindex=0，方向键在项间漫游。
   ============================================================ */

const TABBABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(elRef, options = {}) {
  const active = options.active || (() => true)
  let previous = null

  function focusables() {
    const el = elRef.value
    if (!el) return []
    return Array.from(el.querySelectorAll(TABBABLE)).filter(node => node.offsetParent !== null || node === document.activeElement)
  }

  function onKeydown(event) {
    if (event.key !== 'Tab' || !active()) return
    const nodes = focusables()
    if (!nodes.length) { event.preventDefault(); return }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  async function activate() {
    previous = document.activeElement
    await nextTick()
    const nodes = focusables()
    if (nodes[0]) nodes[0].focus({ preventScroll: true })
    document.addEventListener('keydown', onKeydown, true)
  }

  function deactivate() {
    document.removeEventListener('keydown', onKeydown, true)
    if (previous && previous.focus) previous.focus({ preventScroll: true })
    previous = null
  }

  if (options.model) {
    watch(options.model, value => { value ? activate() : deactivate() }, { immediate: true })
  } else {
    activate()
  }
  onBeforeUnmount(deactivate)
  return { activate, deactivate }
}

export function useRovingTabindex(itemsRef, options = {}) {
  const orientation = options.orientation || 'both'
  const onSelect = options.onSelect || null

  function list() {
    const value = itemsRef.value
    if (!value) return []
    if (Array.isArray(value)) return value.filter(Boolean)
    return Array.from(value.querySelectorAll(options.selector || '[data-roving]'))
  }

  function move(index) {
    const nodes = list()
    if (!nodes.length) return
    const next = (index + nodes.length) % nodes.length
    nodes.forEach((node, i) => { node.tabIndex = i === next ? 0 : -1 })
    nodes[next].focus({ preventScroll: true })
    if (onSelect) onSelect(next, nodes[next])
  }

  function onKeydown(event) {
    const nodes = list()
    const current = nodes.indexOf(document.activeElement)
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)
    if (orientation === 'horizontal' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return
    if (orientation === 'vertical' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) return
    if (forward) { event.preventDefault(); move(current < 0 ? 0 : current + 1) }
    else if (back) { event.preventDefault(); move(current < 0 ? nodes.length - 1 : current - 1) }
    else if (event.key === 'Home') { event.preventDefault(); move(0) }
    else if (event.key === 'End') { event.preventDefault(); move(nodes.length - 1) }
  }

  function bind() {
    const el = itemsRef.value
    if (!el || !el.addEventListener) return () => {}
    el.addEventListener('keydown', onKeydown)
    return () => el.removeEventListener('keydown', onKeydown)
  }

  const detach = bind()
  onBeforeUnmount(detach)
  return { move, refresh: () => move(0), detach }
}

/** 视觉隐藏但可被读屏读到的文本样式（配合 :class 使用）。 */
export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap'
}
