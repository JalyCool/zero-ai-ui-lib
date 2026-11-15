/* ============================================================
   弹簧动效（CSS 端）
   ------------------------------------------------------------
   按「场景 + 动效气质」生成 linear() 曲线，写到 :root 的
   --spring-<scene> / --spring-<scene>-dur 上，全库的过渡共用。

   两条经验（都是踩过的坑）：
   1) 临界阻尼（ζ=1）曲线**永远不会过冲**。之前这里统一写 1.0，
      于是「活泼模式」在 tokens.css 里的弯折全被行内样式盖掉 ——
      活泼也不弹。活泼档必须是欠阻尼（ζ≈0.45~0.6）才有真回弹。
   2) 时长要留够：欠阻尼要跑完一到两个振荡周期才停。截得太短，
      曲线在第一次过冲前就结束了，看起来就是「没有回弹」。
   ============================================================ */

export function springLinear(response, damping, options = {}) {
  const samples = options.samples || 64
  const w = (2 * Math.PI) / Math.max(0.06, response)
  const zeta = Math.min(1, Math.max(0.15, damping))
  const wd = w * Math.sqrt(Math.max(0.0001, 1 - zeta * zeta))

  /* 欠阻尼多留几个周期，临界阻尼 1.35 倍就够了。 */
  const duration = response * (zeta >= 0.999 ? 1.35 : 1.35 + (1 - zeta) * 1.5)

  const points = []
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration
    let x
    if (zeta >= 0.999) {
      x = 1 - (1 + w * t) * Math.exp(-w * t)
    } else {
      x = 1 - Math.exp(-zeta * w * t) *
        (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
    }
    points.push(x)
  }
  /* 首帧必须 0、末帧必须 1；中间保留 >1 的过冲（linear() 允许超调）。 */
  points[0] = 0
  points[points.length - 1] = 1

  return {
    easing: 'linear(' + points.map(point => point.toFixed(4)).join(', ') + ')',
    duration
  }
}

/* response：周期感（秒）；damping：阻尼比（1 = 不过冲）。 */
export const TONE_SPRINGS = {
  calm: {
    feedback: { response: 0.26, damping: 1.00 },
    view: { response: 0.34, damping: 1.00 },
    sheet: { response: 0.44, damping: 1.00 },
    expand: { response: 0.34, damping: 1.00 },
    exit: { response: 0.34, damping: 1.00 },
    fade: { response: 0.24, damping: 1.00 }
  },
  lively: {
    /* 阻尼比 0.45~0.6：回弹 16%~20%；response 取小值让整段更短更「陡」，
       同样的过冲压在更短时间里，才有「弹一下」的脆感。 */
    feedback: { response: 0.20, damping: 0.52 },
    view: { response: 0.26, damping: 0.55 },
    /* 几何类（top/left/width/height）过冲压在 6%~8%：
       再多就不是「弹一下」，而是卡片撑出视口再被裁掉。 */
    sheet: { response: 0.34, damping: 0.62 },
    expand: { response: 0.28, damping: 0.62 },
    exit: { response: 0.24, damping: 0.66 },
    fade: { response: 0.20, damping: 0.78 }
  }
}

export function springsFor(tone) {
  return TONE_SPRINGS[tone] || TONE_SPRINGS.calm
}

/** 把当前气质（或显式传入的 tone）落成一整套 CSS 令牌。 */
export function apply(tone) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const active = tone || root.getAttribute('data-motion') || 'calm'
  const table = springsFor(active === 'lively' ? 'lively' : 'calm')

  Object.keys(table).forEach(name => {
    const params = table[name]
    const spring = springLinear(params.response, params.damping)
    root.style.setProperty(`--spring-${name}`, spring.easing)
    root.style.setProperty(`--spring-${name}-dur`, spring.duration.toFixed(2) + 's')
  })
}
