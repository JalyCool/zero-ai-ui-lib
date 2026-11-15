<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* 仅受控：idle 静止环 / progress 进度弧 / done 勾 / error 叉 */
  status: { type: String, default: 'idle' },
  /* progress 档的进度 0~1 */
  progress: { type: Number, default: 0 },
  /* 视觉尺寸（px） */
  size: { type: Number, default: 26 }
})

/* ============================================================
   任务状态标记（小型状态机）
   四个状态共用同一套图层，切换不销毁任何节点，只改描边 / 透明度：
   · idle：虚环；
   · progress：进度弧（pathLength 归一）+ 缓慢自转；
   · done：弧收满后勾号描边画出，同时整体轻轻「立」一下；
   · error：弧退场、叉号描边画出 + 一次横向抖动。
   任意两个状态之间都能互转：勾 / 叉退出时是反向抽笔（dashoffset 回到 100），
   弧退出时收回到当前进度，所以 done -> progress、error -> done 也不会跳。
   ============================================================ */

const R = 9
const circumference = 2 * Math.PI * R
const clamped = computed(() => Math.max(0, Math.min(1, props.progress)))

/* 弧的目标值：各状态各自的「弧应该到哪儿」。
   done 收满、error 收回一半再淡出、idle 归零、progress 跟进度走。 */
const arcTarget = computed(() => {
  if (props.status === 'done') return 1
  if (props.status === 'progress') return clamped.value
  if (props.status === 'error') return clamped.value * 0.5
  return 0
})
const offset = computed(() => circumference * (1 - arcTarget.value))

const spinning = computed(() => props.status === 'progress')
const finished = computed(() => props.status === 'done')
const failed = computed(() => props.status === 'error')

/* 状态切换时给一次很轻的形变脉冲：整体先微放大再落回，
   让「换图形」这件事有连续的身体感，而不是两个图标互相淡入淡出。 */
const morphing = ref(false)
let morphTimer = 0
watch(() => props.status, () => {
  morphing.value = true
  clearTimeout(morphTimer)
  morphTimer = setTimeout(() => { morphing.value = false }, 360)
})

onBeforeUnmount(() => clearTimeout(morphTimer))

const sizeStyle = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
</script>

<template>
  <span
    class="ui-status-mark"
    :class="[`is-${status}`, { 'is-spinning': spinning, 'is-morphing': morphing }]"
    :style="sizeStyle"
    role="status"
    :aria-label="status === 'done' ? '已完成' : status === 'error' ? '失败' : status === 'progress' ? '进行中' : '待处理'"
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <!-- 轨道：idle 的虚环，其它状态退成淡底环。 -->
      <circle
        class="ui-status-mark__track"
        cx="12" cy="12" :r="R"
        pathLength="100"
        stroke="currentColor"
        :stroke-width="finished || failed ? 0 : 2"
        stroke-dasharray="7 9"
        stroke-dashoffset="0"
        stroke-linecap="round"
      />
      <!-- 进度弧：所有状态共用，靠 dashoffset 连续过渡。 -->
      <circle
        class="ui-status-mark__arc"
        cx="12" cy="12" :r="R"
        pathLength="100"
        :stroke="failed ? 'var(--error)' : finished ? 'var(--ui-success, #1f9d63)' : 'var(--primary)'"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        transform="rotate(-90 12 12)"
      />
      <!-- 勾：进入 done 时描边画出，离开时反向抽笔。 -->
      <path
        class="ui-status-mark__check"
        d="M7 12.6l3.2 3.2L17.2 8.6"
        pathLength="100"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- 叉：进入 error 时描边画出，离开时反向抽笔。 -->
      <path
        class="ui-status-mark__cross"
        d="M8.4 8.6l7.2 6.8M15.6 8.6l-7.2 6.8"
        pathLength="100"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.ui-status-mark {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  /* 只过渡颜色；不要动根节点的 transform —— inline-grid 上的缩放会连带
     改变视觉位置，看起来就是「圆环偏移」。 */
  vertical-align: middle;
  transition: color var(--t-fade);
}
/* 形变脉冲只作用于内部 svg，永远以圆心为原点，不会挪动圆环。 */
.ui-status-mark svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  transform-origin: 50% 50%;
  transition: transform var(--t-panel) var(--spring-view);
}
.ui-status-mark.is-morphing svg { transform: scale(var(--pop-scale, 1.06)); }

/* 轨道：虚环只在 idle 明显，其它状态淡到底环。 */
.ui-status-mark__track {
  opacity: 1;
  transition: opacity var(--t-fade), stroke-width var(--t-fade);
}
.ui-status-mark.is-progress .ui-status-mark__track,
.ui-status-mark.is-done .ui-status-mark__track,
.ui-status-mark.is-error .ui-status-mark__track { opacity: .26; }

/* 弧：dashoffset 是连续量，从任何状态进 / 出都顺势过渡。 */
.ui-status-mark__arc {
  transform-origin: 12px 12px;
  transition: stroke-dashoffset var(--t-panel) var(--spring-view),
              stroke var(--t-fade), opacity var(--t-fade);
}
.ui-status-mark.is-idle .ui-status-mark__arc { opacity: 0; }
.ui-status-mark.is-progress .ui-status-mark__arc,
.ui-status-mark.is-done .ui-status-mark__arc,
.ui-status-mark.is-error .ui-status-mark__arc { opacity: 1; }
/* 自转表示还在跑；停在某个进度时不转，避免误读成还没到。 */
.ui-status-mark.is-spinning .ui-status-mark__arc { animation: uiStatusSpin 1.5s linear infinite; }

/* 勾 / 叉：pathLength 归一的描边抽笔，进出都是同一段过渡（可逆）。 */
.ui-status-mark__check,
.ui-status-mark__cross {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  opacity: 0;
  transform-origin: 12px 12px;
  transition: stroke-dashoffset var(--t-panel) var(--spring-view),
              opacity var(--t-fade),
              transform var(--t-panel) var(--spring-view);
}
.ui-status-mark.is-done { color: var(--ui-success, #1f9d63); }
.ui-status-mark.is-done .ui-status-mark__check {
  stroke-dashoffset: 0;
  opacity: 1;
  animation: uiStatusPop var(--spring-feedback-dur, 320ms) var(--spring-feedback, cubic-bezier(.22,1.2,.36,1));
}
.ui-status-mark.is-done .ui-status-mark__arc { opacity: .55; }
.ui-status-mark.is-error { color: var(--error); }
.ui-status-mark.is-error .ui-status-mark__cross {
  stroke-dashoffset: 0;
  opacity: 1;
  animation: uiStatusPop var(--spring-feedback-dur, 320ms) var(--spring-feedback, cubic-bezier(.22,1.2,.36,1));
}
.ui-status-mark.is-error .ui-status-mark__arc { opacity: .5; }
@keyframes uiStatusSpin { to { transform: rotate(360deg); } }
@keyframes uiStatusPop {
  from { transform: scale(calc(1 - 0.18 * var(--motion-scale, 1))); }
  to { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .ui-status-mark,
  .ui-status-mark * { transition-duration: .01ms !important; animation: none !important; }
  .ui-status-mark.is-morphing svg { transform: none; }
}
</style>
