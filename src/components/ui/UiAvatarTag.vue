<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiAvatar from './UiAvatar.vue'
import UiAgentAvatar from './UiAgentAvatar.vue'
import { getSpringConfig, motion } from '../../composables/useMotion'

/* ============================================================
   AvatarTag（参考 Figma NameTag 5:52 / Frame 11）
   ------------------------------------------------------------
   · 药丸底色比组件盒高**上下各小 1px**（用 ::before 内缩绘制），
     头像与组件盒同高 —— 所以头像会超出药丸背景 1px，和设计稿一致。
   · 头像可以是任意形状遮罩的图片，也可以是任意 SVG 图标：
     图标模式不做任何遮罩 / 裁切，保留 SVG 原本形状。
   · shape 只作用于图片：circle / squircle / square / hexagon /
     diamond / blob；图标模式忽略 shape（无遮罩）。
   ============================================================ */

const props = defineProps({
  name: { type: String, default: '' },
  /* 图片地址：按 shape 裁切成不同形状 */
  src: { type: String, default: '' },
  /* 24x24（或自定义 viewBox）内的 SVG 内部标记；无遮罩直接显示 */
  icon: { type: String, default: '' },
  iconViewBox: { type: String, default: '0 0 24 24' },
  /* circle | squircle | square | hexagon | diamond | blob */
  shape: { type: String, default: 'circle' },
  /* sm | md | lg */
  size: { type: String, default: 'sm' },
  /* 品牌强调色：药丸底色用它的 10%，文字用它调暗后的颜色（参考 Frame 11 的 Guide） */
  accent: { type: String, default: '' },
  /* 头像本体渲染方式：true 时用 UiAgentAvatar（带眼睛的智能体头像），
     否则用标准 UiAvatar（src 图片 / name 首字母）；icon 模式仍走原始 SVG */
  agent: { type: Boolean, default: false },
  agentShape: { type: String, default: 'circle' },
  agentColor: { type: String, default: '' },
  agentState: { type: String, default: 'idle' },
  /* 入场动画：头像由小到大弹出，随后标签从左侧向右展开。
     Markdown 正文里第一次出现的 inline tag 用（不是每次重渲染都播）。 */
  reveal: { type: Boolean, default: false }
})

/* ---------- 入场：头像弹出 -> 标签左→右展开 ----------
   标签宽度是**实测**的（测量时临时放开宽度），所以展开会真实推开后面的
   文字；只做 clip-path 揭示的话占位不变，看起来会像「凭空出现」。
   顺序按需求分开：头像先弹（feedback 弹簧，脆），标签随后展开（view 弹簧，
   稍慢），延迟取头像行程的一小段，形成「先有头再吐字」的层次。 */
const labelEl = ref(null)
const labelWidth = ref(0)
const labelOpen = ref(false)
let labelRo = null

function measureLabel() {
  /* motion 组件的 ref 给的是**组件实例**，没有 style —— 必须取 $el */
  const el = labelEl.value?.$el || labelEl.value
  if (!el?.style) return false
  /* 量不到宽度 = 组件此刻不可见（keep-alive 缓存、display:none 的
     父容器里挂载），scrollWidth 恒为 0。不能把 0 当作展开宽度 ——
     否则标签永远停在 0px，文字整个消失。返回 false，等可见再量。 */
  const prev = el.style.maxWidth
  el.style.maxWidth = 'none'
  const w = Math.ceil(el.scrollWidth)
  el.style.maxWidth = prev
  if (!w) return false
  labelWidth.value = w
  return true
}

onMounted(() => {
  if (!props.reveal) return
  nextTick(() => {
    if (measureLabel()) {
      /* 头像弹到差不多满时再吐标签 */
      setTimeout(() => { labelOpen.value = true }, 110)
    } else {
      /* 父容器此刻不可见：用 ResizeObserver 等它有尺寸了再量再开 */
      const el = labelEl.value?.$el || labelEl.value
      if (el && typeof ResizeObserver !== 'undefined') {
        labelRo = new ResizeObserver(() => {
          if (measureLabel()) {
            if (labelRo) { labelRo.disconnect(); labelRo = null }
            labelOpen.value = true
          }
        })
        labelRo.observe(el)
      } else {
        /* 没有 RO 就退化为直接展开（max-width none 走 CSS） */
        labelOpen.value = true
      }
    }
  })
})

