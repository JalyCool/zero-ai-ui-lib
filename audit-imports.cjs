const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

/* 校验每个 .vue：模板里用到的 <UiXxx> / <ZeroXxx> 是否都在本文件的 import 里。
   Vue 的 <script setup> 靠 import 解析组件；漏一个只会得到一条
   "Failed to resolve component" 警告（页面白屏但控制台不报错）。 */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

let problems = 0
for (const file of walk('src')) {
  const text = readFileSync(file, 'utf8')
  const tplIdx = text.indexOf('<template>')
  if (tplIdx < 0) continue
  const script = text.slice(0, tplIdx)
  const template = text.slice(tplIdx)

  /* import 列表里的标识符 */
  const imported = new Set()
  for (const m of script.matchAll(/import\s+([^;]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const clause = m[1]
    const braces = clause.match(/\{([^}]*)\}/)
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim()
        if (name) imported.add(name)
      }
    }
    const def = clause.replace(/\{[^}]*\}/, '').replace(/,/g, '').trim()
    if (def) imported.add(def)
  }

  /* 模板里的大驼峰标签 */
  const used = new Set()
  for (const m of template.matchAll(/<([A-Z][\w.]*)/g)) used.add(m[1])

  /* 组件库前缀的才算（本地组件如 <RouterView> 走全局注册） */
  const missing = [...used].filter(u => /^(Ui|Zero)[A-Z]/.test(u) && !imported.has(u))
  if (missing.length) {
    problems++
    console.log('✗', file.replace(/\\/g, '/'), '→ 缺:', missing.join(', '))
  }
}
console.log(problems ? `\n共 ${problems} 个文件有未导入的组件` : '✓ 所有模板组件都已导入')