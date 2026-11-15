/* ============================================================
   动效气质（motion tone）
   ------------------------------------------------------------
   产品调性的一种：同一条交互，克制模式「稳、短、几乎不过冲」，
   活泼模式「陡、脆、回弹明显」。它改变的是令牌，不是某个组件：
   · 弹簧曲线与时长：--spring-* / --spring-*-dur
   · 幅度倍率：--motion-scale / bounce / distance / blur、--pop-scale
   · 按压缩放：--press-scale / --press-card-scale
   组件侧只要用这些令牌，就会整体切换。

   ⚠️ 这不是给终端用户的偏好开关。按应用定位在代码里预置：
       setMotionTone('lively')
     或写进 zero.config.yaml 的 ui.motion。示例应用里的切换仅作演示。
   ============================================================ */

export const MOTION_TONES = {
  calm: { value: 'calm', label: '克制', hint: '稳、短、几乎不过冲；工具 / 效率 / 金融 / 企业' },
  lively: { value: 'lively', label: '活泼', hint: '更陡的弹簧与明显回弹；娱乐 / 社交 / 儿童' }
}

import { apply as applySpringTokens } from './spring'

let current = 'calm'

function rootEl() {
  if (typeof document === 'undefined') return null
  return document.documentElement
}

/** 设置动效气质；'calm' 会移除标记、回到默认令牌。返回生效值。 */
export function setMotionTone(tone) {
  const next = tone === 'lively' ? 'lively' : 'calm'
  const el = rootEl()
  if (el) {
    if (next === 'calm') el.removeAttribute('data-motion')
    else el.setAttribute('data-motion', next)
  }
  current = next
  /* 行内 --spring-* 会盖掉 tokens.css 里的气质覆盖，所以换气质必须重算一次。 */
  applySpringTokens(next)
  return next
}

export function getMotionTone() {
  const el = rootEl()
  if (el && el.getAttribute('data-motion') === 'lively') return 'lively'
  return current
}

export function isLively() {
  return getMotionTone() === 'lively'
}

export function toggleMotionTone() {
  return setMotionTone(isLively() ? 'calm' : 'lively')
}

/** 读一个倍率令牌（--motion-scale / --motion-bounce / --motion-distance …）。
 *  JS 里算位移、时长的地方用它，才能跟随气质切换。 */
export function motionFactor(name = 'scale', fallback = 1) {
  const el = rootEl()
  if (!el || typeof getComputedStyle !== 'function') return fallback
  const raw = getComputedStyle(el).getPropertyValue('--motion-' + name)
  const value = parseFloat(raw)
  return Number.isFinite(value) ? value : fallback
}

/** 读一个弹簧时长（--spring-view-dur 之类），单位秒。 */
export function springDuration(name = 'view', fallback = 0.5) {
  const el = rootEl()
  if (!el || typeof getComputedStyle !== 'function') return fallback
  const raw = getComputedStyle(el).getPropertyValue('--spring-' + name + '-dur').trim()
  if (!raw) return fallback
  if (raw.endsWith('ms')) return parseFloat(raw) / 1000 || fallback
  if (raw.endsWith('s')) return parseFloat(raw) || fallback
  return fallback
}
