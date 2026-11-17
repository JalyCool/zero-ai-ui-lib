<script setup>
import { h, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import UiIcon from './UiIcon.vue'
import UiLink from './UiLink.vue'
import UiAvatarTag from './UiAvatarTag.vue'
import { normalizeIconName, ICON_EXPLICIT_RE, ICON_INLINE_RE, MENTION_RE } from '../../core/iconify'

/* ============================================================
   MarkdownView —— Markdown 渲染器
   · marked 解析 -> DOM 树 -> 逐节点渲染成 Vue 元素（不 v-html 原文，天然防注入）
   · 内联图标标记（icons 开启，默认开）：
       ::pack:icon::  显式标记（默认行为）
       pack:icon / pack/icon / pack--icon / i-pack:icon  四种裸写法
     本地注册表（registerIcons）的名字优先于 Iconify。
   · @提及（mentions 开启才渲染）：渲染为 UiAvatarTag 药丸，
     mentionResolver(username) 传 { username, showname, type: 'normal'|'agent', image, shape }。
   ============================================================ */

const props = defineProps({
  content: { type: String, default: '' },
  mentions: { type: Boolean, default: false },
  mentionResolver: { type: Function, default: null },
  icons: { type: Boolean, default: true },
  tagSize: { type: String, default: 'sm' },
  /* 流式更新：内容增长时只让「新增 / 变化的块」播进场，其余保持不动；
     同时预留容器高度，逐块长出来时不把下面的内容顶得跳。 */
  streaming: { type: Boolean, default: false },
  /* 流式新增块的进场方式：rise / blur / fade */
  streamEffect: { type: String, default: 'rise' }
})

marked.use({ gfm: true, breaks: true })

/* 把 [{ t: 'text' }] 按 re 切开，命中的片段交给 map 生成新 part */
function explode(parts, re, map) {
  const out = []
  for (const part of parts) {
    if (part.t !== 'text') { out.push(part); continue }
    re.lastIndex = 0
    let last = 0
    let m
    while ((m = re.exec(part.v))) {
      if (m.index > last) out.push({ t: 'text', v: part.v.slice(last, m.index) })
      out.push(map(m))
      last = m.index + m[0].length
      if (m[0].length === 0) re.lastIndex += 1
    }
    if (last < part.v.length) out.push({ t: 'text', v: part.v.slice(last) })
  }
  return out
}

function inlineParts(text) {
  let parts = [{ t: 'text', v: text }]
  if (props.icons) {
    parts = explode(parts, ICON_EXPLICIT_RE, m => ({ t: 'icon', name: m[1] }))
    parts = explode(parts, ICON_INLINE_RE, m => ({ t: 'icon', name: m[2] }))
  }
  if (props.mentions) {
    parts = explode(parts, MENTION_RE, m => ({ t: 'mention', name: m[1] }))
  }
  return parts
}

function mentionProps(username) {
  const p = typeof props.mentionResolver === 'function' ? (props.mentionResolver(username) || {}) : {}
  const agent = p.type === 'agent'
  return {
    name: p.showname || p.username || '@' + username,
    src: p.image || undefined,
    agent,
    agentShape: agent ? (p.shape || 'circle') : undefined,
    shape: agent ? undefined : (p.shape || 'circle'),
    size: props.tagSize
  }
}

let seq = 0
function renderInline(text) {
  return inlineParts(text).map((part, i) => {
    const key = 'in' + (seq++)
    if (part.t === 'icon') {
      const name = normalizeIconName(part.name)
      return name ? h(UiIcon, { name, size: '1em', key, style: 'vertical-align:-0.15em' }) : String(part.name)
    }
    if (part.t === 'mention') {
      /* 药丸比正文行高高，包一层 inline-flex 让它和文字共用一条视觉中轴 */
      return h('span', { class: 'ui-md-mention', key }, [h(UiAvatarTag, mentionProps(part.name))])
    }
    return part.v
  })
}

/* 代码块语言 -> Iconify 图标 */
const LANG_ICONS = {
  js: 'mdi:language-javascript', javascript: 'mdi:language-javascript',
  ts: 'mdi:language-typescript', typescript: 'mdi:language-typescript',
  json: 'mdi:code-json', html: 'mdi:language-html5', css: 'mdi:language-css3',
  md: 'mdi:language-markdown', markdown: 'mdi:language-markdown',
  vue: 'mdi:vuejs', python: 'mdi:language-python', py: 'mdi:language-python',
  sh: 'mdi:console', bash: 'mdi:console', shell: 'mdi:console',
  yaml: 'mdi:file-code-outline', yml: 'mdi:file-code-outline'
}

const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/)/i
const SAFE_SRC = /^(https?:\/\/|data:image\/|\/)/i

function renderChildren(node) {
  const out = []
  node.childNodes.forEach(child => {
    const v = renderNode(child)
    if (v !== null) out.push(v)
  })
  return out
}

