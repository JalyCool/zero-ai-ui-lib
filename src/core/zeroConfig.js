import { setMotionTone } from './motionTone'

/* ============================================================
   zero.config.yaml / zero.config.json
   ------------------------------------------------------------
   应用根目录放一份配置，库启动时读它的 **ui** 段并落成令牌：

   ui:
     motion: lively            # calm | lively（动效气质，产品调性）
     appearance: auto          # light | dark | auto（可选，交给应用）
     radiusScale: 1            # 圆角倍率 → --radius-scale
     density: 0.93             # 密度 → --density 与 spacing
     pressScale: 0.97          # 按压缩放 → --press-scale
     colors:                   # 颜色令牌（camelCase 或 kebab-case 均可）
       primary: "#3f5f90"
       primaryContainer: "#d7e2ff"
       background: "#faf9fd"
     tokens:                   # 逃生口：直接写任意 CSS 变量
       --focus-w: 2.5px

   规则：
   · 只认根部 ui；其它键忽略（未来扩展用）；
   · 未知的颜色名忽略，不崩；
   · 缺文件不算错（返回 null），应用照默认跑。
   ============================================================ */

const FILES = ['zero.config.yaml', 'zero.config.yml', 'zero.config.json']
const cache = new Map()
let applied = null

/* ---------- 极简 YAML 解析（只覆盖配置文件需要的子集） ----------
   支持：缩进映射、'- ' 列表、引号字符串、数字 / 布尔 / null、
   行内注释、空行。不支持：锚点、多文档、流式写法、复杂多行。 */
export function parseSimpleYaml(text) {
  const lines = String(text || '').split(/\r?\n/)
  const root = {}
  const stack = [{ indent: -1, node: root }]

  const stripComment = line => {
    let quote = null
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quote) {
        if (ch === quote && line[i - 1] !== '\\') quote = null
      } else if (ch === '"' || ch === "'") quote = ch
      else if (ch === '#') return line.slice(0, i)
    }
    return line
  }

  const scalar = raw => {
    const value = raw.trim()
    if (!value) return ''
    if (/^"(.*)"$/.test(value)) return value.slice(1, -1)
    if (/^'(.*)'$/.test(value)) return value.slice(1, -1)
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null' || value === '~') return null
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim()
      if (!inner) return []
      return inner.split(',').map(item => scalar(item))
    }
    return value
  }

  for (const rawLine of lines) {
    const line = stripComment(rawLine)
    if (!line.trim()) continue
    const indent = line.match(/^ */)[0].length
    const content = line.trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1].node

    if (content.startsWith('- ')) {
      const value = scalar(content.slice(2))
      const key = stack[stack.length - 1].key
      const container = stack[stack.length - 1].parentNode
      if (key !== undefined && container) {
        if (!Array.isArray(container[key])) container[key] = []
        container[key].push(value)
      }
      continue
    }

    const colon = content.indexOf(':')
    if (colon < 0) continue
    const key = content.slice(0, colon).trim()
    const rest = content.slice(colon + 1).trim()
    if (rest === '') {
      /* 可能是映射或列表的父节点：先占位成对象，后面遇到 '- ' 时换成数组。 */
      parent[key] = {}
      stack.push({ indent, node: parent[key], key, parentNode: parent })
    } else {
      parent[key] = scalar(rest)
    }
  }
  return root
}

function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj)
}

async function fetchConfig(base) {
  if (typeof fetch !== 'function') return null
  for (const name of FILES) {
    try {
      const response = await fetch(base + name, { cache: 'no-store' })
      if (!response.ok) continue
      const text = await response.text()
      if (name.endsWith('.json')) {
        try { return { source: name, data: JSON.parse(text) } } catch (error) { continue }
      }
      return { source: name, data: parseSimpleYaml(text) }
    } catch (error) { /* 网络 / 路径问题：换下一个候选 */ }
  }
  return null
}

const COLOR_VARS = {
  primary: '--primary', onPrimary: '--on-primary',
  primaryContainer: '--primary-container', onPrimaryContainer: '--on-primary-container',
  secondary: '--secondary', secondaryContainer: '--secondary-container',
  background: '--background', surface: '--surface',
  surfaceContainerLow: '--surface-container-low', surfaceContainer: '--surface-container',
  surfaceContainerHigh: '--surface-container-high',
  onSurface: '--on-surface', onSurfaceVariant: '--on-surface-variant',
  outline: '--outline', outlineVariant: '--outline-variant',
  error: '--error', onError: '--on-error',
  success: '--ui-success', warning: '--ui-warning'
}

function toKebab(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** 把 ui 段落成 CSS 变量 / 属性。返回实际应用的键，便于调试。 */
export function applyZeroConfig(config) {
  const ui = config && config.ui ? config.ui : null
  const appliedKeys = []
  const el = typeof document !== 'undefined' ? document.documentElement : null
  const style = el ? el.style : null

  if (ui && style) {
    if (ui.motion) { setMotionTone(ui.motion); appliedKeys.push('ui.motion') }

    const numeric = {
      radiusScale: '--radius-scale',
      density: '--density',
      pressScale: '--press-scale',
      fontScale: '--font-scale'
    }
    for (const [key, cssVar] of Object.entries(numeric)) {
      const value = ui[key]
      if (typeof value === 'number') { style.setProperty(cssVar, String(value)); appliedKeys.push('ui.' + key) }
    }

    /* 密度同时影响几个派生间距（与 tokens.css 的公式保持一致）。 */
    if (typeof ui.density === 'number') {
      const d = ui.density
      style.setProperty('--space-gap', (20 * d).toFixed(2) + 'px')
      style.setProperty('--space-card', (16 * d).toFixed(2) + 'px')
      style.setProperty('--space-metric', (14 * d).toFixed(2) + 'px')
      style.setProperty('--space-item', (12 * d).toFixed(2) + 'px')
    }

    const colors = ui.colors || ui.theme || null
    if (colors && typeof colors === 'object') {
      for (const [name, value] of Object.entries(colors)) {
        const cssVar = COLOR_VARS[name] || (typeof name === 'string' && name.startsWith('--') ? name : '--' + toKebab(name))
        if (typeof value === 'string' && value) { style.setProperty(cssVar, value); appliedKeys.push('ui.colors.' + name) }
      }
    }

    const tokens = ui.tokens
    if (tokens && typeof tokens === 'object') {
      for (const [name, value] of Object.entries(tokens)) {
        if (typeof name === 'string' && name.startsWith('--')) {
          style.setProperty(name, String(value))
          appliedKeys.push('ui.tokens.' + name)
        }
      }
    }

    if (ui.appearance && el) {
      el.setAttribute('data-appearance', String(ui.appearance))
      appliedKeys.push('ui.appearance')
    }
  }

  applied = { source: null, ui: ui || {}, keys: appliedKeys }
  return applied
}

/** 读取并应用配置；base 一般是 import.meta.env.BASE_URL。 */
export async function initZeroConfig(options = {}) {
  const base = options.base !== undefined ? options.base : (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/')
  const loaded = await fetchConfig(base)
  if (!loaded) return null
  const result = applyZeroConfig(loaded.data)
  applied = { source: loaded.source, ui: loaded.data.ui || {}, keys: result.keys }
  cache.set('config', loaded.data)
  return applied
}

/** 同步应用一份已经拿到的配置对象（例如 SSR 注入到全局）。 */
export function useZeroConfig(config) {
  if (config) cache.set('config', config)
  return applyZeroConfig(config || cache.get('config') || {})
}

export function getZeroConfig() {
  return cache.get('config') || null
}

export function getAppliedZeroConfig() {
  return applied
}
