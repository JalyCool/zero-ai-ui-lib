<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* none | pending | progress | done | failed
     （兼容旧名：idle → pending，running → progress，error / cancelled → failed） */
  status: { type: String, default: 'pending' },
  /* 实际进度 0~1；传 null / undefined = 没有实际进度（转圈的不定进度）。
     注意默认值是 null：以前默认 0 会让「不定进度」被误判成 0%，弧长突然收缩。 */
  progress: { type: Number, default: null },
  size: { type: Number, default: 26 },
  /* pending 虚环的段数 */
  dashes: { type: Number, default: 8 },
  /* 不定进度时弧占整圈的比例 */
  arcLength: { type: Number, default: 0.22 },
  /* 不定进度转一圈的时长（ms） */
  spinDuration: { type: Number, default: 1100 },
  /* 勾 / 叉抽笔时长（ms） */
  drawDuration: { type: Number, default: 240 }
})

/* ============================================================
   任务状态标记
   ------------------------------------------------------------
   五个状态，全部由**同一圈描边**演化而来（不切换、不重建图形）：
   · none      只有底部一段弧（一个「空槽」的暗示），上半部分什么都没有；
   · pending   整圈虚线（8 段），安静待命；
   · progress  分两种：
               - 有实际进度（progress 是数字）：弧长 = 进度，静止不转；
               - 没有实际进度（progress 为 null）：一小段弧持续转圈，
                 像真的在跑，不给假的百分比；
   · done      弧收满 + 勾号描边画出；
   · failed    弧淡出 + 叉号描边画出。
   dasharray 是连续量，CSS 直接过渡，所以任意两态互转都是同一条描边在变形。
   ============================================================ */

const ALIASES = { idle: 'pending', running: 'progress', error: 'failed', cancelled: 'failed' }
const state = computed(() => ALIASES[props.status] || props.status || 'none')

const R = 9
const CIRC = 2 * Math.PI * R
/* pathLength=100 归一之后的周长，方便算 dash。 */
const LEN = 100

const isNumeric = value => typeof value === 'number' && Number.isFinite(value)
/* 有实际进度：progress 是数字（0 也算）。 */
const determinate = computed(() => state.value === 'progress' && isNumeric(props.progress))
/* 没实际进度：progress 状态下 progress 为 null。 */
const indeterminate = computed(() => state.value === 'progress' && !isNumeric(props.progress))

const clamped = computed(() => Math.max(0, Math.min(1, isNumeric(props.progress) ? props.progress : 0)))
const filled = computed(() => state.value === 'done' || state.value === 'failed')

/* 主描边的 dash：none 只留底部半圈、pending 是虚线、progress 是弧、完成是整圈。 */
const ringDash = computed(() => {
  if (state.value === 'none') return '50 50'
  if (state.value === 'pending') {
    const dash = (0.3 * LEN) / props.dashes
    const gap = (0.7 * LEN) / props.dashes
    return dash.toFixed(3) + ' ' + gap.toFixed(3)
  }
  if (state.value === 'progress') {
    if (!determinate.value) return '22 78'
    const dash = clamped.value * LEN
    return Math.max(0.001, dash).toFixed(3) + ' ' + Math.max(0.001, LEN - dash).toFixed(3)
  }
  /* done / failed：整圈，留给勾叉当底色 */
  return '100 0.001'
})
/* none 的底部半圈：从 3 点钟方向开始画 50，正好是下半圈。 */
const ringOffset = computed(() => (state.value === 'none' ? -25 : 0))

const spinDuration = computed(() => props.spinDuration + 'ms')
const drawDuration = computed(() => props.drawDuration + 'ms')
const rootStyle = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
  '--spin-dur': spinDuration.value,
  '--draw-dur': drawDuration.value
}))
</script>

