/* ============================================================
   motion-v 桥接层（Motion for Vue ↔ 项目弹簧令牌）
   ------------------------------------------------------------
   单一事实来源仍是 core/spring.js 的 TONE_SPRINGS：
   · response（周期感，秒）+ damping（阻尼比 ζ，1 = 完全不过冲）
   motion 的 duration-based spring 用另一套语言：
   · duration（秒）+ bounce（0 = 不弹，1 = 极弹，与 ζ 方向相反）
   本文件负责这组换算，业务代码只认场景名（feedback/view/…）。

   ⚠️ motion 的 spring 是互斥两套参数：
      { bounce, duration } 或 { stiffness, damping, mass }，
      混传时后者覆盖前者。本层只用前者，节奏与 CSS linear() 曲线一致。

   用法：
   · 声明式： <motion.div :transition="getSpringConfig('view')" … />
   · 命令式： await animate(el, keyframes, getSpringConfig('expand'))
   · 数值弹簧： const v = useProjectSpring(sourceRef, 'feedback')
   · prefers-reduced-motion 在 getSpringConfig 里统一降级为瞬时。
   ============================================================ */
import { isRef, toValue, watch } from 'vue'
import {
  animate,
  AnimatePresence,
  isMotionValue,
  motion,
  useAnimate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity
} from 'motion-v'
import { LIVELY_DURATION_SCALE, TONE_SPRINGS } from '../core/spring'
import { getMotionTone } from '../core/motionTone'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 项目弹簧（response/ζ）→ motion 弹簧（duration/bounce）。
 * duration 沿用 springLinear 的落定时长公式，保证与 CSS 曲线节奏一致；
 * bounce 与 ζ 反向换算（calm 的 ζ=1 → bounce=0 不弹；lively 的 ζ=0.52 → bounce=0.48）。
 * 返回值直接可作为 motion 组件的 :transition，或 animate() 的 options。
 */
export function getSpringConfig(scene = 'view', tone = null) {
  if (prefersReducedMotion()) {
    return { type: 'spring', duration: 0.01, bounce: 0 }
  }
  const active = tone || getMotionTone()
  const table = TONE_SPRINGS[active === 'lively' ? 'lively' : 'calm']
  const params = table[scene] || table.view
  const zeta = Math.min(1, Math.max(0.15, params.damping))
  /* 与 core/spring.js 的落定时长公式保持一致：欠阻尼多留振荡周期。 */
  const settle = params.response * (zeta >= 0.999 ? 1.35 : 1.35 + (1 - zeta) * 1.5)
  const duration = active === 'lively' ? settle * LIVELY_DURATION_SCALE : settle
  return { type: 'spring', duration, bounce: 1 - zeta }
}

/**
 * 数值弹簧：source 是 Ref<number> / getter / number / MotionValue。
 * 返回跟随用 MotionValue（驱动源变化时带弹簧跟随），可直接绑进
 * motion 组件的 :style（如 { scale: v }）。只接受数值，布尔态请用
 * motion 组件的 :animate 目标切换，不要把布尔喂给弹簧。
 *
 * ⚠️ 单位陷阱（实测 motion-dom 14.11）：attachFollow → FollowAnimation
 * 把 options 原样交给 spring 生成器，**不做秒→毫秒归一化**
 * （归一化只发生在 animateMotionValue，即 animate()/组件路径）。
 * 所以 follow 路径的 duration 必须传毫秒，与 getSpringConfig 的
 * 秒不同。见 ANIMATION_MIGRATION.md「参数映射」。
 */
export function useProjectSpring(source, scene = 'view', options = null) {
  const initial = isMotionValue(source) ? source.get() : toValue(source)
  const driver = useMotionValue(Number.isFinite(initial) ? initial : 0)
  const config = getSpringConfig(scene)
  const follower = useSpring(driver, () => ({
    type: 'spring',
    /* follow 路径按毫秒解读 duration：把场景的秒换算过去 */
    duration: config.duration * 1000,
    bounce: config.bounce,
    ...(options || {})
  }))
  if (isRef(source) || typeof source === 'function') {
    watch(() => toValue(source), value => {
      if (Number.isFinite(value)) driver.set(value)
    })
  }
  return follower
}

/**
 * 物理参数版弹簧（stiffness/damping）：duration-based 弹簧会忽略
 * 初速度（motion 源码：时间定义的弹簧不继承 velocity），需要携带
 * 初速度的动画（拖拽松手吸附、甩动）用它：
 *   animate(heightMv, targetPx, { ...getSpringPhysicsConfig('sheet'), velocity })
 * 换算与 springLinear 同源：ω = 2π/response → stiffness = ω²，
 * damping = 2·ζ·ω。
 */
export function getSpringPhysicsConfig(scene = 'view', tone = null) {
  const active = tone || getMotionTone()
  const table = TONE_SPRINGS[active === 'lively' ? 'lively' : 'calm']
  const params = table[scene] || table.view
  const zeta = Math.min(1, Math.max(0.15, params.damping))
  const w = (2 * Math.PI) / Math.max(0.06, params.response)
  return { type: 'spring', stiffness: w * w, damping: 2 * zeta * w }
}

/**
 * CSS 令牌形式（混合场景用）：想让纯 CSS 元素与 motion 弹簧同节奏时，
 * 直接写 transition: transform var(--spring-view-dur) var(--spring-view)。
 */
export function getSpringTokens(scene = 'view') {
  return {
    easing: `var(--spring-${scene})`,
    duration: `var(--spring-${scene}-dur)`
  }
}

/* motion-v 原语统一出口：业务侧不必直接 import 'motion-v'，
   统一从这里取，将来换底层动画库只改这一个文件。 */
export {
  animate,
  AnimatePresence,
  isMotionValue,
  motion,
  useAnimate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity
}

export default {
  getSpringConfig,
  getSpringPhysicsConfig,
  getSpringTokens,
  useProjectSpring,
  prefersReducedMotion
}
