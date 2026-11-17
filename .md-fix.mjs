import fs from 'node:fs'
const p = 'src/components/ui/MarkdownView.vue'
let c = fs.readFileSync(p, 'utf8')

/* 1) markTail：key 按内容 */
c = c.replace(
  'out.splice(i, 1, head, h("span", { class: "ui-md-fresh-text is-rise", key: "fresh-" + i }, tail))',
  '/* key 必须带内容：每帧的新增段不同 → key 不同 → DOM 重新插入 → 动画重新播。'
)
fs.writeFileSync(p, c)
console.log(c.includes('out.splice(i, 1, head'))