onBeforeUnmount(() => {
  if (labelRo) { labelRo.disconnect(); labelRo = null }
})

const headSize = computed(() => (props.size === 'md' ? 24 : props.size === 'lg' ? 30 : 18))

const initial = computed(() => (props.name || '?').trim().slice(0, 1).toUpperCase())

/* ---------- 头像主色 -> 药丸底色（默认开启，不可关闭） ----------
   三种头像各有主体色的来源：
   · agent：主体色就是 UiAgentAvatar 的 color（agentColor > accent > 默认紫），
     直接跟随，无须取色 —— 药丸永远和头像本体同色。
   · 图片：把图缩到 24×24 画到 canvas，按饱和度 / 亮度过滤掉近白近黑的像素，
     剩下的按「谁更鲜艳」加权求平均色。跨域图片污染 canvas 时静默失败。
   · 图标：把 SVG 标记包成 data URL 走同一取色管线；currentColor 的单色
     图标栅格化后是黑色，会被饱和度阈值滤掉 -> 自动退回 accent / 默认底色。
   显式 accent 在图片 / 图标模式仍是最高优先（品牌语义的刻意指定）；
   agent 模式里 accent 已参与本体色回退链，天然一致。 */
const pickedColor = ref('')

const AGENT_FALLBACK = '#7438ff'
/* agent 本体色：与 UiAgentAvatar 实际渲染的 fill 完全同源，二者永不脱节 */
const agentBodyColor = computed(() => props.agentColor || props.accent || AGENT_FALLBACK)

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h, s, l }
}

function extractDominant(src) {
  if (!src || typeof document === 'undefined') return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.decoding = 'async'
  img.onload = () => {
    try {
      const size = 24
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)
      let r = 0, g = 0, b = 0, weight = 0
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a < 128) continue
        const pr = data[i], pg = data[i + 1], pb = data[i + 2]
        const { s, l } = rgbToHsl(pr, pg, pb)
        /* 跳过近白 / 近黑 / 灰阶：它们不代表「品牌色」 */
        if (s < 0.18 || l < 0.12 || l > 0.94) continue
        const w = s * (1 - Math.abs(l - 0.5))
        r += pr * w
        g += pg * w
        b += pb * w
        weight += w
      }
      if (!weight) { pickedColor.value = ''; return }
      const toHex = v => Math.round(v / weight).toString(16).padStart(2, '0')
      pickedColor.value = '#' + toHex(r) + toHex(g) + toHex(b)
    } catch (error) {
      /* 跨域污染 / 无 CORS：放弃取色，保持 accent 或默认底色 */
      pickedColor.value = ''
    }
  }
  img.onerror = () => { pickedColor.value = '' }
  img.src = src
}

/* 图标栅格化取色：SVG 标记 -> data URL（同源无污染，canvas 可安全读取） */
function extractIconColor() {
  if (!props.icon || typeof document === 'undefined') return
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${props.iconViewBox}">${props.icon}</svg>`
  extractDominant('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
}

/* ---------- 背景自适应（对比度达标） ----------
   药丸底色是 accent 的 10% 半透明，文字是 accent 压暗版 —— 这套组合
   默认只保证「白/浅灰」背景下可读。放进橙色气泡、彩色卡片里时，
   半透明底色会混上宿主背景，文字对比度直接崩。

   做法：挂载后向上找宿主的**实际不透明背景色**（逐层合成 alpha），
   然后按 WCAG 相对亮度验两端对比度：
   · 药丸底（accent 10% 混背景）vs 宿主背景 —— 药丸「看得见」
   · 文字色 vs 药丸底 —— 文字「读得清」
   任一端 < 3:1 就换策略：文字改用黑 / 白里对比度更高的一端，
   药丸底色提高 accent 占比（10% -> 22%），把半透明变成实色感。 */

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function parseColor(str) {
  const s = String(str).trim()
  if (!s || s === 'transparent') return null
  const hex = hexToRgb(s)
  if (hex) return { ...hex, a: 1 }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    if (parts.length >= 3) return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
  }
  return null
}

