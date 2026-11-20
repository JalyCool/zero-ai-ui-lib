const { readFileSync, writeFileSync } = require('node:fs')
const p = 'src/components/ui/MarkdownView.vue'
let c = readFileSync(p, 'utf8')

/* 12) 流式期间先占住容器宽度再排版：边收边排会让换行点一直变，
       文字看起来就是一闪一闪地重排。 */
c = c.replace(
  '  const style = props.streaming && reserveHeight.value ? { minHeight: reserveHeight.val',
  `  /* 流式期间锁定可用宽度（width:100%），换行点不再随内容增长漂移；
     流结束后去掉，容器恢复自适应。 */
  const streamingStyle = props.streaming ? { width: '100%' } : {}
  const style = { ...streamingStyle, ...(props.streaming && reserveHeight.value ? { minHeight: reserveHeight.val`
)
c = c.replace(
  /const style = \{ \.\.\.streamingStyle, \.\.\.\(props\.streaming && reserveHeight\.value \? \{ minHeight: reserveHeight\.val[\s\S]*?\} : \{\}\) \}/,
  (m) => m
)
writeFileSync(p, c, 'utf8')
console.log('streaming width:', c.includes('streamingStyle'))