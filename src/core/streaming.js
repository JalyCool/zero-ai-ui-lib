/* ============================================================
   流式内容增量（streaming）
   ------------------------------------------------------------
   一段内容从 A 变成 B 时，找出「没变的前缀」与「没变的后缀」，
   中间那段才是真正新增 / 改动的内容 —— 只有它需要播进场动画。
   这样逐字进场不会让整段文字重新闪一遍。
   ============================================================ */

/* 按用户可见字符切分（优先 Intl.Segmenter，能正确处理 emoji 组合 / 变音符号） */
let segmenter
function getSegmenter() {
  if (segmenter !== undefined) return segmenter
  segmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null
  return segmenter
}

export function graphemes(text) {
  const s = String(text == null ? '' : text)
  if (!s) return []
  const seg = getSegmenter()
  if (!seg) return Array.from(s)
  return Array.from(seg.segment(s), part => part.segment)
}

/* 两段文字的公共前缀长度（按字符，不是 UTF-16 码元） */
export function commonPrefixLength(a, b) {
  const ga = graphemes(a)
  const gb = graphemes(b)
  const limit = Math.min(ga.length, gb.length)
  let i = 0
  while (i < limit && ga[i] === gb[i]) i += 1
  return i
}

/* 公共后缀长度（前缀之外的部分才有意义，调用方自己去重） */
export function commonSuffixLength(a, b, skip = 0) {
  const ga = graphemes(a)
  const gb = graphemes(b)
  const limit = Math.min(ga.length, gb.length) - skip
  let i = 0
  while (i < limit && ga[ga.length - 1 - i] === gb[gb.length - 1 - i]) i += 1
  return i
}

/* 增量拆分：{ prefix, changed, appended, isPureAppend } */
export function splitStreamChange(prev, next) {
  const before = String(prev == null ? '' : prev)
  const after = String(next == null ? '' : next)
  const ga = graphemes(before)
  const gb = graphemes(after)
  const prefix = commonPrefixLength(before, after)
  const suffix = commonSuffixLength(before, after, prefix)
  return {
    /* 未变化的字符数（从开头算） */
    prefixLength: prefix,
    /* 未变化的字符数（从结尾算） */
    suffixLength: suffix,
    /* 是否只是尾部追加（流式最常见的形态） */
    isPureAppend: prefix >= ga.length && gb.length > ga.length,
    /* 是否确实有变化 */
    changed: prefix < gb.length || prefix < ga.length,
    removedCount: Math.max(0, ga.length - prefix - suffix),
    addedCount: Math.max(0, gb.length - prefix - suffix)
  }
}

/* 流式状态机：记住上一次的内容，下次更新时给出「从第几个字符开始是新的」 */
export function createStreamTracker() {
  let last = null
  return {
    reset(text) { last = text == null ? null : String(text) },
    /* 返回应从第几个字符开始播进场；Infinity 表示整段都不播 */
    consume(next) {
      const current = next == null ? '' : String(next)
      const from = last === null ? Infinity : commonPrefixLength(last, current)
      last = current
      return from
    },
    get value() { return last }
  }
}
