<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /* [{ label, description?, icon? }] */
  steps: { type: Array, default: () => [] },
  /* 当前步（0 起，仅受控） */
  modelValue: { type: Number, default: 0 },
  /* horizontal | vertical */
  orientation: { type: String, default: 'horizontal' },
  /* 允许点击已到达的步骤直接跳转 */
  clickable: { type: Boolean, default: true },
  /* 是否显示底部「上一步 / 下一步」 */
  controls: { type: Boolean, default: true },
  nextLabel: { type: String, default: '下一步' },
  prevLabel: { type: String, default: '上一步' },
  finishLabel: { type: String, default: '完成' }
})

const emit = defineEmits(['update:modelValue', 'change', 'finish'])

/* ============================================================
   多步流程
   步骤之间是一条「滑动的高亮」：指示器是一个绝对定位的薄条，
   位置与长度按当前步的格位算，靠 transform 走弹簧过渡，
   所以换步时是在轨道上滑过去，而不是淡出淡入。
   内容区只换内容：旧的淡出并模糊，新的从反方向浮现（内容替换语言）。
   ============================================================ */

const trackEl = ref(null)
const direction = ref(1)

const count = computed(() => props.steps.length)
const clamped = computed(() => Math.max(0, Math.min(count.value - 1, props.modelValue)))
const isLast = computed(() => clamped.value >= count.value - 1)

/* 指示器与 UiSegmented 完全同一套算法：步骤等分（flex:1），
   宽高用 calc 一次算定，位移用百分比 —— 不依赖 getBoundingClientRect，
   所以换步时它就是一块背景在轨道上平移，不会因为量尺寸的时机抖动。
   GAP = 轨道内间隙（6px），PAD = 轨道内边距（5px）。 */
const PAD = 5
const GAP = 6
const indicatorStyle = computed(() => {
  const n = count.value
  if (!n) return null
  const index = clamped.value
  if (props.orientation === 'vertical') {
    return {
      height: 'calc((100% - ' + PAD * 2 + 'px - ' + (n - 1) * GAP + 'px) / ' + n + ')',
      /* 不要写 calc(index * (100% + gap))：CSS calc 不支持「和式再乘」，
         会被整条忽略，指示器就卡在起点不动。拆成两项相加。 */
      transform: 'translate3d(0, calc(' + index + ' * 100% + ' + index * GAP + 'px), 0)'
    }
  }
  return {
    width: 'calc((100% - ' + PAD * 2 + 'px - ' + (n - 1) * GAP + 'px) / ' + n + ')',
    transform: 'translate3d(calc(' + index + ' * 100% + ' + index * GAP + 'px), 0, 0)'
  }
})

let observer = null

function go(index, fromUser = true) {
  const next = Math.max(0, Math.min(count.value - 1, index))
  if (next === clamped.value) return
  direction.value = next > clamped.value ? 1 : -1
  if (fromUser) emit('update:modelValue', next)
  emit('change', { index: next, direction: direction.value })
  if (next >= count.value - 1 && isLast.value) emit('finish')
}

function next() {
  if (isLast.value) { emit('finish'); return }
  go(clamped.value + 1)
}

function prev() {
  if (clamped.value === 0) return
  go(clamped.value - 1)
}

function onStepClick(index) {
  if (!props.clickable) return
  /* 只允许跳到「已完成」或当前步之后一步以内的位置，避免乱跳。 */
  if (index > clamped.value + 1) return
  go(index)
}

onBeforeUnmount(() => { /* 指示器是纯 CSS 计算，没有监听器需要清理 */ })
</script>

<template>
  <div class="ui-stepflow" :class="[`is-${orientation}`]">
    <div ref="trackEl" class="ui-stepflow__track" role="tablist" :aria-orientation="orientation">
      <!-- 滑动指示器：当前步的格位。 -->
      <span v-if="indicatorStyle" class="ui-stepflow__indicator" :style="indicatorStyle" aria-hidden="true"></span>

      <button
        v-for="(step, index) in steps"
        :key="step.label + index"
        type="button"
        class="ui-stepflow__step"
        :class="{ 'is-active': index === clamped, 'is-done': index < clamped, 'is-locked': index > clamped + 1 }"
        role="tab"
        :aria-selected="index === clamped"
        :aria-disabled="index > clamped + 1"
        :tabindex="index === clamped ? 0 : -1"
        @click="onStepClick(index)"
      >
        <span class="ui-stepflow__dot" aria-hidden="true">
          <svg v-if="index < clamped" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.4 4.4L19 7" /></svg>
          <template v-else-if="step.icon"><span class="ui-stepflow__glyph" v-html="step.icon"></span></template>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="ui-stepflow__text">
          <span class="ui-stepflow__label">{{ step.label }}</span>
          <span v-if="step.description" class="ui-stepflow__desc">{{ step.description }}</span>
        </span>
      </button>
    </div>

    <div class="ui-stepflow__panel">
      <Transition :name="`stepflow-${direction > 0 ? 'next' : 'prev'}`">
        <div :key="clamped" class="ui-stepflow__panel-inner">
          <slot :index="clamped" :step="steps[clamped]" :next="next" :prev="prev" :finish="() => emit('finish')">
            <p class="ui-stepflow__fallback">{{ steps[clamped]?.description || steps[clamped]?.label }}</p>
          </slot>
        </div>
      </Transition>
    </div>

    <div v-if="controls" class="ui-stepflow__controls">
      <button type="button" class="ui-stepflow__btn" :disabled="clamped === 0" @click="prev">{{ prevLabel }}</button>
      <button type="button" class="ui-stepflow__btn is-primary" @click="next">{{ isLast ? finishLabel : nextLabel }}</button>
    </div>
  </div>
