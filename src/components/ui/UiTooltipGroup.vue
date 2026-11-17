<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  /* [{ label, tip }]：label 是触发词，tip 是气泡内容 */
  items: { type: Array, default: () => [] },
  /* 第一次悬停的等待（ms）：先确认用户真的在指这里 */
  wait: { type: Number, default: 520 },
  /* 打开过一次之后的「热区」时长（ms）：这段时间内兄弟项秒开 */
  warmWindow: { type: Number, default: 900 },
  /* 悬停离开后气泡再留多久（让指针能挪到下一个） */
  linger: { type: Number, default: 120 }
})

/* ============================================================
   提示词组
   关键在「冷 / 热」两档延迟：
   · 冷：第一次悬停要等 wait（默认 520ms），避免扫过一排词时闪一片气泡；
   · 热：任一气泡打开过之后，warmWindow 内兄弟项瞬时打开（约一帧），
     用户沿着这排词移动时气泡是连续跟随的，不再逐字等待；
   · 气泡只有一个，跟着当前项移动 —— 兄弟项之间是「换位置 + 换内容」，
     而不是各自冒一个，视觉上不打架。
   ============================================================ */

const hovered = ref(-1)
const bubbleOpen = ref(false)
const bubbleStyle = ref({})
const warmUntil = ref(0)

let openTimer = 0
let closeTimer = 0
const itemEls = ref([])

function setItemEl(el, index) { if (el) itemEls.value[index] = el }

const currentItem = computed(() => (hovered.value >= 0 ? props.items[hovered.value] : null))

function isWarm() { return Date.now() < warmUntil.value }

function place(index) {
  const el = itemEls.value[index]
  if (!el) return
  const rect = el.getBoundingClientRect()
  const half = 0
  bubbleStyle.value = {
    left: rect.left + rect.width / 2 + 'px',
    top: rect.top - 8 + 'px'
  }
}

function enter(index) {
  clearTimeout(closeTimer)
  hovered.value = index
  const warm = isWarm()
  clearTimeout(openTimer)
  const delay = warm ? 16 : props.wait
  if (delay <= 16) {
    place(index)
    bubbleOpen.value = true
    warmUntil.value = Date.now() + props.warmWindow
    return
  }
  openTimer = setTimeout(() => {
    if (hovered.value !== index) return
    place(index)
    bubbleOpen.value = true
    warmUntil.value = Date.now() + props.warmWindow
  }, delay)
}

function leave() {
  clearTimeout(openTimer)
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    bubbleOpen.value = false
    hovered.value = -1
    /* 关闭时把热区再续一小段：在相邻项之间来回时仍然秒开。 */
    warmUntil.value = Date.now() + props.warmWindow
  }, props.linger)
}

function onFocus(index) {
  hovered.value = index
  place(index)
  bubbleOpen.value = true
  warmUntil.value = Date.now() + props.warmWindow
}

function onBlur() { bubbleOpen.value = false; hovered.value = -1 }

onBeforeUnmount(() => { clearTimeout(openTimer); clearTimeout(closeTimer) })
</script>

<template>
  <span class="ui-tooltip-group" @mouseleave="leave">
    <span
      v-for="(item, index) in items"
      :key="item.label + index"
      :ref="el => setItemEl(el, index)"
      class="ui-tooltip-group__trigger"
      :class="{ 'is-active': hovered === index, 'is-icon': !!item.icon }"
      tabindex="0"
      role="button"
      :aria-label="item.icon ? item.label : undefined"
      :aria-describedby="hovered === index ? 'ui-tooltip-group-bubble' : undefined"
      @mouseenter="enter(index)"
      @mouseleave="leave"
      @focus="onFocus(index)"
      @blur="onBlur"
    >
      <span v-if="item.icon" class="ui-tooltip-group__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
      </span>
      <span v-else>{{ item.label }}</span>
    </span>

    <Teleport to="body">
      <Transition name="ui-tip">
        <span
          v-if="bubbleOpen && currentItem"
          id="ui-tooltip-group-bubble"
          class="ui-tooltip-group__bubble"
          :style="bubbleStyle"
          role="tooltip"
        >{{ currentItem.tip }}</span>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.ui-tooltip-group { display: inline-flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.ui-tooltip-group__trigger {
  position: relative;
  padding: 2px 0;
  color: var(--on-surface);
  font-size: inherit;
  cursor: help;
  transition: color var(--t-fade);
}
.ui-tooltip-group__trigger.is-active { color: var(--primary); }
/* 图标按钮触发：主要是给工具栏图标用的，做成方形按钮。 */
.ui-tooltip-group__trigger.is-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container-low);
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-pop);
}
.ui-tooltip-group__trigger.is-icon:active { transform: scale(var(--press-scale)); }
.ui-tooltip-group__trigger.is-icon:hover { background: var(--surface-container); }
.ui-tooltip-group__icon { display: grid; place-items: center; }
.ui-tooltip-group__icon svg { width: 17px; height: 17px; }
.ui-tooltip-group__trigger:focus-visible { outline: var(--focus-w) solid var(--primary); outline-offset: 3px; border-radius: 4px; }

/* 气泡：一项共用，位置由 JS 写，本身只做位移 + 模糊过渡。 */
.ui-tooltip-group__bubble {
  position: fixed;
  z-index: 340;
  transform: translate(-50%, -100%);
  max-width: 240px;
  padding: 7px 10px;
  border-radius: calc(10px * var(--radius-scale));
  background: var(--inverse-surface, #2f3033);
  color: var(--inverse-on-surface, #f2f1f6);
  font-size: var(--fs-micro);
  line-height: 1.45;
  pointer-events: none;
  white-space: pre-line;
  /* 暖态在兄弟触发器之间切换时，气泡平滑滑过去（不是瞬移）：
     位置写在内联 left/top 上，所以 left/top 也必须有过渡，否则 transform 过渡了位置照样跳 */
  transition: transform var(--t-panel), left var(--t-panel), top var(--t-panel),
              opacity var(--t-fade), filter var(--t-fade);
}
.ui-tip-enter-active,
.ui-tip-leave-active { transition: opacity var(--t-fade), transform var(--t-pop), filter var(--t-fade); }
.ui-tip-enter-from,
.ui-tip-leave-to { opacity: 0; transform: translate(-50%, calc(-100% + 4px)) scale(.94); filter: blur(6px); }

@media (prefers-reduced-motion: reduce) {
  .ui-tip-enter-active, .ui-tip-leave-active { transition-duration: .01ms; }
}
</style>
