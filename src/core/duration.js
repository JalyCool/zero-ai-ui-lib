/* ============================================================
   时长文本（范围时间选择器等共用）
   格式示例：00h00m00s —— 单位从大到小拼接，每个字段两位补零。
   显示精度由调用方决定（最小显示单位）：precision: 'h' | 'm' | 's'。
   规则：
   1. 最高单位的值为 0 时不显示该单位（如 45 分钟 -> 不出现 00h）；
   2. 最高非零单位以下的零值单位整体省略（如 60 分钟 -> "1h"，
      而不是 "1h00m00s"）；
   3. 中间零值字段保留（如 1h00m30s 的 00m 保留）；
   4. 拼接完成后，若整个字符串第一位是 0，隐去首位 0
      （如 "01h03m03s" -> "1h03m03s"），其余字段的首位 0 保留。
   ============================================================ */

const UNIT_SECONDS = { h: 3600, m: 60, s: 1 }
/* 从大到小的完整单位链 */
const FULL_CHAIN = ['h', 'm', 's']

/** 把 'HH:mm'（或 'HH:mm:ss'）解析成当天秒数；非法输入返回 null。 */
export function parseClockTime(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? 0)
  if (hour > 23 || minute > 59 || second > 59) return null
  return hour * 3600 + minute * 60 + second
}

/**
 * 把秒数格式化成 "1h03m03s" 风格的时长文本。
 * @param {number} totalSeconds 时长（负数按 0 处理）
 * @param {{ precision?: 'h'|'m'|'s' }} options 最小显示单位，默认 's'
 */
export function formatDuration(totalSeconds, options = {}) {
  const precision = FULL_CHAIN.includes(options.precision) ? options.precision : 's'
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0))

  /* 精度截断链：precision 之前的单位参与显示。 */
  const chain = FULL_CHAIN.slice(0, FULL_CHAIN.indexOf(precision) + 1)
  let rest = total
  const values = {}
  for (const unit of chain) {
    const size = UNIT_SECONDS[unit]
    values[unit] = Math.floor(rest / size)
    rest -= values[unit] * size
  }
  /* 比精度更小的零头向上并入最小单位，避免 59.6s 显示成 59s。 */
  if (rest > 0) values[chain[chain.length - 1]] += 1

  /* 最高单位为 0 时跳过该单位。 */
  const firstNonZero = chain.findIndex(unit => values[unit] > 0)
  if (firstNonZero === -1) {
    /* 整段为 0：显示最小单位本身，不走首位去 0 规则。 */
    return '0' + precision
  }
  const shown = chain.slice(firstNonZero)
  /* 最高非零单位以下的零值单位整体省略。 */
  while (shown.length > 1 && values[shown[shown.length - 1]] === 0) shown.pop()

  let text = shown.map(unit => String(values[unit]).padStart(2, '0') + unit).join('')
  if (text.startsWith('0')) text = text.slice(1)
  return text
}

/** 两个 'HH:mm' 之间的时长文本；结束早于开始按 0 处理。 */
export function formatDurationBetween(start, end, options) {
  const a = parseClockTime(start)
  const b = parseClockTime(end)
  if (a === null || b === null) return formatDuration(0, options)
  return formatDuration(Math.max(0, b - a), options)
 }
