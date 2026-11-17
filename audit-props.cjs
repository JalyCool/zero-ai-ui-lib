const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

/* 只检查**静态属性**（没有 : 前缀）的类型不符。
   Vue 的规则：
   · Boolean prop 收到空字符串 ""  -> true（合法）
   · Boolean prop 收到非空字符串   -> 警告 + 保持默认（真问题）
   · Number prop  收到非数字字符串 -> 警告 + 不转换（真问题）
   · String prop  收到任何字符串   -> 合法
   绑定（:prop="expr"）的类型由运行时决定，静态不可知，跳过。 */

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

const propDecl = new Map()
for (const dir of ['src/components/ui', 'src/components/layout']) {
  for (const file of walk(dir)) {
    const name = file.replace(/\\/g, '/').split('/').pop().replace('.vue', '')
    const text = readFileSync(file, 'utf8')
    const decl = new Map()
    const start = text.indexOf('defineProps')
    if (start < 0) continue
    const body = text.slice(start, start + 3000)
    for (const m of body.matchAll(/(\w+):\s*\{[^}]*?type:\s*(\[[^\]]*\]|String|Number|Boolean|Object|Array|Function)/g)) {
      decl.set(m[1], m[2].replace(/[[\]]/g, '').split(',').map(s => s.trim().replace(/'/g, '')))
    }
    propDecl.set(name, decl)
  }
}

const issues = []
for (const dir of ['src/views', 'src/components']) {
  for (const file of walk(dir)) {
    if (file.includes('components/ui/') || file.includes('components/layout/')) continue
    const text = readFileSync(file, 'utf8')
    const tplIdx = text.indexOf('<template>')
    if (tplIdx < 0) continue
    const template = text.slice(tplIdx)

    for (const m of template.matchAll(/<((?:Ui|Zero)\w+)([^>]*?)\/?>/g)) {
      const comp = m[1]
      const decl = propDecl.get(comp)
      if (!decl) continue
      /* 逐个属性：前面带 : 或 v-bind: 的是绑定，跳过 */
      for (const pm of m[2].matchAll(/(^|\s)([:@]?[\w.-]+)\s*=\s*"([^"]*)"/g)) {
        const attr = pm[2]
        if (attr.startsWith(':') || attr.startsWith('v-bind:') || attr.startsWith('@') || attr.startsWith('v-on:')) continue
        const propName = attr.replace(/^v-/, '')
        const value = pm[3]
        const types = decl.get(propName)
        if (!types) continue
        let problem = null
        if (types.includes('Boolean') && !types.includes('String') && value !== '' && value !== 'true' && value !== 'false') {
          problem = `Boolean prop 收到非空字符串 "${value}"`
        } else if (types.includes('Number') && !types.includes('String') && !/^-?\d+(\.\d+)?$/.test(value)) {
          problem = `Number prop 收到 "${value}"`
        }
        if (problem) {
          issues.push(`${file.replace(/\\/g, '/')}  <${comp} ${propName}="${value}">  ${problem}`)
        }
      }
    }
  }
}

console.log(issues.length ? issues.join('\n') : '✓ 没有静态属性的类型不符')
console.log('共', issues.length, '处')