<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* type = 打字机；shiny = 掠光；gradient = 流动渐变 */
  variant: { type: String, default: 'type' },
  /* 文本；也可以直接用默认插槽 */
  text: { type: String, default: '' },
  /* ---- type：打字节奏 ---- */
  /* 每秒打出的字符数；越小越慢 */
  cps: { type: Number, default: 22 },
  /* 光标 */
  cursor: { type: Boolean, default: true },
  /* 打完从头再来 */
  loop: { type: Boolean, default: false },
  /* 开始前的等待（ms） */
  startDelay: { type: Number, default: 0 },
  /* ---- shiny：掠光 ---- */
  /* soft = 柔和光带；chrome = 带冷色高光的金属反射 */
  sheen: { type: String, default: 'soft' },
  /* 光带扫过一次的时长（ms） */
  sweep: { type: Number, default: 2200 },
  /* ---- gradient：流动渐变 ---- */
  /* sweep = 横向扫过；mesh = 多点缓慢漂移；conic = 摆动的锥形扇面 */
  gradient: { type: String, default: 'sweep' },
  /* 渐变色列表 */
  colors: { type: Array, default: () => ['#5b8def', '#8b5cf6', '#22d3ee', '#5b8def'] }
})

const emit = defineEmits(['done', 'tick'])

/* ============================================================
   文本动效包装器
   · type：逐字符推进，节奏由 cps 换算成毫秒；光标独立闪烁，
     打完（或 loop 时从头）再继续；
   · shiny：整块文字裁成渐变，光带靠 background-position 扫过；
   · gradient：三种流动方式共用同一套 background-clip 手法，
     只是动画的维度不同（横向 / 多点 / 锥形角度）。
   三者都只是「视觉层」，不改变排版尺寸。
   ============================================================ */

const source = computed(() => props.text)

/* ---------- type ---------- */
const typed = ref('')
let timer = 0
let caretTimer = 0
const caretOn = ref(true)

function resetCaretBlink() {
  clearInterval(caretTimer)
  if (!props.cursor) return
  caretOn.value = true
  caretTimer = setInterval(() => { caretOn.value = !caretOn.value }, 520)
}

function type(restart = false) {
  clearTimeout(timer)
  if (restart) typed.value = ''
  if (props.variant !== 'type') { typed.value = source.value; return }
  const delay = typed.value ? Math.max(16, 1000 / Math.max(1, props.cps)) : Math.max(0, props.startDelay)
  timer = setTimeout(() => {
    if (typed.value.length < source.value.length) {
      typed.value = source.value.slice(0, typed.value.length + 1)
      emit('tick', typed.value)
      type()
    } else if (props.loop && source.value) {
      timer = setTimeout(() => type(true), 1200)
    } else {
      emit('done')
    }
  }, delay)
}

watch(() => [source.value, props.cps, props.startDelay, props.variant, props.loop], () => type(true), { immediate: true })
watch(() => props.cursor, resetCaretBlink, { immediate: true })
onBeforeUnmount(() => { clearTimeout(timer); clearInterval(caretTimer) })

/* ---------- shiny / gradient ---------- */
const gradientCss = computed(() => {
  if (props.variant === 'shiny') {
    const base = 'var(--on-surface)'
    const colors = props.sheen === 'chrome'
      ? ['#9fb3d1', '#f2f7ff', '#7dd3fc', '#f2f7ff', '#9fb3d1']
      : ['rgba(255,255,255,0)', 'rgba(255,255,255,.85)', 'rgba(255,255,255,0)']
    if (props.sheen === 'chrome') {
      return `linear-gradient(105deg, ${colors.join(', ')})`
    }
    /* 柔和光带：本体用当前文字色，光带叠加一层高光。 */
    return `linear-gradient(105deg, ${base} 0%,
      ${base} 38%, ${colors[1]} 50%, ${base} 62%, ${base} 100%)`
  }
  const list = props.colors.length >= 2 ? props.colors : ['#5b8def', '#8b5cf6']
  if (props.gradient === 'conic') {
    return `conic-gradient(from var(--ui-text-angle, 0deg), ${list.join(', ')})`
  }
  if (props.gradient === 'mesh') {
    /* 多点径向叠加：位置各自漂移，视觉上像油膜在流动。 */
    const stops = list.map((color, i) => `radial-gradient(60% 160% at ${20 + i * 25}% 50%, ${color} 0%, transparent 62%)`)
    return stops.join(', ')
  }
  return `linear-gradient(100deg, ${list.join(', ')})`
})

