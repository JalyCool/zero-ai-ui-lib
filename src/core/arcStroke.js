/* ============================================================
   弧线宽度档位：全库只有两档，圆环族与仪表盘族共用。
   thin = 10（原圆环宽度），bold = 12（原仪表盘宽度）。
   描边一律配合 vector-effect="non-scaling-stroke"，
   所以档位就是最终 CSS 像素宽度，与组件渲染尺寸无关。
   ============================================================ */

export const ARC_STROKE_LEVELS = { thin: 10, bold: 12 }

/* stroke 可以传档位名，也可以传具体数值（自定义时仍然按 px 生效）。 */
export function arcStroke(value, fallbackLevel) {
  if (value === undefined || value === null || value === '') return ARC_STROKE_LEVELS[fallbackLevel]
  if (typeof value === 'string' && ARC_STROKE_LEVELS[value] !== undefined) return ARC_STROKE_LEVELS[value]
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : ARC_STROKE_LEVELS[fallbackLevel]
}
