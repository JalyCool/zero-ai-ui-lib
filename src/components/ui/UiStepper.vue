<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import UiRollNumber from './UiRollNumber.vue'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  label: { type: String, default: '数量' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 99 },
  step: { type: Number, default: 1 },
  unit: { type: String, default: '' },
  /* sm / md / lg / xl */
  size: { type: String, default: 'md' },
  /* sides 两侧 / bottom 底部横排 */
  controls: { type: String, default: 'sides' },
  /* standard 默认（新值变大 -> 旧值向上）/ reverse 反向 */
  roll: { type: String, default: 'standard' },
  /* 左上角标签：传了就显示在整块控件的左上方 */
  fieldLabel: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   步进器
   数字变化动效由共享的 <UiRollNumber> 提供（数字上下渐变/滚动，
   位移量随变化量缩放），本组件只保留步进语义与「碰壁」回弹。
   到限位再点按钮 -> 只有数字盒朝它该去的方向轻轻顶一下（5px）。
   ============================================================ */

const bump = ref('')
let bumpTimer = null

const value = computed(() => {
  const number = Number(props.modelValue)
  if (!Number.isFinite(number)) return props.min
  return Math.min(props.max, Math.max(props.min, number))
})

const canDecrease = computed(() => value.value > props.min)
const canIncrease = computed(() => value.value < props.max)

/* 碰壁：只有数字盒朝它该去的方向轻轻顶一下（5px），随即回弹。 */
function bumpEdge(direction) {
  if (reduceMotion()) return
  bump.value = ''
  clearTimeout(bumpTimer)
  requestAnimationFrame(() => {
    bump.value = direction
    bumpTimer = setTimeout(() => { bump.value = '' }, 420)
  })
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setValue(next) {
  if (!Number.isFinite(next)) return
  const clamped = Math.min(props.max, Math.max(props.min, next))
  if (clamped === value.value) return
  emit('update:modelValue', clamped)
}

function decrease() {
  if (!canDecrease.value) {
    bumpEdge('minus')
    return
  }
  setValue(value.value - props.step)
}

function increase() {
  if (!canIncrease.value) {
    bumpEdge('plus')
    return
  }
  setValue(value.value + props.step)
}

onBeforeUnmount(() => {
  clearTimeout(bumpTimer)
})
</script>

<template>
  <div
    class="ui-stepper"
    :class="[
      `ui-stepper--${size}`,
      `ui-stepper--ctrl-${controls}`,
      bump ? `is-bumping-${bump}` : ''
    ]"
  >
    <span v-if="fieldLabel" class="ui-stepper__field-label">{{ fieldLabel }}</span>
    <span v-if="label" class="ui-stepper__label">{{ label }}</span>

    <div class="ui-stepper__control" role="group" :aria-label="label || fieldLabel">
      <button
        type="button"
        class="ui-stepper__btn ui-stepper__btn--minus"
        :class="{ 'is-disabled': !canDecrease }"
        :aria-disabled="!canDecrease"
        aria-label="减少"
        @click="decrease"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>

      <div class="ui-stepper__stage">
        <!-- 数字是居中基准；单位相对数字绝对悬浮在右侧，不参与居中计算。 -->
        <span class="ui-stepper__flow">
          <UiRollNumber
            class="ui-stepper__roll"
            :value="value"
            :reverse="roll === 'reverse'"
            :step="step"
          />
          <span v-if="unit" class="ui-stepper__unit">{{ unit }}</span>
        </span>
      </div>

      <button
        type="button"
        class="ui-stepper__btn ui-stepper__btn--plus"
        :class="{ 'is-disabled': !canIncrease }"
        :aria-disabled="!canIncrease"
        aria-label="增加"
        @click="increase"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 尺寸契约：每档只定义数字字号与舞台高度。 */
.ui-stepper {
  /* 四档按约 1.29 倍等比递进：11 / 14.2 / 18.3 / 23.6px；舞台高度用 em 等比。 */
  --stepper-value-size: 0.86rem;
  --stepper-stage-h: calc(var(--stepper-value-size) * 1.95);
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ui-stepper--sm { --stepper-value-size: 0.68rem; }
.ui-stepper--md { --stepper-value-size: 0.86rem; }
.ui-stepper--lg { --stepper-value-size: 1.14rem; }
.ui-stepper--xl { --stepper-value-size: 1.48rem; }

/* 左上角标签（全宽步进器用） */
.ui-stepper__field-label {
  align-self: flex-start;
  font-size: var(--fs-small);
  font-weight: var(--w-label);
  color: var(--on-surface);
}
.ui-stepper__label {
  align-self: flex-start;
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  color: var(--on-surface-variant);
}

.ui-stepper__control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 3px;
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container-low);
  transition: border-color var(--t-fade), background var(--t-fade),
              border-radius var(--t-panel);
}
.ui-stepper__control:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent);
}

