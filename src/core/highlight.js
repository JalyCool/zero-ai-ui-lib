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
  ts: [
    ['comment', /^\/\/[^\n]*/],
    ['comment', /^\/\*[\s\S]*?\*\//],
    ['string', /^'(?:\\.|[^'\\\n])*'|^"(?:\\.|[^"\\\n])*"|^`[^`\\]*(?:\\.[^`\\]*)*`/],
    ['keyword', /^(?:const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|import|from|export|async|await|yield|try|catch|finally|throw|interface|type|enum|namespace|implements|readonly|public|private|protected|abstract|as|satisfies|keyof|infer|never|unknown|any|string|number|boolean|void|null|undefined|true|false|this)\b/],
    ['number', /^(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e-?\d+)?)/i],
    ['fn', /^[A-Za-z_$][\w$]*(?=\s*[<(])/],
    ['prop', /^[A-Za-z_$][\w$]*(?=:)/],
    ['punct', /^[(){}\[\],;:.=<>+\-*/%!&|?~^@#]+/]
  ],
  python: [
    ['comment', /^#[^\n]*/],
    ['string', /^(?:f|rf|fr)?'(?:\\.|[^'\\\n])*'|^(?:f|rf|fr)?"(?:\\.|[^"\\\n])*"/],
    ['keyword', /^(?:def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|raise|pass|break|continue|lambda|yield|global|nonlocal|assert|del|in|is|not|and|or|None|True|False|self|match|case|async|await)\b/],
    ['number', /^\d+(?:\.\d+)?(?:e-?\d+)?/i],
    ['fn', /^[A-Za-z_]\w*(?=\s*\()/],
    ['punct', /^[(){}\[\],;:.=<>+\-*/%!&|?~^@]+/]
  ],
  go: [
    ['comment', /^\/\/[^\n]*/],
    ['comment', /^\/\*[\s\S]*?\*\//],
    ['string', /^'(?:\\.|[^'\\])|^"(?:\\.|[^"\\])*"|^`[^`]*`/],
    ['keyword', /^(?:package|import|func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|struct|interface|map|chan|type|var|const|nil|true|false|string|int|int64|float64|bool|byte|rune|error|any)\b/],
    ['number', /^(?:0x[\da-f]+|\d+(?:\.\d+)?)/i],
    ['fn', /^[A-Za-z_]\w*(?=\s*\()/],
    ['punct', /^[(){}\[\],;:.=<>+\-*/%!&|?~^]+/]
  ],
  sql: [
    ['comment', /^--[^\n]*/],
    ['string', /^'(?:''|[^'])*'/],
    ['keyword', /^(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|DISTINCT|COUNT|SUM|AVG|MIN|MAX|UNION|ALL|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK|WITH|RECURSIVE)\b/i],
    ['number', /^\d+(?:\.\d+)?/],
    ['fn', /^[A-Za-z_]\w*(?=\s*\()/i],
    ['punct', /^[(),;.*=<>+\-/%]+/]
  ],
  yaml: [
    ['comment', /^#[^\n]*/],
    ['key', /^[\w.-]+(?=\s*:)/],
    ['string', /^'[^']*'|^"[^"]*"/],
    ['keyword', /^(?:true|false|null|yes|no|on|off)\b/i],
    ['number', /^-?\d+(?:\.\d+)?/],
    ['punct', /^[-:\[\]{},&*#?|>!%@]+/]
  ],
  bash: [
    ['comment', /^#[^\n]*/],
    ['string', /^'[^']*'|^"[^"]*"/],
    ['keyword', /^(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|echo|cd|ls|grep|awk|sed|cat|rm|cp|mv|mkdir|chmod|curl|git|npm|pnpm|node)\b/],
    ['number', /^\d+(?:\.\d+)?/],
    ['fn', /^[A-Za-z_][\w-]*(?=\s*\(\))/],
    ['punct', /^[{}()\[\];,|&<>=+\-*/%!~^]+/]
  ],
  md: [
    ['heading', /^#{1,6}[^\n]*/],
    ['key', /^[-*+]\s|^\d+\.\s|^> /],
    ['string', /^\*\*[^*]+\*\*|^_[^_]+_/],
    ['fn', /^\[[^\]]*\](\([^)]*\))?/]
  ]
}

/* 每门语言的关键字（代码补全候选）。 */
const KEYWORDS = {
  js: 'const let var function return if else for while do switch case default break continue new delete typeof instanceof in of class extends super import from export async await yield try catch finally throw null undefined true false this'.split(' '),
  ts: 'const let var function return if else for while do switch case default break continue new delete typeof instanceof in of class extends super import from export async await yield try catch finally throw interface type enum namespace implements readonly public private protected abstract as satisfies keyof infer never unknown any string number boolean void null undefined true false this'.split(' '),
  python: 'def class return if elif else for while try except finally with as import from raise pass break continue lambda yield global nonlocal assert del in is not and or None True False self match case async await'.split(' '),
  go: 'package import func return if else for range switch case default break continue go defer select struct interface map chan type var const nil true false string int int64 float64 bool byte rune error any'.split(' '),
  sql: 'SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET AS AND OR NOT NULL PRIMARY KEY FOREIGN REFERENCES INDEX DISTINCT COUNT SUM AVG MIN MAX UNION ALL CASE WHEN THEN ELSE END BEGIN COMMIT ROLLBACK WITH RECURSIVE'.split(' '),
  yaml: 'true false null yes no on off'.split(' '),
  bash: 'if then else elif fi for while do done case esac function return export local echo cd ls grep awk sed cat rm cp mv mkdir chmod curl git npm pnpm node'.split(' ')
}

export function keywordsOf(language) {
  return KEYWORDS[language] || []
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