function lerp(a, b, t) { return a + (b - a) * t }

function mix(c1, c2, t) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
    a: 1
  }
}

/* WCAG 相对亮度（sRGB 线性化） */
function luminance({ r, g, b }) {
  const lin = v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a, b) {
  const la = luminance(a), lb = luminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/* 向上找宿主背景：把每层半透明背景合成到最近的不透明层上 */
function detectHostBackground(el) {
  let node = el?.parentElement
  let over = null /* 半透明层累积的混色底 */
  while (node && node !== document.documentElement) {
    const bg = parseColor(getComputedStyle(node).backgroundColor)
    if (bg) {
      if (bg.a >= 1) {
        return over ? mix(bg, over, 0) && bg : bg
      }
      /* 半透明：先画这层颜色，再叠上更上层已累积的 over */
      const base = over ? mix(bg, over, over.a) : { r: bg.r, g: bg.g, b: bg.b, a: 1 }
      over = { ...base, a: bg.a + (over ? over.a * (1 - bg.a) : 0) }
      if (over.a >= 0.99) return { r: over.r, g: over.g, b: over.b, a: 1 }
    }
    node = node.parentElement
  }
  /* 顶层都没找到：按白底处理 */
  return { r: 255, g: 255, b: 255, a: 1 }
}

const hostBg = ref({ r: 255, g: 255, b: 255, a: 1 })
const adapted = ref(false)

function readapt() {
  const el = rootEl.value?.$el || rootEl.value
  if (!el) return
  hostBg.value = detectHostBackground(el)
  const accent = tagAccent.value ? parseColor(tagAccent.value) : null
  if (!accent) { adapted.value = false; return }

  /* 药丸底 = accent 10% 混宿主背景 */
  const pillOnHost = mix(hostBg.value, accent, 0.1)
  /* 文字 = accent 70% 混黑（与 CSS 的 70% on-surface 近似，
     直接按黑算更保守；对比度不够再切黑白） */
  const labelOnPill = mix(pillOnHost, { r: 0, g: 0, b: 0, a: 1 }, 0.3)

  const pillVisible = contrast(pillOnHost, hostBg.value)
  const textReadable = contrast(labelOnPill, pillOnHost)

  adapted.value = pillVisible < 3 || textReadable < 3
}

/* 药丸底 / 文字色：自适应模式由 CSS 变量接管 */
const pillStyle = computed(() => {
  if (!adapted.value) return undefined
  const accent = tagAccent.value
  const acc = parseColor(accent)
  if (!acc) return undefined
  /* 提高不透明度的药丸底：accent 22% 混宿主背景（近实色） */
  const pill = mix(hostBg.value, acc, 0.22)
  /* 文字：黑 / 白里对比度更高的一端 */
  const onBlack = contrast(pill, { r: 0, g: 0, b: 0, a: 1 })
  const onWhite = contrast(pill, { r: 255, g: 255, b: 255, a: 1 })
  const ink = onBlack >= onWhite ? '#111111' : '#ffffff'
  return {
    '--tag-accent': accent,
    '--tag-pill-bg': `rgb(${pill.r}, ${pill.g}, ${pill.b})`,
    '--tag-ink': ink
  }
})

const rootEl = ref(null)

/* 药丸底色：agent 跟随本体色；图片 / 图标 = 显式 accent 优先，否则取色结果 */
const tagAccent = computed(() => {
  if (props.agent) return agentBodyColor.value
  if (props.accent) return props.accent
  return pickedColor.value
})

onMounted(() => {
  if (props.src) extractDominant(props.src)
  else if (props.icon) extractIconColor()
  /* 背景自适应：等布局稳定后探测宿主背景（keep-alive / 字体加载
     会改变上层背景，所以 rAF 两帧后再量） */
  if (props.accent || props.agentColor || props.agent) {
    nextTick(() => requestAnimationFrame(() => requestAnimationFrame(readapt)))
  }
})
watch(() => props.src, value => {
  pickedColor.value = ''
  if (value) extractDominant(value)
  else if (props.icon) extractIconColor()
})
watch(() => [props.icon, props.iconViewBox], () => {
  if (props.agent || props.src) return
  pickedColor.value = ''
  extractIconColor()
})
/* accent / 本体色变化时重新评估对比度 */
watch(() => [props.accent, props.agentColor, props.agent], () => {
  nextTick(() => requestAnimationFrame(readapt))
})
</script>

<template>
  <span
    ref="rootEl"
    class="ui-avatar-tag"
    :class="['ui-avatar-tag--' + size, { 'has-accent': !!tagAccent, 'is-reveal': reveal, 'is-adapted': adapted }]"
    :style="pillStyle || (tagAccent ? { '--tag-accent': tagAccent } : undefined)"
  >
    <motion.span
      class="ui-avatar-tag__avatar"
      :class="[
        agent ? 'is-agent' : 'is-' + shape,
        { 'is-icon': !!icon && !agent, 'is-image': !!src }
      ]"
      :initial="reveal ? { scale: 0 } : false"
      :animate="{ scale: 1 }"
      :transition="getSpringConfig('feedback')"
    >
      <slot name="avatar">
        <UiAgentAvatar
          v-if="agent"
          class="ui-avatar-tag__agent"
          :shape="agentShape"
          :color="agentBodyColor"
          :size="headSize"
          :state="agentState"
          gaze="none"
        />
        <svg
          v-else-if="icon"
          class="ui-avatar-tag__glyph"
          :viewBox="iconViewBox"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          v-html="icon"
        ></svg>
        <UiAvatar v-else-if="src" class="ui-avatar-tag__std" :src="src" :name="name" />
        <UiAvatar v-else class="ui-avatar-tag__std" :name="name || '?'" />
      </slot>
    </motion.span>
    <motion.span
      ref="labelEl"
      class="ui-avatar-tag__label"
      :initial="reveal ? { maxWidth: 0, opacity: 0 } : false"
      :animate="reveal
        ? { maxWidth: labelOpen ? labelWidth + 'px' : 0, opacity: labelOpen ? 1 : 0 }
        : { maxWidth: 'none', opacity: 1 }"
      :transition="getSpringConfig('view')"
    ><slot>{{ name }}</slot></motion.span>
  </span>
