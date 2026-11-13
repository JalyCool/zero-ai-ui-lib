/* 手写类型声明随库产物一起发布：src/lib/index.d.ts -> dist/index.d.ts */
import { copyFileSync } from 'node:fs'

copyFileSync(new URL('../src/lib/index.d.ts', import.meta.url), new URL('../dist/index.d.ts', import.meta.url))
console.log('index.d.ts -> dist/index.d.ts')
