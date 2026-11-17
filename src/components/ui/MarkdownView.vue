<script setup>
import { h, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import UiIcon from './UiIcon.vue'
import UiLink from './UiLink.vue'
import UiAvatarTag from './UiAvatarTag.vue'
import { getSpringConfig, motion } from '../../composables/useMotion'
import { normalizeIconName, ICON_EXPLICIT_RE, MENTION_RE } from '../../core/iconify'

/* ============================================================
   MarkdownView —— Markdown 渲染器
   · marked 解析 -> DOM 树 -> 逐节点渲染成 Vue 元素（不 v-html 原文，天然防注入）
   · 内联图标标记（icons 开启，默认开）：只认 ::pack:icon:: 显式标记；
     裸写法（pack:icon / pack/icon 等）不再渲染 —— 与路径 / URL 撞车率高。
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
  /* 流式 token 的进场方式：rise（上浮 + 模糊）/ blur（只模糊）/ fade（只透明） */
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
    /* 只认 ::pack:icon:: 显式标记：裸写法（pack:icon / pack/icon 等）与
       普通文本冲突率太高（路径、URL、版本号都会误渲染成图标）。 */
    parts = explode(parts, ICON_EXPLICIT_RE, m => ({ t: 'icon', name: m[1] }))
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
    /* agent 主体色（可选）：药丸底色会自动跟随它（AvatarTag 的主体色跟随） */
    agentColor: agent ? (p.color || undefined) : undefined,
    shape: agent ? undefined : (p.shape || 'circle'),
    size: props.tagSize,
    /* 文档内联 tag 的入场：头像弹出 + 标签左→右展开。
       vnode key 稳定（'inN' 按出现序），重渲染不会重播。 */
    reveal: true
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
/* ---------- streaming：词壳 = motion.span（上浮 + 模糊，逐 token 蹦出来） ----------
   方案：流式文本按空格拆成词（无空白的 CJK 每 3 字一组），每个词一个
   <motion.span class="stream-word">。词表按块缓存，帧间只比「词的前缀」：
   · 词壳 key 稳定（blockId + '.' + ti）-> Vue 节点复用，motion 组件实例
     不重建 -> 已入场词不重播（每个词只在挂载时播一次 initial -> animate）；
   · 新词挂载即从 initial（透明 + 上浮 + 模糊）弹向落定态，transition 走
     feedback 场景弹簧，同一批新增词按批次序号级联延迟，逐个蹦出来；
   · 词一旦成壳就永远是壳（不回并纯文本），
     动画绝不会被「下一帧结构变化」打断 —— 这就是不再闪现的关键。
   initial/animate 在模块级冻结（引用恒定），重渲染传新对象也不会让
   motion 重播；transition 按（effect, 级联步进）记忆化，同理。 */
const shownTokens = new Map()   /* blockId -> 上一帧的词表 */
const freshInfo = ref(new Map())  /* blockId -> { whole, stable } 本轮渲染所需 */
/* 预留高度：上一次渲染完成时容器的高度，避免逐块长出来时页面上下跳。 */
const reserveHeight = ref(0)
const rootEl = ref(null)

/* 各 effect 的初始态 / 落定态（模块级冻结，引用恒定）。
   位移量必须足够大才看得见：0.35em 在 14px 正文上只有 ~5px，弹簧前两帧
   就吃掉大半，配上 6px 模糊就只剩「凭空显影」的观感。取 ~0.9em（≈12px）
   让上浮成为可读的主体，模糊只作伴生。 */
const TOKEN_STATES = {
  rise: {
    initial: { opacity: 0, y: '0.9em', filter: 'blur(6px)' },
    animate: { opacity: 1, y: '0em', filter: 'blur(0px)' }
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: { opacity: 1, filter: 'blur(0px)' }
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  }
}
/* 词壳弹簧走 view 场景：比 feedback 柔和（calm 约 0.46s / 不过冲），
   12px 的上浮能铺开成可读的位移；同时自动跟随动效气质与
   prefers-reduced-motion（getSpringConfig 内部降级为瞬时）。 */
const tokenTransitions = new Map()
function tokenTransition(effect, batchIndex) {
  const step = Math.min(Math.max(batchIndex, 0), 24)
  const memoKey = effect + '|' + step
  let transition = tokenTransitions.get(memoKey)
  if (!transition) {
    transition = { ...getSpringConfig('view'), delay: step * 0.018 }
    tokenTransitions.set(memoKey, transition)
  }
  return transition
}

/* 块在文档里的稳定身份：标签名 + 同类序号（不含文本） */
function blockId(el, indexInType) {
  return el.tagName.toLowerCase() + '#' + indexInType
}

/* 分词：空格切开（空白本身也是 token，保证 join === 原文）；
   无空白的长段（中文整句）每 3 字一组，让 CJK 也有逐词节奏 */
function tokenize(text) {
  const raw = String(text || '').split(/(\s+)/)
  const out = []
  for (const piece of raw) {
    if (!piece) continue
    if (/^\s+$/.test(piece)) { out.push(piece); continue }
    const chars = Array.from(piece)
    if (chars.length > 6) {
      for (let i = 0; i < chars.length; i += 3) out.push(chars.slice(i, i + 3).join(''))
    } else out.push(piece)
  }
  return out
}

/* 两词表的最长公共前缀（token 级） */
function commonTokenPrefix(a, b) {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[i] === b[i]) i += 1
  return i
}

