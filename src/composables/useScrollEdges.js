import { onBeforeUnmount, onMounted, unref, ref, watch } from 'vue'

/* ============================================================
   useScrollEdges —— 滚动容器的「还能往上 / 往下滚」状态
   ------------------------------------------------------------
   渐进式模糊要在「这一侧还有被裁掉的内容」时才出现：到顶了顶部模糊
   就该消失，否则它会一直糊着第一行。手写这套判断是每个页面都要重复
   一遍的样板，所以它属于外壳约定的一部分（ZeroScroll / ZeroApp 已内建）。

   · 内容不足一屏 -> 两侧都 false（没有溢出就不该有模糊）
   · 阈值默认 1px：吸顶元素常见的 0.x 亚像素偏移不算「还能滚」
   · 内容高度变化也要重算：MutationObserver 盯子树增删、
     ResizeObserver 盯容器与内容盒尺寸
   ============================================================ */

export function useScrollEdges(target, options = {}) {
  const threshold = options.threshold ?? 1
  const canScrollUp = ref(false)
  const canScrollDown = ref(false)

  let ro = null
  let roContent = null
  let mo = null

  function measure() {
    const el = unref(target)
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    /* 差 1px 以内按「到底」算，避免亚像素误差让模糊闪 */
    canScrollUp.value = scrollTop > threshold
    canScrollDown.value = scrollTop + clientHeight < scrollHeight - threshold
  }

  function observe(el) {
    if (!el || typeof ResizeObserver === 'undefined') return
    ro = new ResizeObserver(measure)
    ro.observe(el)
    /* 内容层尺寸变化（图片加载、列表增删）不一定改容器尺寸 */
    const content = el.firstElementChild
    if (content) {
      roContent = new ResizeObserver(measure)
      roContent.observe(content)
    }
  }

  function observeContent(el) {
    if (!el || typeof MutationObserver === 'undefined') return
    mo = new MutationObserver(() => {
      measure()
      /* 子树换了新内容层，重新挂 ResizeObserver */
      const content = el.firstElementChild
      if (content && roContent) {
        roContent.disconnect()
        roContent.observe(content)
      }
    })
    mo.observe(el, { childList: true, subtree: true, characterData: true })
  }

  let boundEl = null
  const onScroll = () => measure()

  function bind(el) {
    if (boundEl === el) return
    unbind()
    if (!el) return
    boundEl = el
    el.addEventListener('scroll', onScroll, { passive: true })
    observe(el)
    observeContent(el)
    measure()
  }

  function unbind() {
    if (!boundEl) return
    boundEl.removeEventListener('scroll', onScroll)
    if (ro) { ro.disconnect(); ro = null }
    if (roContent) { roContent.disconnect(); roContent = null }
    if (mo) { mo.disconnect(); mo = null }
    boundEl = null
  }

  watch(() => unref(target), el => bind(el), { immediate: true })

  onMounted(() => {
    bind(unref(target))
    /* 首帧布局稳定后补测一次（字体 / 图片未就绪时高度会变） */
    requestAnimationFrame(measure)
  })

  onBeforeUnmount(unbind)

  return { canScrollUp, canScrollDown, measure }
}

export default useScrollEdges