/* ============================================================
   Iconify 名字归一化 + Markdown 内联标记
   ------------------------------------------------------------
   四种裸写法：pack:icon / pack/icon / pack--icon / i-pack:icon
   显式标记：::pack:icon::（MarkdownView 的默认行为，最高优先级）
   本地注册表（registerIcons）的名字优先于 Iconify 远程图标。
   ============================================================ */

/* i-pack:icon -> pack:icon；pack/icon -> pack:icon；pack--icon -> pack:icon */
export function normalizeIconName(name) {
  let n = String(name || '').trim()
  if (!n) return ''
  if (/^i-[a-z]/i.test(n)) n = n.slice(2)
  const slash = n.indexOf('/')
  if (slash > 0) n = n.slice(0, slash) + ':' + n.slice(slash + 1)
  const dm = n.match(/^([a-z][a-z0-9-]*)--([a-z0-9-]+)$/i)
  if (dm) n = dm[1] + ':' + dm[2]
  return n
}

/* ::pack:icon:: —— 显式标记（名字里可以有冒号 / 斜杠 / 双横线，只要不含空白） */
export const ICON_EXPLICIT_RE = /::\s*([^\s:]+(?:[:/][^\s:]+)*)\s*::/g

/* 四种裸写法：前后必须是空白 / 开括号 / 引号 / 行首行尾，
   避免时间（12:30）与网址（https://）误伤；mailto:a@b 也因 @ 断言不命中 */
export const ICON_INLINE_RE = /(^|[\s(（\[{"'「『])([a-z][a-z0-9-]*:[a-z0-9-]+|[a-z][a-z0-9-]*\/[a-z0-9-]+|[a-z][a-z0-9-]*--[a-z0-9-]+|i-[a-z][a-z0-9-]*:[a-z0-9-]+)(?=$|[\s)）\]}"'」』.,!?;:、])/gi

/* @提及：@用户名（2~32 位字母数字下划线连字符） */
export const MENTION_RE = /@([A-Za-z0-9_-]{2,32})(?![A-Za-z0-9_-])/g
