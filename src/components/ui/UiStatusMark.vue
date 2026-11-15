<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* 仅受控：idle 静止环 / progress 进度弧 / done 勾 / error 叉 */
  status: { type: String, default: 'idle' },
  /* progress 档的进度 0~1 */
  progress: { type: Number, default: 0 },
  /* 视觉尺寸（px） */
  size: { type: Number, default: 26 }
})

/* ============================================================
   任务状态标记
   三个阶段共用同一个圆形容器，靠「图形切换 + 描边绘制」完成形变：
   · idle：一圈浅色虚环，安静待命；
   · progress：同一位置换成进度弧（pathLength 归一，避免圆周率换算）
     并缓慢自转，表示还在跑；
   · done：进度弧收到满，勾号从描边绘制出来；
   · error：叉号绘制 + 一次横向抖动。
   全部只是描边属性与透明度的过渡，不销毁重建节点。
   ============================================================ */

const R = 9
const circumference = 2 * Math.PI * R
const clamped = computed(() => Math.max(0, Math.min(1, props.progress)))
const offset = computed(() => circumference * (1 - clamped.value))
const spinning = computed(() => props.status === 'progress')
const finished = computed(() => props.status === 'done')
const failed = computed(() => props.status === 'error')
const sizeStyle = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
</script>

<template>
  <span
    class="ui-status-mark"
    :class="[`is-${status}`, { 'is-spinning': spinning }]"
    :style="sizeStyle"
    role="status"
    :aria-label="status === 'done' ? '已完成' : status === 'error' ? '失败' : status === 'progress' ? '进行中' : '待处理'"
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <!-- 轨道：idle 可见，progress 时留作底环 -->
      <circle
        class="ui-status-mark__track"
        cx="12" cy="12" :r="R"
        pathLength="100"
        stroke="currentColor"
        :stroke-width="finished || failed ? 0 : 2"
        :stroke-dasharray="failed || finished ? '100 100' : '7 9'"
        stroke-linecap="round"
      />
      <!-- 进度弧 -->
      <circle
        class="ui-status-mark__arc"
        cx="12" cy="12" :r="R"
        pathLength="100"
        stroke="var(--primary)"
        :stroke-width="finished || failed ? 0 : 2.2"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="finished ? 0 : offset"
        transform="rotate(-90 12 12)"
      />
      <!-- 勾 -->
      <path
        class="ui-status-mark__check"
        d="M7 12.6l3.2 3.2L17.2 8.6"
        pathLength="100"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- 叉 -->
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
  transition: color var(--t-fade);
}
.ui-status-mark svg { width: 100%; height: 100%; overflow: visible; display: block; }

/* 轨道：idle 的虚环随进度态淡出。 */
.ui-status-mark__track {
  opacity: 1;
  transition: opacity var(--t-fade), stroke-dasharray var(--t-panel), stroke-width var(--t-fade);
}
.ui-status-mark.is-progress .ui-status-mark__track,
.ui-status-mark.is-done .ui-status-mark__track,
.ui-status-mark.is-error .ui-status-mark__track { opacity: .28; }

/* 进度弧：从 0 到满靠 dashoffset 过渡；跑动时整体缓慢自转。 */
.ui-status-mark__arc {
  opacity: 0;
  transition: stroke-dashoffset var(--t-panel), opacity var(--t-fade), stroke-width var(--t-fade);
  transform-origin: 12px 12px;
}
.ui-status-mark.is-progress .ui-status-mark__arc,
.ui-status-mark.is-done .ui-status-mark__arc { opacity: 1; }
.ui-status-mark.is-done .ui-status-mark__arc { transition: stroke-dashoffset var(--t-sheet), opacity var(--t-fade); }

/* 勾 / 叉：描边绘制（pathLength 归一，dashoffset 100 -> 0）。 */
.ui-status-mark__check,
.ui-status-mark__cross {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  opacity: 0;
  transition: stroke-dashoffset var(--t-fade), opacity var(--t-fade);
}
.ui-status-mark.is-done { color: var(--ui-success, #1f9d63); }
.ui-status-mark.is-done .ui-status-mark__check {
  stroke-dashoffset: 0;
  opacity: 1;
  transition: stroke-dashoffset var(--t-panel) 60ms, opacity 120ms linear;
}
.ui-status-mark.is-error { color: var(--error); }
.ui-status-mark.is-error .ui-status-mark__cross {
  stroke-dashoffset: 0;
  opacity: 1;
  transition: stroke-dashoffset var(--t-panel) 40ms, opacity 100ms linear;
}
.ui-status-mark.is-error { animation: uiStatusShake 420ms cubic-bezier(.36, .07, .19, .97); }

@keyframes uiStatusShake {
  0%, 100% { transform: translateX(0); }
  22% { transform: translateX(-2px); }
  46% { transform: translateX(2px); }
  70% { transform: translateX(-1px); }
}

@media (prefers-reduced-motion: reduce) {
  .ui-status-mark,
  .ui-status-mark * { transition-duration: .01ms !important; animation: none !important; }
}
</style>
