import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { unref } from 'vue'

/* ============================================================
   useSurfaceTier —— 组件背景按所在层自动调整
   ------------------------------------------------------------
   组件背景写死 var(--surface-container) 的问题：放进 surface-container-low
   的卡片里它和宿主同色（看不见），放进 high 层又变成「比宿主高两档」。
   嵌套层级一多，谁都不在正确的档位上。

   做法：挂载后探测宿主的**实际不透明背景色**（逐层合成半透明，
   与 UiAvatarTag 的管线同一套），再在 M3 表面梯度上找「比宿主
   亮 / 暗一档」的最近令牌，写进 --tier-bg / --tier-bg-high / --tier-bg-low
   三个变量。组件样式引用这些变量，就自动落在正确档位。

   M3 表面梯度（亮色）：background -> low -> container -> high -> highest
   每档亮度递增；深色主题同梯度反向。findNext 在梯度上找与宿主
   最近、且亮度差大于最小间隔的一档；找不到（宿主已在最顶层）就
   用 highest。

   用法：
     const { tierVars } = useSurfaceTier(rootEl)
     // :style="tierVars"，CSS 里 background: var(--tier-bg)
   ============================================================ */

const GRADIENT = [
  'var(--background)',
  'var(--surface-container-low)',
  'var(--surface-container)',
  'var(--surface-container-high)',
  'var(--surface-container-highest)'
]

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function parseColor(str) {
  const s = String(str).trim()
  if (!s || s === 'transparent') return null
  const hex = hexToRgb(s)
  if (hex) return { ...hex, a: 1 }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    if (parts.length >= 3) return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
  }
  return null
}

function mixOver(base, over) {
  /* over（半透明层）叠在 base 上 */
  const a = over.a
  return {
    r: Math.round(over.r * a + base.r * (1 - a)),
    g: Math.round(over.g * a + base.g * (1 - a)),
    b: Math.round(over.b * a + base.b * (1 - a)),
    a: 1
  }
}

/* 沿 DOM 向上找宿主的实际不透明背景（半透明逐层合成） */
function detectHostBackground(el) {
  let node = el?.parentElement
  let over = null
  while (node && node !== document.documentElement) {
    const bg = parseColor(getComputedStyle(node).backgroundColor)
    if (bg) {
      if (bg.a >= 1) return bg
      const base = over ? mixOver(bg, over) : { r: bg.r, g: bg.g, b: bg.b, a: 1 }
      over = { ...base, a: bg.a + (over ? over.a * (1 - bg.a) : 0) }
      if (over.a >= 0.99) return { r: over.r, g: over.g, b: over.b, a: 1 }
    }
    node = node.parentElement
  }
  return parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
}

function luminance({ r, g, b }) {
  const lin = v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function useSurfaceTier(target, options = {}) {
  const minStep = options.minStep ?? 0.012 /* 亮度最小档差 */
  const tierVars = ref({})
  let ro = null

  function resolve() {
    const el = unref(target)
    if (!el || typeof getComputedStyle === 'undefined') return
    const host = detectHostBackground(el)
    const hostL = luminance(host)

    /* 把梯度令牌解析成实际色（探针读计算值；主题切换后重算即跟随） */
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;'
    el.appendChild(probe)
    const steps = GRADIENT.map(name => {
      probe.style.background = name
      const c = parseColor(getComputedStyle(probe).backgroundColor)
      return { name, color: c, lum: c ? luminance(c) : 0 }
    })
    /* 混色用的前景 / 表面色也取实际值，保证 high/low 同样是合法 rgb() */
    probe.style.background = 'transparent'
    probe.style.color = 'var(--on-surface)'
    const ink = parseColor(getComputedStyle(probe).color)
    probe.remove()

    /* 找比宿主「高一档」（亮度差 ≥ minStep 且最接近）的令牌 */
    let best = null
    let bestDist = Infinity
    for (const s of steps) {
      if (!s.color) continue
      const d = s.lum - hostL
      if (d < minStep) continue
      if (d < bestDist) { bestDist = d; best = s }
    }
    /* 找不到「严格更高一档」时不硬套最高档（可能和宿主几乎同色，
       卡片会隐形）：改用宿主色混 4% 墨色，得到一条极淡的分层。 */
    const chosenColor = chosen ? chosen.color : blend(host, ink || { r: 30, g: 30, b: 38 }, 0.04)

    const toRgb = col => `rgb(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)})`
    const blend = (a, b, t) => ({
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    })

    tierVars.value = {
      '--tier-bg': toRgb(chosenColor),
      /* 更高 / 更低一档：给弹出层与次级内容用（都基于实际颜色混出来） */
      '--tier-bg-high': toRgb(ink ? blend(chosenColor, ink, 0.12) : chosenColor),
      '--tier-bg-low': toRgb(blend(chosenColor, host, 0.6))
    }
  }

  function observe() {
    const el = unref(target)
    if (!el || typeof ResizeObserver === 'undefined') return
    ro = new ResizeObserver(resolve)
    ro.observe(el)
  }

  watch(() => unref(target), el => {
    if (ro) { ro.disconnect(); ro = null }
    if (el) { resolve(); observe() }
  }, { immediate: true })

  onMounted(() => {
    /* 布局与主题稳定后再算（主题切换会改变令牌值） */
    requestAnimationFrame(() => requestAnimationFrame(resolve))
    observe()
  })

  onBeforeUnmount(() => { if (ro) ro.disconnect() })

  return { tierVars, resolve }
}

export default useSurfaceTier