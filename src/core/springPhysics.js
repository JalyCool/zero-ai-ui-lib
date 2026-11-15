/* ============================================================
   弹簧求解器（参考 react-bits 的「按动作分档弹簧」）
   ------------------------------------------------------------
   CSS transition 只能给一条固定曲线，做不出「松手速度越大冲得越远」
   这种带初速度的回弹。这里用半隐式欧拉积分跑真弹簧，把松手速度注入。

   分档：place 220/26、settle 300/30、tuck 240/28（软）、
        fling 650/42（硬，一下飞走）、lean 400/34。
   注意：本文件只提供数值求解，不碰 CSS 令牌 —— 那是 core/spring.js 的职责。
   ============================================================ */

export const SPRINGS = {
  place: { stiffness: 220, damping: 26 },
  settle: { stiffness: 300, damping: 30 },
  tuck: { stiffness: 240, damping: 28 },
  fling: { stiffness: 650, damping: 42 },
  lean: { stiffness: 400, damping: 34 },
  press: { stiffness: 500, damping: 38 }
}

export function animateSpring(options) {
  const {
    from = 0, to = 0, velocity = 0,
    stiffness = 220, damping = 26,
    onUpdate, onDone, precision = 0.25
  } = options || {}

  let value = from
  let speed = velocity
  let last = 0
  let frame = 0
  let cancelled = false

  const step = now => {
    if (cancelled) return
    if (!last) last = now
    const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000))
    last = now
    const accel = -stiffness * (value - to) - damping * speed
    speed += accel * dt
    value += speed * dt
    if (onUpdate) onUpdate(value)
    if (Math.abs(value - to) < precision && Math.abs(speed) < precision * 12) {
      if (onUpdate) onUpdate(to)
      frame = 0
      if (onDone) onDone()
      return
    }
    frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)

  return () => {
    cancelled = true
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
}
