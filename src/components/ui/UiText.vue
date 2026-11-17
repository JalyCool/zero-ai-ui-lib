<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { graphemes, commonPrefixLength, splitStreamChange } from '../../core/streaming'

const props = defineProps({
  /* type = 打字机；shiny = 掠光；gradient = 流动渐变 */
  variant: { type: String, default: 'type' },
  text: { type: String, default: '' },
  /* ---- type：节奏与光标 ---- */
  cps: { type: Number, default: 22 },
  cursor: { type: Boolean, default: true },
  /* bar | block | underscore | character */
  cursorStyle: { type: String, default: 'bar' },
  /* 光标一次闪烁的半周期（ms） */
  cursorBlink: { type: Number, default: 520 },
  /* 每个新字符的进入方式：blur（透明度 + 模糊）/ fade / rise */
  typeEffect: { type: String, default: 'blur' },
  /* 打完循环：先删再打 */
  loop: { type: Boolean, default: false },
  /* 删除速度（字符/秒） */
  deleteCps: { type: Number, default: 40 },
  /* 打完后停顿（ms） */
  pause: { type: Number, default: 900 },
  startDelay: { type: Number, default: 0 },
  /* 流式更新：内容变成「上一次的延长」时只给新增部分播进场，不重播整段。
     关闭（默认）时行为与以前完全一致。 */
  streaming: { type: Boolean, default: false },
  /* 流式新增片段的进场方式：rise / blur / fade */
  streamEffect: { type: String, default: 'rise' },
  /* 打字机是否提前占位：auto = 没有光标时占位（有光标时高度变化更自然，不必占） */
  reserve: { type: String, default: 'auto' },
  /* ---- shiny ---- */
  sheen: { type: String, default: 'soft' },
  sweep: { type: Number, default: 2200 },
  /* ---- gradient ---- */
  gradient: { type: String, default: 'sweep' },
  colors: { type: Array, default: () => ['#5b8def', '#8b5cf6', '#22d3ee', '#5b8def'] }
})

const emit = defineEmits(['done', 'tick'])

/* ============================================================
   文本动效
   · type：逐字符推进；**每个新字符单独入场**（透明度 + 模糊，
     可选 fade / rise），不是整段文字一起淡入 —— 这是 react-bits
     TextType 的做法：一个字符一个动画，视觉上才有「一个字一个字
     落下来」的感觉。光标四档：bar / block / underscore / character。
     loop 时先逐字删除再重打，而不是瞬间清空。
   · shiny / gradient：同一套 background-clip 裁字，只是流动维度不同。
   ============================================================ */

const source = computed(() => props.text)

/* ---------- streaming：只给增量播进场 ---------- */
/* 记住上一段内容，算出这次的「稳定前缀」长度；前缀部分不重播动画。 */
const stablePrefix = ref(0)
let lastText = null
watch(source, next => {
  if (!props.streaming) { stablePrefix.value = 0; lastText = null; return }
  const text = next || ''
  stablePrefix.value = lastText === null ? 0 : commonPrefixLength(lastText, text)
  lastText = text
}, { immediate: true })

/* 流式片段：前缀之后的文字按「段落 + 增量」切，增量整体播一次 rise */
const streamParts = computed(() => {
  if (!props.streaming) return null
  const text = source.value || ''
  const g = graphemes(text)
  const cut = Math.min(stablePrefix.value, g.length)
  return {
    stable: g.slice(0, cut).join(''),
    fresh: g.slice(cut).join('')
  }
})

/* ---------- type：逐字符 ---------- */
const count = ref(0)
const deleting = ref(false)
let timer = 0
let pauseTimer = 0

function schedule(delay) {
  clearTimeout(timer)
  timer = setTimeout(step, Math.max(8, delay))
}

function step() {
  const length = source.value.length
  const typing = !deleting.value
  const speed = typing ? 1000 / Math.max(1, props.cps) : 1000 / Math.max(1, props.deleteCps)

  if (typing) {
    if (count.value < length) {
      count.value += 1
      emit('tick', source.value.slice(0, count.value))
      schedule(speed)
      return
    }
    /* 打完了 */
    emit('done')
    if (!props.loop) return
    pauseTimer = setTimeout(() => {
      deleting.value = true
      schedule(speed)
    }, Math.max(200, props.pause))
    return
  }

  /* 删除阶段 */
  if (count.value > 0) {
    count.value -= 1
    emit('tick', source.value.slice(0, count.value))
    schedule(speed)
    return
  }
  deleting.value = false
  pauseTimer = setTimeout(() => schedule(speed), 260)
}

