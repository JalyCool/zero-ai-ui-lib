/* ============================================================
   弧线宽度档位：全库只有两档，圆环族与仪表盘族共用。
   thin = 10（原圆环宽度），bold = 12（原仪表盘宽度）。
   档位值就是最终 CSS 像素宽度，与组件渲染尺寸无关。

   注意：不能对「用 pathLength + stroke-dasharray 表示进度」的
   弧使用 vector-effect="non-scaling-stroke" —— 那会让虚线样式
   改按屏幕单位计算，pathLength 归一失效，进度弧会断裂成几段。
   这类弧改用 useStrokeScale 把 CSS 像素折算回 viewBox 用户单位。
   ============================================================ */

import { onBeforeUnmount, onMounted, ref } from 'vue'

/* 目标元素渲染宽 / viewBox 宽：把 CSS 像素的描边宽度折算成用户单位。 */
export function useStrokeScale(elRef, viewBoxWidth) {
  const scale = ref(1)
  let observer = null
  function update() {
    const el = elRef.value
    if (!el) return
    const width = el.getBoundingClientRect().width
    if (width > 0) scale.value = width / viewBoxWidth
  }
  onMounted(() => {
    update()
    if (typeof ResizeObserver !== 'undefined' && elRef.value) {
      observer = new ResizeObserver(update)
      observer.observe(elRef.value)
    }
    window.addEventListener('resize', update)
  })
  onBeforeUnmount(() => {
    if (observer) observer.disconnect()
    window.removeEventListener('resize', update)
  })
  return scale
}

export const ARC_STROKE_LEVELS = { thin: 10, bold: 12 }

/* stroke 可以传档位名，也可以传具体数值（自定义时仍然按 px 生效）。 */
export function arcStroke(value, fallbackLevel) {
  if (value === undefined || value === null || value === '') return ARC_STROKE_LEVELS[fallbackLevel]
  if (typeof value === 'string' && ARC_STROKE_LEVELS[value] !== undefined) return ARC_STROKE_LEVELS[value]
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : ARC_STROKE_LEVELS[fallbackLevel]
}
