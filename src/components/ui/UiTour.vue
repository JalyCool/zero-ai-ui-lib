<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /* [{ target: CSS 选择器, title, text, placement?: top|bottom }] */
  steps: { type: Array, default: () => [] },
  startAt: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue', 'finish'])
const index = ref(props.startAt)
const targetRect = ref(null)
const bubbleStyle = ref({})
const open = computed(() => props.modelValue)

/* 引导：每一步把目标元素挖出来（spotlight），气泡贴着它摆；
   目标不存在就跳过该步，不会把用户卡住。 */
const step = computed(() => props.steps[index.value] || null)

function measure() {
  if (!step.value) return
  const el = document.querySelector(step.value.target)
  if (!el) return
  const rect = el.getBoundingClientRect()
  targetRect.value = { left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }
  const placement = step.value.placement || 'bottom'
  const below = placement !== 'top'
  const top = below ? rect.bottom + 12 : rect.top - 12
  bubbleStyle.value = {
    left: Math.max(12, Math.min(rect.left, window.innerWidth - 292)) + 'px',
    top: below ? top + 'px' : 'auto',
    bottom: below ? 'auto' : Math.max(12, window.innerHeight - top) + 'px'
  }
}

async function go(delta) {
  const next = index.value + delta
  if (next < 0) return
  if (next >= props.steps.length) { close(); emit('finish'); return }
  index.value = next
  await nextTick(); measure()
}
function close() { emit('update:modelValue', false) }
function onKey(event) { if (event.key === 'Escape') close() }

watch(open, async value => {
  if (value) {
    index.value = props.startAt
    await nextTick(); measure()
    window.addEventListener('resize', measure)
    document.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('resize', measure)
    document.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => { window.removeEventListener('resize', measure); document.removeEventListener('keydown', onKey) })
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="ui-tour">
      <div class="ui-tour__blocker" @click="close"></div>
      <div v-if="targetRect" class="ui-tour__spot" :style="{ left: targetRect.left + 'px', top: targetRect.top + 'px', width: targetRect.width + 'px', height: targetRect.height + 'px' }"></div>
      <div class="ui-tour__bubble" :style="bubbleStyle" role="dialog" :aria-label="step ? step.title : '引导'">
        <div class="ui-tour__head">
          <b>{{ step ? step.title : '' }}</b>
          <span>{{ index + 1 }} / {{ steps.length }}</span>
        </div>
        <p class="ui-tour__text">{{ step ? step.text : '' }}</p>
        <div class="ui-tour__actions">
          <button type="button" class="ui-tour__btn" @click="close">跳过</button>
          <span class="ui-tour__spacer"></span>
          <button type="button" class="ui-tour__btn" :disabled="index === 0" @click="go(-1)">上一步</button>
          <button type="button" class="ui-tour__btn is-primary" @click="go(1)">{{ index === steps.length - 1 ? '完成' : '下一步' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
.ui-tour { position: fixed; inset: 0; z-index: 380; }
.ui-tour__blocker { position: absolute; inset: 0; }
/* 挖孔：目标块用巨大的 box-shadow 盖住屏幕其余部分。 */
.ui-tour__spot { position: fixed; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, .42); transition: all var(--t-panel) var(--spring-view); pointer-events: none; }
.ui-tour__bubble { position: fixed; width: 280px; padding: 12px 13px; border: var(--border-w) solid var(--outline-variant); border-radius: 14px; background: var(--surface); box-shadow: var(--elev-tip); }
.ui-tour__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ui-tour__head b { font-size: var(--fs-small); font-weight: var(--w-heading); }
.ui-tour__head span { font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }
.ui-tour__text { margin: 6px 0 10px; font-size: var(--fs-tiny); line-height: 1.55; color: var(--on-surface-variant); }
.ui-tour__actions { display: flex; align-items: center; gap: 6px; }
.ui-tour__spacer { flex: 1; }
.ui-tour__btn { padding: 6px 11px; border: var(--border-w) solid var(--outline-variant); border-radius: 999px; background: transparent; color: var(--on-surface); font-size: var(--fs-micro); font-weight: var(--w-label); cursor: pointer; }
.ui-tour__btn.is-primary { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.ui-tour__btn:disabled { opacity: .35; cursor: not-allowed; }
</style>