function renderNode(node) {
  if (node.nodeType === 3) {
    if (!node.textContent.trim()) return node.textContent
    return renderInline(node.textContent)
  }
  if (node.nodeType !== 1) return null
  const tag = node.tagName.toLowerCase()
  const kids = () => renderChildren(node)
  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return h(tag, { class: 'ui-md-h ui-md-' + tag }, kids())
    case 'p': return h('p', { class: 'ui-md-p' }, kids())
    case 'ul': case 'ol': return h(tag, { class: 'ui-md-list' }, kids())
    case 'li': return h('li', null, kids())
    case 'blockquote': return h('blockquote', { class: 'ui-md-quote' }, kids())
    /* 代码块与行内代码是字面量：不解析图标 / 提及标记 */
    case 'pre': {
      /* 代码块：语言图标 + 语言名 + 代码。语言名取自 child 的 language-xxx 类。 */
      const codeEl = node.querySelector('code')
      const cls = codeEl ? (codeEl.getAttribute('class') || '') : ''
      const m = cls.match(/language-([a-z0-9+#-]+)/i)
      const lang = m ? m[1].toLowerCase() : ''
      const icon = LANG_ICONS[lang] || (lang ? 'mdi:code-tags' : '')
      return h('div', { class: 'ui-md-codeblock' }, [
        h('div', { class: 'ui-md-codeblock__head' }, [
          icon ? h(UiIcon, { name: icon, size: 14, key: 'i' }) : null,
          h('span', { class: 'ui-md-codeblock__lang', key: 'l' }, lang || 'text')
        ]),
        h('pre', { class: 'ui-md-pre' }, h('code', { class: 'ui-md-code' }, node.textContent))
      ])
    }
    case 'code': return h('code', { class: 'ui-md-code' }, node.textContent)
    case 'a': {
      const href = node.getAttribute('href') || ''
      const inner = renderChildren(node)
      if (!SAFE_HREF.test(href)) return h('span', { class: 'ui-md-a' }, inner)
      return h(UiLink, { href, external: /^https?:\/\//i.test(href) }, { default: () => inner })
    }
    case 'img': {
      const src = node.getAttribute('src') || ''
      if (!SAFE_SRC.test(src)) return null
      return h('img', { class: 'ui-md-img', src, alt: node.getAttribute('alt') || '', loading: 'lazy' })
    }
    case 'table': return h('table', { class: 'ui-md-table' }, kids())
    case 'thead': return h('thead', null, kids())
    case 'tbody': return h('tbody', null, kids())
    case 'tr': return h('tr', null, kids())
    case 'th': return h('th', null, kids())
    case 'td': return h('td', null, kids())
    case 'hr': return h('hr', { class: 'ui-md-hr' })
    case 'br': return h('br')
    case 'strong': case 'b': return h('strong', null, kids())
    case 'em': case 'i': return h('em', null, kids())
    case 'del': case 's': return h('del', null, kids())
    default: return h(tag, null, kids())
  }
}

/* 整棵树：props 变化时随父组件重渲染 */
/* ---------- streaming ---------- */
/* seenBlocks / freshBlocks 都不能是响应式的：
   render 里读它们、render 里写它们 = 自己触发自己（Maximum recursive updates）。 */
const seenBlocks = new Set()
const freshBlocks = ref(new Set())
/* 预留高度：上一次渲染完成时容器的高度，避免逐块长出来时页面上下跳。 */
const reserveHeight = ref(0)
const rootEl = ref(null)

/* 顶层块的稳定标识：标签名 + 文本前 400 字（渲染前后一致） */
function blockKey(type, text) {
  return type + '|' + String(text || '').trim().slice(0, 400)
}

/* 在 watcher 里算「这一轮哪些块是新的」——不在 render 里改状态 */
watch(() => props.content, () => {
  if (!props.streaming) {
    freshBlocks.value = new Set()
    seenBlocks.clear()
    reserveHeight.value = 0
    return
  }
  const doc = new DOMParser().parseFromString(marked.parse(props.content || ''), 'text/html')
  const keys = new Set()
  const fresh = new Set()
  Array.from(doc.body.children).forEach(el => {
    const key = blockKey(el.tagName.toLowerCase(), el.textContent)
    keys.add(key)
    if (!seenBlocks.has(key)) fresh.add(key)
  })
  seenBlocks.clear()
  keys.forEach(k => seenBlocks.add(k))
  freshBlocks.value = fresh
}, { immediate: true })

/* 渲染完成后把最终高度缓存成 min-height（高度只增不减，不会抖） */
watch(freshBlocks, async () => {
  if (!props.streaming) return
  await nextTick()
  const el = rootEl.value
  if (el && el.offsetHeight > reserveHeight.value) reserveHeight.value = el.offsetHeight
})

/* 给新增的顶层块打 is-fresh（只读 freshBlocks，不写任何状态） */
function withStreaming(tree) {
  if (!props.streaming) return tree
  const out = []
  for (const child of tree) {
    if (child && child.type && child.props) {
      const key = blockKey(child.type, flatText(child.children))
      if (freshBlocks.value.has(key)) {
        out.push(h(child.type, {
          ...child.props,
          class: [child.props.class, 'ui-md-fresh', 'is-fresh-' + props.streamEffect].filter(Boolean).join(' ')
        }, child.children))
        continue
      }
    }
    out.push(child)
  }
  return out
}

/* 把 VNode 子树拍平成文本，用于算块标识 */
function flatText(children) {
  if (!Array.isArray(children)) return ''
  return children.map(c => {
    if (typeof c === 'string' || typeof c === 'number') return String(c)
    if (c && Array.isArray(c.children)) return flatText(c.children)
    return ''
  }).join('')
}

const Root = () => {
  if (!props.content || !props.content.trim()) return null
  seq = 0
  const doc = new DOMParser().parseFromString(marked.parse(props.content), 'text/html')
  const children = withStreaming(renderChildren(doc.body))
  const style = props.streaming && reserveHeight.value ? { minHeight: reserveHeight.value + 'px' } : undefined
  return h('div', { class: 'ui-md', ref: rootEl, style }, children)
}
</script>

<template>
  <Root />
</template>

<style scoped>
.ui-md { line-height: 1.7; font-size: var(--fs-body); color: var(--on-surface); min-width: 0; }
.ui-md-h { font-weight: var(--w-heading); letter-spacing: -.01em; line-height: 1.3; margin: 1.25em 0 .5em; }
.ui-md :first-child, .ui-md-h:first-child { margin-top: 0; }
.ui-md-h1 { font-size: var(--fs-title); }
.ui-md-h2 { font-size: calc(var(--fs-title) * .84); }
.ui-md-h3 { font-size: var(--fs-body); }
.ui-md-h4, .ui-md-h5, .ui-md-h6 { font-size: var(--fs-small); color: var(--on-surface-variant); }
.ui-md-p { margin: .55em 0; }
.ui-md-list { margin: .5em 0; padding-left: 1.4em; }
.ui-md-list li { margin: .3em 0; }
.ui-md-quote {
  margin: .8em 0;
  padding: 8px 14px;
  border-left: 3px solid var(--primary);
  background: var(--surface-container-low);
  border-radius: calc(10px * var(--radius-scale));
  color: var(--on-surface-variant);
}
.ui-md-pre {
  background: var(--surface-container-low);
  border-radius: calc(12px * var(--radius-scale));
  padding: 12px 14px;
  margin: .9em 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-small);
  line-height: 1.6;
}
.ui-md-code {
  font-family: var(--font-mono);
  font-size: .92em;
  background: var(--surface-container-high);
  border-radius: 5px;
  padding: 1px 5px;
}
.ui-md-pre .ui-md-code { background: none; padding: 0; border-radius: 0; }
/* 提及药丸：与正文同一视觉中轴（inline-flex + 基线对齐，不用负 margin 硬拉） */
.ui-md-mention { display: inline-flex; align-items: center; vertical-align: middle; margin: 0 1px; }
.ui-md-a { color: var(--primary); }

/* 代码块：语言图标 + 名称的头部条 */
.ui-md-codeblock {
  margin: .9em 0;
  border-radius: calc(12px * var(--radius-scale));
  background: var(--surface-container-low);
  overflow: hidden;
}
.ui-md-codeblock__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 0;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
}
.ui-md-codeblock__lang { text-transform: lowercase; letter-spacing: .02em; }
.ui-md-codeblock .ui-md-pre { margin: 0; background: none; padding: 8px 14px 12px; }
.ui-md-img { max-width: 100%; border-radius: calc(12px * var(--radius-scale)); }
.ui-md-table { width: 100%; border-collapse: collapse; font-size: var(--fs-small); }
.ui-md-table th, .ui-md-table td { padding: 7px 10px; text-align: left; }
.ui-md-table tr + tr th, .ui-md-table tr + tr td { border-top: var(--border-w) solid var(--outline-variant); }
.ui-md-hr { border: 0; border-top: var(--border-w) solid var(--outline-variant); margin: 1.4em 0; }

/* ---------- streaming：新增块进场 ---------- */
.ui-md-fresh.is-fresh-rise { animation: uiMdRise 460ms cubic-bezier(.34, 1.4, .64, 1) both; }
.ui-md-fresh.is-fresh-blur { animation: uiMdBlur 500ms cubic-bezier(.22, 1, .36, 1) both; }
.ui-md-fresh.is-fresh-fade { animation: uiMdFade 340ms cubic-bezier(.25, 1, .5, 1) both; }
@keyframes uiMdRise {
  from { opacity: 0; transform: translateY(.42em); filter: blur(.1em); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes uiMdBlur {
  from { opacity: 0; filter: blur(.22em); }
  to { opacity: 1; filter: blur(0); }
}
@keyframes uiMdFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ui-md-fresh.is-fresh-rise, .ui-md-fresh.is-fresh-blur, .ui-md-fresh.is-fresh-fade { animation-duration: .01ms !important; }
}
</style>