function restart() {
  clearTimeout(timer)
  clearTimeout(pauseTimer)
  count.value = 0
  deleting.value = false
  if (props.variant !== 'type') { count.value = source.value.length; return }
  schedule(Math.max(0, props.startDelay))
}

watch(() => [source.value, props.cps, props.deleteCps, props.loop, props.pause, props.startDelay, props.variant], restart, { immediate: true })

const chars = computed(() => {
  if (props.variant !== 'type') return []
  return Array.from(source.value.slice(0, count.value))
})
const showCursor = computed(() => props.variant === 'type' && props.cursor)

/* 打字机占位：用一层不可见的「完整文本」把最终尺寸撑开，
   逐字进场时容器高度不跳、下方内容不被顶得上下抖。 */
const reserveSpace = computed(() => {
  if (props.variant !== 'type') return false
  if (props.reserve === 'on') return true
  if (props.reserve === 'off') return false
  return !props.cursor
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(pauseTimer)
})

/* ---------- shiny / gradient ---------- */
const gradientCss = computed(() => {
  if (props.variant === 'shiny') {
    const base = 'var(--on-surface)'
    if (props.sheen === 'chrome') return 'linear-gradient(105deg, #9fb3d1, #f2f7ff, #7dd3fc, #f2f7ff, #9fb3d1)'
    return 'linear-gradient(105deg, ' + base + ' 0%, ' + base + ' 38%, rgba(255,255,255,.85) 50%, ' + base + ' 62%, ' + base + ' 100%)'
  }
  const list = props.colors.length >= 2 ? props.colors : ['#5b8def', '#8b5cf6']
  if (props.gradient === 'conic') return 'conic-gradient(from var(--ui-text-angle, 0deg), ' + list.join(', ') + ')'
  if (props.gradient === 'mesh') {
    return list.map((color, i) => 'radial-gradient(60% 160% at ' + (20 + i * 25) + '% 50%, ' + color + ' 0%, transparent 62%)').join(', ')
  }
  return 'linear-gradient(100deg, ' + list.join(', ') + ')'
})

const styleVars = computed(() => ({
  backgroundImage: gradientCss.value,
  backgroundSize: props.variant === 'shiny' ? '260% 100%' : props.gradient === 'mesh' ? '220% 220%' : '220% 100%',
  '--ui-text-sweep': props.sweep + 'ms',
  '--caret-blink': props.cursorBlink + 'ms'
}))

const display = computed(() => (props.variant === 'type' ? '' : (source.value || '')))
</script>

<template>
  <span
    class="ui-text"
    :class="[
      `is-${variant}`,
      variant === 'type' ? `is-effect-${typeEffect}` : '',
      variant === 'gradient' ? `is-gradient-${gradient}` : '',
      variant === 'shiny' ? `is-sheen-${sheen}` : ''
    ]"
    :style="variant === 'type' ? { '--caret-blink': cursorBlink + 'ms' } : styleVars"
  >
    <template v-if="variant === 'type'">
      <!-- 占位层：不可见的完整文本，提前把最终高度撑开（光标关掉时默认开启） -->
      <span v-if="reserveSpace" class="ui-text__ghost" aria-hidden="true">{{ source }}</span>
      <!-- 逐字层：占位模式下绝对定位盖在占位层上，不再影响布局尺寸 -->
      <span class="ui-text__typed" :class="{ 'is-overlay': reserveSpace }">
        <span
          v-for="(char, index) in chars"
          :key="index"
          class="ui-text__ch"
        >{{ char === ' ' ? '\u00a0' : char }}</span>
        <span
          v-if="showCursor"
          class="ui-text__caret"
          :class="`is-${cursorStyle}`"
          :style="{ animationDuration: cursorBlink * 2 + 'ms' }"
          aria-hidden="true"
        >{{ cursorStyle === 'character' ? '|' : '' }}</span>
      </span>
      <span class="ui-text__sr">{{ source }}</span>
    </template>
    <template v-else>
      <!-- streaming：稳定段原样输出，新增段单独播一次进场（rise / blur / fade） -->
      <template v-if="streamParts">
        <span class="ui-text__stable">{{ streamParts.stable }}</span
        ><span
          v-if="streamParts.fresh"
          :key="streamParts.stable.length + ':' + streamParts.fresh"
          class="ui-text__chunk"
          :class="'is-chunk-' + streamEffect"
        >{{ streamParts.fresh }}</span>
      </template>
      <slot v-else>{{ display }}</slot>
    </template>
  </span>
</template>

<style scoped>
.ui-text { display: inline-block; max-width: 100%; }

