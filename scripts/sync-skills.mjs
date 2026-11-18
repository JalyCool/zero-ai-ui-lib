#!/usr/bin/env node
/* 把 skills/zero-ai-ui 同步到 .github/skills/zero-ai-ui。
   GitHub Copilot 的项目技能只扫 .github/skills、.claude/skills、.agents/skills，
   而 Vercel / agentskills 规范扫仓库根 skills/；两份保持一致靠这个脚本。 */
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'skills/zero-ai-ui')
const dest = resolve(root, '.github/skills/zero-ai-ui')

if (!existsSync(src)) {
  console.error('找不到源目录:', src)
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })

console.log('skills synced ->', dest.replace(root + '\\', '').replace(root + '/', ''))