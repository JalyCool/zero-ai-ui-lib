<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
const props = defineProps({
  /* [{ label, value?, children?: [{ label, description?, value?, icon? }] }] */
  items: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'select'])

/* 顶部导航：悬停 / 聚焦展开下拉面板，键盘 ←→ 换项、Esc 收起。 */
const openIndex = ref(-1)
let closeTimer = 0

function enter(index) {
  clearTimeout(closeTimer)
  openIndex.value = props.items[index] && props.items[index].children ? index : -1
}
function leave() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => { openIndex.value = -1 }, 140)
}
function pick(item, parent) {
  emit('update:modelValue', item.value ?? item.label)
  emit('select', { item, parent })
  openIndex.value = -1
}
function onKeydown(event) {
  if (event.key === 'Escape') openIndex.value = -1
  if (event.key === 'ArrowRight' && openIndex.value >= 0) { event.preventDefault(); enter((openIndex.value + 1) % props.items.length) }
  if (event.key === 'ArrowLeft' && openIndex.value >= 0) { event.preventDefault(); enter((openIndex.value - 1 + props.items.length) % props.items.length) }
}
const activeItem = computed(() => (openIndex.value >= 0 ? props.items[openIndex.value] : null))
onBeforeUnmount(() => clearTimeout(closeTimer))
</script>
<template>
  <nav class="ui-navmenu" @mouseleave="leave" @keydown="onKeydown">
    <div class="ui-navmenu__bar">
      <button v-for="(item, index) in items" :key="item.label + index" type="button"
        class="ui-navmenu__item" :class="{ 'is-open': openIndex === index, 'is-on': modelValue === item.value }"
        :aria-expanded="openIndex === index" aria-haspopup="true"
        @mouseenter="enter(index)" @focus="enter(index)" @click="item.children ? enter(index) : pick(item, null)">
        {{ item.label }}
        <svg v-if="item.children" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
    <Transition name="ui-nav">
      <div v-if="activeItem" class="ui-navmenu__panel" role="menu" @mouseenter="enter(openIndex)">
        <button v-for="child in activeItem.children" :key="child.label" type="button" role="menuitem"
          class="ui-navmenu__child" @click="pick(child, activeItem)">
          <span v-if="child.icon" class="ui-navmenu__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="child.icon"></svg>
          </span>
          <span class="ui-navmenu__text">
            <b>{{ child.label }}</b>
            <small v-if="child.description">{{ child.description }}</small>
          </span>
        </button>
      </div>
    </Transition>
  </nav>
</template>
<style scoped>
.ui-navmenu { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-navmenu__bar { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
.ui-navmenu__item { display: inline-flex; align-items: center; gap: 4px; padding: 7px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--on-surface-variant); font: inherit; font-size: var(--fs-tiny); font-weight: var(--w-label); cursor: pointer; transition: background var(--t-fade), color var(--t-fade); }
.ui-navmenu__item:hover, .ui-navmenu__item.is-open { background: var(--surface-container); color: var(--on-surface); }
.ui-navmenu__item.is-on { color: var(--primary); }
.ui-navmenu__item svg { width: 12px; height: 12px; transition: transform var(--t-feedback); }
.ui-navmenu__item.is-open svg { transform: rotate(180deg); }
/* 下拉面板贴着导航条下方展开。 */
.ui-navmenu__panel { position: absolute; left: 0; top: calc(100% + 6px); z-index: 330; min-width: 232px; padding: 5px; border: var(--border-w) solid var(--outline-variant); border-radius: 14px; background: var(--surface); box-shadow: var(--elev-tip); display: flex; flex-direction: column; gap: 2px; }
.ui-navmenu__child { display: flex; align-items: flex-start; gap: 9px; width: 100%; padding: 9px 10px; border: 0; border-radius: 10px; background: transparent; color: var(--on-surface); font: inherit; text-align: left; cursor: pointer; }
.ui-navmenu__child:hover { background: var(--surface-container); }
.ui-navmenu__icon { display: grid; place-items: center; width: 17px; height: 17px; flex-shrink: 0; color: var(--on-surface-variant); margin-top: 1px; }
.ui-navmenu__icon svg { width: 16px; height: 16px; }
.ui-navmenu__text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ui-navmenu__text b { font-size: var(--fs-tiny); font-weight: var(--w-label); }
.ui-navmenu__text small { font-size: var(--fs-micro); color: var(--on-surface-variant); }
.ui-nav-enter-active, .ui-nav-leave-active { transition: opacity var(--t-fade), transform var(--t-panel), filter var(--t-fade); }
.ui-nav-enter-from, .ui-nav-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); filter: blur(8px); }
</style>