</template>

<style scoped>
.ui-stepflow { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.ui-stepflow__track { position: relative; display: flex; gap: 6px; padding: 5px; border-radius: calc(16px * var(--radius-scale)); background: var(--surface-container); }
.ui-stepflow.is-vertical .ui-stepflow__track { flex-direction: column; align-items: stretch; }

/* 指示器：靠 transform 在轨道上滑动，宽度 / 高度都跟随格位。 */
.ui-stepflow__indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 0;
  border-radius: calc(12px * var(--radius-scale));
  background: var(--primary-container);
  /* 宽高按 calc 一次算定，位移用百分比 translate：换步时就是平移。 */
  transition: transform var(--t-panel) var(--spring-view), width var(--t-panel), height var(--t-panel);
  pointer-events: none;
  will-change: transform;
}
.ui-stepflow__step {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 8px 10px;
  border: 0;
  border-radius: calc(12px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface-variant);
  font-size: var(--fs-tiny);
  text-align: left;
  cursor: pointer;
  transition: color var(--t-fade), transform var(--t-feedback);
}
.ui-stepflow__step:active { transform: scale(var(--press-scale)); }
.ui-stepflow__step.is-active { color: var(--on-primary-container); font-weight: var(--w-label); }
.ui-stepflow__step.is-done { color: var(--on-surface); }
.ui-stepflow__step.is-locked { cursor: default; opacity: .5; }
.ui-stepflow__dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  border: var(--border-w) solid var(--outline-variant);
  background: var(--surface);
  font-size: var(--fs-micro);
  font-weight: var(--w-strong);
  font-variant-numeric: tabular-nums;
  transition: background var(--t-fade), border-color var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-stepflow__dot svg { width: 13px; height: 13px; }
.ui-stepflow__step.is-active .ui-stepflow__dot { background: var(--primary); border-color: var(--primary); color: var(--on-primary); transform: scale(1.06); }
.ui-stepflow__step.is-done .ui-stepflow__dot { background: color-mix(in oklab, var(--primary) 16%, var(--surface)); border-color: var(--primary); color: var(--primary); }
.ui-stepflow__glyph { display: grid; place-items: center; }
.ui-stepflow__glyph :deep(svg) { width: 13px; height: 13px; }
.ui-stepflow__text { display: flex; flex-direction: column; min-width: 0; }
.ui-stepflow__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-stepflow__desc { font-size: var(--fs-micro); color: var(--on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 面板：内容替换 —— 旧内容淡出模糊，新内容从方向侧浮现。 */
.ui-stepflow__panel { position: relative; min-height: 76px; }
.ui-stepflow__panel-inner { will-change: transform, filter, opacity; }
.ui-stepflow__fallback { margin: 0; color: var(--on-surface-variant); font-size: var(--fs-small); line-height: 1.6; }

.stepflow-next-enter-active,
.stepflow-next-leave-active,
.stepflow-prev-enter-active,
.stepflow-prev-leave-active { transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade); }
.stepflow-next-enter-from { opacity: 0; transform: translateX(24px); filter: blur(8px); }
.stepflow-next-leave-to { opacity: 0; transform: translateX(-24px); filter: blur(8px); }
.stepflow-prev-enter-from { opacity: 0; transform: translateX(-24px); filter: blur(8px); }
.stepflow-prev-leave-to { opacity: 0; transform: translateX(24px); filter: blur(8px); }
/* 两层同时在场时叠在一起，避免高度跳动。 */
.stepflow-next-leave-active,
.stepflow-prev-leave-active { position: absolute; inset: 0; }

.ui-stepflow__controls { display: flex; gap: 8px; justify-content: flex-end; }
.ui-stepflow__btn {
  padding: 9px 15px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), border-color var(--t-fade), transform var(--t-feedback), opacity var(--t-fade);
}
.ui-stepflow__btn:active { transform: scale(var(--press-scale)); }
.ui-stepflow__btn:disabled { opacity: .38; cursor: not-allowed; }
.ui-stepflow__btn.is-primary { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }

@media (prefers-reduced-motion: reduce) {
  .ui-stepflow__indicator { transition-duration: .01ms; }
  .ui-stepflow__panel-inner { transition-duration: .01ms; }
  .stepflow-next-enter-active, .stepflow-next-leave-active,
  .stepflow-prev-enter-active, .stepflow-prev-leave-active { transition-duration: .01ms; }
  .ui-stepflow__step :deep(*) { transition-duration: .01ms; }
}
</style>
