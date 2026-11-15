<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /* [{ target: CSS 选择器, title, text, placement?: top|bottom }] */
  steps: { type: Array, default: () => [] },
  startAt: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue', 'finish'])

/* ============================================================
   巡览（Tour）
   · 进场：高亮孔先铺满整个视口，再收拢到目标元素上 ——
     遮罩从「全黑」过渡到「只有目标亮着」，是从整体聚焦到一点的感觉。
   · 换步：孔在目标之间连续移动 / 缩放，不是重新挖一个。
   · 退场：孔再张回整屏，遮罩同时淡出，然后卸载。
   ============================================================ */
const index = ref(props.startAt)
const spot = ref(null)
const bubbleStyle = ref({})
const rendered = ref(false)
const open = ref(false)
const closing = ref(false)
const landed = ref(false)
let timer = 0

const step = computed(() => props.steps[index.value] || null)

function readDuration(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const amount = parseFloat(value)
  if (!Number.isFinite(amount)) return fallback
  return value.endsWith('ms') ? amount : amount * 1000
}
function viewportRect() {
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
}

function measure() {
  if (!step.value) return
  const el = document.querySelector(step.value.target)
  if (!el) return
  const rect = el.getBoundingClientRect()
  const pad = 6
  spot.value = {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  }
  const placement = step.value.placement || 'bottom'
  const below = placement !== 'top'
  const top = below ? rect.bottom + 14 : rect.top - 14
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
  await nextTick()
  measure()
}
function close() {
  if (closing.value || !rendered.value) return
  closing.value = true
  open.value = false
  /* 退场：孔张回整屏 */
  spot.value = viewportRect()
  const ms = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : readDuration('--spring-exit-dur', 400)
  clearTimeout(timer)
  timer = setTimeout(() => {
    rendered.value = false
    closing.value = false
    open.value = false
    landed.value = false
    spot.value = null
    emit('update:modelValue', false)
  }, ms + 60)
}
function onKey(event) { if (event.key === 'Escape') close() }

watch(() => props.modelValue, async value => {
  clearTimeout(timer)
  if (value) {
    index.value = props.startAt
    closing.value = false
    landed.value = false
    spot.value = viewportRect()
    rendered.value = true
    await nextTick()
    /* 先让「孔 = 整屏」这一帧真正画出来，再量目标并收拢，
       否则初始值直接被覆盖，看起来就是凭空出现一个高亮框。 */
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    measure()
    requestAnimationFrame(() => {
      open.value = true
      requestAnimationFrame(() => { landed.value = true })
    })
    window.addEventListener('resize', measure)
    document.addEventListener('keydown', onKey)
    return
  }
  if (rendered.value && !closing.value) close()
}, { immediate: true })

watch(() => props.steps, () => { if (open.value) { measure() } })

onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('resize', measure)
  document.removeEventListener('keydown', onKey)
})
</script>
<template>
  <Teleport to="body">
    <div v-if="rendered" class="ui-tour" :class="{ 'is-open': open, 'is-closing': closing, 'is-landed': landed }">
      <div class="ui-tour__blocker" @click="close"></div>
      <div
        v-if="spot"
        class="ui-tour__spot"
        :style="{ left: spot.left + 'px', top: spot.top + 'px', width: spot.width + 'px', height: spot.height + 'px' }"
      ></div>
      <div
        v-if="step && landed"
        class="ui-tour__bubble"
        :style="bubbleStyle"
        role="dialog"
        :aria-label="step.title || '引导'"
      >
        <div class="ui-tour__head">
          <b>{{ step.title }}</b>
          <span>{{ index + 1 }} / {{ steps.length }}</span>
        </div>
        <p class="ui-tour__text">{{ step.text }}</p>
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
/* 透明拦截层：点任意处收起 */
/* 只负责接点击；真正的压暗来自挖孔的 box-shadow，
   所以孔铺满整屏时画面是亮的，孔收拢到目标才是「聚焦」。 */
.ui-tour__blocker { position: absolute; inset: 0; background: transparent; }

/* 挖孔：目标块用巨大的 box-shadow 盖住屏幕其余部分。
   孔本身的位置 / 尺寸走 view 弹簧，从整屏收到目标。 */
.ui-tour__spot {
  position: fixed;
  border-radius: calc(14px * var(--radius-scale));
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, .46);
  pointer-events: none;
  will-change: left, top, width, height, border-radius;
  transition:
    left var(--t-view),
    top var(--t-view),
    width var(--t-view),
    height var(--t-view),
    border-radius var(--t-view);
}
.ui-tour.is-closing .ui-tour__spot { transition-duration: var(--spring-exit-dur); }
/* 进场瞬间孔还是整屏：把遮罩收进 box-shadow 之外的那圈，视觉上就是「整屏压暗」。 */

.ui-tour__bubble {
  position: fixed;
  width: 280px;
  padding: 12px 13px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--elev-tip);
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(.96);
  transform-origin: 20% 0;
  transition: opacity var(--t-fade), transform var(--t-panel), left var(--t-view), top var(--t-view), bottom var(--t-view);
}
.ui-tour.is-landed .ui-tour__bubble { opacity: 1; transform: none; transition-delay: 60ms, 60ms, 0s, 0s, 0s; }
.ui-tour.is-closing .ui-tour__bubble { opacity: 0; transform: translate3d(0, 6px, 0) scale(.98); transition: opacity var(--t-exit), transform var(--t-exit); transition-delay: 0s; pointer-events: none; }
.ui-tour__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ui-tour__head b { font-size: var(--fs-small); font-weight: var(--w-heading); }
.ui-tour__head span { font-size: var(--fs-micro); color: var(--on-surface-variant); font-variant-numeric: tabular-nums; }
.ui-tour__text { margin: 6px 0 10px; font-size: var(--fs-tiny); line-height: 1.55; color: var(--on-surface-variant); }
.ui-tour__actions { display: flex; align-items: center; gap: 6px; }
.ui-tour__spacer { flex: 1; }
.ui-tour__btn { padding: 6px 11px; border: var(--border-w) solid var(--outline-variant); border-radius: 999px; background: transparent; color: var(--on-surface); font-size: var(--fs-micro); font-weight: var(--w-label); cursor: pointer; transition: background var(--t-fade), transform var(--t-pop); }
.ui-tour__btn.is-primary { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.ui-tour__btn:active { transform: scale(var(--press-scale)); }
.ui-tour__btn:disabled { opacity: .35; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .ui-tour__spot, .ui-tour__bubble, .ui-tour__blocker { transition-duration: .01ms !important; }
}
</style>
