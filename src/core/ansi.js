/* ============================================================
   ANSI 终端色解析（SGR）：把带色日志转成带样式的 HTML。
   支持 16 / 256 / 真前景色、加粗、暗淡、下划线、反显；
   \r 回车覆盖取最后写入，光标移动类转义直接剥掉。
   ============================================================ */

const BASE16 = [
  'ansi-black', 'ansi-red', 'ansi-green', 'ansi-yellow',
  'ansi-blue', 'ansi-magenta', 'ansi-cyan', 'ansi-white',
  'ansi-bright-black', 'ansi-bright-red', 'ansi-bright-green', 'ansi-bright-yellow',
  'ansi-bright-blue', 'ansi-bright-magenta', 'ansi-bright-cyan', 'ansi-bright-white'
]

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xterm256(n) {
  if (n < 16) return 'var(--' + BASE16[n] + ')'
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return 'rgb(' + v + ',' + v + ',' + v + ')'
  }
  const i = n - 16
  const r = Math.floor(i / 36) * 51
  const g = Math.floor((i % 36) / 6) * 51
  const b = (i % 6) * 51
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}

/* 一行文本 -> HTML 片段。 */
export function ansiLineToHtml(line) {
  const text = String(line)
  const lastCr = text.lastIndexOf('\r')
  const body = lastCr >= 0 ? text.slice(lastCr + 1) : text
  /* 剥掉非 SGR 的转义序列（光标移动、清屏等）。 */
  const cleaned = body.replace(new RegExp('\\x1b\\[[?0-9;]*[A-Za-z]', 'g'), m => (m.endsWith('m') ? m : ''))
  let html = ''
  let bold = false
  let faint = false
  let underline = false
  let inverse = false
  let color = ''
  const styleOf = () => {
    let style = ''
    if (inverse) { style += 'background:var(--on-surface);color:var(--surface);'; }
    else if (color) { style += 'color:' + color + ';'; }
    if (bold) style += 'font-weight:600;'
    if (faint) style += 'opacity:.6;'
    if (underline) style += 'text-decoration:underline;'
    return style
  }
  const parts = cleaned.split(new RegExp('(\\x1b\\[[0-9;]*m)'))
  /* 未闭合样式也输出：每段自带 style。 */
  let openTag = false
  const wrap = content => {
    if (!content) return
    const style = styleOf()
    if (style || inverse) { html += '<i style=\"' + style + '\">' + escapeHtml(content) + '</i>'; }
    else { html += escapeHtml(content) }
  }
  for (const part of parts) {
    const m = new RegExp('^\\x1b\\[([0-9;]*)m$').exec(part)
    if (!m) { wrap(part); continue }
    const codes = (m[1] || '0').split(';').map(c => Number(c || 0))
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i]
      if (code === 0) { bold = faint = underline = inverse = false; color = ''; continue }
      if (code === 1) { bold = true; continue }
      if (code === 2) { faint = true; continue }
      if (code === 4) { underline = true; continue }
      if (code === 7) { inverse = true; continue }
      if (code === 22) { bold = false; faint = false; continue }
      if (code === 24) { underline = false; continue }
      if (code === 27) { inverse = false; continue }
      if (code === 39) { color = ''; continue }
      if (code >= 30 && code <= 37) { color = 'var(--' + BASE16[code - 30] + ')'; continue }
      if (code >= 90 && code <= 97) { color = 'var(--' + BASE16[code - 82] + ')'; continue }
      if (code === 38 && codes[i + 1] === 5) { color = xterm256(codes[i + 2] || 0); i += 2; continue }
      if (code === 38 && codes[i + 1] === 2) { color = 'rgb(' + codes[i + 2] + ',' + codes[i + 3] + ',' + codes[i + 4] + ')'; i += 4; continue }
    }
  }
  return html
}

export function ansiToHtml(text) {
  return String(text ?? '').split('\n').map(ansiLineToHtml).join('\n')
}
