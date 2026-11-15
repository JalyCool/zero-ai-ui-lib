/* ============================================================
   position: fixed 的包含块补偿
   ------------------------------------------------------------
   fixed 并不总是相对视口：只要祖先里有 transform / filter /
   backdrop-filter / perspective / will-change / contain 之一，
   包含块就变成那个祖先，left/top 会被整体加上祖先的位置。
   示例页的粘性筛选条带 backdrop-filter，下拉 / 日期选择器一展开
   就偏出半条 —— 这里把「视口坐标」换算成「包含块内坐标」。
   ============================================================ */

export function fixedContainingBlock(el) {
  if (!el || typeof window === 'undefined') return null
  let node = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (
      (style.transform && style.transform !== 'none') ||
      (style.filter && style.filter !== 'none') ||
      (style.backdropFilter && style.backdropFilter !== 'none') ||
      (style.perspective && style.perspective !== 'none') ||
      /transform|filter|perspective/.test(style.willChange || '') ||
      /paint|layout|strict|content/.test(style.contain || '')
    ) return node
    node = node.parentElement
  }
  return null
}

/* 输入视口坐标（getBoundingClientRect 的结果），返回可直接写进
   fixed 元素 style 的数值；没有包含块时原样返回。 */
export function toFixedBox(el, box) {
  const parent = fixedContainingBlock(el)
  if (!parent) {
    return { left: box.left, top: box.top, width: box.width, height: box.height }
  }
  const rect = parent.getBoundingClientRect()
  let scaleX = 1
  let scaleY = 1
  const transform = getComputedStyle(parent).transform
  if (transform && transform !== 'none' && typeof DOMMatrixReadOnly === 'function') {
    const matrix = new DOMMatrixReadOnly(transform)
    scaleX = matrix.a || 1
    scaleY = matrix.d || 1
  }
  return {
    left: (box.left - rect.left) / scaleX,
    top: (box.top - rect.top) / scaleY,
    width: box.width / scaleX,
    height: box.height / scaleY
  }
}