</template>

<style scoped>
.ui-avatar-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 8px 0 20px;
  border-radius: 999px;
  color: var(--on-surface);
  font-weight: var(--w-strong);
  white-space: nowrap;
  isolation: isolate;
}
/* 药丸底色：上下各内缩 1px。头像和组件盒同高，于是头像正好探出底色 1px。 */
.ui-avatar-tag::before {
  content: '';
  position: absolute;
  inset: 1px 0;
  z-index: 0;
  border-radius: 999px;
  background: color-mix(in oklab, var(--tag-accent, var(--on-surface)) 10%, transparent);
  pointer-events: none;
}
.ui-avatar-tag--sm { height: 18px; font-size: var(--fs-micro); letter-spacing: .04em; }
.ui-avatar-tag--md { height: 24px; padding: 0 9px 0 26px; font-size: var(--fs-tiny); }
.ui-avatar-tag--lg { height: 30px; padding: 0 11px 0 32px; font-size: var(--fs-small); }

/* 头像：左缘比药丸再探出 1px；圆角环画在头像内侧，和设计稿一致。
   垂直定位用 top 而**不是** translateY —— reveal 时 motion 要用 transform
   做 scale，translateY 会被覆盖（头像会跳到底边）。
   transform-origin 定在左中：弹出的圆心贴着药丸左缘。 */
.ui-avatar-tag__avatar {
  position: absolute;
  left: -1px;
  top: -1px;
  z-index: 2;
  width: 18px;
  height: 18px;
  transform-origin: left center;
  overflow: hidden;
  background: var(--surface-container-highest);
}
.ui-avatar-tag--md .ui-avatar-tag__avatar { width: 24px; height: 24px; }
.ui-avatar-tag--lg .ui-avatar-tag__avatar { width: 30px; height: 30px; }