watch(() => props.content, () => {
  if (!props.streaming) {
    shownTokens.clear()
    freshInfo.value = new Map()
    reserveHeight.value = 0
    return
  }
  const doc = new DOMParser().parseFromString(marked.parse(props.content || ''), 'text/html')
  const next = new Map()
  const fresh = new Map()
  const typeCount = new Map()
  Array.from(doc.body.children).forEach(el => {
    const type = el.tagName.toLowerCase()
    const seq = typeCount.get(type) || 0
    typeCount.set(type, seq + 1)
    const id = blockId(el, seq)
    const tokens = tokenize(el.textContent || '')
    const prev = shownTokens.get(id)
    if (prev === undefined) {
      /* 整块第一次出现：整块都是新的，块级进场，内部不逐词 */
      fresh.set(id, { whole: true, stable: 0 })
    } else {
      const stable = commonTokenPrefix(prev, tokens)
      if (tokens.length > stable) fresh.set(id, { whole: false, stable })
    }
    next.set(id, tokens)
  })
  shownTokens.clear()
  next.forEach((v, k) => shownTokens.set(k, v))
  freshInfo.value = fresh
}, { immediate: true })

/* 渲染后：缓存高度做 min-height 预留（词壳入场由 motion 自驱，无须补类）。 */
watch(freshInfo, async () => {
  if (!props.streaming) return
  await nextTick()
  const el = rootEl.value
  if (!el) return
  const height = el.offsetHeight
  if (height > reserveHeight.value) {
    reserveHeight.value = height
  } else if (height < reserveHeight.value * 0.6) {
    /* 明显变短 = 新一轮流式从头开始：跟着缩，不占旧全文高度 */
    reserveHeight.value = height
  }
})

function withStreaming(tree) {
  if (!props.streaming) return tree
  const typeCount = new Map()
  return tree.map(child => {
    if (!child || !child.type || !child.props) return child
    const type = typeof child.type === 'string' ? child.type : ''
    if (!type) return child
    const seq = typeCount.get(type) || 0
    typeCount.set(type, seq + 1)
    const id = type + '#' + seq
    const tokens = shownTokens.get(id)
    if (!tokens || !tokens.length) return child
    /* 没有增量也要重建词壳：让旧帧的 span 结构在这一帧保持一致。
       整块第一次出现 = stable 0 = 全部词按批次级联蹦出。 */
    const info = freshInfo.value.get(id)
    const stable = info ? info.stable : tokens.length
    return h(child.type, { ...child.props }, wrapAllTokens(child.children, tokens, stable, id))
  })
}

/* 把块的 children 按词表整体 span 化：文本按 token 顺序消费，
   每个词一个 motion.span；批次序号 = ti - stable（稳定前缀内为 0，
   新增词按出现次序级联延迟）。递归进嵌套结构（strong / 链接 / 数组 children）。 */
function wrapAllTokens(children, tokens, stable, id) {
  let ti = 0
  function consume(text) {
    const out = []
    let chars = Array.from(text)
    while (ti < tokens.length) {
      const tokChars = Array.from(tokens[ti])
      if (chars.length < tokChars.length) break
      if (tokChars.some((ch, k) => ch !== chars[k])) break
      const tokenKey = id + '.' + ti
      const state = TOKEN_STATES[props.streamEffect] || TOKEN_STATES.rise
      /* motion.span 是组件：第三参数必须是 slot 函数，
         裸字符串会被当成 slots 对象（Vue 会告警「Non-function value
         encountered for default slot」，且每次都重建 vnode）。 */
      out.push(h(motion.span, {
        class: 'stream-word',
        key: tokenKey,
        initial: state.initial,
        animate: state.animate,
        transition: tokenTransition(props.streamEffect, ti - stable)
      }, { default: () => tokens[ti] }))
      chars = chars.slice(tokChars.length)
      ti += 1
    }
    if (chars.length) out.push(chars.join(''))
    return out
  }
  function walk(list) {
    const out = []
    for (const node of list) {
      if (typeof node === 'string' || typeof node === 'number') {
        out.push(...consume(String(node)))
      } else if (Array.isArray(node)) {
        out.push(walk(node))
      } else if (node && typeof node.children === 'string') {
        out.push(h(node.type, { ...node.props }, consume(node.children)))
      } else if (node && Array.isArray(node.children)) {
        out.push(h(node.type, { ...node.props, key: node.key }, walk(node.children)))
      } else {
        out.push(node)
      }
    }
    return out
  }
  if (!Array.isArray(children)) return children
  return walk(children)
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
  border-radius: calc(var(--r-10) * var(--radius-scale));
  color: var(--on-surface-variant);
}
.ui-md-pre {
  background: var(--surface-container-low);
  border-radius: calc(var(--r-12) * var(--radius-scale));
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
  border-radius: calc(var(--r-12) * var(--radius-scale));
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
.ui-md-img { max-width: 100%; border-radius: calc(var(--r-12) * var(--radius-scale)); }
.ui-md-table { width: 100%; border-collapse: collapse; font-size: var(--fs-small); }
.ui-md-table th, .ui-md-table td { padding: 7px 10px; text-align: left; }
.ui-md-table tr + tr th, .ui-md-table tr + tr td { border-top: var(--border-w) solid var(--outline-variant); }
.ui-md-hr { border: 0; border-top: var(--border-w) solid var(--outline-variant); margin: 1.4em 0; }

/* ---------- streaming：词壳（motion 驱动） ----------
   每个词一个 inline-block motion.span：inline 元素 transform 无效，必须 inline-block。
   透明度 / 位移 / 模糊全部由 motion 的 initial -> animate 驱动（feedback 弹簧 +
   批次级联延迟），CSS 不再持有初始态与过渡，避免双重驱动。 */
.stream-word {
  display: inline-block;
}

@media (prefers-reduced-motion: reduce) {
  .stream-word { transform: none; filter: none; }
}
</style>
