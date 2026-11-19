import { onBeforeUnmount, ref } from 'vue'

/* ============================================================
   useHeadFuse —— 头部融合状态（模块级单例）
   ------------------------------------------------------------
   外壳里有两个 AppHead 实例（inline 默认态 + fuse-only 融合条），
   各自监听滚动会得到两份状态，出现两个固定条同时显示。
   这里把状态与滚动监听收成单例：任一实例挂载时绑定一次，
   卸载全部实例后才解绑。
   ============================================================ */

const fused = ref(false)
let watchers = 0
let scrollEl = null
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const el = scrollEl
    if (!el) return
    /* 阈值：inline 头的高度 + 它的顶部偏移（完全离场即融合）。
       由最近的 inline 头实例通过 registerInline 上报。 */
    fused.value = el.scrollTop > threshold()
  })
}

function threshold() {
  return inlineBox ? inlineBox.top + inlineBox.height : 80
}

let inlineBox = null
function measureInline(el) {
  if (!el) return
  inlineBox = { top: el.offsetTop, height: el.offsetHeight }
}

function findScrollHost(el) {
  let node = el?.parentElement
  while (node && node !== document.documentElement) {
    const oy = getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/* 只读的融合状态：页面注入到头部 #actions 的按钮可以据此切换形态
   （例如融合后收起文字、只留图标）。 */
export function useHeadFused() {
  return fused
}

export function useHeadFuse(defaultEl) {  function bind(el) {
    if (scrollEl === el) return
    if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
    scrollEl = el
    if (el) el.addEventListener('scroll', onScroll, { passive: true })
  }

  function attach() {
    watchers += 1
    const host = findScrollHost(defaultEl.value || document.querySelector('.app-head__fuse'))
    if (host) bind(host)
    if (defaultEl.value) measureInline(defaultEl.value)
    if (document.fonts?.ready) document.fonts.ready.then(() => {
      if (defaultEl.value) measureInline(defaultEl.value)
      onScroll()
    })
    onScroll()
  }

  function detach() {
    watchers -= 1
    if (watchers <= 0 && scrollEl) {
      scrollEl.removeEventListener('scroll', onScroll)
      scrollEl = null
      inlineBox = null
      fused.value = false
    }
  }

  onBeforeUnmount(detach)

  return { fused, attach, detach, measureInline, bind }
}