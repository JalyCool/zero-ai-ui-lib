/* ============================================================
   弹簧动效
   分场景固定：
   按压=轻快、视图=顺滑、抽屉=柔和、展开=顺滑、
   离场=轻柔（轻快与柔和的中间值）。速度固定为 1.0×。
   ============================================================ */

export function springLinear(response, damping) {
  const duration = response * 1.5
  const samples = 50
  const w = (2 * Math.PI) / response
  const wd = w * Math.sqrt(Math.max(0.0001, 1 - damping * damping))
  const points = []

  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration
    let x
    if (damping >= 0.999) {
      x = 1 - (1 + w * t) * Math.exp(-w * t)
    } else {
      x = 1 - Math.exp(-damping * w * t) *
        (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t))
    }
    points.push(x)
  }

  const last = points[points.length - 1] || 1
  const normalized = points.map(point => (point / last).toFixed(4))
  normalized[normalized.length - 1] = '1'

  return {
    easing: `linear(${normalized.join(', ')})`,
    duration
  }
}

const SCENE_SPRINGS = {
  feedback: { response: 0.32, damping: 0.90 },
  view:     { response: 0.42, damping: 1.00 },
  sheet:    { response: 0.55, damping: 1.00 },
  expand:   { response: 0.42, damping: 1.00 },
  exit:     { response: 0.435, damping: 0.95 }
}

export function apply() {
  const root = document.documentElement

  Object.keys(SCENE_SPRINGS).forEach(name => {
    const params = SCENE_SPRINGS[name]
    const spring = springLinear(params.response, params.damping)
    root.style.setProperty(`--spring-${name}`, spring.easing)
    root.style.setProperty(`--spring-${name}-dur`, spring.duration.toFixed(2) + 's')
  })

  const fadeSpring = springLinear(0.30, 1.0)
  root.style.setProperty('--spring-fade', fadeSpring.easing)
  root.style.setProperty('--spring-fade-dur', fadeSpring.duration.toFixed(2) + 's')
}
