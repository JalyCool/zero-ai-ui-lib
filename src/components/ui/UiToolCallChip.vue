<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  detail: { type: String, default: '' },
  /* idle | running | done | error */
  status: { type: String, default: 'running' },
  /* 预计耗时（秒）：填充按它线性走 */
  expected: { type: Number, default: 2.4 },
  showTime: { type: Boolean, default: true }
})

const emit = defineEmits(['elapsed'])

/* ============================================================
   工具调用胶囊（按 react-bits CallChip 手法移植）
   · 填充条用 scaleX 跟计时走，transition 时长恰好等于 expected，
     所以它是「按真实时间线性擦过」，不是自己瞎跑；
   · 状态切换走 clip-path 擦洗（wash）：done 从主色洗成绿、error 洗成红；
   · 图标是三枚 glyph（tool / check / retry）叠放，用 opacity + transform
     + filter 轮换，不是换一个 SVG；
   · 失败时用 WAAPI 做一次横向抖动，幅度吃 --motion-bounce。
   ============================================================ */

const glyph = computed(() => props.status === 'done' ? 'check' : props.status === 'error' ? 'retry' : 'tool')
const running = computed(() => props.status === 'running')
const elapsed = ref(0)
const frozen = ref(null)
let raf = 0
let started = 0
const shakeEl = ref(null)

function tick(now) {
  if (!running.value) return
  elapsed.value = (now - started) / 1000
  emit('elapsed', elapsed.value)
  raf = requestAnimationFrame(tick)
}

function start() {
  cancelAnimationFrame(raf)
  started = performance.now()
  elapsed.value = 0
  frozen.value = null
  raf = requestAnimationFrame(tick)
}

watch(() => props.status, (next, prev) => {
  if (next === 'running') start()
  else {
    cancelAnimationFrame(raf)
    if (prev === 'running') frozen.value = elapsed.value
    if (next === 'error') shake()
  }
}, { immediate: true })

function shake() {
  const el = shakeEl.value
  if (!el || typeof el.animate !== 'function') return
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return
  const bounce = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-bounce')) || 1
  const amp = 6 * bounce
  el.animate(
    [0, -1, 1, -0.66, 0.66, -0.33, 0].map(k => ({ transform: 'translateX(' + (k * amp).toFixed(2) + 'px)' })),
    { duration: 450, easing: 'cubic-bezier(.77,0,.175,1)', composite: 'add' }
  )
}

onBeforeUnmount(() => cancelAnimationFrame(raf))

const fillScale = computed(() => {
  if (props.status === 'done' || props.status === 'error') return 1
  const target = Math.max(0.4, props.expected)
  return Math.min(1, elapsed.value / target)
})
const timeText = computed(() => {
  if (props.status === 'idle') return '—'
  const seconds = frozen.value !== null ? frozen.value : elapsed.value
  return seconds < 10 ? seconds.toFixed(1) + 's' : Math.round(seconds) + 's'
})
const words = computed(() => props.status === 'done' ? '已完成' : props.status === 'error' ? '失败' : props.status === 'idle' ? '排队中' : '运行中')
</script>

<template>
  <span
    ref="shakeEl"
    class="ui-call-chip"
    :class="`is-${status}`"
    role="status"
    :aria-busy="running || undefined"
    :aria-label="name + ' ' + detail + ' · ' + words"
  >
    <span class="ui-call-chip__fill" :style="{ '--p': fillScale, '--dur': expected + 's' }" aria-hidden="true"></span>
    <span class="ui-call-chip__body">
      <span class="ui-call-chip__glyph" :class="`is-${glyph}`" aria-hidden="true">
        <svg class="g-tool" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5h6M12 4.5V8" /><rect x="5.5" y="8" width="13" height="11.5" rx="2.5" /></svg>
        <svg class="g-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12.6l4.2 4.2L18.6 7.8" /></svg>
        <svg class="g-retry" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12a7 7 0 1 1-2.1-5" /><path d="M19 4.5V9h-4.5" /></svg>
      </span>
      <span class="ui-call-chip__name">{{ name }}</span>
      <span v-if="detail" class="ui-call-chip__detail">{{ detail }}</span>
      <span class="ui-call-chip__word">{{ words }}</span>
    </span>
    <span v-if="showTime" class="ui-call-chip__time">{{ timeText }}</span>
  </span>
</template>

<style scoped>
.ui-call-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 7px 11px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: var(--fs-tiny);
  line-height: 1.3;
  isolation: isolate;
  transition: border-color 200ms ease, color 200ms ease;
}
/* 填充：时长等于 expected，宽度由 scaleX 决定 —— 时间到就刚好走到头。 */
.ui-call-chip__fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: color-mix(in oklab, var(--primary) 20%, transparent);
  transform-origin: left center;
  transform: scaleX(var(--p, 0));
  transition: transform var(--dur, 2.4s) linear, background 220ms ease;
  pointer-events: none;
}
.ui-call-chip__body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
/* 三个 glyph 叠在同一格，靠 opacity / transform / filter 轮换。 */
.ui-call-chip__glyph { position: relative; display: grid; place-items: center; width: 15px; height: 15px; flex-shrink: 0; }
.ui-call-chip__glyph svg {
  position: absolute;
  inset: 0;
  width: 15px;
  height: 15px;
  opacity: 0;
  transform: scale(.7) rotate(-8deg);
  filter: blur(4px);
  transition: opacity 240ms cubic-bezier(.23,1,.32,1), transform 240ms cubic-bezier(.23,1,.32,1), filter 240ms cubic-bezier(.23,1,.32,1);
}
.ui-call-chip__glyph.is-tool .g-tool,
.ui-call-chip__glyph.is-check .g-check,
.ui-call-chip__glyph.is-retry .g-retry { opacity: 1; transform: none; filter: blur(0); }
.ui-call-chip__name { font-weight: var(--w-label); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-call-chip__detail { color: var(--on-surface-variant); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-call-chip__word { color: var(--on-surface-variant); font-size: var(--fs-micro); }
.ui-call-chip__time {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
  font-size: var(--fs-micro);
}

/* done：填充洗成绿；error：洗成红。clip-path 擦洗而不是硬换背景。 */
.ui-call-chip.is-done { color: var(--ui-success, #15803d); border-color: color-mix(in oklab, var(--ui-success, #15803d) 42%, var(--outline-variant)); }
.ui-call-chip.is-done .ui-call-chip__fill {
  background: color-mix(in oklab, var(--ui-success, #15803d) 16%, transparent);
  clip-path: inset(0 0 0 0);
  transition: transform 260ms cubic-bezier(.23,1,.32,1), background 200ms ease, clip-path 400ms cubic-bezier(.23,1,.32,1) 120ms;
}
.ui-call-chip.is-error { color: var(--error); border-color: color-mix(in oklab, var(--error) 46%, var(--outline-variant)); }
.ui-call-chip.is-error .ui-call-chip__fill { background: color-mix(in oklab, var(--error) 18%, transparent); }
.ui-call-chip.is-idle { opacity: .82; }

@media (prefers-reduced-motion: reduce) {
  .ui-call-chip, .ui-call-chip * { transition-duration: .01ms !important; animation: none !important; }
}
</style>