/* ---------- type ---------- */
.ui-text.is-type { white-space: pre-wrap; position: relative; }
/* 占位层：撑开最终尺寸但不显示、不响应 */
.ui-text__ghost { visibility: hidden; pointer-events: none; user-select: none; }
.ui-text__typed { display: inline; white-space: pre-wrap; }
.ui-text__typed.is-overlay { position: absolute; left: 0; top: 0; right: 0; }
.ui-text__ch { display: inline-block; white-space: pre-wrap; will-change: opacity, filter, transform; }

/* 每个新字符进场：透明度 + 模糊渐变（默认）；另有 fade / rise 两档。 */
/* ---------- streaming 增量段 ---------- */
.ui-text__stable { white-space: pre-wrap; }
.ui-text__chunk { display: inline; white-space: pre-wrap; will-change: opacity, filter, transform; }
.ui-text__chunk.is-chunk-rise { animation: uiTextRise 480ms cubic-bezier(.34, 1.4, .64, 1) both; }
.ui-text__chunk.is-chunk-blur { animation: uiTextBlur 520ms cubic-bezier(.22, 1, .36, 1) both; }
.ui-text__chunk.is-chunk-fade { animation: uiTextFade 360ms cubic-bezier(.25, 1, .5, 1) both; }

.ui-text.is-effect-blur .ui-text__ch { animation: uiTextBlur 520ms cubic-bezier(.22, 1, .36, 1) both; }
.ui-text.is-effect-fade .ui-text__ch { animation: uiTextFade 360ms cubic-bezier(.25, 1, .5, 1) both; }
.ui-text.is-effect-rise .ui-text__ch { animation: uiTextRise 480ms cubic-bezier(.34, 1.4, .64, 1) both; }

@keyframes uiTextBlur {
  from { opacity: 0; filter: blur(.3em); }
  to { opacity: 1; filter: blur(0); }
}
@keyframes uiTextFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes uiTextRise {
  from { opacity: 0; transform: translateY(.55em); filter: blur(.16em); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

/* 光标四档：bar / block / underscore / character。 */
.ui-text__caret {
  display: inline-block;
  margin-left: .06em;
  vertical-align: -.14em;
  animation-name: uiTextCaretBlink;
  animation-timing-function: steps(1, end);
  animation-iteration-count: infinite;
}
.ui-text__caret.is-bar { width: .1em; height: 1.05em; background: currentColor; border-radius: 1px; }
.ui-text__caret.is-block { width: .52em; height: 1.05em; background: currentColor; border-radius: 2px; opacity: .62; }
.ui-text__caret.is-underscore { width: .55em; height: .1em; vertical-align: -.06em; background: currentColor; border-radius: 1px; }
.ui-text__caret.is-character { width: auto; height: auto; font-weight: var(--w-body); color: currentColor; }
@keyframes uiTextCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

/* 屏幕阅读器读完整句子，避免逐字播报。 */
.ui-text__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---------- shiny / gradient ---------- */
.ui-text.is-shiny,
.ui-text.is-gradient {
  background-repeat: repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .ui-text.is-shiny,
  .ui-text.is-gradient { color: var(--on-surface); -webkit-text-fill-color: currentColor; }
}
.ui-text.is-shiny { animation: uiTextSweep var(--ui-text-sweep, 2200ms) linear infinite; }
.ui-text.is-shiny.is-sheen-chrome { filter: saturate(1.15) contrast(1.05); }
.ui-text.is-gradient-sweep { animation: uiTextSweep var(--ui-text-sweep, 2200ms) linear infinite; }
.ui-text.is-gradient-mesh { animation: uiTextMesh calc(var(--ui-text-sweep, 2200ms) * 2.4) ease-in-out infinite alternate; }
.ui-text.is-gradient-conic { animation: uiTextConic calc(var(--ui-text-sweep, 2200ms) * 1.6) ease-in-out infinite alternate; }

@keyframes uiTextSweep { from { background-position: 120% 50%; } to { background-position: -20% 50%; } }
@keyframes uiTextMesh { from { background-position: 0% 40%; } to { background-position: 100% 60%; } }
@keyframes uiTextConic { from { --ui-text-angle: 0deg; } to { --ui-text-angle: 360deg; } }
@property --ui-text-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

@media (prefers-reduced-motion: reduce) {
  .ui-text__ch { animation: none !important; }
  .ui-text__caret { animation: none; opacity: 1; }
  .ui-text.is-shiny,
  .ui-text.is-gradient-sweep,
  .ui-text.is-gradient-mesh,
  .ui-text.is-gradient-conic { animation: none; background-position: 50% 50%; }
}
</style>