<template>
  <span
    class="ui-status-mark"
    :class="[`is-${state}`, { 'is-indeterminate': indeterminate }]"
    :style="rootStyle"
    role="status"
    :aria-label="state === 'none' ? '无状态'
      : state === 'done' ? '已完成'
      : state === 'failed' ? '失败'
      : indeterminate ? '进行中（不定进度）'
      : determinate ? '进行中 ' + Math.round(clamped * 100) + '%'
      : '待处理'"
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <!-- 主描边：none 底部残弧 / pending 虚线 / progress 实弧 / done·failed 整圈 -->
      <circle
        class="ui-status-mark__ring"
        cx="12" cy="12" :r="R"
        pathLength="100"
        transform="rotate(-90 12 12)"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="ringDash"
        :stroke-dashoffset="ringOffset"
      />
      <!-- 不定进度的转圈：固定一小段弧，靠 dashoffset 匀速走 -->
      <circle
        v-if="indeterminate"
        class="ui-status-mark__spin"
        cx="12" cy="12" :r="R"
        pathLength="100"
        transform="rotate(-90 12 12)"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="(arcLength * 100).toFixed(2) + ' ' + ((1 - arcLength) * 100).toFixed(2)"
      />
      <!-- 勾 / 叉：pathLength=1 抽笔 -->
      <path class="ui-status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength="1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <path class="ui-status-mark__cross" d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" pathLength="1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  </span>
</template>

<style scoped>
.ui-status-mark {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  vertical-align: middle;
  color: var(--on-surface-variant);
  transition: color 200ms ease;
}
.ui-status-mark svg { width: 100%; height: 100%; display: block; overflow: visible; }

/* 主描边：dasharray / dashoffset 都是连续量，状态互转时自然过渡。
   注意这里不写 CSS transform-origin —— 旋转原点由 rotate(-90 12 12) 自带，
   再写一次会让圆环整体偏移（踩过这个坑）。 */
.ui-status-mark__ring {
  transition: stroke-dasharray 320ms cubic-bezier(.23,1,.32,1),
              stroke-dashoffset 320ms cubic-bezier(.23,1,.32,1),
              stroke 200ms ease, opacity 200ms ease;
}

/* 各态配色 */
.ui-status-mark.is-progress { color: var(--primary); }
.ui-status-mark.is-pending { color: var(--on-surface-variant); }
.ui-status-mark.is-pending .ui-status-mark__ring { opacity: .62; }
.ui-status-mark.is-none { color: var(--outline-variant); }
.ui-status-mark.is-none .ui-status-mark__ring { opacity: .8; }
.ui-status-mark.is-done { color: var(--ui-success, #15803d); }
.ui-status-mark.is-failed { color: var(--error); }
/* 完成 / 失败：整圈退成淡底，让勾叉当主角 */
.ui-status-mark.is-done .ui-status-mark__ring,
.ui-status-mark.is-failed .ui-status-mark__ring { opacity: .26; }

/* 不定进度：只显示转圈那条弧，主描边隐去，避免两段弧叠在一起乱跳。 */
.ui-status-mark.is-indeterminate .ui-status-mark__ring { opacity: 0; }
.ui-status-mark__spin {
  animation: uiStatusSpin var(--spin-dur, 1100ms) linear infinite;
}
@keyframes uiStatusSpin {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -100; }
}

/* 勾 / 叉：默认抽笔隐藏，进入对应状态才画出来。 */
.ui-status-mark__check,
.ui-status-mark__cross {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
}
.ui-status-mark.is-done .ui-status-mark__check {
  animation: uiStatusDraw var(--draw-dur, 240ms) cubic-bezier(.23,1,.32,1) forwards;
}
.ui-status-mark.is-failed .ui-status-mark__cross {
  animation: uiStatusDraw var(--draw-dur, 240ms) cubic-bezier(.23,1,.32,1) forwards;
}
@keyframes uiStatusDraw {
  from { stroke-dashoffset: 1; opacity: 1; }
  to { stroke-dashoffset: 0; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-status-mark__ring { transition-duration: .01ms; }
  .ui-status-mark__spin { animation: none; }
  .ui-status-mark__check,
  .ui-status-mark__cross { animation-duration: .01ms !important; }
}
</style>
