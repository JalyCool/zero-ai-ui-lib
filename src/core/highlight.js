/* ============================================================
   轻量语法高亮：正则分词 -> 带 class 的 token 序列。
   不求完备，只求常用语言（js / json / css / html / md）不再裸奔。
   所有文本经过 escapeHtml，输出可直接进 v-html。
   ============================================================ */

const RULES = {
  js: [
    ['comment', /^\/\/[^\n]*/],
    ['comment', /^\/\*[\s\S]*?\*\//],
    ['string', /^'(?:\\.|[^'\\\n])*'|^\"(?:\\.|[^\"\\\n])*\"/],
    ['keyword', /^(?:const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|import|from|export|async|await|yield|try|catch|finally|throw|null|undefined|true|false|this)\b/],
    ['number', /^(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e-?\d+)?)/i],
    ['fn', /^[A-Za-z_$][\w$]*(?=\s*\()/],
    ['prop', /^[A-Za-z_$][\w$]*(?=:)/],
    ['punct', /^[(){}\[\],;:.=<>+\-*/%!&|?~^]+/]
  ],
  json: [
    ['key', /^\"(?:\\.|[^\"\\])*\"(?=\s*:)/],
    ['string', /^\"(?:\\.|[^\"\\])*\"/],
    ['keyword', /^(?:true|false|null)\b/],
    ['number', /^-?\d+(?:\.\d+)?(?:e-?\d+)?/i],
    ['punct', /^[{}\[\],:]+/]
  ],
  css: [
    ['comment', /^\/\*[\s\S]*?\*\//],
    ['string', /^'[^'\n]*'|^\"[^\"\n]*\"/],
    ['key', /^[.#][\w-]+|^@[-\w]+|^[a-z-]+(?=\s*:)/i],
    ['number', /^-?\d*\.?\d+(?:px|rem|em|%|s|ms|deg|vh|vw|fr)?|^#[0-9a-f]{3,8}\b/i],
    ['fn', /^[a-z-]+(?=\()/i],
    ['punct', /^[{}();:,]+/]
  ],
  html: [
    ['comment', /^<!--[\s\S]*?-->/],
    ['tag', /^<\/?[-\w]+|^\/?>/],
    ['string', /^\"[^\"]*\"|^'[^']*'/],
    ['key', /^[-\w]+(?==)/],
    ['punct', /^[=<>]+/]
  ],
  md: [
    ['heading', /^#{1,6}[^\n]*/],
    ['key', /^[-*+]\s|^\d+\.\s|^> /],
    ['string', /^\*\*[^*]+\*\*|^_[^_]+_/],
    ['fn', /^\[[^\]]*\](\([^)]*\))?/]
  ]
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/* 把文本切成 [{ type, text }]；识别不出的一律当普通文本。 */
export function tokenize(text, lang) {
  const rules = RULES[lang] || []
  const tokens = []
  let rest = String(text ?? '')
  let plain = ''
  while (rest.length) {
    let hit = null
    for (const [type, re] of rules) {
      const m = re.exec(rest)
      if (m && m[0]) { hit = { type, text: m[0] }; break }
    }
    if (!hit) { plain += rest[0]; rest = rest.slice(1); continue }
    if (plain) { tokens.push({ type: 'plain', text: plain }); plain = '' }
    tokens.push(hit)
    rest = rest.slice(hit.text.length)
  }
  if (plain) tokens.push({ type: 'plain', text: plain })
  return tokens
}

/* 整段高亮成 HTML 片段。 */
export function highlightToHtml(text, lang) {
  return tokenize(text, lang)
    .map(token => token.type === 'plain'
      ? escapeHtml(token.text)
      : '<i class="tok tok-' + token.type + '">' + escapeHtml(token.text) + '</i>')
    .join('')
}
