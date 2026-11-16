<script setup>
import { h } from 'vue'
import { marked } from 'marked'
import UiIcon from './UiIcon.vue'
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
  tagSize: { type: String, default: 'sm' }
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
      return h(UiAvatarTag, { ...mentionProps(part.name), key, style: 'vertical-align:-0.35em; margin: 0 2px;' })
    }
    return part.v
  })
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
    case 'pre': return h('pre', { class: 'ui-md-pre' }, h('code', { class: 'ui-md-code' }, node.textContent))
    case 'code': return h('code', { class: 'ui-md-code' }, node.textContent)
    case 'a': {
      const href = node.getAttribute('href') || ''
      const inner = renderChildren(node)
      if (!SAFE_HREF.test(href)) return h('span', { class: 'ui-md-a' }, inner)
      return h('a', { class: 'ui-md-a', href, target: '_blank', rel: 'noopener noreferrer nofollow' }, inner)
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
const Root = () => {
  if (!props.content || !props.content.trim()) return null
  seq = 0
  const doc = new DOMParser().parseFromString(marked.parse(props.content), 'text/html')
  return h('div', { class: 'ui-md' }, renderChildren(doc.body))
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
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fs-small);
  line-height: 1.6;
}
.ui-md-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .92em;
  background: var(--surface-container-high);
  border-radius: 5px;
  padding: 1px 5px;
}
.ui-md-pre .ui-md-code { background: none; padding: 0; border-radius: 0; }
.ui-md-a { color: var(--primary); text-decoration: none; }
.ui-md-a:hover { text-decoration: underline; }
.ui-md-img { max-width: 100%; border-radius: calc(12px * var(--radius-scale)); }
.ui-md-table { width: 100%; border-collapse: collapse; font-size: var(--fs-small); }
.ui-md-table th, .ui-md-table td { padding: 7px 10px; text-align: left; }
.ui-md-table tr + tr th, .ui-md-table tr + tr td { border-top: var(--border-w) solid var(--outline-variant); }
.ui-md-hr { border: 0; border-top: var(--border-w) solid var(--outline-variant); margin: 1.4em 0; }
</style>