const styleVars = computed(() => ({
  backgroundImage: gradientCss.value,
  backgroundSize: props.variant === 'shiny' ? '260% 100%'
    : props.gradient === 'mesh' ? '220% 220%'
    : props.gradient === 'conic' ? '100% 100%'
    : '220% 100%',
  '--ui-text-sweep': props.sweep + 'ms'
}))

const display = computed(() => (props.variant === 'type' ? typed.value : (source.value || '')))
</script>

<template>
  <span
    class="ui-text"
    :class="[`is-${variant}`, variant === 'gradient' ? `is-gradient-${gradient}` : '', variant === 'shiny' ? `is-sheen-${sheen}` : '']"
    :style="variant === 'type' ? undefined : styleVars"
  >
    <template v-if="variant === 'type'">
      <span class="ui-text__typed">{{ display }}</span>
      <span v-if="cursor" class="ui-text__caret" :class="{ 'is-on': caretOn }" aria-hidden="true"></span>
      <span class="ui-text__sr">{{ source }}</span>
    </template>
    <template v-else>
      <slot>{{ display }}</slot>
    </template>
  </span>
</template>

<style scoped>
.ui-text { display: inline-block; max-width: 100%; }

/* ---------- type ---------- */
.ui-text.is-type { white-space: pre-wrap; }
.ui-text__typed { white-space: pre-wrap; }
.ui-text__caret {
  display: inline-block;
  width: .08em;
  height: 1.05em;
  margin-left: .06em;
  vertical-align: -.16em;
  background: currentColor;
  border-radius: 1px;
  opacity: 0;
  transition: opacity var(--t-fade);
}
.ui-text__caret.is-on { opacity: 1; }
/* 屏幕阅读器读到完整句子，避免逐字播报。 */
.ui-text__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---------- shiny / gradient：共用的裁字渐变 ---------- */
.ui-text.is-shiny,
.ui-text.is-gradient {
  background-repeat: repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  /* 兜底：不支持 background-clip:text 时退回普通文字色。 */
  background-blend-mode: normal;
}
@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .ui-text.is-shiny,
  .ui-text.is-gradient { color: var(--on-surface); -webkit-text-fill-color: currentColor; }
}

.ui-text.is-shiny { animation: uiTextSweep var(--ui-text-sweep, 2200ms) linear infinite; }
.ui-text.is-shiny.is-sheen-chrome { filter: saturate(1.15) contrast(1.05); }

.ui-text.is-gradient-sweep { animation: uiTextSweep var(--ui-text-sweep, 2200ms) linear infinite; }
.ui-text.is-gradient-mesh { animation: uiTextMesh calc(var(--ui-text-sweep, 2200ms) * 2.4) ease-in-out infinite alternate; }
.ui-text.is-gradient-conic {
  /* conic 渐变的角度需要注册成可插值变量；不支持时退回 sweep。 */
  animation: uiTextConic calc(var(--ui-text-sweep, 2200ms) * 1.6) ease-in-out infinite alternate;
}

@keyframes uiTextSweep {
  from { background-position: 120% 50%; }
  to { background-position: -20% 50%; }
}
@keyframes uiTextMesh {
  from { background-position: 0% 40%; }
  to { background-position: 100% 60%; }
}
@keyframes uiTextConic {
  from { --ui-text-angle: 0deg; }
  to { --ui-text-angle: 360deg; }
}
/* 让 conic 角度真的能插值（Chrome 支持 @property；不支持则停在静态渐变）。 */
@property --ui-text-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@media (prefers-reduced-motion: reduce) {
  .ui-text.is-shiny,
  .ui-text.is-gradient-sweep,
  .ui-text.is-gradient-mesh,
  .ui-text.is-gradient-conic { animation: none; background-position: 50% 50%; }
}
</style>
