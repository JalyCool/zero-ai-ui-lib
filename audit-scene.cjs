const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

/* 统计「库组件」在**场景页**（views/）里的使用情况，
   排除清单页 ComponentsView —— 那里堆了所有组件，不算数。 */

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

const libIndex = readFileSync('src/components/ui/index.js', 'utf8') +
  readFileSync('src/components/layout/index.js', 'utf8')
const exported = new Set()
for (const m of libIndex.matchAll(/export \{ default as (\w+) \}/g)) exported.add(m[1])

const sceneFiles = walk('src/views').filter(f => !f.includes('ComponentsView'))
const usage = new Map()
for (const f of sceneFiles) {
  const text = readFileSync(f, 'utf8')
  for (const comp of exported) {
    if (new RegExp(`<${comp}[\\s>/]`).test(text)) {
      if (!usage.has(comp)) usage.set(comp, new Set())
      usage.get(comp).add(f.replace(/\\/g, '/').split('/').pop())
    }
  }
}

const unused = [...exported].filter(c => !usage.has(c)).sort()
console.log('场景页已用:', usage.size, '/', exported.size)
console.log('\n尚未进入场景页 (' + unused.length + '):')
for (const c of unused) {
  console.log('  ' + c)
}
console.log('\n各场景页覆盖:')
for (const [c, files] of [...usage.entries()].sort((a, b) => b[1].size - a[1].size)) {
  console.log('  ' + String(files.size) + '  ' + c + '  [' + [...files].join(', ') + ']')
}