/* 标签：reveal 用 max-width 展开（真实推开后续文字），非 reveal 不裁剪 */
.ui-avatar-tag__label {
  position: relative;
  z-index: 1;
  display: inline-block;
  vertical-align: middle;
}
.ui-avatar-tag.is-reveal .ui-avatar-tag__label {
  overflow: hidden;
  white-space: nowrap;
}

.ui-avatar-tag__avatar img,
.ui-avatar-tag__glyph,
.ui-avatar-tag__initial { display: block; width: 100%; height: 100%; object-fit: cover; }
.ui-avatar-tag__glyph { overflow: visible; }
.ui-avatar-tag__initial {
  display: grid;
  place-items: center;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font-size: 10px;
  font-weight: var(--w-strong);
}

/* 智能体头像：剪影（三角 / 星形…）有自己的外形，**不能裁成圆形、也不垫底**，
   否则头像会变成一颗圆底里的三角。只有图片模式才按 shape 裁切。 */
.ui-avatar-tag__avatar.is-agent {
  border-radius: 0;
  overflow: visible;
  background: transparent;
}

/* 图片：不同遮罩形状 */
.ui-avatar-tag__avatar.is-circle { border-radius: 50%; }
.ui-avatar-tag__avatar.is-squircle { border-radius: 36%; }
.ui-avatar-tag__avatar.is-square { border-radius: 18%; }
.ui-avatar-tag__avatar.is-hexagon {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
}
.ui-avatar-tag__avatar.is-diamond {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.ui-avatar-tag__avatar.is-blob {
  border-radius: 0;
  overflow: visible;
  clip-path: polygon(50% 2%, 72% 7%, 88% 22%, 98% 45%, 92% 70%, 74% 88%, 50% 98%, 26% 88%, 8% 70%, 2% 45%, 12% 22%, 28% 7%);
}

/* 标准头像 / 智能体头像填满头盒：UiAvatar 的固定尺寸在盒内强制铺满 */
.ui-avatar-tag__avatar :deep(.ui-avatar) { width: 100%; height: 100%; background: transparent; font-size: 9px; }
.ui-avatar-tag--md .ui-avatar-tag__avatar :deep(.ui-avatar) { font-size: 11px; }
.ui-avatar-tag--lg .ui-avatar-tag__avatar :deep(.ui-avatar) { font-size: 13px; }
/* 智能体头像：铺在头盒里，overflow 放开让眼睛 / 呼吸探出去 */
.ui-avatar-tag__avatar.is-agent { background: transparent; overflow: visible; }
.ui-avatar-tag__agent { position: absolute; inset: 0; }

/* 图标：无遮罩 —— 背景、描边、裁切全部去掉，保留 SVG 自身形状 */
.ui-avatar-tag__avatar.is-icon {
  background: transparent;
  /* 图标模式不要边框占位：SVG 要铺满 18px 头像盒，才能和设计一样探出药丸 1px。 */
  border: 0;
  overflow: visible;
  border-radius: 0;
  clip-path: none;
}
.ui-avatar-tag__avatar.is-icon .ui-avatar-tag__glyph { overflow: visible; }

/* 品牌色：底色取 accent 的 10%，文字往 on-surface 方向压暗 / 提亮，深色主题也可读。 */
.ui-avatar-tag.has-accent {
  color: color-mix(in oklab, var(--tag-accent) 70%, var(--on-surface));
}
/* 背景自适应（is-adapted，由 JS 对比度验算后开启）：
   药丸底换成近实色的混色（--tag-pill-bg），文字用对比度更高的黑或白
   （--tag-ink）。半透明底色混上彩色宿主背景后，原来的 10% 底 + 压暗
   文字会双双崩掉 —— 这里接管两端的颜色。 */
.ui-avatar-tag.has-accent.is-adapted {
  color: var(--tag-ink, inherit);
}
.ui-avatar-tag.has-accent.is-adapted::before {
  background: var(--tag-pill-bg, var(--tag-accent));
}

@media (prefers-reduced-motion: reduce) {
  .ui-avatar-tag__avatar { transition: none; }
}
</style>