.ui-stepper__btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container);
  color: var(--on-surface);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--t-fade), color var(--t-fade),
              transform var(--t-feedback), opacity var(--t-fade),
              border-radius var(--t-panel);
}
.ui-stepper__btn:hover:not(.is-disabled) {
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.ui-stepper__btn:active:not(.is-disabled) { transform: scale(.9); }
.ui-stepper__btn.is-disabled { opacity: .32; cursor: not-allowed; }
.ui-stepper__btn svg { width: 16px; height: 16px; }

/* ---------- 数字轨 ---------- */
.ui-stepper__stage {
  position: relative;
  flex: 1;
  min-width: 0;
  height: var(--stepper-stage-h);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* flow 只按数字宽度定尺寸并居中；单位绝对挂在数字右侧，不影响居中。 */
.ui-stepper__flow {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  max-width: 100%;
}

/* 数字字号与字重由步进器定义，UiRollNumber 只负责滚动。 */
.ui-stepper__roll {
  font-size: var(--stepper-value-size);
  font-weight: var(--w-strong);
}
.ui-stepper--xl .ui-stepper__roll {
  font-weight: var(--w-heading);
  letter-spacing: -.02em;
}

.ui-stepper__unit {
  position: absolute;
  left: 100%;
  bottom: 0.08em;
  margin-left: 3px;
  line-height: 1.05;
  color: var(--on-surface-variant);
  font-size: max(0.62rem, calc(var(--stepper-value-size) * .52));
  font-weight: 500;
  white-space: nowrap;
}

/* 碰壁只动数字盒（UiRollNumber 内部），不产生任何盒模型变化。 */
.ui-stepper--dir-up .ui-roll__box { --bump-dir: -1; }

/* 方向由 UiRollNumber 依据新旧值自行决定；碰壁沿用本组件的状态。 */
.ui-stepper.is-bumping-plus :deep(.ui-roll__box),
.ui-stepper.is-bumping-minus :deep(.ui-roll__box) {
  animation: stepperBump var(--spring-feedback-dur) var(--spring-feedback) 1;
}

@keyframes stepperBump {
  0% { transform: translate3d(0, 0, 0); }
  32% { transform: translate3d(0, calc(var(--bump-sign, -1) * 5px), 0); }
  64% { transform: translate3d(0, calc(var(--bump-sign, -1) * -1.5px), 0); }
  100% { transform: translate3d(0, 0, 0); }
}

/* 碰壁方向：加到上限 -> 向上顶；减到下限 -> 向下顶。
   旧实现按滚动方向镜像，这里直接给出符号。 */
.ui-stepper.is-bumping-plus :deep(.ui-roll__box) { --bump-sign: -1; }
.ui-stepper.is-bumping-minus :deep(.ui-roll__box) { --bump-sign: 1; }

/* ---------- 两侧按钮（默认） ---------- */
.ui-stepper--ctrl-sides .ui-stepper__control { flex-direction: row; }

/* ---------- 底部横排 ---------- */
.ui-stepper--ctrl-bottom .ui-stepper__control {
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 10px 9px;
  gap: 8px;
}
.ui-stepper--ctrl-bottom .ui-stepper__stage {
  order: -1;
  flex-basis: 100%;
}
.ui-stepper--ctrl-bottom .ui-stepper__btn {
  width: 46px;
  height: 30px;
}

/* ---------- 尺寸 ---------- */
.ui-stepper--sm .ui-stepper__control { min-height: 34px; padding: 2px; border-radius: calc(11px * var(--radius-scale)); }
.ui-stepper--sm .ui-stepper__btn { width: 28px; height: 28px; border-radius: 8px; }
.ui-stepper--sm .ui-stepper__btn svg { width: 13px; height: 13px; }

.ui-stepper--lg .ui-stepper__control { min-height: 54px; padding: 5px; border-radius: calc(16px * var(--radius-scale)); }
.ui-stepper--lg .ui-stepper__btn { width: 42px; height: 42px; border-radius: 12px; }
.ui-stepper--lg .ui-stepper__btn svg { width: 20px; height: 20px; }

.ui-stepper--xl .ui-stepper__label { font-size: var(--fs-small); }
.ui-stepper--xl .ui-stepper__control {
  min-height: 108px;
  padding: 16px 16px 12px;
  border-radius: calc(22px * var(--radius-scale));
  gap: 10px;
}
.ui-stepper--xl .ui-stepper__btn {
  width: 56px;
  height: 42px;
  border-radius: calc(14px * var(--radius-scale));
}
.ui-stepper--xl .ui-stepper__btn svg { width: 22px; height: 22px; }
.ui-stepper--xl.ui-stepper--ctrl-bottom .ui-stepper__btn {
  flex: 1;
  max-width: 148px;
}

/* 全宽步进器：占满整行，左上角标签 + 大数字 */
.ui-stepper--block { width: 100%; }
.ui-stepper--block .ui-stepper__control { width: 100%; }

@media (prefers-reduced-motion: reduce) {
  .ui-stepper.is-bumping-plus :deep(.ui-roll__box),
  .ui-stepper.is-bumping-minus :deep(.ui-roll__box) { animation-duration: .01ms; }
}
</style>
