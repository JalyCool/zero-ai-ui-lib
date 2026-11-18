#!/usr/bin/env node
/* 把 skills/zero-ai-ui 同步到两个检索位置：
   · .agents/skills/zero-ai-ui  （GitHub Copilot / agentskills 项目技能）
   · .github/skills/zero-ai-ui  （GitHub Copilot 备选位置）
   源头唯一（skills/zero-ai-ui），避免三处漂移。 */
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'skills/zero-ai-ui')
const targets = ['.agents/skills/zero-ai-ui', '.github/skills/zero-ai-ui']

if (!existsSync(src)) {
  console.error('找不到源目录:', src)
  process.exit(1)
}

for (const rel of targets) {
  const dest = resolve(root, rel)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log('skills synced ->', rel)
}